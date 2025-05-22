// mapping-area.js

let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let pdfUrl = null;
let scale = 1.0;

let mappings = []; // {startPage, endPage, x, y, w, h}

// Elements
const jobTypeSelect = document.getElementById('job-type');
const setMappingAreaBtn = document.getElementById('set-mapping-area-btn');
const pdfUpload = document.getElementById('pdf-upload');
const modal = document.getElementById('mapping-modal');
const closeModal = document.getElementById('close-mapping-modal');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfo = document.getElementById('page-info');
const pdfContainer = document.getElementById('pdf-mapping-container');
const canvas = document.getElementById('mapping-pdf-canvas');
const ctx = canvas.getContext('2d');
const rectDiv = document.getElementById('mapping-rectangle');
const startPageInput = document.getElementById('mapping-start-page');
const endPageInput = document.getElementById('mapping-end-page');
const xInput = document.getElementById('mapping-x');
const yInput = document.getElementById('mapping-y');
const wInput = document.getElementById('mapping-w');
const hInput = document.getElementById('mapping-h');
const applyAreaBtn = document.getElementById('apply-area-btn');
const mappingsList = document.getElementById('mappings-list');
const saveMappingsBtn = document.getElementById('save-mappings-btn');

// Show/hide set mapping btn
jobTypeSelect.addEventListener('change', () => {
  if (jobTypeSelect.value === 'add-links-utm' && pdfUpload.files.length > 0) {
    setMappingAreaBtn.style.display = '';
  } else {
    setMappingAreaBtn.style.display = 'none';
  }
});

// Show/hide set mapping btn on file upload
pdfUpload.addEventListener('change', () => {
  if (jobTypeSelect.value === 'add-links-utm' && pdfUpload.files.length > 0) {
    setMappingAreaBtn.style.display = '';
  } else {
    setMappingAreaBtn.style.display = 'none';
  }
});

// Open mapping modal
setMappingAreaBtn.addEventListener('click', () => {
  if (!pdfUpload.files.length) return;
  mappings = [];
  openMappingModal();
});

function openMappingModal() {
  modal.style.display = 'block';
  // Load PDF
  const file = pdfUpload.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    loadPdf(e.target.result);
  };
  reader.readAsArrayBuffer(file);
}

closeModal.onclick = () => {
  closeMappingModal();
};

function closeMappingModal() {
  modal.style.display = 'none';
}

// PDF.js setup
async function loadPdf(arrayBuffer) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.2.67/build/pdf.worker.min.js';
  pdfDoc = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
  totalPages = pdfDoc.numPages;
  currentPage = 1;

  startPageInput.max = totalPages;
  endPageInput.max = totalPages;
  endPageInput.value = currentPage;
  startPageInput.value = currentPage;

  renderPage(currentPage);
  updatePageInfo();
  listMappings();
}

// Page navigation
prevPageBtn.onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    updatePageInfo();
  }
};
nextPageBtn.onclick = () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage(currentPage);
    updatePageInfo();
  }
};
function updatePageInfo() {
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  startPageInput.value = currentPage;
  endPageInput.value = currentPage;
}

// Render page
async function renderPage(pageNum) {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({scale: 1.0});
  scale = Math.min(canvas.width / viewport.width, canvas.height / viewport.height);
  const scaledViewport = page.getViewport({scale});

  canvas.width = scaledViewport.width;
  canvas.height = scaledViewport.height;

  await page.render({canvasContext: ctx, viewport: scaledViewport}).promise;
}

// Rectangle drawing logic
let isDrawing = false, startX, startY;

pdfContainer.onmousedown = function(e) {
  // Only start drawing if within canvas bounds
  const rect = canvas.getBoundingClientRect();
  if (e.target !== canvas) return;
  isDrawing = true;
  startX = e.offsetX;
  startY = e.offsetY;
  rectDiv.style.left = startX + 'px';
  rectDiv.style.top = startY + 'px';
  rectDiv.style.width = '0px';
  rectDiv.style.height = '0px';
  rectDiv.style.display = 'block';
};
pdfContainer.onmousemove = function(e) {
  if (!isDrawing) return;
  const currX = e.offsetX, currY = e.offsetY;
  const width = Math.abs(currX - startX);
  const height = Math.abs(currY - startY);
  rectDiv.style.left = Math.min(currX, startX) + 'px';
  rectDiv.style.top = Math.min(currY, startY) + 'px';
  rectDiv.style.width = width + 'px';
  rectDiv.style.height = height + 'px';
};
pdfContainer.onmouseup = function(e) {
  if (!isDrawing) return;
  isDrawing = false;
  // Set input values based on drawn rectangle
  const rect = rectDiv.getBoundingClientRect();
  const containerRect = canvas.getBoundingClientRect();
  const x = parseInt(rectDiv.style.left);
  const y = parseInt(rectDiv.style.top);
  const w = parseInt(rectDiv.style.width);
  const h = parseInt(rectDiv.style.height);
  xInput.value = Math.round(x);
  yInput.value = Math.round(y);
  wInput.value = Math.round(w);
  hInput.value = Math.round(h);
  rectDiv.style.display = 'block';
};

// Apply area to page range
applyAreaBtn.onclick = () => {
  const start = parseInt(startPageInput.value);
  const end = parseInt(endPageInput.value);
  const x = parseInt(xInput.value);
  const y = parseInt(yInput.value);
  const w = parseInt(wInput.value);
  const h = parseInt(hInput.value);
  if (w <= 0 || h <= 0 || isNaN(start) || isNaN(end)) return;
  mappings.push({
    startPage: Math.min(start, end),
    endPage: Math.max(start, end),
    x, y, w, h
  });
  listMappings();
  // Clear rectangle
  rectDiv.style.display = 'none';
};

function listMappings() {
  mappingsList.innerHTML = '';
  mappings.forEach((m, i) => {
    const li = document.createElement('li');
    li.textContent = `Pages ${m.startPage}-${m.endPage}: x=${m.x}, y=${m.y}, w=${m.w}, h=${m.h}`;
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Remove';
    delBtn.onclick = () => {
      mappings.splice(i, 1);
      listMappings();
    };
    li.appendChild(delBtn);
    mappingsList.appendChild(li);
  });
}

// Rectangle manual input
[xInput, yInput, wInput, hInput].forEach(inp => {
  inp.addEventListener('input', () => {
    rectDiv.style.left = xInput.value + 'px';
    rectDiv.style.top = yInput.value + 'px';
    rectDiv.style.width = wInput.value + 'px';
    rectDiv.style.height = hInput.value + 'px';
    rectDiv.style.display = 'block';
  });
});

// Save mappings and close modal
saveMappingsBtn.onclick = () => {
  // Here, send mappings to your backend or save for next process step.
  // For prototype, we just close the modal.
  closeMappingModal();
  alert('Mappings saved:\n' + JSON.stringify(mappings, null, 2));
};

// Optional: Hide rectangle on modal close
closeModal.onclick = () => {
  rectDiv.style.display = 'none';
  closeMappingModal();
};