# Department of Law - Chouksey Group of Colleges (front-end prototype)

A student-built front-end prototype for the **Department of Law, Chouksey College of Science & Commerce**, Lalkhadan, Bilaspur (C.G.). Plain HTML, CSS and JavaScript. No framework, no build step is needed to view it.

## Pages

| Page | What it covers |
|---|---|
| `index.html` | Home: hero, programmes at a glance, faculty, Vidyarambh induction, library, gallery preview |
| `department.html` | About the department, approvals, teaching method, faculty |
| `programmes.html` | BA LLB, B.Com LLB, LLB: duration, intake, eligibility, fees |
| `admissions.html` | Fee table, eligibility checker, steps, documents, online registration links |
| `gallery.html` | Filterable photo gallery with lightbox |
| `contact.html` | Admission, enquiry and placement contacts, map |

## Run it

Open `index.html` in any browser. It also works as-is on GitHub Pages (Settings > Pages > Deploy from branch `main`, folder `/root`).

## Edit and rebuild

Page content lives in `src/pages/`, shared header, footer and CTA in `src/partials/`. After editing, regenerate the root HTML files:

```
node tools/build.mjs
```

Each page in `src/pages/` starts with metadata comments (`<!-- title: ... -->`, `<!-- desc: ... -->`, optional `<!-- nav: file.html -->`). `<!-- @cta -->` inserts the admissions call-to-action band.

`tools/crop-photos.ps1` crops the event photos out of the original social-media posters in `assets/img/law/originals/`.

## Structure

```
assets/
  css/site.css        all styles
  js/site.js          nav, reveals, eligibility checker, gallery lightbox
  fonts/              self-hosted Libre Caslon and Libre Franklin
  img/brand/          college logo and emblem favicons
  img/law/            law department event photos
  img/campus/         library and campus photos
  docs/               BCI, university and AICTE approval PDFs
src/
  pages/              page bodies
  partials/           head, header, cta, footer
tools/
  build.mjs           page assembler
  crop-photos.ps1     photo cropping
```

## Sources and credits

The logo, photographs, approval documents and factual content (programmes, intake, fees, faculty, library, contacts) are taken from the official college website, https://cecbilaspur.ac.in/, and belong to Chouksey Group of Colleges. This is a non-official prototype made for presentation.

Notes on content that is not verbatim from the college site:

- Subject lists on the programmes page are indicative; the official syllabus is set by Atal Bihari Vajpayee Vishwavidyalaya.
- The home page pull quote and the department vision line are paraphrased from site text.
- Gallery captions, admission steps and the document checklist are written for the prototype.

## Law Desk (AI assistant)

Every page has a "Ask Law Desk" button (bottom right). It answers visitors' questions about programmes, fees, eligibility, admission and campus life in English, Hindi or Hinglish, using only the information published by the college.

- `assets/js/assistant.js` - the chat widget (no dependencies)
- `api/chat.js` - Vercel serverless function that calls Groq (`openai/gpt-oss-120b`, falls back to `openai/gpt-oss-20b` when rate-limited)
- `api/_knowledge.js` - the assistant's instructions and the college facts it answers from. Edit this file to update what it knows.

The Groq key is never shipped to the browser. Set it once in Vercel: Project > Settings > Environment Variables > `GROQ_API_KEY`, then redeploy.

Local preview with the assistant working:

```
echo GROQ_API_KEY=your_key > .env.local
node tools/serve.mjs        # http://localhost:3000
```

Opening the HTML files directly (file://) shows the site, but the assistant needs the server.