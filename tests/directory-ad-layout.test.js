"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");

test("directory ad widths match their desktop content containers", () => {
  const css = fs.readFileSync(path.join(ROOT, "static", "css", "site.css"), "utf8");
  assert.match(css, /\.teams-command-page \.site-ad-banner \{ width: min\(1260px, calc\(100% - 40px\)\); \}/);
  assert.match(css, /\.players-directory-body \.site-ad-banner \{ width: min\(1240px, calc\(100% - 40px\)\); \}/);
  assert.match(css, /\.squads-directory-body \.site-ad-banner \{ width: min\(1290px, calc\(100% - 40px\)\); \}/);
});

test("empty or blocked ad containers collapse without leaving a blank slot", () => {
  const css = fs.readFileSync(path.join(ROOT, "static", "css", "site.css"), "utf8");
  const javascript = fs.readFileSync(path.join(ROOT, "static", "js", "site.js"), "utf8");
  assert.match(css, /site-ad-banner\[data-ad-state="empty"\]/);
  assert.match(javascript, /data\.state === "rendered"/);
  assert.match(javascript, /onerror=/);
  assert.match(javascript, /hasCreative/);
});

test("all three generated directories load the cache-busted ad fix", () => {
  for (const directory of ["teams", "players", "squads"]) {
    const html = fs.readFileSync(path.join(ROOT, directory, "index.html"), "utf8");
    assert.match(html, /site\.css\?v=20260902adfit1/);
    assert.match(html, /site\.js\?v=20260902adfit1/);
  }
  const squads = fs.readFileSync(path.join(ROOT, "squads", "index.html"), "utf8");
  assert.match(squads, /<body class="squads-directory-body">/);
});
