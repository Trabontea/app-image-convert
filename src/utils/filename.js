/**
 * Helpers for naming the converted output files.
 */
import path from 'node:path';

/**
 * Builds one output filename: "<base>_<W>x<H>.webp".
 * Characters that are unsafe in filenames or HTTP headers are replaced with "_".
 *
 * @param {string} base   Filename without extension.
 * @param {number} width
 * @param {number} height
 * @returns {string} e.g. "holiday_photo_800x600.webp"
 */
function outputName(base, width, height) {
  const safe = base.replace(/[^\w.-]+/g, '_') || 'image';
  return `${safe}_${width}x${height}.webp`;
}

/**
 * Builds an output name for each uploaded file and makes sure no two names clash.
 * Two "photo.jpg" uploads become "photo_800x600.webp" and "photo-2_800x600.webp";
 * otherwise one would overwrite the other inside the zip.
 *
 * @param {string[]} originalNames  Uploaded filenames, in order.
 * @param {number} width
 * @param {number} height
 * @returns {string[]} Output names, in the same order as the input.
 */
export function uniqueOutputNames(originalNames, width, height) {
  const used = new Set();
  return originalNames.map((original) => {
    const base = path.parse(original).name; // drop the original extension
    let name = outputName(base, width, height);
    // On a clash, try base-2, base-3, … until the name is free.
    for (let i = 2; used.has(name); i++) name = outputName(`${base}-${i}`, width, height);
    used.add(name);
    return name;
  });
}
