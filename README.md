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