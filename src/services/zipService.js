/**
 * Zip service: packs several in-memory files into one zip archive.
 */
import archiver from 'archiver';

/**
 * Writes the given files into a zip and streams it to `output`
 * (for example the Express response), so the zip is sent as it's built.
 *
 * @param {{ name: string, data: Buffer }[]} entries  Files to add: name inside the zip + contents.
 * @param {import('node:stream').Writable} output    Where to write the zip bytes.
 * @returns {Promise<void>} Resolves once the whole zip has been written to `output`.
 */
export async function streamZip(entries, output) {
  // 'store' = no compression: WebP is already compressed, so zipping again just wastes CPU.
  const zip = archiver('zip', { store: true });

  // Resolve when the output stream finishes; reject if building the zip fails.
  const done = new Promise((resolve, reject) => {
    zip.on('error', reject);
    output.on('finish', resolve);
  });

  zip.pipe(output);
  for (const { name, data } of entries) zip.append(data, { name });
  await zip.finalize(); // no more files; flush the archive
  return done;
}
