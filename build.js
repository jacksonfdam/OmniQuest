#!/usr/bin/env node
/* ============================================================
   build.js — src/ → public/ pipeline
   ============================================================ */
"use strict";

const fs   = require("fs");
const path = require("path");
const crypto = require("crypto");

const csso       = require("csso");
const terser     = require("terser");
const htmlMinify = require("html-minifier-terser").minify;
const JOb        = require("javascript-obfuscator");

const SRC = path.join(__dirname, "src");
const OUT = path.join(__dirname, "public");

// ---------- helpers ----------

function rm(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full));
    else out.push(full);
  }
  return out;
}

function copyVerbatim(srcFile, destFile) {
  ensureDir(path.dirname(destFile));
  fs.copyFileSync(srcFile, destFile);
}

function md5short(buf) {
  return crypto.createHash("md5").update(buf).digest("hex").slice(0, 8);
}

// Protected dynamic classes (must NOT be renamed)
const PROTECTED_NAMES = new Set([
  "is-locked", "is-current", "is-done", "is-shown", "is-open",
  "is-correct", "is-wrong", "is-success", "is-error",
  "is-hidden", "is-glitching", "is-on", "is-out",
  "on", "node--celebrate"
]);

// ---------- 1) load all source ----------

console.log("[build] cleaning…");
rm(OUT);
ensureDir(OUT);

const srcFiles = walk(SRC);

// ---------- 2) determine which files to process ----------

const cssFiles  = srcFiles.filter(f => f.endsWith(".css"));
const jsFiles   = srcFiles.filter(f => f.endsWith(".js") && !f.endsWith("/sw.js") && !f.endsWith(path.sep + "sw.js"));
const swFiles   = srcFiles.filter(f => /[/\\]sw\.js$/.test(f));
const htmlFiles = srcFiles.filter(f => f.endsWith(".html"));
const assetFiles = srcFiles.filter(f =>
  !f.endsWith(".css") && !f.endsWith(".js") && !f.endsWith(".html") &&
  !f.endsWith(".DS_Store")
);

// ---------- 3) build manifest of class/id renames ----------

console.log("[build] indexing class/id names…");

const renameMap = {};
let aIdx = 0;
function nextAlias() {
  // _a, _b, ..., _z, _aa, _ab, ...
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let n = aIdx++;
  let s = "";
  do { s = letters[n % 26] + s; n = Math.floor(n / 26) - 1; } while (n >= 0);
  return "_" + s;
}

const allText = [];
for (const f of [...cssFiles, ...jsFiles, ...htmlFiles]) {
  allText.push(fs.readFileSync(f, "utf8"));
}
const blob = allText.join("\n");

// classes from CSS .foo and HTML class="…"
const classMatches = new Set();
const idMatches    = new Set();
const cssClassRe = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
const cssIdRe    = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g;
let m;
while ((m = cssClassRe.exec(blob))) classMatches.add(m[1]);
while ((m = cssIdRe.exec(blob)))    idMatches.add(m[1]);

// also scan HTML class= and id=
const attrClassRe = /class\s*=\s*["']([^"']+)["']/g;
const attrIdRe    = /\bid\s*=\s*["']([^"']+)["']/g;
while ((m = attrClassRe.exec(blob))) m[1].split(/\s+/).forEach(c => c && classMatches.add(c));
while ((m = attrIdRe.exec(blob))) idMatches.add(m[1]);

