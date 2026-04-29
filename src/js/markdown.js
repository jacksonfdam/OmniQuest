/* ============================================================
   markdown.js — minimal Markdown -> HTML renderer
   Supports: h1-h3, paragraphs, bold/italic/code, lists, hr, links
   ============================================================ */
(function (global) {
  "use strict";

  function esc(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function inline(s) {
    s = esc(s);
    s = s.replace(/`([^`]+)`/g, function (_m, c) { return "<code>" + c + "</code>"; });
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_m, t, u) {
      var safe = /^https?:|^#|^\//.test(u) ? u : "#";
      return '<a href="' + esc(safe) + '" target="_blank" rel="noopener noreferrer">' + t + "</a>";
    });
    return s;
  }

  function render(md) {
    if (!md) return "";
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var out = [];
    var i = 0;
    var openList = null; // 'ul' | 'ol' | null

    function closeList() {
      if (openList) { out.push("</" + openList + ">"); openList = null; }
    }

    while (i < lines.length) {
      var ln = lines[i];

      if (/^\s*$/.test(ln)) { closeList(); i++; continue; }
      if (/^---+\s*$/.test(ln)) { closeList(); out.push("<hr/>"); i++; continue; }

      var h = ln.match(/^(#{1,3})\s+(.*)$/);
      if (h) { closeList(); out.push("<h" + h[1].length + ">" + inline(h[2]) + "</h" + h[1].length + ">"); i++; continue; }

      var ul = ln.match(/^[-*]\s+(.*)$/);
      if (ul) {
        if (openList !== "ul") { closeList(); out.push("<ul>"); openList = "ul"; }
        out.push("<li>" + inline(ul[1]) + "</li>");
        i++; continue;
      }
      var ol = ln.match(/^\d+\.\s+(.*)$/);
      if (ol) {
        if (openList !== "ol") { closeList(); out.push("<ol>"); openList = "ol"; }
        out.push("<li>" + inline(ol[1]) + "</li>");
        i++; continue;
      }

      // paragraph collect
      closeList();
      var buf = [ln];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|[-*]\s|\d+\.\s|---+\s*$)/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      out.push("<p>" + inline(buf.join(" ")) + "</p>");
    }
    closeList();
    return out.join("\n");
  }

  function splitChapters(md) {
    // split on H2 headings (## )
    var lines = String(md).replace(/\r\n/g, "\n").split("\n");
    var chapters = [];
    var current = null;
    for (var i = 0; i < lines.length; i++) {
      var m = lines[i].match(/^##\s+(.*)$/);
      if (m) {
        if (current) chapters.push(current);
        current = { title: m[1].trim(), body: "" };
      } else {
        if (current === null) {
          // capture lead-in (often a top-level H1) into a chapter 0
          current = { title: "", body: "" };
          // detect H1 as title
          var h1 = lines[i].match(/^#\s+(.*)$/);
          if (h1) current.title = h1[1].trim();
          else current.body += lines[i] + "\n";
          continue;
        }
        current.body += lines[i] + "\n";
      }
    }
    if (current) chapters.push(current);
    // drop empty preludes
    return chapters.filter(function (c) { return (c.title || c.body.trim()); });
  }

  global.OQ_MD = { render: render, splitChapters: splitChapters };
})(window);
