/* ============================================================
   splash.js — intro overlay, PWA install handling
   ============================================================ */
(function (global) {
  "use strict";

  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var btn = document.getElementById("splash-install");
    var hint = document.getElementById("splash-hint");
    if (btn) btn.classList.remove("is-hidden");
    if (hint) hint.classList.add("is-hidden");
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    var btn = document.getElementById("splash-install");
    if (btn) btn.classList.add("is-hidden");
  });

  function isFirstVisit() {
    try {
      if (localStorage.getItem("oq:visited") === "1") return false;
      localStorage.setItem("oq:visited", "1");
      return true;
    } catch (e) { return true; }
  }

  function isiOS() {
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) && !window.MSStream;
  }

  function setupInstall(first) {
    var btn = document.getElementById("splash-install");
    var hint = document.getElementById("splash-hint");
    if (first) {
      if (deferredPrompt) {
        if (btn) btn.classList.remove("is-hidden");
      } else if (isiOS()) {
        if (hint) hint.classList.remove("is-hidden");
      }
    }
    if (btn) {
      btn.addEventListener("click", function () {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.finally(function () {
            deferredPrompt = null;
            btn.classList.add("is-hidden");
          });
        }
      });
    }
  }

  function dismiss() {
    var el = document.getElementById("splash");
    if (!el) return;
    el.classList.add("is-hidden");
  }

  function init() {
    var first = isFirstVisit();
    var ms = first ? 4500 : 1700;
    setupInstall(first);
    var el = document.getElementById("splash");
    if (el) el.addEventListener("click", dismiss);
    setTimeout(dismiss, ms);
  }

  function showInstall() {
    if (deferredPrompt) deferredPrompt.prompt();
    else if (isiOS()) alert("No iPhone: toque em Compartilhar ⤴ → Adicionar à Tela de Início.");
    else alert("Use o menu do navegador: 'Instalar aplicativo'.");
  }

  global.OQ_SPLASH = { init: init, dismiss: dismiss, showInstall: showInstall };
})(window);
