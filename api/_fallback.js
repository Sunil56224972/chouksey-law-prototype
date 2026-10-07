// Built-in Law Desk replies, used when Groq is not configured or cannot answer.
// It reads the conversation, works out what the visitor is asking (fees, eligibility,
// faculty, admission...) and replies in their language (English or Hinglish) from the
// same verified college facts as _knowledge.js, so the chat never dead-ends.
"use strict";

const R = "\u20B9";
const PHONE = "[97524 10899](tel:+919752410899)";
const MAIL = "[admission@cecbilaspur.ac.in](mailto:admission@cecbilaspur.ac.in)";
const REGISTER = "https://accsoft.cecbilaspur.ac.in/Accsoft2/AdmissionRegistration.aspx";
const PAY = "https://accsoft.cecbilaspur.ac.in/accsoft2/admissionregpayment.aspx";

const PROGRAMMES = {
  ba: { name: "BA LLB", years: 5, sem: "20,000", year: "40,000" },
  bcom: { name: "B.Com LLB", years: 5, sem: "20,000", year: "40,000" },
  llb: { name: "LLB", years: 3, sem: "15,000", year: "30,000" }
};
const SOCIAL = ["greeting", "howareyou", "thanks", "bye", "ack"];
const topical = (list) => list.filter((i) => !SOCIAL.includes(i));
const say = (lang, en, hl) => (lang === "en" ? en : hl);

// ---------- understanding ----------
function language(text) {
  if (/[\u0900-\u097F]/.test(text)) return "hl";
  const t = text.toLowerCase();
  const strong = (t.match(/\b(kya|kitni|kitna|kitne|kaise|kaisa|kaun|kon|batao|bataiye|bataye|chahiye|fark|farak|hai|hain|hoga|hogi|milega|milegi|mujhe|mera|meri|mere|aapka|apka|aapki|apki|nahi|nahin|kab|kahan|kaha|padhate|sakta|sakti|sakte|karna|karu|karun)\b/g) || []).length;
  const weak = (t.match(/\b(aur|mein|mai|ke|ka|ki|ko|se|par|bhi|ho|hu|hoon|ji|liye|wala|wali|kar|koi|kuch)\b/g) || []).length;
  return strong >= 1 || weak >= 2 ? "hl" : "en";
}

function programmesIn(text) {
  const found = new Set();
  let t = text.toLowerCase().replace(/\./g, "").replace(/[-_]/g, " ");
  t = t.replace(/\b(bcom|b com|commerce)\s*llb\b|\bbcomllb\b/g, () => { found.add("bcom"); return " "; });
  t = t.replace(/\b(ba|b a|arts)\s*llb\b|\bballb\b/g, () => { found.add("ba"); return " "; });
  if (/\bllb\b/.test(t)) found.add("llb");
  return [...found];
}