// also JS classList / getElementById / querySelector
const jsClassListRe = /classList\.(?:add|remove|toggle|contains|replace)\(\s*["']([^"']+)["']/g;
while ((m = jsClassListRe.exec(blob))) classMatches.add(m[1]);
const jsGetByIdRe  = /getElementById\(\s*["']([^"']+)["']/g;
while ((m = jsGetByIdRe.exec(blob))) idMatches.add(m[1]);
const jsQuerySelRe = /querySelector(?:All)?\(\s*["']([^"']+)["']/g;
while ((m = jsQuerySelRe.exec(blob))) {
  const sel = m[1];
  // pick out class/id tokens
  let cm; const cre = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g; while ((cm = cre.exec(sel))) classMatches.add(cm[1]);
  let im; const ire = /#([a-zA-Z_][a-zA-Z0-9_-]*)/g; while ((im = ire.exec(sel))) idMatches.add(im[1]);
}

// build alias map (skip protected)
for (const c of classMatches) {
  if (PROTECTED_NAMES.has(c)) continue;
  if (c.startsWith("_")) continue; // alias-style names left alone
  if (c.length <= 2)     continue;
  // skip svg-internal / data attrs that can be confused
  renameMap["." + c] = "." + nextAlias();
}
for (const i of idMatches) {
  if (PROTECTED_NAMES.has(i)) continue;
  if (i.length <= 2) continue;
  renameMap["#" + i] = "#" + nextAlias();
}

console.log(`[build] renaming ${Object.keys(renameMap).length} symbols`);

function applyRenames(text, kind) {
  // kind: 'css' | 'js' | 'html'
  for (const [orig, alias] of Object.entries(renameMap)) {
    const sigil = orig[0]; // . or #
    const name  = orig.slice(1);
    const aliasName = alias.slice(1);
    if (kind === "css") {
      const re = new RegExp("\\" + sigil + name + "(?![a-zA-Z0-9_-])", "g");
      text = text.replace(re, sigil + aliasName);
    } else if (kind === "html") {
      // class= attributes: replace whole-token in class attr lists
      text = text.replace(/class\s*=\s*"([^"]*)"/g, function (full, body) {
        const tokens = body.split(/\s+/).map(t =>
          (sigil === "." && t === name) ? aliasName : t);
        return 'class="' + tokens.join(" ") + '"';
      });
      if (sigil === "#") {
        text = text.replace(new RegExp('id\\s*=\\s*"' + name + '"', "g"), 'id="' + aliasName + '"');
        text = text.replace(new RegExp('href\\s*=\\s*"#' + name + '"', "g"), 'href="#' + aliasName + '"');
        text = text.replace(new RegExp('url\\(\\s*#' + name + '\\s*\\)', "g"), "url(#" + aliasName + ")");
      }
    } else if (kind === "js") {
      if (sigil === "#") {
        text = text.replace(new RegExp('getElementById\\(\\s*"' + name + '"', "g"),
          'getElementById("' + aliasName + '"');
        text = text.replace(new RegExp("getElementById\\(\\s*'" + name + "'", "g"),
          "getElementById('" + aliasName + "'");
      }
      // querySelector(All): rewrite tokens inside the selector string
      text = text.replace(/querySelector(All)?\(\s*(['"])([^'"]+)\2/g, function (_full, all, q, sel) {
        let out = sel;
        if (sigil === ".") out = out.replace(new RegExp("\\." + name + "(?![a-zA-Z0-9_-])", "g"), "." + aliasName);
        if (sigil === "#") out = out.replace(new RegExp("#" + name + "(?![a-zA-Z0-9_-])", "g"), "#" + aliasName);
        return "querySelector" + (all || "") + "(" + q + out + q;
      });
      if (sigil === ".") {
        // classList.{add|remove|toggle|contains|replace}('name', ...)
        text = text.replace(/classList\.(add|remove|toggle|contains|replace)\(\s*(['"])([^'"]+)\2/g,
          function (full, op, q, n) {
            const newN = n === name ? aliasName : n;
            return "classList." + op + "(" + q + newN + q;
          });
        // string template literal class= "..."
        text = text.replace(new RegExp("class=\"" + name + "(\\s|\")", "g"), "class=\"" + aliasName + "$1");
        text = text.replace(new RegExp("class=\\\\\"" + name + "(\\\\s|\\\\\")", "g"), "class=\\\"" + aliasName + "$1");
      }
    }
  }
  return text;
}

// ---------- 4) process CSS ----------

console.log("[build] processing CSS…");
const builtCssFiles = []; // {rel, hash}
for (const f of cssFiles) {
  const rel = path.relative(SRC, f);
  let css = fs.readFileSync(f, "utf8");
  css = applyRenames(css, "css");
  const min = csso.minify(css, { restructure: false }).css;
  const dest = path.join(OUT, rel);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, min, "utf8");
  builtCssFiles.push({ rel, hash: md5short(Buffer.from(min)) });
}

// ---------- 5) process JS (terser + obfuscate + IIFE wrap) ----------

console.log("[build] processing JS…");
const HEAVY_FILES = new Set(["data.js", "library.js", "integrity.js", "state.js", "quiz.js"]);

async function buildJs() {
  const out = [];
  for (const f of jsFiles) {
    const rel = path.relative(SRC, f);
    const base = path.basename(f);
    let js = fs.readFileSync(f, "utf8");
    js = applyRenames(js, "js");

    // terser two-pass, drop console.* (anti-tamper relies on debugger -- KEEP those)
    const min = await terser.minify(js, {
      compress: { passes: 2, drop_console: true, drop_debugger: false },
      mangle: true,
      format: { comments: false }
    });
    let code = min.code;

    // obfuscate
    const heavy = HEAVY_FILES.has(base);
    const obf = JOb.obfuscate(code, heavy ? {
      seed: 0x4F5147, // OQ G fixed
      compact: true,
      simplify: true,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.6,
      stringArray: true,
      stringArrayEncoding: ["base64"],
      stringArrayThreshold: 0.85,
      transformObjectKeys: true,
      identifierNamesGenerator: "mangled-shuffled",
      selfDefending: true,
      numbersToExpressions: true,
      splitStrings: false
    } : {
      seed: 0x4F5147,
      compact: true,
      simplify: true,
      identifierNamesGenerator: "mangled",
      stringArray: false,
      controlFlowFlattening: false
    }).getObfuscatedCode();

    // IIFE wrap (avoid cross-file collisions of obfuscator helpers)
    const wrapped = "(function(){" + obf + "})();";

    const dest = path.join(OUT, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, wrapped, "utf8");
    out.push({ rel, hash: md5short(Buffer.from(wrapped)) });
  }
  // sw.js: minify only, no obfuscation, no rename
  for (const f of swFiles) {
    const rel = path.relative(SRC, f);
    const js = fs.readFileSync(f, "utf8");
    const min = (await terser.minify(js, { compress: true, mangle: true })).code;
    const dest = path.join(OUT, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, min, "utf8");
  }
  return out;
}

// ---------- 6) process HTML ----------

async function buildHtml(jsHashMap, cssHashMap) {
  console.log("[build] processing HTML…");
  for (const f of htmlFiles) {
    const rel = path.relative(SRC, f);
    let html = fs.readFileSync(f, "utf8");
    html = applyRenames(html, "html");

    // cache bust references
    html = html.replace(/<script\s+src="js\/([^"]+)"/g, (full, name) => {
      const h = jsHashMap[name];
      return '<script src="js/' + name + (h ? "?v=" + h : "") + '"';
    });
    html = html.replace(/<link\s+rel="stylesheet"\s+href="css\/([^"]+)"/g, (full, name) => {
      const h = cssHashMap[name];
      return '<link rel="stylesheet" href="css/' + name + (h ? "?v=" + h : "") + '"';
    });

    const min = await htmlMinify(html, {
      collapseWhitespace: true,
      removeComments: true,
      removeOptionalTags: false, // keep <head>/<body> so SW + manifest selectors work
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      minifyCSS: true,
      minifyJS: true,
      caseSensitive: true
    });
    const dest = path.join(OUT, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, min, "utf8");
  }
}

// ---------- 7) copy assets verbatim ----------

function copyAssets() {
  console.log("[build] copying assets…");
  for (const f of assetFiles) {
    const rel = path.relative(SRC, f);
    copyVerbatim(f, path.join(OUT, rel));
  }
}

// ---------- 8) main ----------

(async function main() {
  const builtJs  = await buildJs();
  const jsHashMap  = Object.fromEntries(builtJs.map(x => [path.basename(x.rel), x.hash]));
  const cssHashMap = Object.fromEntries(builtCssFiles.map(x => [path.basename(x.rel), x.hash]));
  await buildHtml(jsHashMap, cssHashMap);
  copyAssets();
  console.log("[build] done. → " + path.relative(__dirname, OUT));
})().catch(err => {
  console.error("[build] FAILED:", err);
  process.exit(1);
});
