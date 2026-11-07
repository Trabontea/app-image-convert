/**
 * Image processing service. Knows nothing about HTTP — it just turns an
 * image buffer into a WebP buffer, so it can be reused anywhere.
 */
import sharp from 'sharp';
import { UnprocessableImage } from '../utils/errors.js';

/**
 * Resizes an image to exactly width × height (stretching if the aspect ratio
 * differs) and encodes it as WebP.
 *
 * @param {Buffer} buffer          Raw bytes of the uploaded image (JPG, PNG, GIF, …).
 * @param {object} options
 * @param {number} options.width   Output width in pixels.
 * @param {number} options.height  Output height in pixels.
 * @param {number} options.quality WebP quality, 1 (smallest file) to 100 (best quality).
 * @param {string} [originalName]  Original filename, used only in the error message.
 * @returns {Promise<Buffer>} The encoded WebP image.
 * @throws {UnprocessableImage} If Sharp can't read or convert the image (e.g. a corrupt file).
 */
export async function convertToWebp(buffer, { width, height, quality }, originalName = 'image') {
  try {
    return await sharp(buffer)
      .rotate() // apply EXIF orientation so phone photos aren't sideways
      .resize(width, height, { fit: 'fill', kernel: 'lanczos3' }) // 'fill' = exact size, ignore aspect ratio
      .webp(
        quality === 100
          ? { lossless: true, effort: 6 } // 100 = pixel-perfect, no compression artifacts
          : {
              quality,
              alphaQuality: 100, // keep transparent edges crisp
              smartSubsample: true, // sharper colour edges than plain 4:2:0 subsampling
              effort: 6, // slowest/best encoder search (0–6); better quality per byte
            },
      )
      .toBuffer();
  } catch {
    throw new UnprocessableImage(`Could not process "${originalName}"`);
  }
}