const INTENTS = [
  ["legal", /\b(my case|fir|bail|divorce|court case|property dispute|police|legal advice|legal notice|complaint against|dowry|mera case)\b/],
  ["identity", /\b(who are you|what are you|are you (a |an )?(ai|bot|robot|human|real|person)|your name|who (made|built|created) you|tum kaun|aap kaun|kaun ho|bot ho)\b/],
  ["difference", /\b(difference|differ|vs|versus|compare|comparison|fark|farak|better|which (one|course|programme|program) (is|should)|choose between)\b/],
  ["eligibility", /\b(eligib\w*|criteria|qualification|qualify|percent\w*|marks|scored|minimum|cut ?off|can i (join|apply|get|take|do)|join kar\w*|admission mil\w*|yogyata)\b|%|\u092F\u094B\u0917\u094D\u092F\u0924\u093E/],
  ["fees", /\b(fee|fees|cost|costs|price|charges?|tuition|how much (is|does|will|for|fee|fees)|kitna paisa|paisa|paise|rupees?|afford)\b|\u20B9|\u092B\u0940\u0938/],
  ["loan", /\b(loan|scholarships?|installments?|instalments?|emi|financial (aid|help)|concession|discount)\b/],
  ["faculty", /\b(faculty|teachers?|teaches|teaching staff|professors?|lecturers?|staff|padhate|padhata|padhati|hod)\b|\u0936\u093F\u0915\u094D\u0937\u0915/],
  ["apply", /\b(apply|application|admission process|admissions? (open|start\w*)|(get|take) admission|how (to|do i|can i) (join|apply)|register|registration|form|enrol\w*|enroll\w*|admission kaise|kaise le\w*|process|steps?|procedure)\b|\u092A\u094D\u0930\u0935\u0947\u0936/],
  ["documents", /\b(documents?|certificates?|marksheets?|mark sheets?|tc|migration|kagaz\w*)\b/],
  ["approval", /\b(bci|bar council|approved|approval|affiliat\w*|university|recogni[sz]ed|valid|aicte|legit|genuine)\b/],
  ["subjects", /\b(subjects?|syllabus|curriculum|what (will|do) (i|we|you) (study|learn)|padhai|padhaya)\b/],
  ["programmes", /\b(courses?|programmes?|programs?|degrees?|duration|how many years|seats?|intake|integrated|offer\w*|llm)\b|\u0915\u094B\u0930\u094D\u0938/],
  ["hostel", /\b(hostels?|accommodation|mess|transport|bus|canteen|food|facilit\w*|sports|campus|ragging|safety|cctv|smart class\w*)\b|\u0939\u0949\u0938\u094D\u091F\u0932/],
  ["library", /\b(library|books?|journals?|e-?books?|delnet|j-?gate)\b/],
  ["placement", /\b(placements?|jobs?|careers?|internships?|salary|package|scope|after (llb|ba llb|graduation)|become (a |an )?(lawyer|advocate|judge)|judiciary)\b/],
  ["events", /\b(events?|vidyarambh|induction|moot courts?|seminars?|activities|gallery|photos?|fest|legal aid|nss|ncc|teaching methods?|practical)\b/],
  ["dates", /\b(dates?|last date|deadline|when (does|will|is|do)|exams?|entrance|clat|results?|session start\w*)\b/],
  ["contact", /\b(contact|phone|(contact|mobile|phone|whatsapp) (no|number)|call|e-?mail|address|location|located|where is (the )?(college|campus|department)|directions?|map|kahan hai|kaha hai|timings?|office hours|visit)\b/],
  ["howareyou", /\b(how are you|how r u|kaise ho|kya haal|how is it going)\b/],
  ["thanks", /\b(thanks|thank you|thank u|thx|dhanyavad|dhanyawad|shukriya)\b|\u0927\u0928\u094D\u092F\u0935\u093E\u0926/],
  ["bye", /\b(bye|goodbye|see you|alvida|good night)\b/],
  ["greeting", /\b(hi+|hello|hey+|namaste|namaskar|good (morning|afternoon|evening))\b|\u0928\u092E\u0938\u094D\u0924\u0947/],
  ["ack", /^\s*(ok|okay|okk|k|hmm+|yes|no|yeah|yup|nope|haan|han|nahi|accha|acha|theek|thik|theek hai|got it|sure|cool|great|nice)\s*[.!]*\s*$/]
];

function intentsIn(text) {
  const t = text.toLowerCase();
  return INTENTS.filter(([, re]) => re.test(t)).map(([name]) => name);
}

function marksIn(text) {
  const t = text.toLowerCase();
  const m = /(\d{2}(?:\.\d+)?)\s*(%|percent|per cent|pct|marks|percentage)/.exec(t) ||
    /\b(?:scored|got|score|percentage|aaye|aaya|mile)\D{0,12}?(\d{2}(?:\.\d+)?)\b/.exec(t);
  let level = null;
  if (/\b(graduat\w*|degree|bachelor|bsc|bba|bca|ug|ba pass|bcom pass|ba kiya|bcom kiya)\b/.test(t)) level = "grad";
  else if (/\b(12th|12 th|class 12|xii|10\s*\+\s*2|plus two|inter|intermediate|hsc|higher secondary|twelfth|12vi|12 me|12 mein)\b/.test(t)) level = "12";
  const pct = m ? Number(m[1]) : null;
  return { pct: pct !== null && pct > 0 && pct <= 100 ? pct : null, level };
}

