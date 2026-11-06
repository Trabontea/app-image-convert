/**
 * Entry point: starts the HTTP server.
 * All app setup (routes, middleware) lives in src/app.js; this file only listens on the port.
 */
import app from './src/app.js';
import { config } from './src/config/index.js';

// Start listening and log the URL so it's easy to open in a browser.
app.listen(config.port, () => {
  console.log(`Image → WebP converter running at http://localhost:${config.port}`);
});
