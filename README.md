![React](https://img.shields.io/badge/React-19.1.1-61dafb?logo=react&logoColor=222) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=fff) ![Vite](https://img.shields.io/badge/Vite-7.1-646cff?logo=vite&logoColor=fff) ![TanStack Router](https://img.shields.io/badge/TanStack%20Router-1.131-blue) ![Tailwind](https://img.shields.io/badge/Tailwind%20CSS-4.1-38bdf8?logo=tailwindcss&logoColor=fff)

# PDF to Image

Convert PDF pages into high‑quality images directly in your browser. Private, fast, and fully client‑side. Built with React, TypeScript, Vite, and TanStack Router, and powered by PDF.js for rendering.

---

## Overview

PDF to Image converts each page of your PDF into PNG, JPEG, or WEBP images using in‑browser rendering. No server uploads occur; your files never leave your device.

## Why this exists

I built this tool because a third‑party app at work that handles payouts for my commute tickets only accepts image uploads, not PDFs. That limitation made submitting receipts frustrating and slow. This project fills that gap by quickly converting PDF pages to images locally, so submissions are fast, private, and compatible with systems that require image formats.

## Features

- 100% client‑side: No uploads, no servers, no tracking
- Multiple formats: PNG, JPEG, WEBP (with automatic fallback if WEBP unsupported)
- Page selection: Pick any subset of pages per document
- Quality controls: Scale and quality sliders for crisp outputs
- Batch export: Download images individually or as a single ZIP
- Password‑protected PDFs: Prompted securely in the browser
- Accessible UI: Keyboard‑friendly controls and clear labels
- Pre‑render and SEO: Static head configuration with meta/OG/Twitter tags

## Live Demo

- Try it out at [kaiiiiiiiii.github.io/pdf-to-image](https://kaiiiiiiiii.github.io/pdf-to-image)

- This app is deployable as a static site (e.g., GitHub Pages, Netlify, Vercel). See Deployment for base‑path configuration.
- Default base path is configured for GitHub Pages (/pdf-to-image). Adjust via environment if your hosting path differs.

## Quick Start

### Prerequisites

- Node.js 18+
- Bun

### Install and run

```bash
bun install
bun dev
# open http://localhost:3000
```

### Build and preview

```bash
bun run build
bun run serve
```

## Usage Guide

1. Add PDFs

- Drag and drop PDFs onto the homepage dropzone, or click to browse.

2. Configure output

- Format: PNG, JPEG, or WEBP
- Scale: 1.0–4.0 (multiplied by device pixel ratio under the hood)
- Quality: 70–100% (for JPEG/WEBP only)

3. Select pages

- For each PDF, use per‑document controls to select all, clear, invert, or click individual page thumbnails to toggle selection.

4. Export

- Download individually (multiple files, one per page), or
- Download ZIP (a single archive with files organized per source PDF)

Tip: When working with many pages or large PDFs, prefer ZIP export to avoid multiple browser save prompts.

## How It Works (Architecture)

- Open PDFs using PDF.js with [openPdf()](src/lib/pdf/render.ts:25). The PDF worker is initialized lazily via [initPdfJsWorker()](src/lib/pdf/worker.ts:15) to avoid SSR pitfalls.
- Render a page to a high‑DPI canvas using [renderPageToCanvas()](src/lib/pdf/render.ts:59). A white background is filled to prevent artifacts in lossy formats (e.g., JPEG).
- Encode the canvas to an image and determine the filename using [exportPageAsImage()](src/lib/pdf/export.ts:77), which:
  - Selects a MIME type [mimeForFormat()](src/lib/pdf/export.ts:23)
  - Falls back from WEBP as needed [effectiveFormat()](src/lib/pdf/export.ts:37)
  - Encodes via [canvasToBlob()](src/lib/pdf/export.ts:55)
  - Generates a predictable filename [fileNameFor()](src/lib/pdf/export.ts:46)
- Batch downloads are handled either one‑by‑one with [downloadMany()](src/lib/download.ts:26) and [downloadBlob()](src/lib/download.ts:10), or compressed into a single archive using [zipFiles()](src/lib/zip.ts:8).
- UI orchestration, import flow, selection logic, and export actions are managed in the main route component [createFileRoute("/")](src/routes/index.tsx:15), specifically:
  - Import and password handling [addFiles()](src/routes/index.tsx:75)
  - Download images individually [exportIndividually()](src/routes/index.tsx:215)
  - Download a ZIP [exportAsZip()](src/routes/index.tsx:260)

## UI Controls

- Conversion settings panel lives in [src/components/ControlsPanel.tsx](src/components/ControlsPanel.tsx) and exposes:
  - Image format selector (JPEG/PNG/WEBP). The WEBP slider hints reflect automatic fallback [showQuality](src/components/ControlsPanel.tsx:31).
  - Scale slider: Controls output resolution; final pixel size ≈ page size × scale × device pixel ratio (DPR).
  - Quality slider: Enabled for JPEG/WEBP only.

## File Naming and Output Formats

- Filenames follow baseName-pNN.ext via [fileNameFor()](src/lib/pdf/export.ts:46), e.g., my‑file-p01.jpg
- Formats:
  - PNG: Lossless, supports transparency
  - JPEG: Lossy, smallest sizes for photographic content
  - WEBP: Modern codec, great compression/quality; app auto‑falls back to PNG if unsupported [effectiveFormat()](src/lib/pdf/export.ts:37)
- Background handling: A white background is prefilled to avoid JPEG artifacts on transparent PDFs [renderPageToCanvas()](src/lib/pdf/render.ts:84)

## Privacy and Security

- 100% local processing within your browser
- No network uploads are performed for PDF rendering or image generation
- Password‑protected PDFs prompt securely via window.prompt within [addFiles()](src/routes/index.tsx:116) and are passed into [openPdf()](src/lib/pdf/render.ts:25)

## Browser Support

- Modern evergreen browsers: Chromium, Firefox, and Safari on desktop and mobile
- WEBP support is auto‑detected; fallback behavior ensures compatibility
- Note: Extremely large pages or very high scale on low‑memory devices may cause memory pressure

## Project Structure

```
src/
├─ components/                # UI components
│  ├─ ui/                     # Shadcn/Radix-based primitives
│  ├─ ControlsPanel.tsx
│  ├─ Dropzone.tsx
│  ├─ FileList.tsx
│  └─ PageThumbnail.tsx
├─ lib/                       # Core utilities
│  ├─ pdf/
│  │  ├─ export.ts            # Canvas encoding, filenames, format logic
│  │  ├─ render.ts            # PDF.js open/render helpers
│  │  └─ worker.ts            # PDF.js worker bootstrap
│  ├─ config.ts               # Auto-generated from package.json
│  ├─ download.ts             # Client-side download helpers
│  ├─ feature.ts              # Feature detection (WEBP, DPR, etc.)
│  ├─ utils.ts
│  └─ zip.ts                  # ZIP creation with JSZip
├─ routes/
│  ├─ __root.tsx              # Document shell & head (SEO/OG/Twitter)
│  └─ index.tsx               # Main app route and logic
├─ env.ts                     # Type-safe environment configuration
└─ styles.css                 # Tailwind styles
```

## Deployment

Static hosting

- The app is a fully static SPA. Compatible with GitHub Pages, Netlify, Vercel, AWS S3 + CloudFront, etc.
- Ensure the base path is set correctly when hosting under a subpath.

GitHub Pages

1. Base path

- Default is /pdf-to-image via [src/env.ts](src/env.ts)
- Override at build time if needed, e.g.:

```bash
VITE_BASE_PATH=/my-subpath bun run build
```

2. Build

```bash
bun run build
```

3. Deploy

- Publish the contents of dist/ to your Pages target (gh-pages branch or GitHub Pages config)

Netlify/Vercel

- Usually root “/”; adjust VITE_BASE_PATH if deploying under a non‑root subpath

Prerendering

- TanStack Start prerender enabled with link crawling disabled [vite.config.ts](vite.config.ts:19). The main route is static and works with static hosting.

## Testing

Unit Tests (Vitest)

```bash
bun test
```

- Tests live under src/lib/**tests**/ and use @testing-library/react/jsdom as needed

## End‑to‑End Tests (Playwright)

```bash
bun run playwright:install
bun run test:e2e
```

- Specs live under tests/e2e
- Base URL defaults to <http://localhost:3000/pdf-to-image> [playwright.config.ts](playwright.config.ts:4)
- Playwright can auto‑launch the dev server when needed [playwright.config.ts](playwright.config.ts:29)
- For custom base paths, set PLAYWRIGHT_BASE_URL or VITE_BASE_PATH

## Scripts

Common scripts from package.json:

- dev: Start Vite dev server on port 3000
- build: Runs update-config then Vite build
- serve: Preview production build locally
- test / test:e2e / playwright:install
- lint / format / check / check-unused
- update-config: Generates a typed config file from package.json

## Generated config

- The script updates [src/lib/config.ts](src/lib/config.ts) from package.json using [scripts/update-config.js](scripts /update-config.js:21). It stores:
  - version (from package.json "version")
  - homepage (from package.json "homepage", or default)

## Accessibility

- Keyboard navigation supported for dropzone and thumbnails (Enter/Space)
- Clear labels and helper text in settings panel [src/components/ControlsPanel.tsx](src/components/ControlsPanel.tsx)
- Live region style footer shows progress and messages [src/routes/index.tsx](src/routes/index.tsx:422)

## Performance Tips

- Increase Scale for sharper images on HiDPI/Retina displays. Note that memory use grows with page size and scale.
- Prefer WEBP where supported for a good quality/size balance; fallback is automatic [effectiveFormat()](src/lib/pdf/export.ts:37).
- For many pages, use ZIP export to avoid multiple simultaneous download prompts.

## Troubleshooting

- “Failed to open …”
  - The PDF may require a password or be corrupted. You will be prompted as needed [addFiles()](src/routes/index.tsx:116), [openPdf()](src/lib/pdf/render.ts:25).
- “No pages selected.”
  - Select at least one page before exporting [exportIndividually()](src/routes/index.tsx:215), [exportAsZip()](src/routes/index.tsx:260).
- Blank/low‑quality output
  - Increase Scale; ensure the original PDF page isn’t a low‑res bitmap.
- Multiple downloads blocked by browser
  - Use “Download ZIP” for a single save prompt [zipFiles()](src/lib/zip.ts:8).

## FAQ

- Does my PDF leave my device?
  - No. All processing happens in your browser; nothing is uploaded.
- What’s the best format?
  - For general use, WEBP (if supported) offers excellent quality with small size; otherwise PNG for graphics or JPEG for photos.
- Why are JPEGs on transparent PDFs white?
  - JPEG has no alpha channel; the app fills a white background to avoid visual artifacts [renderPageToCanvas()](src/lib/pdf/render.ts:84).
- Can I convert password‑protected PDFs?
  - Yes. You will be prompted for the password when required [openPdf()](src/lib/pdf/render.ts:25).
- Can I host the app in a subfolder?
  - Yes. Set VITE_BASE_PATH before building to match your hosting path [vite.config.ts](vite.config.ts:9).

## Roadmap

- Remember last used format/quality/scale between sessions
- Page range presets (e.g., “odd”, “even”, “1-4,7,10‑12” input)
- Drag‑to‑reorder output pages in ZIP
- Dark mode preference toggle
- Optional transparent background for PNG/WEBP when safe for UX

## Contributing

1. Fork and clone the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes with tests
4. Run checks: `bun run check && bun test && bun run test:e2e`
5. Commit and push
6. Open a pull request

## Code Style

- TypeScript‑first
- ESLint and Prettier enforced
- Keep UI accessible and responsive
- Prefer small, pure utilities in src/lib

## License

MIT.

## Acknowledgements

- PDF.js for robust PDF rendering
- TanStack Router/Start for routing and prerender support
- Tailwind CSS and Radix primitives (via shadcn/ui)
- Lucide Icons for SVG icons

## Appendix: Key APIs and Entry Points

- Vite base path and build config:
  - [vite.config.ts](vite.config.ts:9)
  - [vite.config.ts](vite.config.ts:12)
  - Plugin/prerender: [vite.config.ts](vite.config.ts:19)
- Document/SEO:
  - [src/routes/\_\_root.tsx](src/routes/__root.tsx)
- Home route and export logic:
  - [createFileRoute("/")](src/routes/index.tsx:15)
  - [addFiles()](src/routes/index.tsx:75)
  - [exportIndividually()](src/routes/index.tsx:215)
  - [exportAsZip()](src/routes/index.tsx:260)
- PDF utilities:
  - [openPdf()](src/lib/pdf/render.ts:25)
  - [renderPageToCanvas()](src/lib/pdf/render.ts:59)
  - [countPages()](src/lib/pdf/render.ts:109)
  - [initPdfJsWorker()](src/lib/pdf/worker.ts:15)
- Image export:
  - [mimeForFormat()](src/lib/pdf/export.ts:23)
  - [effectiveFormat()](src/lib/pdf/export.ts:37)
  - [fileNameFor()](src/lib/pdf/export.ts:46)
  - [canvasToBlob()](src/lib/pdf/export.ts:55)
  - [exportPageAsImage()](src/lib/pdf/export.ts:77)
- ZIP and download:
  - [zipFiles()](src/lib/zip.ts:8)
  - [downloadBlob()](src/lib/download.ts:10)
  - [downloadMany()](src/lib/download.ts:26)
