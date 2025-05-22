(function() {
  // === Mapping Area Modal Logic (IIFE Scope) ===

  // --- Configurable Variables ---
  let mappingModal = document.getElementById('mapping-modal');
  let openMappingModalBtn = document.getElementById('open-mapping-modal-btn');
  let closeMappingModalBtn = document.getElementById('close-mapping-modal-btn');
  let pdfMappingCanvas = document.getElementById('mapping-pdf-canvas');
  let mappingCtx = pdfMappingCanvas.getContext('2d');
  let pdfDoc = null;
  let mappingCurrentPage = 1;
  let mappingTotalPages = 1;
  let isDrawing = false;
  let startX, startY, endX, endY;
  let mappingRectangles = [];
  let mappingRectangleDiv = document.getElementById('mapping-rectangle');
  let mappingsListEl = document.getElementById('mappings-list');
  let prevPageBtn = document.getElementById('prev-page-btn');
  let nextPageBtn = document.getElementById('next-page-btn');
  let saveMappingsBtn = document.getElementById('save-mappings-btn');
  let clearMappingsBtn = document.getElementById('clear-mappings-btn');
  let mappingFilenameSpan = document.getElementById('mapping-filename');

  // Page range and area input elements
  let mappingStartPageInput = document.getElementById('mapping-start-page');
  let mappingEndPageInput = document.getElementById('mapping-end-page');
  let mappingXInput = document.getElementById('mapping-x');
  let mappingYInput = document.getElementById('mapping-y');
  let mappingWInput = document.getElementById('mapping-w');
  let mappingHInput = document.getElementById('mapping-h');
  let applyAreaBtn = document.getElementById('apply-area-btn');
  let pageInfo = document.getElementById('page-info');

  // The main file input, used for both main form and mapping modal
  let mainFileInput = document.getElementById('file');

  // --- Utility ---
  function updatePageInfo() {
    if (pageInfo) pageInfo.textContent = `Page ${mappingCurrentPage} of ${mappingTotalPages}`;
    if (prevPageBtn) prevPageBtn.disabled = (mappingCurrentPage <= 1);
    if (nextPageBtn) nextPageBtn.disabled = (mappingCurrentPage >= mappingTotalPages);
    if (mappingStartPageInput) {
      mappingStartPageInput.max = mappingTotalPages;
      mappingStartPageInput.value = mappingCurrentPage;
    }
    if (mappingEndPageInput) {
      mappingEndPageInput.max = mappingTotalPages;
      mappingEndPageInput.value = mappingCurrentPage;
    }
  }

  function renderMappingsList() {
    mappingsListEl.innerHTML = '';
    mappingRectangles.forEach((rect, idx) => {
      const li = document.createElement('li');
      li.textContent = `Page ${rect.page + 1}: (${rect.x0.toFixed(1)}, ${rect.y0.toFixed(1)}) → (${rect.x1.toFixed(1)}, ${rect.y1.toFixed(1)})`;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.onclick = () => {
        mappingRectangles.splice(idx, 1);
        renderMappingsList();
        renderPage();
      };
      li.appendChild(removeBtn);
      mappingsListEl.appendChild(li);
    });
  }

  function renderPage() {
    if (!pdfDoc) return;
    pdfDoc.getPage(mappingCurrentPage).then(page => {
      let viewport = page.getViewport({ scale: 1.0 });
      let scale = Math.min(
        pdfMappingCanvas.width / viewport.width,
        pdfMappingCanvas.height / viewport.height
      );
      viewport = page.getViewport({ scale });
      pdfMappingCanvas.width = viewport.width;
      pdfMappingCanvas.height = viewport.height;

      // Clear and render
      page.render({ canvasContext: mappingCtx, viewport: viewport }).promise.then(() => {
        // Draw rectangles for this page
        mappingRectangles.forEach(rect => {
          if (rect.page === mappingCurrentPage - 1) {
            mappingCtx.save();
            mappingCtx.strokeStyle = '#3b82f6';
            mappingCtx.lineWidth = 2;
            mappingCtx.setLineDash([6, 4]);
            mappingCtx.strokeRect(
              rect.x0 * scale,
              rect.y0 * scale,
              (rect.x1 - rect.x0) * scale,
              (rect.y1 - rect.y0) * scale
            );
            mappingCtx.restore();
          }
        });
      });
    });
    updatePageInfo();
  }

  // --- Modal Open/Close Handlers ---
  if (openMappingModalBtn) {
    openMappingModalBtn.onclick = async () => {
      mappingModal.classList.add('show');
      // When opening, load the PDF from the main file input if it's present
      if (mainFileInput && mainFileInput.files.length > 0) {
        const file = mainFileInput.files[0];
        if (file && file.type === "application/pdf") {
          mappingFilenameSpan.textContent = file.name.replace(/\.[^.]+$/, '');
          const arrayBuffer = await file.arrayBuffer();
          const loadingTask = window.pdfjsLib.getDocument(arrayBuffer);
          pdfDoc = await loadingTask.promise;
          mappingCurrentPage = 1;
          mappingTotalPages = pdfDoc.numPages;
          renderPage();
          mappingRectangles.length = 0;
          renderMappingsList();
        } else {
          mappingFilenameSpan.textContent = "";
          pdfDoc = null;
        }
      } else {
        mappingFilenameSpan.textContent = "";
        pdfDoc = null;
      }
      updatePageInfo();
    };
  }
  if (closeMappingModalBtn) {
    closeMappingModalBtn.onclick = () => {
      mappingModal.classList.remove('show');
    };
  }

  // --- Page Navigation ---
  if (prevPageBtn) {
    prevPageBtn.onclick = () => {
      if (mappingCurrentPage > 1) {
        mappingCurrentPage--;
        renderPage();
      }
    };
  }
  if (nextPageBtn) {
    nextPageBtn.onclick = () => {
      if (mappingCurrentPage < mappingTotalPages) {
        mappingCurrentPage++;
        renderPage();
      }
    };
  }

  // --- Apply Area to Range ---
  if (applyAreaBtn) {
    applyAreaBtn.onclick = () => {
      if (!pdfDoc) return;
      // Get page range
      let startPage = parseInt(mappingStartPageInput.value, 10) || mappingCurrentPage;
      let endPage = parseInt(mappingEndPageInput.value, 10) || mappingCurrentPage;
      if (startPage < 1) startPage = 1;
      if (endPage > mappingTotalPages) endPage = mappingTotalPages;
      if (endPage < startPage) [startPage, endPage] = [endPage, startPage];

      // Get area
      let x = parseFloat(mappingXInput.value) || 0;
      let y = parseFloat(mappingYInput.value) || 0;
      let w = parseFloat(mappingWInput.value) || 0;
      let h = parseFloat(mappingHInput.value) || 0;
      let x0 = x;
      let y0 = y;
      let x1 = x + w;
      let y1 = y + h;

      for (let pageIdx = startPage - 1; pageIdx <= endPage - 1; pageIdx++) {
        mappingRectangles.push({
          page: pageIdx,
          x0, y0, x1, y1
        });
      }
      renderMappingsList();
      renderPage();
    };
  }

  // --- Clear/Save ---
  if (clearMappingsBtn) {
    clearMappingsBtn.onclick = () => {
      mappingRectangles.length = 0;
      renderMappingsList();
      renderPage();
    };
  }
  if (saveMappingsBtn) {
    saveMappingsBtn.onclick = () => {
      // Save as JSON for backend
      const mappingData = JSON.stringify(mappingRectangles);
      // For demo: download as file
      const blob = new Blob([mappingData], { type: "application/json" });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (mappingFilenameSpan.textContent || "mapping-areas") + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      document.body.removeChild(a);
      // Or: emit event / send to backend as needed
    };
  }

  // --- Canvas Drawing ---
  if (pdfMappingCanvas) {
    pdfMappingCanvas.onmousedown = (e) => {
      if (!pdfDoc) return;
      isDrawing = true;
      const rect = pdfMappingCanvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      mappingRectangleDiv.style.display = 'block';
      mappingRectangleDiv.style.left = startX + 'px';
      mappingRectangleDiv.style.top = startY + 'px';
      mappingRectangleDiv.style.width = '0px';
      mappingRectangleDiv.style.height = '0px';
    };
    pdfMappingCanvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = pdfMappingCanvas.getBoundingClientRect();
      endX = e.clientX - rect.left;
      endY = e.clientY - rect.top;
      const left = Math.min(startX, endX);
      const top = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);
      mappingRectangleDiv.style.left = left + 'px';
      mappingRectangleDiv.style.top = top + 'px';
      mappingRectangleDiv.style.width = width + 'px';
      mappingRectangleDiv.style.height = height + 'px';
    };
    pdfMappingCanvas.onmouseup = (e) => {
      if (!isDrawing || !pdfDoc) return;
      isDrawing = false;
      mappingRectangleDiv.style.display = 'none';
      pdfDoc.getPage(mappingCurrentPage).then(page => {
        let viewport = page.getViewport({ scale: 1.0 });
        let scale = Math.min(
          pdfMappingCanvas.width / viewport.width,
          pdfMappingCanvas.height / viewport.height
        );
        // Convert canvas coordinates back to PDF coordinates
        const x0 = Math.min(startX, endX) / scale;
        const y0 = Math.min(startY, endY) / scale;
        const x1 = Math.max(startX, endX) / scale;
        const y1 = Math.max(startY, endY) / scale;
        mappingRectangles.push({
          page: mappingCurrentPage - 1,
          x0, y0, x1, y1
        });
        renderMappingsList();
        renderPage();
      });
    };
    pdfMappingCanvas.onmouseleave = () => {
      if (isDrawing) {
        isDrawing = false;
        mappingRectangleDiv.style.display = 'none';
      }
    };
  }

  // --- Optionally, reset mapping when main file input changes ---
  if (mainFileInput) {
    mainFileInput.onchange = () => {
      pdfDoc = null;
      mappingRectangles.length = 0;
      if (mappingFilenameSpan) mappingFilenameSpan.textContent = "";
      renderMappingsList();
    };
  }

})();
