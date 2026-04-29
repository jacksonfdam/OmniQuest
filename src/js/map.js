/* ============================================================
   map.js — SVG path map renderer
   ============================================================ */
(function (global) {
  "use strict";

  var DATA  = global.OQ_DATA;
  var STATE = global.OQ_STATE;
  var FX    = global.OQ_FX;

  var ART_STYLES = ["chip-hub", "hud-tactical", "circuit"];
  var loadedArt = null; // <svg> string

  function pickArt() {
    var name = ART_STYLES[Math.floor(Math.random() * ART_STYLES.length)];
    return fetch("assets/paths/" + name + ".svg")
      .then(function (r) { return r.ok ? r.text() : ""; })
      .then(function (txt) { loadedArt = txt; return name; })
      .catch(function () { loadedArt = ""; return name; });
  }

  function star(rotation, size, isOn) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size +
      '" class="' + (isOn ? "is-on" : "") + '" style="transform:rotate(' + rotation + 'deg)" aria-hidden="true">' +
      '<path d="M12 2 L14.6 9 H22 L16 13.4 L18.2 21 L12 16.4 L5.8 21 L8 13.4 L2 9 H9.4 Z" fill="currentColor"/></svg>';
  }

  function nodeMarkup(level, status, stars, justPerfect) {
    var crown = "";
    var rotations = [-32, -16, 0, 16, 32];
    var sizes = [11, 13, 15, 13, 17]; // grow 11->17
    for (var i = 0; i < 5; i++) {
      crown += star(rotations[i], sizes[i], i < stars);
    }
    var inner;
    if (status === "done") {
      inner = '<span aria-hidden="true">' + level.icon + '</span>' +
              '<span class="node__check" aria-label="concluído">✓</span>';
    } else {
      inner = '<span aria-hidden="true">' + level.id + '</span>';
    }
    return '<div class="node ' + (status === "done" ? "is-done " : "") +
                                 (status === "current" ? "is-current " : "") +
                                 (status === "locked" ? "is-locked " : "") +
                                 (justPerfect ? "node--celebrate" : "") + '"' +
           ' data-level="' + level.id + '" role="button" tabindex="0" aria-label="' + level.name + '">' +
           '<div class="node__crown">' + crown + '</div>' +
           '<button class="node__btn" type="button">' + inner +
           (justPerfect ? '<span class="node__shock"></span>' : "") +
           '</button>' +
           '<div class="node__label">' + level.name + '</div>' +
           '<div class="node__tier">' + level.tier + '</div>' +
           '</div>';
  }

  var celebrateOnce = {};

  function render(container) {
    if (!container) return;
    var s = STATE.get();
    var levels = DATA.levels;

    // accent = current player level color
    var cur = levels[Math.min(s.level, levels.length) - 1];
    if (cur && FX) FX.setAccent(cur.color, cur.color2);

    var artHTML = loadedArt ? '<div class="map__art">' + loadedArt + '</div>' : "";
    var nodesHTML = '<div class="map__nodes">';
    for (var i = 0; i < levels.length; i++) {
      var lv = levels[i];
      var status = "locked";
      if (s.completedLevels[String(lv.id)]) status = "done";
      if (s.level === lv.id) status = "current";
      if (lv.id <= s.level && status !== "current") status = (status === "done") ? "done" : "current";
      // simpler: any level <= player.level is unlocked
      if (lv.id < s.level) status = "done";
      if (lv.id === s.level) status = "current";
      var stars = (s.completedLevels[String(lv.id)] || {}).stars || 0;
      var perfect = stars === 5;
      var justPerfect = perfect && !celebrateOnce[lv.id];
      if (justPerfect) celebrateOnce[lv.id] = true;
      nodesHTML += nodeMarkup(lv, status, stars, justPerfect);
    }
    nodesHTML += "</div>";

    container.innerHTML = artHTML + nodesHTML;

    // legend
    var legend = document.getElementById("map-legend");
    if (legend) legend.textContent = "Tier " + cur.tier + " • " + cur.name;
  }

  function init(container) {
    if (!container) return Promise.resolve();
    return pickArt().then(function () { render(container); });
  }

  global.OQ_MAP = { init: init, render: render };
})(window);
