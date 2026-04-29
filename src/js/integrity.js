/* ============================================================
   integrity.js — XOR + FNV-1a localStorage wrapper
   ============================================================ */
(function (global) {
  "use strict";

  // baked-in salt; rotated per release
  var SALT = "OQ_2026_a8c1f6e3d97b04e2";

  function fnv1a(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  function xor(input, key) {
    var out = "";
    for (var i = 0; i < input.length; i++) {
      out += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return out;
  }

  // Use TextEncoder/Decoder to handle multi-byte safely round-trip
  function b64encode(s) {
    try {
      return btoa(unescape(encodeURIComponent(s)));
    } catch (e) {
      return "";
    }
  }
  function b64decode(s) {
    try {
      return decodeURIComponent(escape(atob(s)));
    } catch (e) {
      return "";
    }
  }

  function pack(obj) {
    var json = JSON.stringify(obj);
    var sum = fnv1a(json + SALT);
    var payload = sum + "|" + json;
    return b64encode(xor(payload, SALT));
  }

  function unpack(s) {
    if (typeof s !== "string" || !s) return null;
    var dec = xor(b64decode(s), SALT);
    var pipe = dec.indexOf("|");
    if (pipe < 0) return null;
    var sum = dec.slice(0, pipe);
    var json = dec.slice(pipe + 1);
    if (sum !== fnv1a(json + SALT)) return null;
    try { return JSON.parse(json); } catch (e) { return null; }
  }

  function clamp(v, min, max, fb) {
    if (typeof v !== "number" || !isFinite(v)) return fb;
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  function validate(state) {
    if (!state || typeof state !== "object") return null;
    var s = {};
    s.level = clamp(Math.floor(state.level), 1, 12, 1);
    s.xp    = clamp(Math.floor(state.xp), 0, 9_999_999, 0);
    s.streakPerfect = clamp(Math.floor(state.streakPerfect), 0, 999, 0);

    s.completedLevels = {};
    var cl = state.completedLevels || {};
    var levelKeys = Object.keys(cl).slice(0, 20);
    for (var i = 0; i < levelKeys.length; i++) {
      var k = levelKeys[i];
      var ent = cl[k] || {};
      s.completedLevels[k] = {
        stars:      clamp(Math.floor(ent.stars), 0, 5, 0),
        points:     clamp(Math.floor(ent.points), 0, 500, 0),
        bestPoints: clamp(Math.floor(ent.bestPoints), 0, 500, 0),
        attempts:   clamp(Math.floor(ent.attempts), 0, 9999, 0),
        correct:    clamp(Math.floor(ent.correct), 0, 9999, 0),
        total:      clamp(Math.floor(ent.total), 0, 9999, 0),
        lastPlayed: clamp(Number(ent.lastPlayed), 0, 9_999_999_999_999, 0)
      };
    }

    var cdx = state.codex || {};
    s.codex = {
      chaptersRead:   {},
      booksCompleted: {}
    };
    var cr = cdx.chaptersRead || {};
    var crKeys = Object.keys(cr).slice(0, 60);
    for (var j = 0; j < crKeys.length; j++) {
      var bk = crKeys[j];
      if (!Array.isArray(cr[bk])) continue;
      var arr = cr[bk].slice(0, 50).map(function (n) {
        return clamp(Math.floor(n), 0, 99, 0);
      });
      // dedupe
      var seen = {};
      var dedup = [];
      for (var n = 0; n < arr.length; n++) if (!seen[arr[n]]) { seen[arr[n]] = 1; dedup.push(arr[n]); }
      s.codex.chaptersRead[bk] = dedup;
    }
    var bc = cdx.booksCompleted || {};
    var bcKeys = Object.keys(bc).slice(0, 60);
    for (var p = 0; p < bcKeys.length; p++) {
      var bb = bcKeys[p];
      s.codex.booksCompleted[bb] = clamp(Number(bc[bb]), 0, 9_999_999_999_999, 0);
    }

    s.achievements = {};
    var ach = state.achievements || {};
    var ak = Object.keys(ach).slice(0, 60);
    for (var q = 0; q < ak.length; q++) {
      s.achievements[ak[q]] = clamp(Number(ach[ak[q]]), 0, 9_999_999_999_999, 0);
    }

    return s;
  }

  global.OQ_INT = { pack: pack, unpack: unpack, validate: validate };
})(window);
