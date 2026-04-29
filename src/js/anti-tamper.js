/* ============================================================
   anti-tamper.js — production-only defenses
   Skipped on localhost / 127.* / ?dev=1
   ============================================================ */
(function () {
  "use strict";

  var host = (location.hostname || "").toLowerCase();
  var local = host === "localhost" || host === "127.0.0.1" || host === "" || /\.local$/.test(host);
  var isFile = location.protocol === "file:";
  var dev = /(\?|&)dev=1\b/.test(location.search);
  if (local || isFile || dev) {
    if (dev) try { sessionStorage.setItem("oq_dev", "1"); } catch (e) {}
    return;
  }
  if ((function () { try { return sessionStorage.getItem("oq_dev") === "1"; } catch (e) { return false; } })()) return;

  var DOC = document;
  var WIN = window;

  // CSS-level guards
  try {
    var style = DOC.createElement("style");
    style.textContent = "*{user-select:none}@media print{*{display:none!important}}";
    DOC.head.appendChild(style);
  } catch (e) {}

  // Block console.* without breaking objects with .toString shenanigans
  try {
    var consoleProto = WIN.console || {};
    var noop = function () {};
    ["log","info","warn","error","debug","trace","table","group","groupEnd","groupCollapsed","time","timeEnd","timeLog","dir","dirxml","count","countReset","assert"].forEach(function (k) {
      try { Object.defineProperty(consoleProto, k, { value: noop, writable: false, configurable: false }); } catch (e) {}
    });
  } catch (e) {}

  // debugger interval trap
  try { setInterval(function () { (function () { debugger; })(); }, 1500); } catch (e) {}

  // soft DevTools heuristics — require two correlated signals
  var soft = 0;
  function softHit() { soft++; if (soft >= 2) hardLockSoft(); }

  function hardLockSoft() {
    // mild punishment: glitch the screen + close any open quiz
    try { document.documentElement.classList.add("is-glitching"); } catch (e) {}
    setTimeout(function () { try { document.documentElement.classList.remove("is-glitching"); } catch (e) {} }, 800);
  }

  // size delta
  setInterval(function () {
    var dW = (WIN.outerWidth  || 0) - (WIN.innerWidth  || 0);
    var dH = (WIN.outerHeight || 0) - (WIN.innerHeight || 0);
    if (dW > 320 || dH > 320) softHit();
  }, 1800);

  // console getter probe
  try {
    var probe = /./;
    probe.toString = function () { softHit(); return ""; };
    setInterval(function () {
      try { (0, console.log)(probe); } catch (e) {}
    }, 2200);
  } catch (e) {}

  // strong tamper signals
  function nuke(reason) {
    try { WIN.__DG_TAMPER = true; } catch (e) {}
    try {
      // seal fetch/XHR
      WIN.fetch = function () { return Promise.reject(new Error("blocked")); };
      WIN.XMLHttpRequest = function () { throw new Error("blocked"); };
    } catch (e) {}
    try {
      DOC.documentElement.innerHTML =
        '<head><meta charset="utf-8"/><title>Sessão suspensa</title></head>' +
        '<body style="background:#050608;color:#aeb6c6;font:14px system-ui;display:grid;place-items:center;height:100vh;text-align:center;padding:20px;">' +
        '<div><h1 style="color:#ff5c7a">Sessão suspensa</h1>' +
        '<p>Detectamos modificações no ambiente. Recarregue para tentar novamente.</p>' +
        '<p style="opacity:.5;font-size:11px;margin-top:18px">' + (reason || "tamper") + '</p></div></body>';
    } catch (e) {}
  }

  // Frida-style toString hooks
  try {
    var nat = Function.prototype.toString.call(Function.prototype.toString);
    if (nat.indexOf("[native code]") < 0) nuke("fnToString");
  } catch (e) { nuke("fnToString-err"); }

  // userscript globals
  try {
    if (WIN.GM_info || WIN.GM_setValue || WIN.GM_getValue || WIN.unsafeWindow) nuke("userscript");
  } catch (e) {}

  // dataset markers / extension scripts
  try {
    var scripts = DOC.querySelectorAll("script[src]");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (/^chrome-extension:\/\//.test(src) || /^moz-extension:\/\//.test(src)) { nuke("ext-script"); break; }
    }
    if (DOC.documentElement.dataset.tampered) nuke("dataset");
  } catch (e) {}

  // PrintScreen / Cmd+Shift+(3|4|5) — clear clipboard, flash veil
  function veil() {
    var el = document.getElementById("veil");
    if (!el) return;
    el.classList.remove("is-hidden");
    setTimeout(function () { el.classList.add("is-hidden"); }, 1200);
  }
  WIN.addEventListener("keydown", function (e) {
    var meta = e.metaKey || e.ctrlKey;
    if (e.key === "PrintScreen" || (meta && e.shiftKey && (e.key === "3" || e.key === "4" || e.key === "5"))) {
      try { navigator.clipboard && navigator.clipboard.writeText && navigator.clipboard.writeText(""); } catch (_e) {}
      veil();
    }
  }, true);

  // boot guard companion: app.js checks window.__DG_TAMPER
})();
