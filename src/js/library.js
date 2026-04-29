/* ============================================================
   library.js — Codex catalog (areas / books) + chapter loader
   ============================================================ */
(function (global) {
  "use strict";

  var AREAS = [
    {
      id: "numerica", name: "Reino Numérico", color: "#7dd3fc",
      tagline: "Frações, decimais e porcentagens em ação.",
      books: [
        { id: "fracoes_brawl",   title: "Frações no Brawl",           tagline: "Vitórias, HP e munição em frações.", file: "numerica/fracoes_brawl.md" },
        { id: "decimais_genshin", title: "Decimais & Primogems",       tagline: "Conversões e arredondamentos no Teyvat.", file: "numerica/decimais_genshin.md" },
        { id: "porcentagem_genshin", title: "Porcentagem em Ação",     tagline: "Descontos, aumentos e comparação justa.", file: "numerica/porcentagem_genshin.md" },
        { id: "operacoes_fracoes", title: "Operações com Frações",     tagline: "Soma, subtração, multiplicação e divisão.", file: "numerica/operacoes_fracoes.md" },
        { id: "mdc_euclides",      title: "MDC pelo Algoritmo de Euclides", tagline: "Simplificar com confiança.", file: "numerica/mdc_euclides.md" }
      ]
    },
    {
      id: "geometria", name: "Geometria do Mundo", color: "#86EFAC",
      tagline: "Áreas, volumes, formas que você usa.",
      books: [
        { id: "geometria_genshin", title: "Mapas, Mondstadt e Áreas", tagline: "Geometria pelos mapas.", file: "geometria/geometria_genshin.md" },
        { id: "simetria_sohma",    title: "Simetria do Zodíaco",      tagline: "Simetrias e escala no Sohma House.", file: "geometria/simetria_sohma.md" }
      ]
    },
    {
      id: "velocidade", name: "Velocidade & Esporte", color: "#fde68a",
      tagline: "Tempo, distância e ritmo do Blue Lock.",
      books: [
        { id: "blue_lock_velocidade", title: "Blue Lock Hastighet", tagline: "Triângulo mágico v=s/t.", file: "velocidade/blue_lock_velocidade.md" }
      ]
    },
    {
      id: "estatistica", name: "Estatística do Cotidiano", color: "#fca5a5",
      tagline: "Médias, medianas e o que dizem.",
      books: [
        { id: "media_mediana", title: "Média & Mediana — Tohru explica", tagline: "Cozinhar, contar e comparar.", file: "estatistica/media_mediana.md" }
      ]
    },
    {
      id: "calculo", name: "Cálculo do Dia-a-Dia", color: "#fdba74",
      tagline: "Multiplicação, divisão e o sistema posicional.",
      books: [
        { id: "multiplicacao_divisao", title: "Tabuada Inteligente & Divisão",  tagline: "Truques que economizam tempo.", file: "calculo/multiplicacao_divisao.md" },
        { id: "sistema_posicional",    title: "Posição Faz Toda a Diferença", tagline: "Unidades, dezenas, centenas, milhares.", file: "calculo/sistema_posicional.md" }
      ]
    },
    {
      id: "glossario", name: "Glossário Trilíngue", color: "#a78bfa",
      tagline: "Termos PT/EN/SV que aparecem na escola.",
      books: [
        { id: "glossario_trilingue", title: "PT · EN · SV — Termos da Escola", tagline: "Bråk, decimaltal, hastighet & mais.", file: "glossario/glossario_trilingue.md" }
      ]
    }
  ];

  var cache = {};

  function getBook(bookId) {
    for (var i = 0; i < AREAS.length; i++) {
      for (var j = 0; j < AREAS[i].books.length; j++) {
        if (AREAS[i].books[j].id === bookId) {
          return { area: AREAS[i], book: AREAS[i].books[j] };
        }
      }
    }
    return null;
  }

  function loadBook(bookId) {
    var ref = getBook(bookId);
    if (!ref) return Promise.reject(new Error("book not found: " + bookId));
    if (cache[bookId]) return Promise.resolve(cache[bookId]);
    return fetch("assets/library/" + ref.book.file)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (md) {
        var chapters = global.OQ_MD.splitChapters(md);
        cache[bookId] = { ref: ref, raw: md, chapters: chapters };
        return cache[bookId];
      });
  }

  function listAreas() { return AREAS; }

  global.OQ_LIB = {
    areas: AREAS,
    listAreas: listAreas,
    getBook: getBook,
    loadBook: loadBook
  };
})(window);
