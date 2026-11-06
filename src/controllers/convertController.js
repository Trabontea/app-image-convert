/**
 * Controller for the convert endpoint: reads the HTTP request, calls the
 * services to do the work, and decides what HTTP response to send.
 */
import { config } from '../config/index.js';
import { convertToWebp } from '../services/imageService.js';
import { streamZip } from '../services/zipService.js';
import { BadRequest } from '../utils/errors.js';
import { parseIntField } from '../utils/validation.js';
import { uniqueOutputNames } from '../utils/filename.js';

/**
 * Handles POST /api/convert.
 *
 * Expects multipart form data with:
 *   - images  : one or more image files (already parsed by the upload middleware into req.files)
 *   - width   : output width in px (required)
 *   - height  : output height in px (required)
 *   - quality : WebP quality 1–100 (optional, defaults to config.defaultQuality)
 *
 * Responds with a single .webp file for one image, or a .zip for several.
 * Any thrown error is passed to next() so the error handler can turn it into JSON.
 */
export async function convert(req, res, next) {
  try {
    const files = req.files || [];
    if (files.length === 0) throw new BadRequest('No images uploaded');

    // Validate the form fields (they always arrive as strings).
    const width = parseIntField(req.body.width, 'Width', 1, config.maxDimension);
    const height = parseIntField(req.body.height, 'Height', 1, config.maxDimension);
    const quality = parseIntField(req.body.quality, 'Quality', 1, 100, config.defaultQuality);
    const options = { width, height, quality };

    // Convert each image in order, pairing it with a unique output filename.
    const names = uniqueOutputNames(files.map((f) => f.originalname), width, height);
    const results = [];
    for (const [i, file] of files.entries()) {
      results.push({ name: names[i], data: await convertToWebp(file.buffer, options, file.originalname) });
    }

    // One image → send the WebP directly as a download.
    if (results.length === 1) {
      const [{ name, data }] = results;
      res.set({
        'Content-Type': 'image/webp',
        'Content-Disposition': `attachment; filename="${name}"`,
      });
      return res.send(data);
    }

    // Several images → bundle them into a zip streamed to the client.
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="converted_webp.zip"',
    });
    await streamZip(results, res);
  } catch (err) {
    next(err);
  }
}
