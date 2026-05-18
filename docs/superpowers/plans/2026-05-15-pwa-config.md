# PWA 配置 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure the app as a PWA with manifest, service worker offline cache, and installable support.

**Architecture:** Use `vite-plugin-pwa` to generate service worker and handle caching. Add manifest.json with app metadata. Update `index.html` with required PWA meta tags.

**Tech Stack:** Vite, `vite-plugin-pwa`, HTML

---

## File Structure

| File | Responsibility |
|------|---------------|
| `vite.config.ts` | Add `vite-plugin-pwa` plugin configuration |
| `public/manifest.json` | PWA manifest with app metadata |
| `public/icon-192.png` | App icon (192x192) — generate simple SVG fallback if no asset |
| `public/icon-512.png` | App icon (512x512) |
| `index.html` | Add PWA meta tags (theme-color, viewport, manifest link) |
| `src/App.tsx` | Optional: add `beforeinstallprompt` handler for custom install UI |

---

## Task 1: Install `vite-plugin-pwa` and configure

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json` / `package-lock.json` (via npm install)

### Step 1: Install dependency

```bash
npm install -D vite-plugin-pwa
```

### Step 2: Update `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // Use public/manifest.json instead
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

### Step 3: Commit

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "chore: add vite-plugin-pwa dependency and config"
```

---

## Task 2: Add manifest and icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.svg` (fallback, will be used as icon source)
- Create: `public/icon-512.svg`

### Step 1: Create manifest

```json
{
  "name": "时间感知",
  "short_name": "时间感知",
  "description": "有时间感知能力的个人日程工具",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#111827",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Step 2: Create simple SVG icons

`public/icon-192.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="24" fill="#111827"/>
  <circle cx="96" cy="96" r="60" fill="none" stroke="#F9FAFB" stroke-width="8"/>
  <line x1="96" y1="96" x2="96" y2="56" stroke="#F9FAFB" stroke-width="8" stroke-linecap="round"/>
  <line x1="96" y1="96" x2="126" y2="96" stroke="#F9FAFB" stroke-width="8" stroke-linecap="round"/>
</svg>
```

`public/icon-512.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#111827"/>
  <circle cx="256" cy="256" r="160" fill="none" stroke="#F9FAFB" stroke-width="20"/>
  <line x1="256" y1="256" x2="256" y2="136" stroke="#F9FAFB" stroke-width="20" stroke-linecap="round"/>
  <line x1="256" y1="256" x2="356" y2="256" stroke="#F9FAFB" stroke-width="20" stroke-linecap="round"/>
</svg>
```

Note: `vite-plugin-pwa` can generate PNGs from SVGs automatically, but for simplicity we'll use SVGs directly in manifest and let the plugin handle conversion, OR we can reference the SVGs in the manifest. Let's use the SVGs directly:

Update manifest icons to point to SVGs:
```json
"icons": [
  {
    "src": "/icon-192.svg",
    "sizes": "192x192",
    "type": "image/svg+xml"
  },
  {
    "src": "/icon-512.svg",
    "sizes": "512x512",
    "type": "image/svg+xml"
  }
]
```

### Step 3: Commit

```bash
git add public/manifest.json public/icon-192.svg public/icon-512.svg
git commit -m "feat: add PWA manifest and icons"
```

---

## Task 3: Update `index.html`

**Files:**
- Modify: `index.html`

### Step 1: Add PWA meta tags

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <meta name="description" content="有时间感知能力的个人日程工具" />
    <meta name="theme-color" content="#111827" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon-192.svg" />
    <title>时间感知</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 2: Commit

```bash
git add index.html
git commit -m "feat: add PWA meta tags to index.html"
```

---

## Task 4: Final Verification

### Step 1: Build check

```bash
npx vite build
```

Verify that `dist/sw.js` (service worker) and `dist/manifest.json` are generated.

### Step 2: Commit

```bash
git commit --allow-empty -m "feat: PWA configuration complete"
```

---

## Spec Coverage Checklist

| Requirement | Task | Status |
|-------------|------|--------|
| Service Worker auto-update | Task 1 | ✅ |
| Offline cache for JS/CSS/HTML/assets | Task 1 | ✅ |
| Manifest with app metadata | Task 2 | ✅ |
| App icons | Task 2 | ✅ |
| Theme color meta tag | Task 3 | ✅ |
| Apple mobile web app meta tags | Task 3 | ✅ |
| Manifest link in HTML | Task 3 | ✅ |
