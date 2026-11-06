/**
 * Upload middleware: parses multipart form uploads with multer.
 */
import multer from 'multer';
import { config } from '../config/index.js';
import { BadRequest } from '../utils/errors.js';

/**
 * Express middleware that reads the "images" field of a multipart request
 * and puts the files on req.files (each with .buffer, .originalname, .mimetype).
 *
 * - Files are kept in memory (no temp files on disk).
 * - Enforces the size and count limits from config.
 * - Rejects anything whose MIME type isn't image/* with a 400 error.
 */
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize, files: config.maxFiles },
  // Called once per file: cb(null, true) accepts it, cb(error) rejects the whole request.
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new BadRequest(`"${file.originalname}" is not an image`));
  },
}).array('images', config.maxFiles);
