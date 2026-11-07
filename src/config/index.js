/**
 * Central app settings. Change limits here instead of hunting through the code.
 */
export const config = {
  /** HTTP port; override with the PORT environment variable. */
  port: Number(process.env.PORT) || 3000,
  /** Largest allowed output width or height, in pixels. */
  maxDimension: 10000,
  /** Largest allowed upload per file, in bytes (25 MB). */
  maxFileSize: 25 * 1024 * 1024,
  /** Most files accepted in one request. */
  maxFiles: 50,
  /** WebP quality used when the client doesn't send one (1–100). */
  defaultQuality: 90,
};
