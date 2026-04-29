/* ============================================================
   fx.js — CRT presets, glitch transitions, noise overlay
   ============================================================ */
(function (global) {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 7 presets, weighted
  var PRESETS = [
    { name: "pristine",   weight: 8,  vars: { "--crt-scan-opacity":"0.04","--crt-vignette":"0.32","--crt-flicker":"0.97","--crt-aberration":"0.3px","--crt-saturate":"1.02","--crt-grain-opacity":"0.02" } },
    { name: "soft",       weight: 16, vars: { "--crt-scan-opacity":"0.07","--crt-vignette":"0.42","--crt-flicker":"0.96","--crt-aberration":"0.4px","--crt-saturate":"1.04","--crt-grain-opacity":"0.04" } },
    { name: "standard_a", weight: 22, vars: { "--crt-scan-opacity":"0.10","--crt-vignette":"0.55","--crt-flicker":"0.94","--crt-aberration":"0.6px","--crt-saturate":"1.06","--crt-grain-opacity":"0.05" } },
    { name: "standard_b", weight: 22, vars: { "--crt-scan-opacity":"0.12","--crt-vignette":"0.58","--crt-flicker":"0.94","--crt-aberration":"0.7px","--crt-saturate":"1.07","--crt-grain-opacity":"0.06" } },
    { name: "crunchy",    weight: 14, vars: { "--crt-scan-opacity":"0.16","--crt-vignette":"0.68","--crt-flicker":"0.92","--crt-aberration":"1.0px","--crt-saturate":"1.10","--crt-grain-opacity":"0.08" } },
    { name: "arcade",     weight: 10, vars: { "--crt-scan-opacity":"0.18","--crt-vignette":"0.62","--crt-flicker":"0.90","--crt-aberration":"1.4px","--crt-saturate":"1.18","--crt-grain-opacity":"0.10" } },
    { name: "badSignal",  weight: 4,  vars: { "--crt-scan-opacity":"0.22","--crt-vignette":"0.78","--crt-flicker":"0.86","--crt-aberration":"1.8px","--crt-saturate":"1.05","--crt-grain-opacity":"0.13" } },
    { name: "midnight",   weight: 4,  vars: { "--crt-scan-opacity":"0.09","--crt-vignette":"0.82","--crt-flicker":"0.90","--crt-aberration":"0.5px","--crt-saturate":"0.96","--crt-grain-opacity":"0.05" } }
  ];

  function pickPreset() {
    var total = PRESETS.reduce(function (a, p) { return a + p.weight; }, 0);
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < PRESETS.length; i++) {
      acc += PRESETS[i].weight;
      if (r < acc) return PRESETS[i];
    }
    return PRESETS[2];
  }

  function applyPreset(p) {
    var root = document.documentElement;
    Object.keys(p.vars).forEach(function (k) { root.style.setProperty(k, p.vars[k]); });
    var app = document.getElementById("app");
    if (app) app.dataset.fx = p.name;
  }

  function init() {
    if (REDUCED) {
      applyPreset(PRESETS[0]);
      return;
    }
    applyPreset(pickPreset());
  }

  function glitch(target, ms) {
    if (REDUCED) return;
    var el = (typeof target === "string") ? document.querySelector(target) : target;
    if (!el) return;
    el.classList.add("is-glitching");
    setTimeout(function () { el.classList.remove("is-glitching"); }, ms || 600);
  }

  function noise(ms) {
    if (REDUCED) return;
    var d = document.createElement("div");
    d.style.cssText = [
      "position:fixed","inset:0","pointer-events:none","z-index:9100",
      "background-image:radial-gradient(rgba(255,0,80,.08) 1px,transparent 1px),radial-gradient(rgba(0,255,200,.07) 1px,transparent 1px),radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px)",
      "background-size:5px 5px, 7px 7px, 3px 3px",
      "background-position:0 0, 2px 3px, 1px 0",
      "mix-blend-mode:screen","opacity:.8"
    ].join(";");
    document.body.appendChild(d);
    setTimeout(function () { d.parentNode && d.parentNode.removeChild(d); }, ms || 350);
  }

  function setAccent(color, color2) {
    var root = document.documentElement;
    if (color)  root.style.setProperty("--accent", color);
    if (color2) root.style.setProperty("--accent-2", color2);
  }

  global.OQ_FX = { init: init, glitch: glitch, noise: noise, setAccent: setAccent, presets: PRESETS };
})(window);
