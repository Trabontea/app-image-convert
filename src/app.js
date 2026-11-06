/**
 * Builds and configures the Express application (without starting it).
 * Keeping this separate from server.js makes the app easy to import in tests.
 */
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import convertRoutes from './routes/convertRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

// ES modules have no __dirname, so derive it from this file's URL.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// Serve the browser UI (index.html, app.js, style.css) from /public.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount the API under /api  →  POST /api/convert
app.use('/api', convertRoutes);

// Must be registered last so it catches errors from every route above.
app.use(errorHandler);

export default app;
