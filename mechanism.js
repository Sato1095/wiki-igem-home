/* ==========================================================================
   Aeth3r — "How it works": targeted protein degradation, animated.

   Drives the inline SVG in the home page's .mech-section. The markup renders
   a readable static diagram on its own; this file turns it into a timeline.

   Stage is a 1200 x 620 viewBox. The story runs left to right:
     POI  ->  POI + peptide  ->  ternary complex  ->  polyUb chain  ->  26S
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var root = document.getElementById("mech");
    if (!root || root.dataset.ready === "1") return;
    root.dataset.ready = "1";

    var $ = function (id) { return document.getElementById("mech-" + id); };
    var NS = "http://www.w3.org/2000/svg";
    var reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ---------------------------------------------------------------- maths */
    var clamp = function (t, lo, hi) {
      if (lo === undefined) lo = 0;
      if (hi === undefined) hi = 1;
      return t < lo ? lo : (t > hi ? hi : t);
    };
    var lerp = function (a, b, t) { return a + (b - a) * t; };
    var seg = function (p, a, b) { return clamp((p - a) / (b - a)); };
    var easeInOut = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
    var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
    var easeOutBack = function (t) {
      var c = 1.25;
      return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
    };

    var place = function (el, x, y, s, rot) {
      var t = "translate(" + x.toFixed(2) + " " + y.toFixed(2) + ")";
      if (rot) t += " rotate(" + rot.toFixed(2) + ")";
      if (s !== undefined && s !== 1) t += " scale(" + s.toFixed(4) + ")";
      el.setAttribute("transform", t);
    };
    var fade = function (el, v) { if (el) el.style.opacity = clamp(v); };

    /* --------------------------------------------------------------- script */
    var PHASES = [
      {
        key: "Target",
        dur: 3000,
        desc: "Inside the tumor cell a protein of interest (POI) keeps cancer " +
              "growth going. Rather than trying to block it, Aeth3r sets out to " +
              "remove it altogether."
      },
      {
        key: "Engage",
        dur: 3200,
        desc: "A short bifunctional peptide — the peptide PROTAC — grips the POI " +
              "with one of its two binding ends."
      },
      {
        key: "Recruit",
        dur: 3400,
        desc: "The peptide's other end captures an E3 ubiquitin ligase, the enzyme " +
              "that marks proteins for disposal. POI, peptide and ligase are now " +
              "locked into one ternary complex."
      },
      {
        key: "Tag",
        dur: 4800,
        desc: "Held side by side, an E2 enzyme transfers ubiquitin onto a lysine of " +
              "the POI. Round after round this builds a K48-linked polyubiquitin " +
              "chain — the cell's own “destroy this” label."
      },
      {
        key: "Degrade",
        dur: 5600,
        desc: "The 26S proteasome reads the chain, unfolds the POI and cuts it into " +
              "short peptides. The peptide PROTAC is released intact and moves on " +
              "to the next copy of the target."
      }
    ];

    var TOTAL = 0, STARTS = [];
    PHASES.forEach(function (ph) { STARTS.push(TOTAL); TOTAL += ph.dur; });

    /* -------------------------------------------------------- stage anchors */
    var POI_ENTER = { x: 600, y: 350 };
    var POI_DOCK  = { x: 430, y: 350 };
    var PROTAC_D  = { x: 575, y: 350 };
    var E3_DOCK   = { x: 748, y: 340 };
    var E2_DOCK   = { x: 792, y: 218 };
    var PROTE     = { x: 872, y: 340 };
    var MOUTH_X   = PROTE.x - 152;          /* left opening of the 19S cap */
    var LYS       = { x: 66, y: -56 };      /* lysine, in POI-local units   */

    /* ubiquitin beads, offset from the lysine; the chain arcs up and over */
    var UB_N = 6;
    var UB_AT = [
      { x: 26, y: -34 }, { x: 56, y: -58 }, { x: 72, y: -96 },
      { x: 66, y: -140 }, { x: 38, y: -172 }, { x: 2, y: -192 }
    ];

    /* ------------------------------------------------------------- elements */
    var svg        = $("svg");
    var world      = $("world");
    var poi        = $("poi");
    var poiLab     = $("poiLab");
    var lys        = $("lys");
    var strand     = $("strand");
    var protac     = $("protac");
    var protacLab  = $("protacLab");
    var e3         = $("e3");
    var e3Lab      = $("e3Lab");
    var e2         = $("e2");
    var e2ub       = $("e2ub");
    var beam       = $("beam");
    var halo       = $("halo");
    var chainG     = $("chain");
    var bondP      = $("bond");
    var prote      = $("proteasome");
    var debrisG    = $("debris");
    var ambG       = $("amb");
    var readout    = $("readout");
    var live       = $("live");

    if (!svg || !world || !poi) return;

    /* ------------------------------------------------- generated sub-pieces */
    var UB = [];
    for (var i = 0; i < UB_N; i++) {
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "mech-ub");
      g.innerHTML =
        '<circle r="17" fill="url(#mech-gUb)" stroke="#f7f8ec" stroke-width="1.6"/>' +
        '<circle cx="-5" cy="-6" r="5.5" fill="#ffffff" opacity=".45"/>' +
        '<text class="mech-tag mech-tag-sm" y="5" font-size="13" fill="#2c3410">Ub</text>';
      g.style.opacity = 0;
      chainG.appendChild(g);
      UB.push(g);
    }

    var DEBRIS = [];
    for (var d = 0; d < 9; d++) {
      var r = document.createElementNS(NS, "rect");
      var w = 11 + Math.random() * 14;
      r.setAttribute("width", w);
      r.setAttribute("height", 7);
      r.setAttribute("rx", 3.5);
      r.setAttribute("fill", "#2a3157");
      r.style.opacity = 0;
      debrisG.appendChild(r);
      DEBRIS.push({ el: r, dy: (Math.random() - 0.5) * 120, dx: 48 + Math.random() * 92, rot: (Math.random() - 0.5) * 50 });
    }

    var AMB = [];
    for (var a = 0; a < 26; a++) {
      var c = document.createElementNS(NS, "circle");
      var rad = 1.5 + Math.random() * 3.6;
      c.setAttribute("r", rad);
      c.setAttribute("fill", Math.random() > 0.5 ? "#848dc6" : "#b6c7d8");
      c.setAttribute("opacity", (0.05 + Math.random() * 0.1).toFixed(3));
      ambG.appendChild(c);
      AMB.push({
        el: c,
        x: Math.random() * 1240 - 20,
        y: 40 + Math.random() * 540,
        sp: 0.1 + Math.random() * 0.3,
        ph: Math.random() * 6.283,
        amp: 6 + Math.random() * 20
      });
    }

    /* ----------------------------------------------------------- step track */
    var track = $("track");
    var steps = PHASES.map(function (ph, idx) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mech-step";
      b.setAttribute("aria-label", "Step " + (idx + 1) + " of 5: " + ph.key);
      b.innerHTML =
        '<span class="mech-rail"><span class="mech-fill"></span></span>' +
        '<span class="mech-step-lab"><b>' + String(idx + 1).padStart(2, "0") + '</b>' +
        '<span>' + ph.key + '</span></span>';
      b.addEventListener("click", function () { goTo(idx, true); });
      track.appendChild(b);
      return b;
    });
    var fills = steps.map(function (b) { return b.querySelector(".mech-fill"); });

    var chips = Array.prototype.slice.call(root.querySelectorAll(".mech-chip"));

    /* ----------------------------------------------------------- draw frame */
    var lastReadout = "";

    function setReadout(text) {
      if (text === lastReadout) return;
      lastReadout = text;
      if (text) {
        readout.textContent = text;
        readout.classList.add("is-on");
      } else {
        readout.classList.remove("is-on");
      }
    }

    function locate(E) {
      var acc = 0;
      for (var i = 0; i < PHASES.length; i++) {
        if (E < acc + PHASES[i].dur) return { idx: i, p: (E - acc) / PHASES[i].dur };
        acc += PHASES[i].dur;
      }
      return { idx: PHASES.length - 1, p: 1 };
    }

    function render(E, idx, p) {
      var breathe = motion ? Math.sin(E / 900) : 0;
      var sway = motion ? Math.sin(E / 1250) : 0;

      /* everything off; each phase switches on what it needs */
      fade(poi, 0); fade(protac, 0); fade(e3, 0); fade(e2, 0); fade(prote, 0);
      fade(halo, 0); fade(beam, 0); fade(strand, 0); fade(bondP, 0);
      fade(poiLab, 0); fade(protacLab, 0); fade(e3Lab, 0);
      UB.forEach(function (u) { u.style.opacity = 0; });
      DEBRIS.forEach(function (f) { f.el.style.opacity = 0; });

      AMB.forEach(function (o) {
        o.x += o.sp;
        if (o.x > 1220) o.x = -20;
        o.el.setAttribute("cx", o.x.toFixed(1));
        o.el.setAttribute("cy", (o.y + (motion ? Math.sin(E / 1000 * o.sp + o.ph) * o.amp : 0)).toFixed(1));
      });

      var px = POI_DOCK.x, py = POI_DOCK.y, pscale = 1;
      var text = "";

      /* ---------------------------------------------------- 1 . TARGET ---- */
      if (idx === 0) {
        px = POI_ENTER.x;
        py = POI_ENTER.y + breathe * 7;
        pscale = 1 + (motion ? Math.sin(E / 620) * 0.014 : 0);
        fade(poi, easeOut(seg(p, 0, 0.3)));
        fade(poiLab, easeOut(seg(p, 0.22, 0.58)));
      }

      /* ---------------------------------------------------- 2 . ENGAGE ---- */
      if (idx === 1) {
        var slide = easeInOut(seg(p, 0, 0.66));
        px = lerp(POI_ENTER.x, POI_DOCK.x, slide);
        py = POI_DOCK.y + breathe * 6;
        fade(poi, 1);
        fade(poiLab, 1 - easeOut(seg(p, 0, 0.25)));

        var fly = easeInOut(seg(p, 0.06, 0.74));
        var snap = Math.sin(seg(p, 0.74, 0.92) * Math.PI) * 0.055;
        fade(protac, easeOut(seg(p, 0.06, 0.3)));
        place(protac,
          lerp(170, PROTAC_D.x, fly),
          lerp(505, PROTAC_D.y, fly),
          1 + snap,
          lerp(-24, 0, fly));
        fade(protacLab, easeOut(seg(p, 0.62, 0.88)));
        if (p > 0.76) text = "peptide PROTAC bound";
      }

      /* --------------------------------------------------- 3 . RECRUIT ---- */
      if (idx === 2) {
        py = POI_DOCK.y + breathe * 3;
        fade(poi, 1);
        fade(protac, 1);
        place(protac, PROTAC_D.x, PROTAC_D.y, 1, 0);
        fade(protacLab, 1 - easeOut(seg(p, 0.1, 0.4)));

        var come = easeInOut(seg(p, 0, 0.64));
        fade(e3, easeOut(seg(p, 0, 0.26)));
        place(e3, lerp(1370, E3_DOCK.x, come), lerp(300, E3_DOCK.y, come) + sway * 3, 1, 0);
        fade(e3Lab, easeOut(seg(p, 0.52, 0.8)));

        var ring = Math.sin(seg(p, 0.62, 1) * Math.PI);
        fade(halo, ring * 0.85);
        halo.setAttribute("stroke-dashoffset", (-E / 26).toFixed(1));
        if (p > 0.66) text = "ternary complex";
      }

      /* ------------------------------------------------------- 4 . TAG ---- */
      var shown = 0, partial = 0;
      if (idx === 3) {
        fade(poi, 1); fade(protac, 1); fade(e3, 1);
        place(protac, PROTAC_D.x, PROTAC_D.y, 1, 0);
        place(e3, E3_DOCK.x, E3_DOCK.y + sway * 3, 1, 0);
        fade(e2, easeOut(seg(p, 0, 0.18)));

        var reveal = clamp(p / 0.86) * UB_N;
        shown = Math.floor(reveal + 1e-6);
        partial = reveal - shown;
        var dip = Math.sin(clamp(partial) * Math.PI);

        var tip = UB_AT[Math.min(UB_N - 1, shown)];
        var tipX = px + LYS.x + tip.x;
        var tipY = py + LYS.y + tip.y;

        var ex = lerp(E2_DOCK.x, tipX + 56, dip * 0.58);
        var ey = lerp(E2_DOCK.y + (motion ? Math.sin(E / 700) * 4 : 0), tipY + 44, dip * 0.58);
        place(e2, ex, ey, 1, 0);
        fade(e2ub, 1 - dip * 0.95);

        beam.setAttribute("x1", (ex + 22).toFixed(1));
        beam.setAttribute("y1", (ey - 34).toFixed(1));
        beam.setAttribute("x2", tipX.toFixed(1));
        beam.setAttribute("y2", tipY.toFixed(1));
        beam.setAttribute("stroke-dashoffset", (-E / 14).toFixed(1));
        fade(beam, dip * 0.6);

        shown = reveal;                                 /* fractional, for draw */
        text = "K48 polyUb chain ×" + Math.min(UB_N, Math.round(reveal));
      }
      if (idx > 3) shown = UB_N;

      /* --------------------------------------------------- 5 . DEGRADE ---- */
      var unfold = 0, stripFade = 0;
      if (idx === 4) {
        var enter = easeInOut(seg(p, 0, 0.26));
        fade(prote, easeOut(seg(p, 0, 0.18)));
        place(prote, lerp(1430, PROTE.x, enter), PROTE.y, 1, 0);

        /* E2 lets go first */
        var e2go = easeInOut(seg(p, 0, 0.18));
        fade(e2, 1 - easeOut(seg(p, 0, 0.16)));
        place(e2, E2_DOCK.x + e2go * 34, E2_DOCK.y - e2go * 70, lerp(1, 0.8, e2go), 0);

        /* then the ligase */
        var e3go = easeInOut(seg(p, 0.04, 0.32));
        fade(e3, 1 - easeOut(seg(p, 0.06, 0.34)));
        place(e3, lerp(E3_DOCK.x, 862, e3go), lerp(E3_DOCK.y, 470, e3go), lerp(1, 0.7, e3go), 0);

        /* the peptide comes off intact and drifts away to be reused */
        var pgo = easeInOut(seg(p, 0.1, 0.42));
        fade(protac, 1 - easeOut(seg(p, 0.16, 0.46)));
        place(protac, lerp(PROTAC_D.x, 360, pgo), lerp(PROTAC_D.y, 140, pgo), lerp(1, 0.78, pgo), lerp(0, -30, pgo));

        /* the tagged POI is hauled to the proteasome */
        var travel = easeInOut(seg(p, 0.28, 0.62));
        px = lerp(POI_DOCK.x, MOUTH_X - 150, travel);
        py = POI_DOCK.y;
        fade(poi, 1 - easeOut(seg(p, 0.8, 0.95)));

        /* the chain is stripped back off before the protein goes in */
        stripFade = seg(p, 0.44, 0.66);
        shown = lerp(UB_N, 0, easeOut(stripFade));

        /* unfolded and threaded through the cap */
        unfold = easeOut(seg(p, 0.54, 0.82));
        var thread = easeInOut(seg(p, 0.60, 0.92));
        pscale = lerp(1, 0.06, thread);

        /* the POI is pulled apart into one long chain and reeled into the pore */
        var sx = px + 62 * pscale;
        var ex = MOUTH_X + 8;
        if (unfold > 0.02 && ex > sx + 10) {
          var span = ex - sx;
          var amp = 24 * unfold * (1 - thread * 0.55);
          var d = "M " + sx.toFixed(1) + " 350";
          for (var w = 1; w <= 4; w++) {
            d += " Q " + (sx + span * ((w - 0.5) / 4)).toFixed(1) + " " +
                 (350 + (w % 2 ? -amp : amp)).toFixed(1) + " " +
                 (sx + span * (w / 4)).toFixed(1) + " 350";
          }
          strand.setAttribute("d", d);
          fade(strand, Math.min(1, unfold * 1.7) * (1 - easeOut(seg(p, 0.88, 0.99))));
        }

        /* peptide fragments leave by the far cap */
        var emit = seg(p, 0.66, 1);
        DEBRIS.forEach(function (f, j) {
          var e = clamp(emit * 7 - j * 0.75);
          if (e <= 0) return;
          var fx = PROTE.x + 152 + easeOut(e) * f.dx;
          var fy = PROTE.y + f.dy * easeOut(e);
          f.el.setAttribute("x", fx.toFixed(1));
          f.el.setAttribute("y", (fy - 3.5).toFixed(1));
          f.el.setAttribute("transform", "rotate(" + (f.rot * e).toFixed(1) + " " + fx.toFixed(1) + " " + fy.toFixed(1) + ")");
          f.el.style.opacity = (e < 0.65 ? e / 0.65 : Math.max(0, 1 - (e - 0.65) * 1.9)) * 0.9;
        });

        if (p > 0.84) text = "target degraded";
        else if (p > 0.16) text = "peptide PROTAC recycles ↻";
      }

      /* ------------------------------------------------------- commit POI -- */
      place(poi, px, py, pscale, 0);
      fade(lys, idx >= 3 ? 1 : (idx === 2 ? seg(p, 0.6, 1) * 0.6 : 0));

      /* --------------------------------------------------- the polyUb chain */
      if (shown > 0.001) {
        var ax = px + LYS.x * pscale;
        var ay = py + LYS.y * pscale;
        var d = "M " + ax.toFixed(1) + " " + ay.toFixed(1);
        fade(bondP, clamp(shown));

        for (var k = 0; k < UB_N; k++) {
          var local = clamp(shown - k);
          if (local <= 0) { UB[k].style.opacity = 0; continue; }
          var sc = (idx === 3) ? lerp(0.25, 1, easeOutBack(local)) : 1;
          var bx = ax + UB_AT[k].x * pscale;
          var by = ay + UB_AT[k].y * pscale;
          place(UB[k], bx, by, sc * pscale, 0);
          UB[k].style.opacity = clamp(local * 1.7);
          if (local > 0.35) d += " L " + bx.toFixed(1) + " " + by.toFixed(1);
        }
        bondP.setAttribute("d", d);
      }

      setReadout(text);
    }

    /* ----------------------------------------------------------- chrome UI */
    function paintUI(idx, p) {
      steps.forEach(function (b, i) {
        b.classList.toggle("is-active", i === idx);
        b.classList.toggle("is-done", i < idx);
        b.setAttribute("aria-current", i === idx ? "step" : "false");
        fills[i].style.width = (i < idx ? 100 : (i === idx ? p * 100 : 0)).toFixed(1) + "%";
      });
      chips.forEach(function (c) {
        var on = (c.dataset.phases || "").indexOf(String(idx + 1)) !== -1;
        c.classList.toggle("is-on", on);
      });
      if (shownIdx !== idx) {
        shownIdx = idx;
        $("capNum").textContent = String(idx + 1).padStart(2, "0") + " / 05";
        $("capTitle").textContent = PHASES[idx].key;
        $("capDesc").textContent = PHASES[idx].desc;
        svg.setAttribute("aria-label",
          "Step " + (idx + 1) + " of 5, " + PHASES[idx].key + ". " + PHASES[idx].desc);
        if (live) live.textContent = "Step " + (idx + 1) + " of 5: " + PHASES[idx].key + ". " + PHASES[idx].desc;
      }
    }

    /* -------------------------------------------------------------- engine */
    var motion = !reduceQuery.matches;
    var playing = motion;
    /* resting frames: when nothing is going to animate we show the end of a
       step rather than its first frame, which is deliberately empty. */
    var clock = motion ? 520 : restAt(0);
    var fadeIn = 1;
    var last = performance.now();
    var shownIdx = -1;
    var inView = true;

    var ICON_PLAY  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5h3.5v14H6.5zM14 5h3.5v14H14z"/></svg>';
    var playBtn = $("play");

    function syncPlay() {
      playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      playBtn.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
      playBtn.setAttribute("aria-pressed", String(playing));
    }

    function restAt(idx) { return STARTS[idx] + PHASES[idx].dur * 0.86; }

    function goTo(idx, play) {
      var willRun = motion && (play || playing);
      clock = willRun ? STARTS[idx] : restAt(idx);
      fadeIn = 0;
      if (play && motion) { playing = true; syncPlay(); }
    }

    function step(delta) {
      var idx = locate(clock % TOTAL).idx;
      goTo((idx + delta + PHASES.length) % PHASES.length, true);
    }

    playBtn.addEventListener("click", function () {
      playing = !playing;
      if (playing && !motion) motion = true;   /* an explicit press wins */
      syncPlay();
    });
    $("prev").addEventListener("click", function () { step(-1); });
    $("next").addEventListener("click", function () { step(1); });
    $("restart").addEventListener("click", function () { goTo(0, true); });

    root.addEventListener("keydown", function (e) {
      if (e.target.closest("button, a, input, select, textarea")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    });

    /* On a phone the full 1200-wide canvas renders the molecules far too small,
       so we crop to the part of the stage the action actually uses. Objects
       entering from off-stage simply appear a little sooner. */
    var narrow = window.matchMedia("(max-width: 760px)");
    var fitView = function () {
      svg.setAttribute("viewBox", narrow.matches ? "332 56 756 452" : "0 0 1200 560");
    };
    fitView();
    if (narrow.addEventListener) narrow.addEventListener("change", fitView);
    else if (narrow.addListener) narrow.addListener(fitView);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
      }, { threshold: 0.12 }).observe(root);
    }

    var onMotionChange = function () {
      motion = !reduceQuery.matches;
      if (!motion) { playing = false; clock = restAt(locate(clock % TOTAL).idx); syncPlay(); }
    };
    if (reduceQuery.addEventListener) reduceQuery.addEventListener("change", onMotionChange);
    else if (reduceQuery.addListener) reduceQuery.addListener(onMotionChange);

    function frame(now) {
      var dt = Math.min(64, now - last);
      last = now;
      if (playing && inView && !document.hidden) clock += dt;
      if (fadeIn < 1) fadeIn = clamp(fadeIn + dt / 320);

      var E = clock % TOTAL;
      var loopEdge = clock < TOTAL ? Math.min(1, (TOTAL - E) / 420)
                                   : Math.min(1, E / 420, (TOTAL - E) / 420);
      world.style.opacity = lerp(0.2, 1, Math.min(fadeIn, playing ? loopEdge : 1));

      var at = locate(E);
      render(E, at.idx, at.p);
      paintUI(at.idx, at.p);
      requestAnimationFrame(frame);
    }

    syncPlay();
    var boot = locate(clock);
    render(clock, boot.idx, boot.p);
    paintUI(boot.idx, boot.p);
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
