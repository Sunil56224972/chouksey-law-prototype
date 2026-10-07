/* Law Desk: the Department of Law's chat assistant.
   Talks to /api/chat (a Vercel function that holds the Groq key) and keeps the
   conversation in sessionStorage so it survives moving between pages. */
(function () {
  "use strict";

  var ENDPOINT = "/api/chat";
  var STORE = "lawdesk.v1";
  var MAX_CHARS = 800;
  var ADMISSION = '<a href="tel:+919752410899">97524 10899</a>';

  var MARK =
    '<svg class="ld-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' +
      '<path class="ld-mark__b" d="M24 3.5c11.3 0 20.5 9.2 20.5 20.5S35.3 44.5 24 44.5c-3.1 0-6-.7-8.7-1.9L5.6 45.2l2.6-8.7A20.4 20.4 0 0 1 3.5 24C3.5 12.7 12.7 3.5 24 3.5Z"/>' +
      '<circle class="ld-mark__ring" cx="24" cy="24" r="16.6"/>' +
      '<g class="ld-mark__s">' +
        '<path d="M24 15.2v16.6M19.2 32.4h9.6M14.6 18.6h18.8"/>' +
        '<path d="M15.6 18.8l-3.3 7.4M15.6 18.8l3.3 7.4M32.4 18.8l-3.3 7.4M32.4 18.8l3.3 7.4"/>' +
        '<path d="M11.4 26.2h8.4a4.2 3 0 0 1-8.4 0ZM28.2 26.2h8.4a4.2 3 0 0 1-8.4 0Z"/>' +
      '</g>' +
      '<circle class="ld-mark__r" cx="24" cy="14" r="1.7"/>' +
    '</svg>';

  var ICONS = {
    close: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    reset: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.8"/><path d="M2.6 2.2v3h3"/></svg>',
    send: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3.4M3.6 7.6 8 3.2l4.4 4.4"/></svg>',
    stop: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="7"/></svg>'
  };

  var SUGGESTIONS = [
    "What is the fee for BA LLB?",
    "I scored 48% in Class 12. Which course can I join?",
    "How do I apply for 2026-27?",
    "Who teaches in the law department?",
    "BA LLB aur B.Com LLB mein kya fark hai?",
    "Is the college approved by the Bar Council?"
  ];

  /* ---------- state ---------- */
  var state = { messages: [], open: false };
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
    if (saved && Array.isArray(saved.messages)) state = saved;
  } catch (e) { /* storage unavailable */ }
  var save = function () {
    try { sessionStorage.setItem(STORE, JSON.stringify({ messages: state.messages.slice(-30), open: state.open, nudged: state.nudged })); } catch (e) {}
  };

  /* ---------- markup ---------- */
  var root = document.createElement("div");
  root.className = "ld";
  root.innerHTML =
    '<div class="ld-nudge" role="status">' +
      '<button type="button" class="ld-nudge__body" data-ld-open>' +
        '<b>Questions about admission?</b><span>Ask Law Desk about fees, eligibility or the course, in English or Hindi.</span>' +
      '</button>' +
      '<button type="button" class="ld-nudge__x" data-ld-nudge-x aria-label="Dismiss">' + ICONS.close + '</button>' +
    '</div>' +
    '<button type="button" class="ld-launch" aria-expanded="false" aria-controls="ld-panel">' +
      '<span class="ld-launch__mark">' + MARK + '</span>' +
      '<span class="ld-launch__text"><b>Ask Law Desk</b><small>Admissions &amp; course help</small></span>' +
      '<span class="ld-launch__x">' + ICONS.close + '</span>' +
    '</button>' +
    '<section class="ld-panel" id="ld-panel" role="dialog" aria-labelledby="ld-title" aria-describedby="ld-sub">' +
      '<header class="ld-head">' +
        '<span class="ld-head__mark">' + MARK + '</span>' +
        '<div class="ld-head__text"><h2 id="ld-title" tabindex="-1">Law Desk</h2><p id="ld-sub"><i class="ld-dot" aria-hidden="true"></i>Department of Law<span class="ld-sub-long"> &middot; Chouksey College</span></p></div>' +
        '<button type="button" class="ld-icon" data-ld-reset aria-label="Start a new conversation" title="New conversation">' + ICONS.reset + '</button>' +
        '<button type="button" class="ld-icon" data-ld-close aria-label="Close Law Desk" title="Close">' + ICONS.close + '</button>' +
      '</header>' +
      '<div class="ld-log" role="log" aria-live="polite"></div>' +
      '<form class="ld-form" novalidate>' +
        '<label class="visually-hidden" for="ld-input">Your question</label>' +
        '<textarea id="ld-input" rows="1" maxlength="' + MAX_CHARS + '" placeholder="Ask about fees, eligibility, admission&hellip;" autocomplete="off"></textarea>' +
        '<button type="submit" class="ld-send" aria-label="Send">' + ICONS.send + '</button>' +
      '</form>' +
      '<p class="ld-foot">Answers come from information published by the college. Please confirm fees and dates with the admission cell.</p>' +
    '</section>';
  document.body.appendChild(root);

  var launch = root.querySelector(".ld-launch");
  var panel = root.querySelector(".ld-panel");
  var log = root.querySelector(".ld-log");
  var form = root.querySelector(".ld-form");
  var input = root.querySelector("#ld-input");
  var sendBtn = root.querySelector(".ld-send");
  var nudge = root.querySelector(".ld-nudge");
  var title = root.querySelector("#ld-title");
  var phone = window.matchMedia("(max-width: 640px)");
  var controller = null;

  /* ---------- tiny, safe markdown (bold, links, lists, paragraphs) ---------- */
  var esc = function (s) {
    return s.replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  };
  var link = function (url, text) {
    var raw = url.replace(/&amp;/g, "&");
    if (!/^(https?:\/\/|tel:|mailto:|[a-z0-9-]+\.html(#[\w-]*)?$)/i.test(raw)) return text;
    var ext = /^https?:/i.test(raw);
    return '<a href="' + esc(raw) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + text + "</a>";
  };
  var inline = function (s) {
    var keep = [];
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, t, u) { keep.push(link(u, t)); return "\u0000" + (keep.length - 1) + "\u0000"; });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:])/g, function (_, pre, u) { keep.push(link(u, u.replace(/^https?:\/\//, ""))); return pre + "\u0000" + (keep.length - 1) + "\u0000"; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|\W)\*([^*\s][^*]*)\*(?=\W|$)/g, "$1<em>$2</em>");
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return keep[+i]; });
  };
  var markdown = function (text) {
    var lines = esc(text.replace(/\r/g, "")).split("\n");
    var html = "", list = null, para = [];
    var flush = function () {
      if (para.length) { html += "<p>" + inline(para.join("<br>")) + "</p>"; para = []; }
      if (list) { html += "</" + list + ">"; list = null; }
    };
    lines.forEach(function (line) {
      var t = line.trim();
      var ul = /^[-*\u2022]\s+(.*)/.exec(t), ol = /^\d+[.)]\s+(.*)/.exec(t), h = /^#{1,6}\s+(.*)/.exec(t);
      if (!t) { flush(); return; }
      if (ul || ol) {
        var kind = ul ? "ul" : "ol";
        if (para.length) { html += "<p>" + inline(para.join("<br>")) + "</p>"; para = []; }
        if (list !== kind) { if (list) html += "</" + list + ">"; html += "<" + kind + ">"; list = kind; }
        html += "<li>" + inline((ul || ol)[1]) + "</li>";
        return;
      }
      if (list) { html += "</" + list + ">"; list = null; }
      para.push(h ? "<strong>" + h[1] + "</strong>" : t);
    });
    flush();
    return html;
  };

  /* ---------- rendering ---------- */
  var nearBottom = function () { return log.scrollHeight - log.scrollTop - log.clientHeight < 80; };
  var toBottom = function () { log.scrollTop = log.scrollHeight; };

  var intro = function () {
    var chips = SUGGESTIONS.map(function (q) { return '<li><button type="button" class="ld-chip">' + esc(q) + "</button></li>"; }).join("");
    return '<div class="ld-intro">' +
      '<p class="ld-intro__kicker">Namaste</p>' +
      '<p class="ld-intro__lead">I&rsquo;m Law Desk, the online help desk of the Department of Law.</p>' +
      '<p>Ask me about the BA LLB, B.Com LLB and LLB programmes, fees, eligibility, the admission process or campus life. English, Hindi or Hinglish all work.</p>' +
      '<p class="ld-intro__label">Try asking</p><ul class="ld-chips">' + chips + "</ul></div>";
  };
  var bubble = function (msg) {
    var el = document.createElement("div");
    el.className = "ld-msg ld-msg--" + (msg.role === "user" ? "user" : "bot");
    if (msg.role === "user") {
      el.innerHTML = '<div class="ld-msg__body"><p>' + esc(msg.content).replace(/\n/g, "<br>") + "</p></div>";
    } else {
      el.innerHTML = '<span class="ld-msg__av" aria-hidden="true">' + MARK + '</span><div class="ld-msg__body">' + markdown(msg.content) + "</div>";
    }
    return el;
  };
  var renderAll = function () {
    log.innerHTML = "";
    if (!state.messages.length) { log.innerHTML = intro(); return; }
    state.messages.forEach(function (m) { log.appendChild(bubble(m)); });
    toBottom();
  };

  /* ---------- open / close ---------- */
  var setOpen = function (open, opts) {
    state.open = open;
    root.classList.toggle("is-open", open);
    launch.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("ld-lock", open && phone.matches);
    if (open) {
      hideNudge(true);
      toBottom();
      if (!(opts && opts.silent)) {
        // Avoid popping the keyboard on phones; focus the heading there instead.
        setTimeout(function () { (phone.matches || matchMedia("(hover: none)").matches ? title : input).focus({ preventScroll: true }); }, 60);
      }
    } else if (!(opts && opts.silent)) {
      launch.focus({ preventScroll: true });
    }
    save();
  };
  launch.addEventListener("click", function () { setOpen(!state.open); });
  root.querySelector("[data-ld-close]").addEventListener("click", function () { setOpen(false); });
  root.querySelector("[data-ld-reset]").addEventListener("click", function () {
    if (controller) controller.abort();
    state.messages = [];
    save();
    renderAll();
    input.focus({ preventScroll: true });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.open && !document.querySelector("dialog[open]")) setOpen(false);
  });
  phone.addEventListener("change", function () { document.documentElement.classList.toggle("ld-lock", state.open && phone.matches); });

  /* ---------- nudge: one gentle prompt per session on larger screens ---------- */
  var nudgeTimer = null;
  function hideNudge(remember) {
    clearTimeout(nudgeTimer);
    nudge.classList.remove("is-shown");
    if (remember) { state.nudged = true; save(); }
  }
  root.querySelector("[data-ld-nudge-x]").addEventListener("click", function () { hideNudge(true); });
  root.querySelector("[data-ld-open]").addEventListener("click", function () { setOpen(true); });
  if (!state.nudged && !state.open && !state.messages.length) {
    nudgeTimer = setTimeout(function () { if (!phone.matches && !state.open) nudge.classList.add("is-shown"); }, 7000);
  }

  /* ---------- sending ---------- */
  var busy = function (on) {
    root.classList.toggle("is-busy", on);
    sendBtn.innerHTML = on ? ICONS.stop : ICONS.send;
    sendBtn.setAttribute("aria-label", on ? "Stop answer" : "Send");
  };
  var autosize = function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 132) + "px";
  };

  var failure = function (text) {
    return text + " Meanwhile, the admission cell can help on " + ADMISSION + ' or <a href="mailto:admission@cecbilaspur.ac.in">admission@cecbilaspur.ac.in</a>.';
  };

  var ask = function (question) {
    question = question.trim().slice(0, MAX_CHARS);
    if (!question || controller) return;
    if (!state.messages.length) log.innerHTML = "";
    var userMsg = { role: "user", content: question };
    state.messages.push(userMsg);
    log.appendChild(bubble(userMsg));
    save();

    var reply = document.createElement("div");
    reply.className = "ld-msg ld-msg--bot is-pending";
    reply.innerHTML = '<span class="ld-msg__av" aria-hidden="true">' + MARK + '</span><div class="ld-msg__body"><span class="ld-typing" aria-label="Law Desk is typing"><i></i><i></i><i></i></span></div>';
    log.appendChild(reply);
    toBottom();
    var body = reply.querySelector(".ld-msg__body");

    controller = new AbortController();
    busy(true);
    var text = "";
    var history = state.messages.slice(-16).map(function (m) { return { role: m.role, content: m.content }; });

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
      signal: controller.signal
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          var err = new Error(j.error || "HTTP " + res.status);
          err.friendly = j.error;
          throw err;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var pump = function () {
        return reader.read().then(function (r) {
          if (r.done) return;
          text += decoder.decode(r.value, { stream: true });
          var stick = nearBottom();
          reply.classList.remove("is-pending");
          body.innerHTML = markdown(text);
          if (stick) toBottom();
          return pump();
        });
      };
      return pump();
    }).then(function () {
      if (!text.trim()) throw new Error("empty");
      state.messages.push({ role: "assistant", content: text.trim() });
    }).catch(function (err) {
      reply.classList.remove("is-pending");
      if (err.name === "AbortError") {
        if (text.trim()) state.messages.push({ role: "assistant", content: text.trim() });
        else reply.remove();
        return;
      }
      state.messages.pop(); // let the visitor retry the same question
      reply.classList.add("is-error");
      var offline = location.protocol === "file:" || err instanceof TypeError;
      body.innerHTML = "<p>" + failure(err.friendly ? esc(err.friendly) : offline
        ? "Law Desk works on the live website, and I can&rsquo;t reach it from here."
        : "Sorry, I couldn&rsquo;t answer that just now.") + "</p>" +
        '<p><button type="button" class="ld-retry">Try again</button></p>';
      reply.querySelector(".ld-retry").addEventListener("click", function () {
        reply.previousElementSibling && reply.previousElementSibling.remove();
        reply.remove();
        ask(question);
      });
    }).then(function () {
      controller = null;
      busy(false);
      save();
    });
  };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (controller) { controller.abort(); return; }
    var q = input.value;
    if (!q.trim()) { input.focus(); return; }
    input.value = "";
    autosize();
    ask(q);
  });
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit")); }
  });
  log.addEventListener("click", function (e) {
    var chip = e.target.closest(".ld-chip");
    if (chip) ask(chip.textContent);
  });

  renderAll();
  if (state.open && !phone.matches) setOpen(true, { silent: true });
  else if (state.open) { state.open = false; save(); }
})();