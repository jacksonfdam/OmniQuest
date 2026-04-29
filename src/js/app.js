/* ============================================================
   app.js — views, modals, toast, quiz flow, init
   ============================================================ */
(function () {
  "use strict";

  // boot guard: anti-tamper or dom missing
  if (window.__DG_TAMPER) return;

  var DATA  = window.OQ_DATA;
  var STATE = window.OQ_STATE;
  var ACH   = window.OQ_ACH;
  var FX    = window.OQ_FX;
  var QUIZ  = window.OQ_QUIZ;
  var MAP   = window.OQ_MAP;
  var LIB   = window.OQ_LIB;
  var MD    = window.OQ_MD;
  var SP    = window.OQ_SPLASH;

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // ---------- HUD ----------
  function refreshHUD() {
    var s = STATE.get();
    var lv = $("#stat-lv"); if (lv) lv.textContent = String(s.level);
    var xp = $("#stat-xp"); if (xp) xp.textContent = String(s.xp);
    var st = 0;
    var keys = Object.keys(s.completedLevels);
    for (var i = 0; i < keys.length; i++) st += (s.completedLevels[keys[i]].stars || 0);
    var stEl = $("#stat-st"); if (stEl) stEl.textContent = String(st);
  }

  // ---------- Routing ----------
  var ROUTES = ["map", "codex", "about", "credits"];
  var currentRoute = "map";

  function go(route) {
    if (ROUTES.indexOf(route) < 0) route = "map";
    if (route === currentRoute) return;
    var prev = $("#view-" + currentRoute);
    var next = $("#view-" + route);
    if (prev) prev.classList.add("is-hidden");
    if (next) next.classList.remove("is-hidden");
    currentRoute = route;
    if (FX) FX.glitch("#view-" + route, 600);

    if (route === "map") MAP && MAP.render($("#map"));
    if (route === "codex") renderCodex();
    if (route === "about") renderAbout();
    if (route === "credits") renderCredits();
  }

  // ---------- Modal ----------
  function modal(html, opts) {
    opts = opts || {};
    var root = $("#modal-root");
    if (!root) return;
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.innerHTML =
      '<div class="modal__panel" role="dialog" aria-modal="true">' +
        (opts.noClose ? "" : '<button class="modal__close" aria-label="Fechar">✕</button>') +
        html +
      '</div>';
    root.appendChild(wrap);
    var close = function () {
      wrap.parentNode && wrap.parentNode.removeChild(wrap);
      if (typeof opts.onClose === "function") opts.onClose();
    };
    var x = wrap.querySelector(".modal__close");
    if (x) x.addEventListener("click", close);
    wrap.addEventListener("click", function (e) {
      if (e.target === wrap && !opts.persistent) close();
    });
    return { el: wrap, close: close };
  }

  // ---------- Quiz flow ----------
  function startLevel(levelId) {
    var lvl = DATA.levels.find(function (l) { return l.id === levelId; });
    if (!lvl) return;
    var s = STATE.get();
    if (lvl.id > s.level) {
      modal('<h2>Nível bloqueado</h2><p>Termine o nível atual para liberar este.</p>');
      return;
    }
    FX && FX.setAccent(lvl.color, lvl.color2);

    var bullets = lvl.knowledge.bullets.map(function (b) { return "<li>" + b + "</li>"; }).join("");
    var html =
      '<h2>' + lvl.icon + " " + lvl.name + "</h2>" +
      '<p><b>' + lvl.knowledge.title + "</b></p>" +
      '<p>' + lvl.knowledge.body + '</p>' +
      '<ul class="modal__bullets">' + bullets + '</ul>' +
      '<div class="modal__cta">' +
        '<button class="btn btn--primary" data-act="start">Estou pronto — 5 perguntas</button>' +
        '<button class="btn" data-act="cancel">Voltar</button>' +
      '</div>';

    var m = modal(html);
    m.el.querySelector('[data-act="cancel"]').addEventListener("click", m.close);
    m.el.querySelector('[data-act="start"]').addEventListener("click", function () {
      m.close();
      runQuiz(lvl);
    });
  }

  function runQuiz(lvl) {
    var session = QUIZ.build(lvl.id);
    var i = 0;

    function step() {
      if (i >= session.questions.length) return finishQuiz(session);
      var q = session.questions[i];
      var optsHTML = q.options.map(function (o, idx) {
        return '<button class="quiz__opt" data-idx="' + idx + '" type="button">' + o + '</button>';
      }).join("");
      var html =
        '<div class="quiz">' +
          '<div class="quiz__hdr"><span>' + lvl.icon + " " + lvl.name + "</span><span>" + (i + 1) + " / " + session.questions.length + "</span></div>" +
          '<div class="quiz__q">' + q.q + '</div>' +
          '<div>' + optsHTML + '</div>' +
        '</div>';
      var m = modal(html, { persistent: true });
      var btns = m.el.querySelectorAll(".quiz__opt");
      btns.forEach(function (b) {
        b.addEventListener("click", function () {
          var idx = Number(b.dataset.idx);
          var ok = idx === q.correct;
          if (ok) { session.correct++; session.points += 100; }
          for (var k = 0; k < btns.length; k++) {
            btns[k].disabled = true;
            if (Number(btns[k].dataset.idx) === q.correct) btns[k].classList.add("is-correct");
            if (Number(btns[k].dataset.idx) === idx && !ok) btns[k].classList.add("is-wrong");
          }
          var fb = document.createElement("div");
          fb.className = "quiz__feedback " + (ok ? "is-success" : "is-error");
          fb.innerHTML = (ok ? "✅ <b>Correto!</b> " : "❌ <b>Quase!</b> ") + q.rationale;
          m.el.querySelector(".quiz").appendChild(fb);
          var nx = document.createElement("button");
          nx.className = "btn btn--primary";
          nx.style.marginTop = "10px";
          nx.textContent = (i === session.questions.length - 1) ? "Ver resultado" : "Próxima";
          nx.addEventListener("click", function () { m.close(); i++; step(); });
          m.el.querySelector(".quiz").appendChild(nx);
        });
      });
    }

    step();
  }

  function finishQuiz(session) {
    var lvl = session.level;
    var stars = QUIZ.starsFor(session.correct);
    var prev = STATE.get().completedLevels[String(lvl.id)] || { bestPoints: 0 };
    var beatBest = session.points > (prev.bestPoints || 0);

    STATE.recordQuiz(lvl.id, {
      stars: stars,
      points: session.points,
      correct: session.correct,
      total: session.questions.length
    });

    var s = STATE.get();
    var html =
      '<h2>Resultado — ' + lvl.name + '</h2>' +
      '<div class="score">' +
        '<div class="score__stars">' + "★".repeat(stars) + "☆".repeat(5 - stars) + '</div>' +
        '<div class="score__pts">' + session.points + ' pts</div>' +
        '<div class="score__badge">' + QUIZ.badge(session.correct) + '</div>' +
        (beatBest ? '<div class="score__xp">+' + session.points + ' XP</div>' : '<div class="score__xp" style="opacity:.6">XP só ao bater seu recorde</div>') +
      '</div>' +
      '<div class="modal__cta" style="justify-content:center">' +
        '<button class="btn btn--primary" data-act="back">Voltar ao mapa</button>' +
        '<button class="btn" data-act="retry">Tentar de novo</button>' +
      '</div>';

    var m = modal(html);
    m.el.querySelector('[data-act="back"]').addEventListener("click", function () {
      m.close();
      go("map");
      if (FX) FX.glitch("#view-map", 600);
      ACH && ACH.evaluateAndNotify();
      refreshHUD();
    });
    m.el.querySelector('[data-act="retry"]').addEventListener("click", function () {
      m.close(); runQuiz(lvl); refreshHUD();
    });
  }

  // ---------- Codex ----------
  var codexTab = "areas";

  function renderCodex() {
    var root = $("#codex");
    if (!root) return;
    var s = STATE.get();
    var tabsHTML =
      '<div class="codex__tabs">' +
        '<button data-tab="areas"   class="' + (codexTab === "areas"   ? "is-on" : "") + '">📚 Coleções</button>' +
        '<button data-tab="history" class="' + (codexTab === "history" ? "is-on" : "") + '">📜 Histórico</button>' +
      '</div>';

    if (codexTab === "areas") {
      var grid = LIB.areas.map(function (area) {
        var totalCh = area.books.reduce(function (a, b) { return a + 3; }, 0);
        var readCh = area.books.reduce(function (a, b) {
          return a + ((s.codex.chaptersRead[b.id] || []).length);
        }, 0);
        var booksDone = area.books.filter(function (b) { return s.codex.booksCompleted[b.id]; }).length;
        var pct = totalCh ? Math.round(readCh / totalCh * 100) : 0;
        return '<a class="area-card" href="#" data-area="' + area.id + '" style="--accent:' + area.color + ';--accent-2:' + area.color + ';">' +
          '<div class="area-card__name">' + area.name + '</div>' +
          '<div class="area-card__meta">' + area.tagline + '</div>' +
          '<div class="area-card__meta">📖 ' + booksDone + "/" + area.books.length + ' livros · ' + readCh + "/" + totalCh + ' capítulos</div>' +
          '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
        '</a>';
      }).join("");
      root.innerHTML = '<h2>Codex — Aprenda a mais</h2>' + tabsHTML + '<div class="area-grid" style="margin-top:12px">' + grid + '</div>';
      $$('a.area-card', root).forEach(function (a) {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          openArea(a.dataset.area);
        });
      });
    } else {
      var rows = [];
      Object.keys(s.codex.chaptersRead).forEach(function (bookId) {
        var ref = LIB.getBook(bookId); if (!ref) return;
        rows.push({ bookId: bookId, title: ref.book.title, when: s.codex.booksCompleted[bookId] || 0 });
      });
      Object.keys(s.codex.booksCompleted).forEach(function (bk) {
        var ref = LIB.getBook(bk); if (!ref) return;
        rows.push({ bookId: bk, title: "✓ " + ref.book.title + " concluído", when: s.codex.booksCompleted[bk] });
      });
      rows.sort(function (a, b) { return (b.when || 0) - (a.when || 0); });
      var html = rows.length ? rows.map(function (r) {
        var d = r.when ? new Date(r.when) : null;
        return '<div class="history__row"><span>' + r.title + '</span><time>' + (d ? d.toLocaleDateString() : "—") + '</time></div>';
      }).join("") : '<p style="color:var(--ink-3)">Nada lido ainda. Abra um livro!</p>';
      root.innerHTML = '<h2>Codex — Histórico</h2>' + tabsHTML + '<div class="history" style="margin-top:12px">' + html + '</div>';
    }

    $$('.codex__tabs button', root).forEach(function (b) {
      b.addEventListener("click", function () { codexTab = b.dataset.tab; renderCodex(); });
    });
  }

  function openArea(areaId) {
    var area = LIB.areas.find(function (a) { return a.id === areaId; });
    if (!area) return;
    var s = STATE.get();
    FX && FX.setAccent(area.color, area.color);
    var html = '<h2>' + area.name + '</h2><p>' + area.tagline + '</p><div class="book-list">' +
      area.books.map(function (b) {
        var read = (s.codex.chaptersRead[b.id] || []).length;
        return '<a class="book-card" href="#" data-book="' + b.id + '">' +
          '<div><h3>' + b.title + '</h3><p>' + b.tagline + '</p></div>' +
          '<div style="align-self:center;color:var(--ink-3);font-size:12px">' + read + ' / 3 caps</div>' +
        '</a>';
      }).join("") + '</div>';
    var m = modal(html);
    $$('a.book-card', m.el).forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        m.close();
        openBook(a.dataset.book);
      });
    });
  }

  function openBook(bookId) {
    LIB.loadBook(bookId).then(function (loaded) {
      var s = STATE.get();
      var read = (s.codex.chaptersRead[bookId] || []).slice();
      // pick next unread chapter, else first
      var idx = 0;
      for (var k = 0; k < loaded.chapters.length; k++) {
        if (read.indexOf(k) < 0) { idx = k; break; }
      }
      openChapter(loaded, idx);
    }).catch(function () {
      modal('<h2>Conteúdo indisponível</h2><p>Não conseguimos carregar este livro agora. Tente de novo em instantes.</p>');
    });
  }

  function openChapter(loaded, idx) {
    if (idx >= loaded.chapters.length) {
      modal('<h2>Você terminou ' + loaded.ref.book.title + '!</h2><p>+100 XP de bônus por concluir o livro.</p>');
      return;
    }
    var ch = loaded.chapters[idx];
    var bodyHTML = MD.render(ch.body);
    var html =
      '<h2>' + (ch.title || loaded.ref.book.title) + '</h2>' +
      '<div class="chapter__progress" aria-hidden="true"><i id="chProg"></i></div>' +
      '<div class="chapter__body" id="chBody">' + bodyHTML + '</div>' +
      '<div class="chapter__nav">' +
        '<button class="btn" data-act="close">Fechar</button>' +
        '<button class="btn btn--primary" data-act="mark" disabled>Marcar como lido</button>' +
      '</div>';
    var m = modal(html, { persistent: true });
    var panel = m.el.querySelector(".modal__panel");
    var prog  = m.el.querySelector("#chProg");
    var btn   = m.el.querySelector('[data-act="mark"]');
    var unlocked = false;
    var startTime = Date.now();
    var unlock = function () {
      if (unlocked) return;
      unlocked = true;
      btn.disabled = false;
    };
    setTimeout(unlock, 2500);
    panel.addEventListener("scroll", function () {
      var ratio = (panel.scrollTop + panel.clientHeight) / panel.scrollHeight;
      ratio = Math.max(0, Math.min(1, ratio));
      prog.style.width = (ratio * 100) + "%";
      if (ratio >= 0.8) unlock();
    });
    m.el.querySelector('[data-act="close"]').addEventListener("click", m.close);
    btn.addEventListener("click", function () {
      STATE.recordChapter(loaded.ref.book.id, idx, loaded.chapters.length);
      ACH && ACH.evaluateAndNotify();
      refreshHUD();
      m.close();
      // auto-advance
      openChapter(loaded, idx + 1);
    });
  }

  // ---------- About ----------
  function renderAbout() {
    var root = $("#about");
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>O que é o OmniQuest?</h2>' +
        '<p>Um modelo de jogo educacional gamificado. Aqui ele veio recheado de matemática básica em PT/SV — frações, decimais, porcentagem, velocidade, geometria e estatística — com temas de Brawl Stars, Genshin, Fruits Basket e Blue Lock.</p></div>' +

      '<div class="card"><h2>Como funcionam os níveis</h2>' +
        '<p>Cada nó do mapa é um nível. Você lê um conceito-chave e responde 5 questões aleatórias.</p>' +
        '<ul><li>5 acertos → 5★ + Perfect Run</li>' +
        '<li>4 acertos → 4★ + Great</li>' +
        '<li>3 acertos → 3★ + desbloqueio do próximo</li>' +
        '<li>Cada acerto vale 100 pts; XP só conta quando você bate seu recorde.</li></ul></div>' +

      '<div class="card"><h2>Como funciona o Codex</h2>' +
        '<p>Coleções de livros curtos com 3 capítulos cada. Para liberar o "Marcar como lido" você precisa rolar até 80% ou esperar 2,5s. Cada capítulo dá 25 XP; livro completo dá +100 XP.</p></div>' +

      '<div class="card"><h2>Privacidade & dados</h2>' +
        '<p>Todo o progresso fica no seu próprio aparelho (localStorage). Nada é enviado a servidores. Você pode resetar quando quiser na página de Créditos.</p></div>' +

      '<div class="card"><h2>Dicas & easter eggs</h2>' +
        '<ul><li>Toque na splash para pular.</li>' +
        '<li>Sequência de 3 perfectos libera "Sequência Perfeita".</li>' +
        '<li>Termos suecos espalhados pelos textos: bråk, hastighet, omkrets.</li>' +
        '<li>Cada cor do mapa muda quando você sobe de nível.</li></ul>' +
        '<button class="btn" id="aboutInstall" style="margin-top:8px">📲 Instalar app</button></div>';
    var b = $("#aboutInstall");
    if (b) b.addEventListener("click", function () { SP && SP.showInstall(); });
  }

  // ---------- Credits ----------
  function renderCredits() {
    var root = $("#credits");
    if (!root) return;
    root.innerHTML =
      '<div class="card"><h2>OmniQuest</h2>' +
        '<p>Modelo de jogo educacional baseado em DroidGuard Quest. Subject atual: matemática básica para a Bryannah.</p>' +
        '<p>Tutor de referência: <b>Jackson Mafra</b>.</p></div>' +

      '<div class="card"><h2>Fontes do currículo</h2>' +
        '<ul>' +
        '<li><a href="https://www.khanacademy.org/" target="_blank" rel="noopener">Khan Academy</a> — frações, decimais, porcentagens</li>' +
        '<li><a href="https://learnamic.com/" target="_blank" rel="noopener">Skolverket / Matte Direkt (referência)</a> — programa sueco anos 6–9</li>' +
        '<li><a href="https://www.bbc.co.uk/bitesize" target="_blank" rel="noopener">BBC Bitesize</a> — geometria e estatística básica</li>' +
        '</ul></div>' +

      '<div class="card"><h2>Codex (referências temáticas)</h2>' +
        '<ul>' +
        '<li>Brawl Stars — Supercell (citação de jogabilidade fictícia para exemplos)</li>' +
        '<li>Genshin Impact — HoYoverse (idem)</li>' +
        '<li>Fruits Basket — Natsuki Takaya (idem)</li>' +
        '<li>Blue Lock — Muneyuki Kaneshiro / Yusuke Nomura (idem)</li>' +
        '</ul></div>' +

      '<div class="card"><h2>Reset de progresso</h2>' +
        '<p>Limpa stars, XP, leituras e conquistas. Não dá pra desfazer.</p>' +
        '<button class="btn btn--danger" id="resetBtn">Resetar progresso</button></div>';
    var rb = $("#resetBtn");
    if (rb) rb.addEventListener("click", function () {
      var html = '<h2>Tem certeza?</h2><p>Tudo será apagado. Sem volta.</p>' +
        '<div class="modal__cta"><button class="btn btn--danger" data-act="yes">Sim, resetar</button>' +
        '<button class="btn" data-act="no">Cancelar</button></div>';
      var m = modal(html);
      m.el.querySelector('[data-act="no"]').addEventListener("click", m.close);
      m.el.querySelector('[data-act="yes"]').addEventListener("click", function () {
        STATE.reset();
        refreshHUD();
        m.close();
        go("map");
      });
    });
  }

  // ---------- Init ----------
  function bindHUD() {
    $$('[data-route]').forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        go(b.dataset.route);
      });
    });
    var map = $("#map");
    if (map) {
      map.addEventListener("click", function (e) {
        var n = e.target.closest && e.target.closest(".node");
        if (!n || n.classList.contains("is-locked")) return;
        var id = Number(n.dataset.level);
        startLevel(id);
      });
      map.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var n = e.target.closest && e.target.closest(".node");
        if (!n || n.classList.contains("is-locked")) return;
        e.preventDefault();
        startLevel(Number(n.dataset.level));
      });
    }
  }

  function init() {
    if (!$("#hud") || !$("#map")) return; // boot guard
    if (window.__DG_TAMPER) return;

    STATE.load();
    FX && FX.init();
    SP && SP.init();
    refreshHUD();
    bindHUD();
    MAP && MAP.init($("#map")).then(function () {
      ACH && ACH.evaluateAndNotify();
    });

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function () {});
      });
    }
  }

  ready(init);
})();
