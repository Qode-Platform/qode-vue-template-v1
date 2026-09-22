#!/usr/bin/env node
/**
 * check-base-path.mjs — guard against host-root ("/...") literals.
 *
 * WHY
 * ---
 * These apps are not served from the host root. A proxy serves them under a
 * prefix, BASE_PATH=/direct/<agent>:<port>, and forwards the prefix UNCHANGED
 * to the app. So anything hard-coded to "/" — `fetch("/api/...")`,
 * `src="/logo.png"`, `href="/favicon.ico"`, `url: "/api/trpc"` — leaves the
 * prefix off, hits the *host* root instead of the app, and 404s in production
 * while looking perfectly fine on localhost.
 *
 * Frameworks only rewrite *some* of this for you:
 *   - Vite / Astro rewrite index.html and bundled asset imports.
 *   - Next rewrites next/link and next/image.
 * They do NOT rewrite fetch/tRPC/XHR URLs, or plain string literals in code.
 *
 * HOW TO FIX
 * ----------
 *   Vite / Astro:  import.meta.env.BASE_URL
 *       fetch(`${import.meta.env.BASE_URL}api/thing`)
 *     (Vite's BASE_URL always ends in "/"; Astro's may not — join safely with
 *      `import.meta.env.BASE_URL.replace(/\/$/, "")` + "/path".)
 *   Next:          process.env.NEXT_PUBLIC_BASE_PATH
 *       const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");
 *       fetch(`${base}/api/thing`)
 *
 * EXEMPTING A LINE
 * ----------------
 * If a literal is genuinely handled by the framework (e.g. a next/image `src`,
 * which Next prefixes itself), append a trailing `// base-path-ok` comment to
 * that line and this check will skip it.
 *
 * Run with:  npm run check:base-path
 * This is a standalone guard — it is deliberately NOT wired into the build or CI.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const DIRS = ["src", "app"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".astro", "dist", "build", ".git"]);
const EXTS = /\.(m?[jt]sx?|astro|vue|svelte|html)$/;

// Host-root literals we refuse: the opening quote is immediately followed by "/".
const PATTERNS = [
  { re: /fetch\(\s*"\//, what: 'fetch("/' },
  { re: /fetch\(\s*'\//, what: "fetch('/" },
  { re: /fetch\(\s*`\//, what: "fetch(`/" },
  { re: /\bsrc\s*=\s*"\//, what: 'src="/' },
  { re: /\bhref\s*=\s*"\//, what: 'href="/' },
  { re: /\burl\s*:\s*"\//, what: 'url: "/' },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.test(name)) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(join(ROOT, d)));
const offenders = [];

for (const file of files) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    // Explicit, reviewed exemption.
    if (line.includes("base-path-ok")) return;
    // In-page anchors are not host-root paths.
    if (/\bhref\s*=\s*"\/#/.test(line)) return;
    for (const { re, what } of PATTERNS) {
      if (re.test(line)) {
        offenders.push({
          file: relative(ROOT, file),
          line: i + 1,
          what,
          text: line.trim(),
        });
        return;
      }
    }
  });
}

if (offenders.length === 0) {
  console.log("check:base-path — OK, no host-root literals found.");
  process.exit(0);
}

console.error(
  `check:base-path — found ${offenders.length} host-root literal(s) that ignore BASE_PATH:\n`
);
for (const o of offenders) {
  console.error(`  ${o.file}:${o.line}  [${o.what}]  ${o.text}`);
}
console.error(
  "\nThese will 404 when the app is served under a proxy prefix.\n" +
    "Use import.meta.env.BASE_URL (Vite/Astro) or process.env.NEXT_PUBLIC_BASE_PATH (Next),\n" +
    "or mark a genuinely framework-handled line with a trailing `// base-path-ok` comment."
);
process.exit(1);
