# T25 — Demo on GitHub Pages

**Пріоритет:** P3  
**Статус:** done (workflow); **requires public repo or paid Pages**  
**Залежності:** demo build ✅

---

## Goal

Publish `packages/demo` static build to GitHub Pages so the diagram can be opened without local `npm run dev`.

## Done

- [x] `DEMO_BASE_PATH` / `assetPrefix` in Rsbuild (`/dg/` for project Pages)
- [x] `.nojekyll` in demo `public/`
- [x] Workflow `.github/workflows/pages.yml` (build WASM + demo → deploy-pages)
- [x] Docs link in root README / work README

## Hosting constraint

Repo `b2vv/dg` is **private** on a **free** plan. GitHub Pages for private repos needs GitHub Pro/Team, **or** make the repository **public**.

Expected URL after Pages is enabled: **https://b2vv.github.io/dg/**

## Out of scope

- Custom domain
- Cloudflare / Vercel alternate hosts
