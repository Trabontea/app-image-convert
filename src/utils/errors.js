/**
 * Custom error types. Each carries the HTTP status the error handler should send,
 * so code that throws doesn't need to know about HTTP responses.
 */

/** The client sent invalid input (missing field, bad number, non-image file). → 400 */
export class BadRequest extends Error {
  status = 400;
}

/** The file looked like an image but couldn't be decoded or converted. → 422 */
export class UnprocessableImage extends Error {
  status = 422;
}