// ---------- replies ----------
function feesReply(lang, progs) {
  const list = progs.length ? progs : ["ba", "bcom", "llb"];
  const lines = list.map((k) => {
    const p = PROGRAMMES[k];
    return say(lang,
      `- **${p.name}**: ${R}${p.sem} per semester (${R}${p.year} per year), ${p.years} years`,
      `- **${p.name}**: ${R}${p.sem} per semester (${R}${p.year} saal ka), ${p.years} saal`);
  }).join("\n");
  return [
    list.length === 1 ? say(lang, "Here's the fee:", "Fees ye hai:") : say(lang, "Here are the fees for session 2026-27:", "Session 2026-27 ki fees ye hai:"),
    lines,
    say(lang,
      "Fees are charged per semester. University, exam and other statutory charges, if any, are separate, and education loan assistance is available. Full details: [Admissions & fees](admissions.html).",
      "Fees har semester li jaati hai. University, exam ya dusre statutory charges (agar ho) alag hain, aur education loan mein madad bhi milti hai. Poori details: [Admissions & fees](admissions.html).")
  ].join("\n\n");
}

function eligibilityReply(lang, pct, level, progs) {
  const confirm = say(lang,
    `Final eligibility is confirmed by the admission cell (${PHONE}). You can also try the [Eligibility checker](admissions.html#checker).`,
    `Final eligibility admission cell confirm karta hai (${PHONE}). Aap [Eligibility checker](admissions.html#checker) bhi try kar sakte hain.`);
  if (pct === null) {
    return [
      say(lang, "Eligibility for 2026-27:", "2026-27 ke liye eligibility:"),
      say(lang,
        "- **BA LLB / B.Com LLB** (5 years): 10+2 in any stream with at least **45%**\n- **LLB** (3 years): graduation in any discipline with at least **50%**",
        "- **BA LLB / B.Com LLB** (5 saal): kisi bhi stream se 10+2 mein kam se kam **45%**\n- **LLB** (3 saal): kisi bhi subject mein graduation, kam se kam **50%**"),
      say(lang,
        "Tell me your percentage and whether it's Class 12 or graduation, and I'll check it for you.",
        "Apna percentage aur ye 12th ka hai ya graduation ka, bata dijiye, main check kar deta hoon."),
      confirm
    ].join("\n\n");
  }
  const out = [];
  if (level === "grad") {
    out.push(pct >= 50
      ? say(lang, `With **${pct}%** in graduation you appear **eligible for LLB** (3 years, needs 50%).`,
        `Graduation mein **${pct}%** ke saath aap **LLB ke liye eligible** lagte hain (3 saal, 50% chahiye).`)
      : say(lang, `With **${pct}%** in graduation you are below the **50%** needed for LLB, so you don't appear eligible for it under the published rule.`,
        `Graduation mein **${pct}%** LLB ke liye zaroori **50%** se kam hai, isliye published rule ke hisaab se aap eligible nahi lagte.`));
    out.push(say(lang,
      "The 5-year BA LLB and B.Com LLB need 45% in Class 12, so they are another option if your 12th marks qualify.",
      "5 saal ke BA LLB aur B.Com LLB ke liye 12th mein 45% chahiye, to agar 12th ke marks itne hain to wo bhi option hai."));
  } else {
    const which = progs.filter((k) => k !== "llb");
    const names = (which.length ? which : ["ba", "bcom"]).map((k) => PROGRAMMES[k].name).join(say(lang, " and ", " aur "));
    out.push(pct >= 45
      ? say(lang, `With **${pct}%** in Class 12 you appear **eligible for ${names}** (needs 45%).`,
        `12th mein **${pct}%** ke saath aap **${names} ke liye eligible** lagte hain (45% chahiye).`)
      : say(lang, `With **${pct}%** in Class 12 you are below the **45%** needed for ${names}, so you don't appear eligible under the published rule.`,
        `12th mein **${pct}%** ${names} ke liye zaroori **45%** se kam hai, isliye published rule ke hisaab se aap eligible nahi lagte.`));
    if (level === "12") {
      out.push(say(lang, "The 3-year LLB is for graduates (50% in graduation).", "3 saal ka LLB graduates ke liye hai (graduation mein 50%)."));
    } else {
      out.push(pct >= 50
        ? say(lang, `If ${pct}% is your graduation score, you also meet the 50% needed for the 3-year LLB.`,
          `Agar ${pct}% graduation ka hai, to 3 saal ke LLB ki 50% wali condition bhi poori hoti hai.`)
        : say(lang, "The 3-year LLB needs graduation with at least 50%.", "3 saal ke LLB ke liye graduation mein kam se kam 50% chahiye."));
    }
  }
  out.push(confirm);
  return out.join("\n\n");
}

