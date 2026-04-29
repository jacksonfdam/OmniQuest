/* ============================================================
   quiz.js — 5-question session builder, scoring, modal flow
   ============================================================ */
(function (global) {
  "use strict";

  var DATA   = global.OQ_DATA;
  var STATE  = global.OQ_STATE;
  var ACH    = global.OQ_ACH;
  var FX     = global.OQ_FX;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sample(pool, n) {
    var s = shuffle(pool).slice(0, Math.min(n, pool.length));
    return s.map(function (q) {
      var pairs = q.options.map(function (o, i) { return { o: o, c: i === q.correct }; });
      var sh = shuffle(pairs);
      return {
        q: q.q,
        options: sh.map(function (p) { return p.o; }),
        correct: sh.findIndex(function (p) { return p.c; }),
        rationale: q.rationale
      };
    });
  }

  function build(levelId) {
    var lvl = DATA.levels.find(function (l) { return l.id === levelId; });
    if (!lvl) return null;
    var qs = sample(lvl.questions, 5);
    return { level: lvl, questions: qs, idx: 0, correct: 0, points: 0 };
  }

  function starsFor(correct) {
    // 5/5 -> 5★, 4/5 -> 4★, 3/5 -> 3★, 2/5 -> 2★, 1/5 -> 1★, 0 -> 0★
    return correct;
  }

  function badge(correct) {
    if (correct === 5) return "Perfect Run";
    if (correct === 4) return "Great";
    if (correct === 3) return "Cleared";
    if (correct === 2) return "Almost";
    return "Try Again";
  }

  global.OQ_QUIZ = {
    build: build,
    starsFor: starsFor,
    badge: badge
  };
})(window);
