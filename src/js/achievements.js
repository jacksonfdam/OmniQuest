/* ============================================================
   achievements.js — catalog, criteria, toast notifications
   ============================================================ */
(function (global) {
  "use strict";

  var STATE = global.OQ_STATE;

  function totalStars(s) {
    var n = 0;
    var keys = Object.keys(s.completedLevels);
    for (var i = 0; i < keys.length; i++) n += (s.completedLevels[keys[i]].stars || 0);
    return n;
  }
  function levelsAtStars(s, starsMin) {
    var n = 0;
    var keys = Object.keys(s.completedLevels);
    for (var i = 0; i < keys.length; i++) if ((s.completedLevels[keys[i]].stars || 0) >= starsMin) n++;
    return n;
  }
  function chaptersReadCount(s) {
    var n = 0;
    var keys = Object.keys(s.codex.chaptersRead);
    for (var i = 0; i < keys.length; i++) n += (s.codex.chaptersRead[keys[i]] || []).length;
    return n;
  }
  function booksDoneCount(s) {
    return Object.keys(s.codex.booksCompleted).length;
  }

  var CATALOG = [
    { id: "first_step",   icon: "🛡️", title: "Primeira Conquista",       desc: "Complete o nível 1.",
      criterion: function (s) { return !!s.completedLevels["1"]; } },
    { id: "halfway",      icon: "🗺️", title: "No Meio do Caminho",        desc: "Conclua até o nível 6.",
      criterion: function (s) { return s.level >= 7; } },
    { id: "master",       icon: "👑", title: "Mestre da Jornada",          desc: "Conclua todos os 12 níveis.",
      criterion: function (s) { return Object.keys(s.completedLevels).length >= 12; } },
    { id: "perfect",      icon: "✨", title: "Acerto em Cheio",            desc: "Tire 5 de 5 em qualquer nível.",
      criterion: function (s) { return levelsAtStars(s, 5) >= 1; } },
    { id: "streak3",      icon: "🔥", title: "Sequência Perfeita",         desc: "3 perfectos seguidos.",
      criterion: function (s) { return (s.streakPerfect || 0) >= 3; } },
    { id: "stargazer",    icon: "🌟", title: "Caçador de Estrelas",        desc: "Acumule 25 estrelas.",
      criterion: function (s) { return totalStars(s) >= 25; } },
    { id: "constellation",icon: "💫", title: "Constelação",                desc: "Acumule 40 estrelas.",
      criterion: function (s) { return totalStars(s) >= 40; } },
    { id: "bookworm",     icon: "📖", title: "Rato de Biblioteca",         desc: "Leia 5 capítulos no Codex.",
      criterion: function (s) { return chaptersReadCount(s) >= 5; } },
    { id: "scholar",      icon: "🎓", title: "Erudito",                    desc: "Conclua um livro inteiro.",
      criterion: function (s) { return booksDoneCount(s) >= 1; } },
    { id: "library",      icon: "📚", title: "Biblioteca Pessoal",         desc: "Conclua 3 livros.",
      criterion: function (s) { return booksDoneCount(s) >= 3; } },
    { id: "polyglot",     icon: "🗣️", title: "Poliglota",                  desc: "Abra o glossário trilíngue.",
      criterion: function (s) { return !!(s.codex.chaptersRead["glossario_trilingue"] || []).length; } },
    { id: "xp_1k",        icon: "⚡", title: "Mil de XP",                  desc: "Acumule 1000 XP.",
      criterion: function (s) { return (s.xp || 0) >= 1000; } },
    { id: "xp_5k",        icon: "🌌", title: "Lenda do XP",                desc: "Acumule 5000 XP.",
      criterion: function (s) { return (s.xp || 0) >= 5000; } }
  ];

  function evaluate() {
    if (!STATE) return [];
    var s = STATE.get();
    var unlocked = [];
    for (var i = 0; i < CATALOG.length; i++) {
      var a = CATALOG[i];
      if (!s.achievements[a.id] && a.criterion(s)) {
        if (STATE.unlockAchievement(a.id)) unlocked.push(a);
      }
    }
    return unlocked;
  }

  function spawnToasts(list) {
    if (!list || !list.length) return;
    var stack = document.getElementById("ach-stack");
    if (!stack) return;
    list.forEach(function (a, idx) {
      setTimeout(function () { renderToast(stack, a); }, idx * 700);
    });
  }

  function renderToast(stack, a) {
    var el = document.createElement("div");
    el.className = "ach-toast";
    el.setAttribute("role", "status");
    el.innerHTML =
      '<div class="ach-toast__icon">' + a.icon + "</div>" +
      '<div>' +
        '<div class="ach-toast__eyebrow">Conquista desbloqueada</div>' +
        '<div class="ach-toast__title">' + a.title + "</div>" +
        '<div class="ach-toast__desc">'  + a.desc  + "</div>" +
      "</div>";
    var dismiss = function () {
      el.classList.add("is-out");
      setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 350);
    };
    el.addEventListener("click", dismiss);
    stack.appendChild(el);
    setTimeout(dismiss, 4800);
  }

  function evaluateAndNotify() { spawnToasts(evaluate()); }

  global.OQ_ACH = {
    catalog: CATALOG,
    evaluate: evaluate,
    evaluateAndNotify: evaluateAndNotify
  };
})(window);
