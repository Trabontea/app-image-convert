/**
 * Global error handler: the single place where errors become HTTP responses.
 */
import multer from 'multer';

/**
 * Converts any error thrown in a route into a JSON response: { error: "message" }.
 *
 * - Multer errors (file too large, too many files) → 400
 * - Our own errors with a .status (BadRequest 400, UnprocessableImage 422) → that status
 * - Anything else is unexpected → logged, and a generic 500 is sent (no internals leaked)
 *
 * Express recognises error handlers by their 4 parameters, so `_next` must stay
 * even though it isn't used.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