function programmesReply(lang, progs) {
  if (progs.length === 1) {
    const k = progs[0], p = PROGRAMMES[k];
    const elig = k === "llb"
      ? say(lang, "graduation in any discipline with at least 50%", "kisi bhi subject mein graduation, kam se kam 50%")
      : say(lang, "10+2 in any stream with at least 45%", "kisi bhi stream se 10+2 mein kam se kam 45%");
    const integ = k === "llb" ? "" : say(lang, " (integrated, 10 semesters)", " (integrated, 10 semester)");
    return say(lang,
      `**${p.name}** is a full-time ${p.years}-year programme${integ} with **60 seats**. Eligibility: ${elig}. Fee: **${R}${p.sem} per semester**. More on the [Programmes](programmes.html) page. Would you like the admission steps?`,
      `**${p.name}** ${p.years} saal ka full-time programme hai${integ}, **60 seats**. Eligibility: ${elig}. Fees: **${R}${p.sem} per semester**. Details [Programmes](programmes.html) page par hain. Admission ke steps bataun?`);
  }
  return [
    say(lang, "The department offers three full-time programmes for 2026-27, with 60 seats each:", "Department mein 2026-27 ke liye teen full-time programmes hain, har ek mein 60 seats:"),
    say(lang,
      `- **BA LLB**: 5 years, after 10+2 (45%), ${R}20,000/semester\n- **B.Com LLB**: 5 years, after 10+2 (45%), ${R}20,000/semester\n- **LLB**: 3 years, after graduation (50%), ${R}15,000/semester`,
      `- **BA LLB**: 5 saal, 10+2 ke baad (45%), ${R}20,000/semester\n- **B.Com LLB**: 5 saal, 10+2 ke baad (45%), ${R}20,000/semester\n- **LLB**: 3 saal, graduation ke baad (50%), ${R}15,000/semester`),
    say(lang, "Which one are you interested in?", "Aap kis course mein interested hain?")
  ].join("\n\n");
}

function subjectsReply(lang, progs) {
  const subjects = {
    ba: "Political Science, Sociology, History, English, Constitutional Law, Law of Contract, Law of Torts, Criminal Law, Family Law, Jurisprudence, Moot Court & Drafting",
    bcom: "Financial Accounting, Business Economics, Banking, Taxation, Constitutional Law, Law of Contract, Company Law, Criminal Law, Labour & Industrial Law, Jurisprudence, Moot Court & Drafting",
    llb: "Constitutional Law, Law of Contract, Law of Torts, Criminal Law, Family Law, Property Law, Law of Evidence, Civil & Criminal Procedure, Jurisprudence, Professional Ethics, Moot Court & Drafting"
  };
  const list = progs.length ? progs : ["ba", "bcom", "llb"];
  return [
    say(lang, "Indicative subjects:", "Main subjects (indicative):"),
    list.map((k) => `- **${PROGRAMMES[k].name}**: ${subjects[k]}`).join("\n"),
    say(lang, "The exact semester syllabus is set by Atal Bihari Vajpayee Vishwavidyalaya under BCI rules.",
      "Exact semester syllabus Atal Bihari Vajpayee Vishwavidyalaya BCI rules ke under tay karta hai.")
  ].join("\n\n");
}

