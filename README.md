# Image → WebP Converter

Local app that resizes photos to an exact width × height (stretched) and converts them to WebP.

## Quick start

```bash
npm install
npm start
```

Open <http://localhost:3000>, drop images, set width, height and quality, and click **Convert**.
When the conversion finishes, click **Download**: one image is saved as `.webp`, several are saved together as a `.zip`.

To use another port: `PORT=3124 npm start` (Git Bash) or `$env:PORT=3124; npm start` (PowerShell).

> npm may block Sharp's install script. Sharp still works from its prebuilt binaries; if it fails to load, run `npm install-scripts approve sharp`.

## Desktop app (Electron)

```bash
npm run desktop   # open the app in a desktop window (development)
npm run dist      # build Windows installers into dist/
```

`npm run dist` produces:

- `dist/Image to WebP Setup <version>.exe`: an installer that adds Start-menu and desktop shortcuts.
- `dist/Image to WebP Portable <version>.exe`: a single exe that runs without installing.

The desktop app reuses the same server and UI. `electron/main.js` starts `src/app.js` on a random free port on `127.0.0.1` (it is not reachable from the network) and opens it in a window. **Download** opens the native Save dialog. The installers are unsigned, so Windows SmartScreen may warn the first time you run them.

> If `npm run desktop` says Electron "failed to install correctly", run `node node_modules/electron/install.js` to download its binary.

## How it works

### Overview

```text
Browser (public/)                          Server (Node + Express)
─────────────────                          ───────────────────────
pick / drop images
show previews
        │  POST /api/convert (multipart)
        └────────────────────────────────▶ multer: read files into memory
                                           validate width / height / quality
                                           Sharp: rotate → resize → WebP
                                           1 file  → image/webp
                                           2+ files → zip (streamed)
        ┌──────────────────────────────── ◀
keep result in memory
show "Download" button → save on click
```

Images are processed in memory only. Nothing is written to disk on the server, and nothing is kept after the response is sent.

### Image processing

Each image goes through [Sharp](https://sharp.pixelplumbing.com/) (libvips):

1. `.rotate()` applies the EXIF orientation, so phone photos come out upright.
2. `.resize(width, height, { fit: 'fill' })` produces **exactly** the requested size. The aspect ratio is not kept, so the image is stretched if the ratios differ.
3. `.webp({ quality })` encodes as WebP (quality 1–100, default 80).

Any input format Sharp can read works (JPG, PNG, GIF, TIFF, AVIF, WebP, …).

### API

`POST /api/convert`, `multipart/form-data`:

| Field     | Required | Rules                              |
| --------- | -------- | ---------------------------------- |
| `images`  | yes      | 1–50 files, `image/*`, max 25 MB   |
| `width`   | yes      | integer, 1–10000                   |
| `height`  | yes      | integer, 1–10000                   |
| `quality` | no       | integer, 1–100 (default 80)        |

Responses:

| Case             | Status | Body                                                   |
| ---------------- | ------ | ------------------------------------------------------ |
| One image        | 200    | `image/webp`, filename `<name>_<W>x<H>.webp`           |
| Several images   | 200    | `application/zip`, filename `converted_webp.zip`       |
| Invalid input    | 400    | `{ "error": "Width is required" }` etc.                |
| Unreadable image | 422    | `{ "error": "Could not process \"photo.jpg\"" }`       |
| Unexpected error | 500    | `{ "error": "Internal server error" }`                 |

Output names are made safe (characters other than letters, digits, `_`, `.` and `-` become `_`) and unique: two `photo.jpg` uploads become `photo_800x600.webp` and `photo-2_800x600.webp`. The zip uses no compression, because WebP is already compressed.

Example with curl:

```bash
curl -o out.webp -F width=800 -F height=600 -F images=@photo.jpg http://localhost:3000/api/convert
curl -o out.zip  -F width=800 -F height=600 -F images=@a.jpg -F images=@b.png http://localhost:3000/api/convert
```

### Project structure

```text
server.js                         Entry point: starts the server
electron/main.js                  Desktop entry: runs src/app.js on a random port and opens a window
build/icon.png                    App icon used by electron-builder
src/
  app.js                          Express setup: static files, /api routes, error handler
  config/index.js                 Port and limits
  routes/convertRoutes.js         POST /api/convert → upload middleware → controller
  controllers/convertController.js  Validates input, runs conversions, sends .webp or .zip
  services/imageService.js        Sharp pipeline (rotate, resize, WebP)
  services/zipService.js          Streams a zip of the results
  middlewares/upload.js           multer: memory storage, image-only filter, limits
  middlewares/errorHandler.js     Turns errors into JSON responses
  utils/errors.js                 BadRequest (400), UnprocessableImage (422)
  utils/validation.js             Integer field parsing and range checks
  utils/filename.js               Safe, unique output names
public/
  index.html, style.css           UI (light and dark themes)
  app.js                          File selection, previews, upload, Download button
  favicon.svg, apple-touch-icon.png  Browser tab and iOS home-screen icons
```

The code is split by responsibility: routes only wire URLs, controllers handle HTTP, services do the work without knowing about HTTP, and all errors become responses in one place (`errorHandler.js`), using the status carried by the error.

### Frontend

- Selected files are kept in the browser and previewed with object URLs; their original size is read once each image loads.
- **Convert** sends everything in one `FormData` request with `fetch`.
- The result is held as a Blob, and a **Download** button saves it with the filename from the server's `Content-Disposition` header. Nothing downloads automatically.
- The Download button is cleared when the selected files, size or quality change, so it never offers an out-of-date result.

### Configuration

Limits are in `src/config/index.js`:

| Setting          | Default | Meaning                                |
| ---------------- | ------- | -------------------------------------- |
| `port`           | 3000    | Overridden by the `PORT` env variable  |
| `maxDimension`   | 10000   | Largest output width or height (px)    |
| `maxFileSize`    | 25 MB   | Per uploaded file                      |
| `maxFiles`       | 50      | Per request                            |
| `defaultQuality` | 80      | WebP quality when none is sent         |

## Tech stack

- [Express](https://expressjs.com/): HTTP server and static files
- [multer](https://github.com/expressjs/multer): multipart upload parsing
- [Sharp](https://sharp.pixelplumbing.com/): resizing and WebP encoding
- [archiver](https://github.com/archiverjs/node-archiver): zip creation
- Plain HTML, CSS and JavaScript for the UI (no framework or build step)

Requires Node.js 18.17 or newer, the minimum for Sharp 0.34 (developed on Node 24).
