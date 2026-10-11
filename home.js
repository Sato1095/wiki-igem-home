/* ==========================================================================
   Aeth3r home page behaviour: stat cards, the explore gallery and the
   scroll reveals. Small and dependency-free; the page is fully readable
   without it.
   ========================================================================== */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    var home = document.querySelector(".hm");
    if (!home) return;

    /* ---------------------------------------------- stat cards: dot grids */
    home.querySelectorAll(".hm-dots").forEach(function (grid) {
      var filled = parseInt(grid.dataset.filled, 10) || 0;
      var frag = document.createDocumentFragment();
      for (var i = 0; i < 100; i++) {
        var dot = document.createElement("i");
        if (i < filled) dot.className = "on";
        frag.appendChild(dot);
      }
      grid.appendChild(frag);
    });

    /* ------------------------------------------------- stat cards: flip */
    home.querySelectorAll(".hm-flip").forEach(function (card) {
      card.addEventListener("click", function () {
        var open = card.getAttribute("aria-pressed") === "true";
        card.setAttribute("aria-pressed", String(!open));
      });
    });

    /* ------------------------------------------------- explore gallery */
    var hero = document.getElementById("gallery-hero");
    var title = document.getElementById("gallery-title");
    var link = document.getElementById("gallery-readmore");
    var tiles = Array.prototype.slice.call(home.querySelectorAll(".hm-tile"));

    if (hero && tiles.length) {
      var first = home.querySelector(".hm-tile.is-active") || tiles[0];
      hero.style.backgroundImage = "url('" + first.dataset.bg + "')";

      /* preload so switching tiles does not flash */
      tiles.forEach(function (t) { new Image().src = t.dataset.bg; });

      var select = function (tile) {
        hero.style.backgroundImage = "url('" + tile.dataset.bg + "')";
        title.textContent = tile.dataset.title;
        link.setAttribute("href", tile.dataset.link);
        link.textContent = "Read more about " + tile.dataset.title;
        tiles.forEach(function (t) {
          var on = t === tile;
          t.classList.toggle("is-active", on);
          t.setAttribute("aria-selected", String(on));
        });
      };

      tiles.forEach(function (tile, i) {
        tile.addEventListener("click", function () { select(tile); });
        tile.addEventListener("keydown", function (e) {
          var next = null;
          if (e.key === "ArrowRight") next = tiles[(i + 1) % tiles.length];
          else if (e.key === "ArrowLeft") next = tiles[(i - 1 + tiles.length) % tiles.length];
          if (next) { e.preventDefault(); next.focus(); select(next); }
        });
      });

      select(first);
    }

    /* ------------------------------------------------- reveal on scroll */
    var targets = Array.prototype.slice.call(
      home.querySelectorAll(".hm-shaping-item, .hm-flip, .hm-band-title, .hm-band-lead")
    );

    if (!("IntersectionObserver" in window) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    targets.forEach(function (el) { el.classList.add("hm-reveal"); });

    var show = function (el, delay) {
      setTimeout(function () { el.classList.add("is-in"); }, delay || 0);
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var peers = Array.prototype.slice.call(entry.target.parentNode.children);
        show(entry.target, Math.min(peers.indexOf(entry.target), 4) * 130);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    /* Failsafe: a reveal that never fires would hide real content, so after a
       few seconds anything still waiting is shown regardless. */
    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-in")) { io.unobserve(el); show(el); }
      });
    }, 4000);
  });
})();
