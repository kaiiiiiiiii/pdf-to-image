## PDF-to-Image: Copilot instructions for AI coding agents

Purpose: Help you navigate and extend this TanStack React Start app that converts PDF pages to images entirely in the browser.

Architecture and data flow

- Routing: File-based via TanStack Router (`src/routes`). Root layout is `src/routes/__root.tsx`; the main feature lives in `src/routes/index.tsx`.
- UI: Shadcn/Radix-based components in `src/components/ui/` and feature components in `src/components/` (`Dropzone`, `FileList`, `PageThumbnail`, `ControlsPanel`). Use `cn` from `src/lib/utils.ts` for class merging.
- Core PDF pipeline (`src/lib/pdf/`):
  - `render.ts`: `openPdf(input, { onPassword? })` lazy-loads `pdfjs-dist` and sets up the worker (client-only), `renderPageToCanvas(doc, page, { scale, dpr, background })` renders with device pixel ratio and returns a canvas plus `cleanup()`.
  - `export.ts`: `exportPageAsImage(doc, page, { format, pageScale, quality, baseName, dpr, background })` calls the renderer, encodes with `canvas.toBlob`, and names files like `mydoc-p01.png` (padded). `webp` auto-falls back to `png` if unsupported.
  - `worker.ts`: Configures the PDF.js worker from `pdfjs-dist/build/pdf.worker.mjs?url`. Don’t call directly; `openPdf` handles it.
- Utilities: `download.ts` triggers safe multi-file downloads; `zip.ts` uses `jszip` to generate a ZIP; `feature.ts` centralizes feature detection (`supportsWebP`, `dpr`, etc.).
- Config: `src/lib/config.ts` is auto-generated from `package.json` by `scripts/update-config.js` and surfaced in the header (`src/components/Header.tsx`).

Conventions and patterns

- Path aliases: Use `@/…` (Vite + `vite-tsconfig-paths`). Example: `import { env } from "@/env"`.
- SSR constraints: PDF operations are browser-only. `openPdf` throws on the server; guard new browser APIs with `typeof window !== "undefined"` as in `render.ts`.
- Rendering defaults: Canvases are prefilled white to avoid JPEG transparency artifacts. Respect `cleanup()` from `renderPageToCanvas` to free memory after encoding.
- UI additions: Prefer Shadcn components; install via `pnpx shadcn@latest add <component>` and place in `src/components/ui/`.

Key workflows

- Install: `pnpm install`
- Develop: `pnpm dev` then open `http://localhost:3000/pdf-to-image` (base path matters)
- Build: `pnpm build` (runs `scripts/update-config.js`, then Vite build/prerender). Preview with `pnpm serve`.
- Unit tests: `pnpm test` (Vitest, jsdom). See examples in `src/lib/pdf/__tests__/export.spec.ts` and `src/lib/__tests__/feature.spec.ts`.
- E2E tests: `pnpm test:e2e` (Playwright auto-starts dev server unless `PLAYWRIGHT_NO_WEBSERVER` is set). Base URL defaults to `http://localhost:3000/pdf-to-image`.
- Lint/format: `pnpm lint` / `pnpm format`. `pnpm check` runs Prettier write and ESLint fix (modifies files).

Practical examples (project APIs)

- Open a PDF: `const doc = await openPdf(file, { onPassword(update, reason){ update(prompt('pw')||'') } })`
- Render one page: `const { canvas, cleanup } = await renderPageToCanvas(doc, 1, { scale: 2, background: '#fff' }); try { /* use canvas */ } finally { cleanup(); }`
- Export to image: `const { blob, filename } = await exportPageAsImage(doc, 1, { format: 'png', pageScale: 2, baseName: file.name });`
- ZIP a set: `const zipBlob = await zipFiles([{ path: 'doc/image.png', data: blob }], { level: 6 });`

Gotchas and integration notes

- PDF.js worker is configured lazily on the client; don’t import `pdfjs-dist/build/pdf.worker.*` directly outside `worker.ts`.
- `downloadMany` triggers sequential anchor clicks; ensure actions happen within a user gesture to appease popup blockers.
- WebP may be unsupported; `export.ts` falls back automatically—avoid assuming `.webp` in downstream code.
- The config generator runs from `scripts/update-config.js`. If the script path differs on your system, align the npm script or folder name so builds can write `src/lib/config.ts` before bundling.

Where to look first

- End-to-end flow: `src/routes/index.tsx`
- PDF core: `src/lib/pdf/{render.ts,export.ts,worker.ts}`
- UI patterns: `src/components/ui/` and `src/components/*`
- Env/base path: `src/env.ts`, `src/router.tsx`, `vite.config.ts`

Ask me to expand any section (e.g., adding a new export mode, drag-and-drop behavior, or test patterns) and I’ll update this guide.
