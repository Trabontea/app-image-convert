/**
 * Browser UI logic: collects images (drag-and-drop or file picker), shows a
 * preview list, sends them to POST /api/convert, and downloads the result.
 */

// --- DOM references ---------------------------------------------------------
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const fileList = document.getElementById('fileList');
const form = document.getElementById('options');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const qualityInput = document.getElementById('quality');
const qualityOut = document.getElementById('qualityOut');
const convertBtn = document.getElementById('convertBtn');
const statusEl = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');

/**
 * Images the user has selected so far.
 * Each entry holds the File plus an object URL used for the thumbnail preview.
 * @type {{ file: File, url: string }[]}
 */
let files = [];

/**
 * Hides the Download button and frees the previous result from memory.
 * Called whenever the result would be out of date: a new conversion starts,
 * or the selected files or options change.
 */
function clearResult() {
  if (downloadLink.href) URL.revokeObjectURL(downloadLink.href);
  downloadLink.removeAttribute('href');
  downloadLink.hidden = true;
}

/**
 * Shows the Download button for a finished conversion.
 * Nothing is saved until the user clicks it.
 * @param {Blob} blob    The converted .webp or .zip returned by the server.
 * @param {string} name  Filename to save it as.
 */
function showResult(blob, name) {
  clearResult();
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = name;
  downloadLink.textContent = `Download ${name} (${(blob.size / 1024).toFixed(0)} KB)`;
  downloadLink.hidden = false;
}

/**
 * Shows a message under the form.
 * @param {string} msg              Text to display ('' clears it).
 * @param {'' | 'ok' | 'error'} kind Optional style: green for 'ok', red for 'error'.
 */
function setStatus(msg, kind = '') {
  statusEl.textContent = msg;
  statusEl.className = `status ${kind}`;
}

/**
 * Adds files to the selection, skipping anything that isn't an image,
 * then redraws the list.
 * @param {FileList | File[]} list  Files from the picker or a drop event.
 */
function addFiles(list) {
  for (const file of list) {
    if (!file.type.startsWith('image/')) {
      setStatus(`Skipped "${file.name}" (not an image)`, 'error');
      continue;
    }
    files.push({ file, url: URL.createObjectURL(file) });
  }
  render();
}

/**
 * Removes one file from the selection and frees its preview URL (avoids memory leaks).
 * @param {number} index  Position in the `files` array.
 */
function removeFile(index) {
  URL.revokeObjectURL(files[index].url);
  files.splice(index, 1);
  render();
}

/**
 * Rebuilds the file list from the `files` array: thumbnail, name,
 * original dimensions and size, and a remove button for each image.
 * Also enables/disables the Convert button and updates its label.
 */
function render() {
  clearResult(); // the selection changed, so any previous result no longer matches it
  fileList.innerHTML = '';
  files.forEach(({ file, url }, i) => {
    const li = document.createElement('li');

    const img = document.createElement('img');
    img.src = url;
    img.alt = '';

    const meta = document.createElement('div');
    meta.className = 'meta';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = file.name; // textContent (not innerHTML) so filenames can't inject HTML
    const dims = document.createElement('div');
    dims.className = 'dims';
    dims.textContent = `${(file.size / 1024).toFixed(0)} KB`;
    // The real pixel size is only known once the browser has decoded the image.
    img.onload = () => {
      dims.textContent = `${img.naturalWidth}×${img.naturalHeight} · ${(file.size / 1024).toFixed(0)} KB`;
    };
    meta.append(name, dims);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Remove';
    btn.textContent = '×';
    btn.onclick = () => removeFile(i);

    li.append(img, meta, btn);
    fileList.append(li);
  });
  convertBtn.disabled = files.length === 0;
  convertBtn.textContent = files.length > 1 ? `Convert ${files.length} images` : 'Convert';
}

// --- Selecting files --------------------------------------------------------

// File picker: add the chosen files, then reset the input so picking the same file again still fires "change".
fileInput.addEventListener('change', () => {
  addFiles(fileInput.files);
  fileInput.value = '';
});

// Drag-and-drop: preventDefault stops the browser from opening the image itself;
// the "over" class highlights the drop zone while a file is dragged over it.
['dragenter', 'dragover'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('over'); }));
dropzone.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));

// Keep the number next to the quality slider in sync while dragging it.
qualityInput.addEventListener('input', () => { qualityOut.textContent = qualityInput.value; });

// Changing the size or quality makes the previous result out of date, so hide its Download button.
[widthInput, heightInput, qualityInput].forEach((input) => input.addEventListener('input', clearResult));

// --- Converting -------------------------------------------------------------

/**
 * Reads the download filename the server put in the Content-Disposition header.
 * @param {Response} res
 * @param {string} fallback  Used if the header is missing.
 * @returns {string}
 */
function filenameFrom(res, fallback) {
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename="([^"]+)"/);
  return m ? m[1] : fallback;
}

/**
 * Convert button: uploads all selected images with the chosen size and quality,
 * then shows a Download button for the returned .webp (one image) or .zip (several).
 */
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // handle the upload with fetch instead of a page reload
  if (!files.length) return;

  // Same field names the server expects: width, height, quality, images.
  const fd = new FormData();
  fd.append('width', widthInput.value);
  fd.append('height', heightInput.value);
  fd.append('quality', qualityInput.value);
  files.forEach(({ file }) => fd.append('images', file));

  convertBtn.disabled = true; // prevent double submits while converting
  clearResult();
  setStatus(`Converting ${files.length} image(s)…`);
  try {
    const res = await fetch('/api/convert', { method: 'POST', body: fd });
    if (!res.ok) {
      // The server sends errors as { error: "message" }.
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Server error (${res.status})`);
    }

    // Keep the result in memory and let the user decide when to download it.
    const blob = await res.blob();
    const name = filenameFrom(res, files.length > 1 ? 'converted_webp.zip' : 'image.webp');
    showResult(blob, name);
    setStatus('Conversion finished. Click Download to save the file.', 'ok');
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    convertBtn.disabled = files.length === 0;
  }
});