function facultyReply(lang, text) {
  const subjectAsked = /\b(constitution\w*|contract|torts?|criminal|family|property|evidence|procedure|jurisprudence|company|tax\w*|labour|subject|kaunsa|which subject)\b/i.test(text);
  return [
    say(lang, "The Faculty of Law this year:", "Is saal ki Faculty of Law:"),
    "- **Mrs. Tanuja Birthare**, Assistant Professor, Ph.D. (Law), 18 years' experience\n- **Mrs. L. Uma Rao**, Assistant Professor, LL.M. (Legal Education), M.A. (English Literature), 2 years\n- **Mr. Vikash Kumar**, Assistant Professor, LL.M. (Corporate Law), 2 years\n- **Ms. Kajal Lulla**, Assistant Professor, LL.M. (Crime & Torts), 1 year",
    subjectAsked
      ? say(lang, "The college hasn't published which teacher takes which subject, so I can only share their specialisations. See [Faculty](department.html#faculty).",
        "Kaun teacher kaunsa subject padhata hai, ye college ne publish nahi kiya hai, isliye main sirf specialisation bata sakta hoon. Dekhiye [Faculty](department.html#faculty).")
      : say(lang, "More on the [Faculty](department.html#faculty) page.", "Zyada jaankari [Faculty](department.html#faculty) page par hai.")
  ].join("\n\n");
}

