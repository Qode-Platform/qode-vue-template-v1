# Vue template

Provisioned from [`Qode-Platform/fleet-template-v1`](https://github.com/Qode-Platform/fleet-template-v1) — the fleet
lifecycle contract (`bin/`, `fleet.conf`, deploy workflows) with a
Vue starter laid on top.

## Origin

    npx create-vue@latest vue --ts --router --pinia --eslint

Generated 2026-09-21 on Node v22.12.0 / Python 3.12.3. **Dependencies were
never installed and this has never been built or run.** Boot it once before
trusting it.

## Fleet lifecycle

`fleet.conf` drives every script in `bin/`:

| step | command |
|---|---|
| install | `npm install` |
| build | `npm run build` |
| start | `npx vite preview --host 0.0.0.0 --port $PORT` |

    ./bin/run       # install, build, start in the foreground
    ./bin/start     # start from existing build artifacts
    ./bin/restart   # rebuild and restart
    ./bin/stop      # stop whatever holds the port

Listens on `$PORT` (default `3000`); health check hits `/`.

## BASE_PATH

The fleet injects `BASE_PATH` (`/direct/<agent>:<port>`) and nginx forwards
that prefix **unchanged** — so this app serves every route and asset under
it. An empty or unset value means standalone mode: serve at the host root.

- Vite `base` in vite.config.ts, baked at BUILD time from $BASE_PATH.
- `HEALTH_PATH` in `fleet.conf` stays un-prefixed; the fleet prepends `$BASE_PATH` itself.
- A value like `direct/x:3000/` is normalised to `/direct/x:3000`.

---

# vue

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```

## Rule: everything under BASE_PATH

This app is served behind a proxy under a prefix (`BASE_PATH=/direct/<agent>:<port>`),
and the prefix is forwarded to the app unchanged. **Every API call and every asset
reference must carry the base path.** Anything hard-coded to `/` hits the host root,
not the app, and 404s in production even though it works on localhost.

The framework rewrites only *some* things for you:

- **Vite / Astro** rewrite `index.html` and bundled asset imports.
- **Next** rewrites `next/link` and `next/image`.

What is **not** rewritten: `fetch` / tRPC / XHR URLs, and string literals in code
(`<use href="/icons.svg#x">`, `<link href="/favicon.ico">`, `url: "/api/trpc"`, …).
Those must build the URL themselves from:

- `import.meta.env.BASE_URL` (Vite / Astro), or
- `process.env.NEXT_PUBLIC_BASE_PATH` (Next).

Run `npm run check:base-path` to verify — it scans `src/` for host-root literals and
fails if it finds any. A line that is genuinely framework-handled can be exempted with
a trailing `// base-path-ok` comment.
