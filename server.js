#!/usr/bin/env node
/* ============================================================
   server.js — local Express dev server, mirrors vercel.json
   ============================================================ */
"use strict";

const path     = require("path");
const fs       = require("fs");
const express  = require("express");
const compression = require("compression");

const PUBLIC_DIR = path.join(__dirname, "public");
const API_DIR    = path.join(__dirname, "api");

if (!fs.existsSync(PUBLIC_DIR)) {
  console.error("public/ não existe. Rode `npm run build` antes de `npm start`.");
  process.exit(1);
}

const app = express();

// security headers (mirror vercel.json)
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; font-src 'self' data:; connect-src 'self'; manifest-src 'self'; " +
    "worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  next();
});

app.use(compression());

// auto-mount api/*.js as /api/<filename>
if (fs.existsSync(API_DIR)) {
  for (const f of fs.readdirSync(API_DIR)) {
    if (!f.endsWith(".js")) continue;
    const route = "/api/" + f.replace(/\.js$/, "");
    const handler = require(path.join(API_DIR, f));
    if (typeof handler === "function") {
      app.all(route, handler);
      console.log("[api] mount " + route);
    }
  }
}

app.use(express.static(PUBLIC_DIR, {
  setHeaders: (res, filePath) => {
    if (/[\/\\](css|js|assets)[\/\\]/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    } else {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
}));

// SPA fallback (path-less, Express 5 friendly)
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log("OmniQuest dev → http://localhost:" + PORT);
});
