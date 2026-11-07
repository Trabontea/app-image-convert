# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local web app that resizes uploaded photos to an **exact** width × height (stretched, aspect ratio deliberately ignored via Sharp's `fit: 'fill'`) and converts them to WebP. Node + Express backend with a plain HTML/CSS/JS frontend in `public/`; no build step, no framework, no database.

## Commands

- `npm install` — install deps. npm may block Sharp's install script (`allowScripts`); Sharp still works from its prebuilt binaries. If it fails to load, run `npm install-scripts approve sharp`.
- `npm start` — run at http://localhost:3000 (`PORT=3124 npm start` to use another port).
- There is no test suite, linter, or build. Verify changes by hitting the API with curl, e.g.:
  ```
  curl -o out.webp -F width=800 -F height=600 -F images=@photo.jpg http://localhost:3000/api/convert
  ```
  Multiple `-F images=@...` returns a zip instead.
- `node --check <file>` for a quick syntax check.
- `npm run desktop` — run as an Electron desktop app. `npm run dist` — build the NSIS installer and portable exe into `dist/` (electron-builder; config in the `build` block of `package.json`).

## Desktop (Electron)

`electron/main.js` (the package `main`) imports `src/app.js`, listens on `127.0.0.1:0` (a random port, which it logs), and loads that URL in a `BrowserWindow`. The frontend is identical to the browser version; Electron's default download handling gives `<a download>` a Save dialog. Sharp and `@img/*` are listed in `asarUnpack` because native `.node` binaries can't load from inside the asar. To test the API of a running desktop app, curl the logged port. If the Electron binary is missing (npm install-script blocking), run `node node_modules/electron/install.js`.

When launched from Claude Code's sandboxed shell, Chromium's renderer sandbox can't start: the window stays blank (`ERR_FAILED (-2)`, plus repeated `GPUPersistentCache ... being used by another process` errors). The server still answers curl. To check the UI, have the user run `npm run desktop` from their own terminal.

## Architecture

ES modules throughout (`"type": "module"`). `server.js` only calls `listen`; the Express app is built in `src/app.js` (static `public/`, routes under `/api`, error handler last).

Request flow for the single endpoint, `POST /api/convert`:
`routes/convertRoutes.js` → `middlewares/upload.js` (multer, memory storage, field `images`, rejects non-`image/*`) → `controllers/convertController.js` (validates `width`/`height`/`quality` with `utils/validation.js`, names outputs with `utils/filename.js`, converts each file via `services/imageService.js`) → response is a single `image/webp` for one file, or a stored (uncompressed) zip streamed by `services/zipService.js` for several.

Layering rules:
- Services know nothing about HTTP; controllers do the request/response work.
- Errors carry their own HTTP status: throw `BadRequest` (400) or `UnprocessableImage` (422) from `utils/errors.js`; `middlewares/errorHandler.js` turns any error with `.status` (and multer errors) into `{ error: "message" }` JSON, everything else into a logged 500. The handler must keep its 4-parameter signature or Express won't treat it as an error handler.
- Limits (port, max dimension 10000, 25 MB/file, 50 files, default quality 90) live in `src/config/index.js`.

Frontend (`public/app.js`): keeps selected files in memory, POSTs `FormData` with the same field names the server expects, and on success shows a Download link (an object URL) instead of auto-downloading. The link is cleared whenever the files or options change. Error messages shown in the UI come from the server's `error` field.

## Windows notes

Development is on Windows with Git Bash. Pass Windows-style paths (`C:/...`) to Node, not `/c/...`. Stopping a backgrounded `npm start` may leave the child `node.exe` holding the port; check with `netstat -ano | grep :3000` before restarting.