const REPLIES = {
  greeting: (lang) => say(lang,
    "Hello! I'm Law Desk, the help desk of the Department of Law, Chouksey College. How can I help you today? You can ask me about courses, fees, eligibility, admission or campus life.",
    "Namaste! Main Law Desk hoon, Chouksey College ke Department of Law ka help desk. Bataiye, main aapki kya madad kar sakta hoon? Aap courses, fees, eligibility, admission ya campus ke baare mein pooch sakte hain."),
  howareyou: (lang) => say(lang,
    "I'm doing well, thank you for asking! How can I help you today? Fees, eligibility, admission steps or anything else about the Department of Law.",
    "Main bilkul theek hoon, poochne ke liye shukriya! Bataiye, aaj main aapki kya madad karoon? Fees, eligibility, admission ya department ke baare mein kuch bhi."),
  thanks: (lang) => say(lang,
    "You're welcome! Is there anything else you'd like to know about admission or the courses?",
    "Aapka swagat hai! Admission ya courses ke baare mein kuch aur poochna hai?"),
  bye: (lang) => say(lang,
    `Goodbye, and all the best! If you need help later, the admission cell is on ${PHONE}.`,
    `Alvida, all the best! Baad mein madad chahiye ho to admission cell: ${PHONE}.`),
  ack: (lang) => say(lang,
    "Sure. Is there anything else I can help with? For example fees, eligibility, admission steps, faculty or hostel facilities.",
    "Theek hai. Aur kuch jaanna hai? Jaise fees, eligibility, admission steps, faculty ya hostel ke baare mein."),
  identity: (lang) => say(lang,
    "I'm Law Desk, the online help desk of the Department of Law, Chouksey College of Science & Commerce, Bilaspur. I answer questions about programmes, fees, eligibility, admission and campus life using information published by the college. What would you like to know?",
    "Main Law Desk hoon, Chouksey College of Science & Commerce, Bilaspur ke Department of Law ka online help desk. College ki published jaankari se courses, fees, eligibility, admission aur campus life ke sawaalon ka jawab deta hoon. Aap kya jaanna chahte hain?"),
  legal: (lang) => say(lang,
    "I can't give advice on personal legal matters. Please consult a practising advocate, or the District Legal Services Authority (DLSA), which offers free legal aid. I'm happy to help with any questions about studying law here.",
    "Main personal legal matters par advice nahi de sakta. Kisi practising advocate se ya District Legal Services Authority (DLSA) se miliye, wahan free legal aid milti hai. Law padhai ke baare mein kuch poochna ho to zaroor poochiye."),
  difference: (lang) => say(lang,
    `Both are 5-year integrated programmes with the same fee (${R}20,000/semester), 60 seats and 45% in 10+2 as eligibility. The difference is the non-law side:\n\n- **BA LLB** pairs law with Political Science, Sociology, History and English. It suits students drawn to the social, political and constitutional side of law.\n- **B.Com LLB** pairs law with Accounting, Economics, Banking and Taxation. It suits corporate, banking, tax and commercial practice.\n\nThe **LLB** is the 3-year option for students who already hold a degree. See [Programmes](programmes.html).`,
    `Dono 5 saal ke integrated programmes hain, fees same (${R}20,000/semester), 60 seats aur eligibility 10+2 mein 45%. Fark non-law subjects ka hai:\n\n- **BA LLB** mein law ke saath Political Science, Sociology, History aur English. Social, political aur constitutional side pasand ho to ye sahi hai.\n- **B.Com LLB** mein law ke saath Accounting, Economics, Banking aur Taxation. Corporate, banking, tax aur commercial practice ke liye accha hai.\n\n**LLB** 3 saal ka hai, un students ke liye jinke paas pehle se degree hai. Dekhiye [Programmes](programmes.html).`),
  apply: (lang) => say(lang,
    `Admissions are open for 2026-27. Here's how to apply:\n\n1. Register on the [admission portal](${REGISTER}).\n2. Keep documents ready: Class 10 and 12 mark sheets, graduation mark sheets (for LLB), transfer and migration certificates, ID proof and photographs.\n3. The admission cell verifies eligibility against university and BCI norms.\n4. Pay the first-semester fee on the [payment portal](${PAY}) to confirm your seat.\n\nNeed help? Call ${PHONE} (Monday to Saturday). More on [Admissions](admissions.html).`,
    `2026-27 ke admissions open hain. Apply karne ke steps:\n\n1. [Admission portal](${REGISTER}) par register kijiye.\n2. Documents ready rakhiye: 10th aur 12th ki marksheet, graduation marksheet (LLB ke liye), TC aur migration certificate, ID proof aur photos.\n3. Admission cell university aur BCI norms ke hisaab se eligibility check karega.\n4. Seat confirm karne ke liye [payment portal](${PAY}) par first-semester fees bhariye.\n\nMadad chahiye to ${PHONE} par call kijiye (Monday se Saturday). Details: [Admissions](admissions.html).`),
  documents: (lang) => say(lang,
    "Keep these ready: Class 10 and 12 mark sheets, graduation mark sheets (for LLB), transfer and migration certificates, ID proof and photographs. The full checklist is on [Admissions](admissions.html).",
    "Ye documents ready rakhiye: 10th aur 12th ki marksheet, graduation marksheet (LLB ke liye), TC aur migration certificate, ID proof aur photos. Poori list [Admissions](admissions.html) par hai."),
  approval: (lang) => say(lang,
    "Yes. The curriculum follows the Bar Council of India's Legal Education Rules, 2008, with BCI approval reference **1367:2024 (LE/Std. 25.08.2024)**. The department is affiliated to **Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur**, and CCSC also holds AICTE approval for 2025-26. The documents are under [Approvals](department.html#approvals).",
    "Haan. Curriculum Bar Council of India ke Legal Education Rules, 2008 ke hisaab se hai, BCI approval reference **1367:2024 (LE/Std. 25.08.2024)**. Department **Atal Bihari Vajpayee Vishwavidyalaya, Bilaspur** se affiliated hai, aur CCSC ke paas 2025-26 ka AICTE approval bhi hai. Documents [Approvals](department.html#approvals) mein hain."),
  loan: (lang) => say(lang,
    `Education loan assistance is available through the college. Scholarship amounts aren't published, so please check with the admission cell on ${PHONE} or ${MAIL}.`,
    `College ke through education loan mein madad milti hai. Scholarship amount publish nahi hai, iske liye admission cell se baat kijiye: ${PHONE} ya ${MAIL}.`),
  hostel: (lang) => say(lang,
    `The Chouksey campus has boys' and girls' hostels, college transport, a canteen, sports, smart classrooms, a hospital, an ATM, CCTV surveillance and an anti-ragging committee. Hostel and transport fees aren't published, so please ask the admission cell on ${PHONE}. Photos: [Student life](gallery.html).`,
    `Chouksey campus mein boys aur girls hostel, college bus, canteen, sports, smart classrooms, hospital, ATM, CCTV aur anti-ragging committee hai. Hostel aur transport ki fees publish nahi hai, uske liye admission cell ko call kijiye: ${PHONE}. Photos: [Student life](gallery.html).`),
  library: (lang) => say(lang,
    "The central library is fully computerised: 37,177 text and reference volumes, 5,500+ online e-journals, 33,000+ e-books, DELNET and J-Gate access, previous question papers and a Book Bank. It's open Monday to Saturday, 9:00 AM to 4:00 PM.",
    "Central library fully computerised hai: 37,177 books, 5,500+ e-journals, 33,000+ e-books, DELNET aur J-Gate access, purane question papers aur Book Bank. Monday se Saturday, subah 9 se shaam 4 baje tak khuli rehti hai."),
  placement: (lang) => say(lang,
    "After an LLB degree you can enrol as an advocate with a State Bar Council, and paths include litigation, corporate legal work and judiciary exams. The college has a training & placement cell ([+91 93294 70964](tel:+919329470964), tpocec@gmail.com), but placement figures for law students aren't published yet. CCSC also gives free Banking and PSC coaching from the first year.",
    "LLB ke baad aap State Bar Council mein advocate ke roop mein enrol ho sakte hain, aur litigation, corporate legal work, judiciary exams jaise options hain. College mein training & placement cell hai ([+91 93294 70964](tel:+919329470964), tpocec@gmail.com), lekin law students ke placement figures abhi publish nahi hue. CCSC first year se free Banking aur PSC coaching bhi deta hai."),
  events: (lang) => say(lang,
    "Teaching includes moot court training, case law analysis, seminars, legal research and writing, a legal aid clinic and legal literacy camps. The first batch's induction, **Vidyarambh 2024**, was held on 18 September 2024 at the Swami Vivekanand Auditorium with Shri Nirmal Minz, Retd. Principal Judge, as Chief Guest. Photos are on [Student life](gallery.html).",
    "Padhai mein moot court training, case law analysis, seminars, legal research aur writing, legal aid clinic aur legal literacy camps shaamil hain. Pehle batch ka induction **Vidyarambh 2024** 18 September 2024 ko Swami Vivekanand Auditorium mein hua tha, Chief Guest the Shri Nirmal Minz, Retd. Principal Judge. Photos: [Student life](gallery.html)."),
  dates: (lang) => say(lang,
    `Admissions for 2026-27 are open now. Exact dates, deadlines and exam schedules aren't published here, so please confirm with the admission cell on ${PHONE} or ${MAIL}.`,
    `2026-27 ke admissions abhi open hain. Exact dates, last date ya exam schedule yahan publish nahi hai, iske liye admission cell se confirm kijiye: ${PHONE} ya ${MAIL}.`),
  contact: (lang) => say(lang,
    `- Admission cell: ${PHONE}, ${MAIL} (Monday to Saturday)\n- General enquiry: [+91 77460 99992](tel:+917746099992), [info@cecbilaspur.ac.in](mailto:info@cecbilaspur.ac.in)\n- Address: Chouksey Group of Colleges, Lalkhadan, Masturi Road, NH-49, Bilaspur, Chhattisgarh 495004\n\nCall ahead and someone from the department will show you around. Map: [Contact](contact.html).`,
    `- Admission cell: ${PHONE}, ${MAIL} (Monday se Saturday)\n- General enquiry: [+91 77460 99992](tel:+917746099992), [info@cecbilaspur.ac.in](mailto:info@cecbilaspur.ac.in)\n- Pata: Chouksey Group of Colleges, Lalkhadan, Masturi Road, NH-49, Bilaspur, Chhattisgarh 495004\n\nPehle call kar lijiye, department se koi aapko campus dikha dega. Map: [Contact](contact.html).`)
};

