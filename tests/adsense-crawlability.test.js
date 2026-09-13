"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const ACCOUNT_META = '<meta name="google-adsense-account" content="ca-pub-6650468267259370">';
const ADSENSE_SCRIPT = "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6650468267259370";

function generatedHtmlFiles(directory = ROOT) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".vercel", "output", "templates"].includes(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return generatedHtmlFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
    if (directory === ROOT && entry.name.startsWith("google")) return [];
    return [fullPath];
  });
}

test("every public HTML document exposes the AdSense account in its head", () => {
  const files = generatedHtmlFiles();
  assert.ok(files.length >= 300);
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    const head = html.split(/<\/head>/i, 1)[0];
    assert.equal(
      head.split(ACCOUNT_META).length - 1,
      1,
      `${path.relative(ROOT, file)} must contain one AdSense account meta tag`,
    );
    assert.equal(
      head.split(ADSENSE_SCRIPT).length - 1,
      1,
      `${path.relative(ROOT, file)} must contain one AdSense script`,
    );
  }
});

test("AdSense crawlers are explicitly allowed", () => {
  const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
  assert.match(robots, /User-agent: Mediapartners-Google\s+Allow: \//);
  assert.match(robots, /User-agent: Google-Display-Ads-Bot\s+Allow: \//);
});

test("Vercel has no redirect whose source and destination are identical", () => {
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
  for (const redirect of config.redirects || []) {
    assert.notEqual(redirect.source, redirect.destination);
  }
});
