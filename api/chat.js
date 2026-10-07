// Vercel serverless function behind the Law Desk assistant.
// Proxies chat turns to Groq and streams plain text back. The API key comes from
// the GROQ_API_KEY environment variable and never reaches the browser.
"use strict";

const SYSTEM_PROMPT = require("./_knowledge.js");
const fallback = require("./_fallback.js");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const SECOND_MODEL = process.env.GROQ_SECOND_MODEL || "qwen/qwen3.8-27b";
const FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
const MAX_TURNS = 16;
const MAX_USER_CHARS = 800;
const WINDOW_MS = 5 * 60 * 1000;
const WINDOW_LIMIT = 30;
const hits = new Map(); // best-effort, per warm instance

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, recent);
  return recent.length > WINDOW_LIMIT;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

// Answer from the built-in college facts (api/_fallback.js), streamed in small pieces
// like a model reply, so visitors get a real answer instead of an error.
async function sendFallback(res, messages, reason) {
  let text;
  try { text = fallback.answer(messages); } catch (e) {
    console.error("fallback failed", e);
    text = "Sorry, I couldn't work that out. The admission cell can help on [97524 10899](tel:+919752410899) or [admission@cecbilaspur.ac.in](mailto:admission@cecbilaspur.ac.in).";
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("X-LawDesk-Source", "fallback:" + reason); // why Groq was not used (no secrets)
  const pieces = text.match(/\S+\s*|\s+/g) || [text];
  for (let i = 0; i < pieces.length; i += 3) {
    res.write(pieces.slice(i, i + 3).join(""));
    await new Promise((r) => setTimeout(r, 12));
  }
  res.end();
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64000) throw new Error("Body too large");
  }
  return JSON.parse(raw || "{}");
}

// Keep only well-formed user/assistant turns, trimmed, ending on a user turn.
function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const out = [];
  for (const m of input.slice(-MAX_TURNS)) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, m.role === "user" ? MAX_USER_CHARS : 3000);
    if (content) out.push({ role: m.role, content });
  }
  return out.length && out[out.length - 1].role === "user" ? out : null;
}

// The model drifts into Devanagari for Hinglish questions, so state the script explicitly.
function scriptHint(messages) {
  const last = messages[messages.length - 1].content;
  return /[\u0900-\u097F]/.test(last)
    ? "Reply in Hindi using Devanagari script."
    : "The visitor wrote in Roman (Latin) letters. Reply ONLY in Roman letters, in the same language as their latest message: English if it is English, or simple Hinglish (Hindi words in Roman letters, e.g. \"Aapki fees 20,000 per semester hai\") if it contains Hindi words such as hai, kya, ka, kaisa, scene or batao. Do not use Devanagari.";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }


  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch (e) { /* malformed origin */ }
    if (originHost !== host) return sendJson(res, 403, { error: "Forbidden" });
  }

  const ip = String(req.headers["x-forwarded-for"] || (req.socket && req.socket.remoteAddress) || "").split(",")[0].trim();
  if (rateLimited(ip)) return sendJson(res, 429, { error: "That's a lot of questions in a short time. Please wait a minute and try again." });

  let messages;
  try { messages = cleanMessages((await readBody(req)).messages); } catch (e) { messages = null; }
  if (!messages) return sendJson(res, 400, { error: "Bad request" });

  // Without a Groq key (e.g. not set in Vercel yet) answer from the built-in facts.
  const key = process.env.GROQ_API_KEY;
  if (!key) return sendFallback(res, messages, "no-key");

  // Free-tier Groq keys are limited per model per minute (about 8k tokens), so on a 429
  // move to the next model, each of which has its own limit, then retry once.
  const callGroq = (model) => fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages, { role: "system", content: scriptHint(messages) }],
      temperature: 0.6,
      max_completion_tokens: 1200,
      reasoning_effort: model.startsWith("openai/") ? "low" : "none",
      include_reasoning: false,
      stream: true
    }),
    signal: AbortSignal.timeout(25000)
  });

  let upstream;
  try {
    const attempts = [MODEL, SECOND_MODEL, FALLBACK_MODEL, MODEL];
    for (let i = 0; i < attempts.length; i++) {
      upstream = await callGroq(attempts[i]);
      if (upstream.status !== 429) break;
      const detail = await upstream.text().catch(() => "");
      console.error("groq 429 on", attempts[i], detail.slice(0, 200));
      if (i === attempts.length - 2) {
        const wait = Math.min(Number(upstream.headers.get("retry-after")) || 3, 5);
        await new Promise((r) => setTimeout(r, wait * 1000));
      }
    }
  } catch (e) {
    console.error("groq fetch failed", e);
    return sendFallback(res, messages, "unreachable");
  }

  if (!upstream.ok || !upstream.body) {
    const detail = upstream.bodyUsed ? "" : await upstream.text().catch(() => "");
    console.error("groq error", upstream.status, detail.slice(0, 400));
    return sendFallback(res, messages, "groq-" + upstream.status);

  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("X-LawDesk-Source", "groq");

  // Groq streams server-sent events; forward only the text deltas.
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let nl;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) res.write(delta);
        } catch (e) { /* ignore partial or keep-alive frames */ }
      }
    }
  } catch (e) {
    console.error("groq stream interrupted", e);
  }
  res.end();
};