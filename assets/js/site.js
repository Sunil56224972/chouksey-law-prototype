/* Department of Law prototype - small, dependency-free behaviours. */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  /* Mobile navigation */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 981px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* Compact masthead once the page scrolls */
  var masthead = document.querySelector(".masthead");
  if (masthead) {
    var onScroll = function () { masthead.classList.toggle("is-stuck", window.scrollY > 40); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* Scroll reveals */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* Eligibility checker (rules as published on cecbilaspur.ac.in) */
  var checker = document.getElementById("checker");
  if (checker) {
    var range = checker.querySelector("#marks");
    var out = checker.querySelector("#marks-out");
    var summary = document.getElementById("checker-summary");
    var rows = document.querySelectorAll("[data-prog]");
    var rules = {
      "ba-llb": { level: "12", min: 45 },
      "bcom-llb": { level: "12", min: 45 },
      "llb": { level: "grad", min: 50 }
    };
    var update = function () {
      var level = checker.querySelector("input[name=level]:checked").value;
      var marks = Number(range.value);
      out.value = marks + "%";
      var okCount = 0;
      rows.forEach(function (row) {
        var rule = rules[row.getAttribute("data-prog")];
        // A graduate also holds a 10+2, so the integrated courses stay open to them.
        var levelOk = rule.level === "12" ? true : level === "grad";
        var ok = levelOk && marks >= rule.min;
        var reason = !levelOk ? "Requires a completed graduation" : (marks >= rule.min ? "Meets the minimum of " + rule.min + "%" : "Minimum required is " + rule.min + "%");
        row.classList.toggle("is-ok", ok);
        row.classList.toggle("is-no", !ok);
        row.querySelector(".mark").textContent = ok ? "\u2713" : "\u2013";
        row.querySelector(".state").textContent = ok ? "Eligible" : "Not yet";
        row.querySelector("small").textContent = reason;
        if (ok) okCount++;
      });
      summary.textContent = okCount === 0
        ? "None of the programmes match these marks yet. Speak to the admission cell about reserved-category relaxations, if any."
        : "You appear eligible for " + okCount + " of 3 programmes. Final eligibility is confirmed by the admission cell.";
    };
    checker.addEventListener("input", update);
    update();
  }

  /* Gallery filters + lightbox */
  var gallery = document.querySelector(".gallery");
  if (gallery) {
    var figures = Array.prototype.slice.call(gallery.querySelectorAll("figure"));
    document.querySelectorAll(".filters button").forEach(function (btn, _, all) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        all.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        figures.forEach(function (fig) {
          fig.hidden = !(f === "all" || fig.getAttribute("data-cat") === f);
        });
      });
    });

    var box = document.getElementById("lightbox");
    if (box && typeof box.showModal === "function") {
      var img = box.querySelector("img");
      var cap = box.querySelector(".lb-cap");
      var count = box.querySelector(".lb-count");
      var current = 0;
      var visible = function () { return figures.filter(function (f) { return !f.hidden; }); };
      var show = function (i) {
        var list = visible();
        current = (i + list.length) % list.length;
        var fig = list[current];
        var src = fig.querySelector("img");
        img.src = src.getAttribute("src");
        img.alt = src.getAttribute("alt");
        cap.textContent = fig.querySelector("figcaption").textContent;
        count.textContent = (current + 1) + " / " + list.length;
      };
      gallery.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        show(visible().indexOf(btn.closest("figure")));
        box.showModal();
      });
      box.querySelector(".lb-prev").addEventListener("click", function () { show(current - 1); });
      box.querySelector(".lb-next").addEventListener("click", function () { show(current + 1); });
      box.querySelector(".lb-close").addEventListener("click", function () { box.close(); });
      box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("lightbox__inner")) box.close(); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") show(current - 1);
        if (e.key === "ArrowRight") show(current + 1);
      });
    }
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
