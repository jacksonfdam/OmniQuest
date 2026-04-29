/* ============================================================
   state.js — progression & persistence
   ============================================================ */
(function (global) {
  "use strict";

  var KEY = "dgq:state:v2";

  function emptyState() {
    return {
      level: 1,
      xp: 0,
      completedLevels: {},
      streakPerfect: 0,
      codex: { chaptersRead: {}, booksCompleted: {} },
      achievements: {}
    };
  }

  var INT = global.OQ_INT || {
    pack: function (o) { return JSON.stringify(o); },
    unpack: function (s) { try { return JSON.parse(s); } catch (e) { return null; } },
    validate: function (s) { return s; }
  };

  var _state = null;
  var listeners = [];

  function load() {
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { raw = null; }
    var parsed = raw ? INT.unpack(raw) : null;
    var validated = parsed ? INT.validate(parsed) : null;
    _state = validated || emptyState();
    return _state;
  }

  function persist() {
    try { localStorage.setItem(KEY, INT.pack(_state)); } catch (e) { /* quota */ }
  }

  function emit() { for (var i = 0; i < listeners.length; i++) try { listeners[i](_state); } catch (e) {} }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  function get() { if (!_state) load(); return _state; }
  function reset() { _state = emptyState(); persist(); emit(); }

  function update(fn) {
    if (!_state) load();
    var next = fn(_state) || _state;
    _state = next;
    var cleaned = INT.validate(_state) || emptyState();
    _state = cleaned;
    persist();
    emit();
    return _state;
  }

  function recordQuiz(levelId, result) {
    update(function (s) {
      var key = String(levelId);
      var prev = s.completedLevels[key] || { bestPoints: 0, attempts: 0, correct: 0, total: 0, stars: 0 };
      var beatBest = result.points > (prev.bestPoints || 0);
      s.completedLevels[key] = {
        stars: Math.max(prev.stars || 0, result.stars),
        points: result.points,
        bestPoints: Math.max(prev.bestPoints || 0, result.points),
        attempts: (prev.attempts || 0) + 1,
        correct:  (prev.correct  || 0) + (result.correct || 0),
        total:    (prev.total    || 0) + (result.total   || 0),
        lastPlayed: Date.now()
      };
      // perfect streak
      if (result.stars === 5) s.streakPerfect = (s.streakPerfect || 0) + 1;
      else s.streakPerfect = 0;
      // XP only on personal best beat
      if (beatBest) s.xp = (s.xp || 0) + result.points;
      // unlock next level if completed and stars >= 3
      if (result.stars >= 3 && Number(levelId) === s.level && s.level < 12) {
        s.level = s.level + 1;
      }
      return s;
    });
  }

  function recordChapter(bookId, chapterIdx, totalChapters) {
    update(function (s) {
      var arr = (s.codex.chaptersRead[bookId] || []).slice();
      if (arr.indexOf(chapterIdx) < 0) {
        arr.push(chapterIdx);
        s.codex.chaptersRead[bookId] = arr;
        s.xp = (s.xp || 0) + 25;
        if (arr.length >= totalChapters && !s.codex.booksCompleted[bookId]) {
          s.codex.booksCompleted[bookId] = Date.now();
          s.xp += 100;
        }
      }
      return s;
    });
  }

  function unlockAchievement(id) {
    var s = get();
    if (s.achievements[id]) return false;
    update(function (st) { st.achievements[id] = Date.now(); return st; });
    return true;
  }

  global.OQ_STATE = {
    KEY: KEY,
    load: load,
    get: get,
    reset: reset,
    update: update,
    subscribe: subscribe,
    recordQuiz: recordQuiz,
    recordChapter: recordChapter,
    unlockAchievement: unlockAchievement
  };
})(window);