function unknownReply(lang) {
  return say(lang,
    `I'm not sure I have that detail. I can help with programmes, fees, eligibility, admission steps, faculty, approvals and campus life, so feel free to ask about any of those. For anything else, the admission cell can help on ${PHONE} or ${MAIL}.`,
    `Ye jaankari mere paas nahi hai. Main courses, fees, eligibility, admission process, faculty, approvals aur campus life ke baare mein bata sakta hoon, inmein se kuch bhi poochiye. Baaki ke liye admission cell se baat kijiye: ${PHONE} ya ${MAIL}.`);
}

// ---------- main ----------
function answer(messages) {
  const users = messages.filter((m) => m.role === "user").map((m) => m.content);
  const text = users[users.length - 1];
  const prev = users.length > 1 ? users[users.length - 2] : "";
  const lang = language(text);
  const prevIntents = prev ? intentsIn(prev) : [];
  let intents = intentsIn(text);
  let progs = programmesIn(text);
  let { pct, level } = marksIn(text);

  // Answers to "tell me your percentage" ("48", "12th me 52") complete the earlier question.
  if (prevIntents.includes("eligibility") && !topical(intents).filter((i) => i !== "eligibility").length) {
    const bare = /^\s*(\d{2}(?:\.\d+)?)\s*%?\s*$/.exec(text);
    if (pct === null && bare) pct = Number(bare[1]);
    if (pct !== null || level) {
      const before = marksIn(prev);
      if (pct === null) pct = before.pct;
      if (!level) level = before.level;
      if (!progs.length) progs = programmesIn(prev);
    }
  }
  if (pct !== null && !intents.includes("eligibility")) intents.unshift("eligibility");

  // Follow-ups such as "and for LLB?" or "kitni?" reuse the topic of the previous question.
  if (!intents.length && prev && (progs.length || text.trim().split(/\s+/).length <= 4)) {
    intents = topical(prevIntents);
    if (!progs.length) progs = programmesIn(prev);
  }
  // A programme name on its own ("BA LLB?") means "tell me about it".
  if (!topical(intents).length && progs.length && !intents.includes("ack") && !intents.includes("thanks")) intents.push("programmes");

  if (intents.includes("legal")) return REPLIES.legal(lang);
  if (intents.includes("difference") && progs.length !== 1) {
    intents = ["difference"].concat(intents.filter((i) => i !== "difference" && i !== "programmes" && i !== "subjects"));
  } else {
    intents = intents.filter((i) => i !== "difference");
  }
  const drop = (cond, names) => { if (intents.includes(cond)) intents = intents.filter((i) => !names.includes(i)); };
  drop("eligibility", ["programmes", "dates", "apply"]);
  drop("fees", ["programmes"]);
  drop("subjects", ["programmes"]);
  drop("apply", ["documents", "dates"]);
  drop("faculty", ["subjects"]);
  drop("loan", ["fees"]);

  const parts = topical(intents).slice(0, 2).map((i) => {
    if (i === "fees") return feesReply(lang, progs);
    if (i === "eligibility") return eligibilityReply(lang, pct, level, progs);
    if (i === "programmes") return programmesReply(lang, progs);
    if (i === "subjects") return subjectsReply(lang, progs);
    if (i === "faculty") return facultyReply(lang, text);
    return REPLIES[i](lang);
  });

  if (!parts.length) {
    for (const s of ["howareyou", "thanks", "bye", "greeting", "ack"]) if (intents.includes(s)) return REPLIES[s](lang);
    return unknownReply(lang);
  }
  if (intents.includes("greeting")) parts.unshift(say(lang, "Hello!", "Namaste!"));
  return parts.join("\n\n");
}

module.exports = { answer };