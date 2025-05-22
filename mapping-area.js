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
  let prevPageBtn = document.getElementById('mapping-prev-page-btn');
  let nextPageBtn = document.getElementById('mapping-next-page-btn');
  let saveMappingsBtn = document.getElementById('save-mappings-btn');
  let clearMappingsBtn = document.getElementById('clear-mappings-btn');
  let mappingFileInput = document.getElementById('mapping-file-input');
  let mappingFilenameSpan = document.getElementById('mapping-filename');

  // --- Utility ---
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
  }

  // --- Button Actions ---
  if (openMappingModalBtn) {
    openMappingModalBtn.onclick = () => {
      mappingModal.classList.add('show');
      if (pdfDoc) renderPage();
    };
  }
  if (closeMappingModalBtn) {
    closeMappingModalBtn.onclick = () => {
      mappingModal.classList.remove('show');
    };
  }

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
  if (mappingFileInput) {
    mappingFileInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      mappingFilenameSpan.textContent = file.name.replace(/\.[^.]+$/, '');
      const loadingTask = window.pdfjsLib.getDocument(await file.arrayBuffer());
      pdfDoc = await loadingTask.promise;
      mappingCurrentPage = 1;
      mappingTotalPages = pdfDoc.numPages;
      renderPage();
      mappingRectangles.length = 0;
      renderMappingsList();
    };
  }

  // --- Canvas Drawing ---
  if (pdfMappingCanvas) {
    pdfMappingCanvas.onmousedown = (e) => {
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
      if (!isDrawing) return;
      isDrawing = false;
      mappingRectangleDiv.style.display = 'none';
      // Store rectangle in PDF coordinates
      pdfDoc.getPage(mappingCurrentPage).then(page => {
        let viewport = page.getViewport({ scale: 1.0 });
        let scale = Math.min(
          pdfMappingCanvas.width / viewport.width,
          pdfMappingCanvas.height / viewport.height
        );
        let x0 = Math.min(startX, endX) / scale;
        let y0 = Math.min(startY, endY) / scale;
        let x1 = Math.max(startX, endX) / scale;
        let y1 = Math.max(startY, endY) / scale;
        mappingRectangles.push({
          page: mappingCurrentPage - 1,
          x0, y0, x1, y1
        });
        renderMappingsList();
        renderPage();
      });
    };
  }

  // --- On Modal Open, Reset State ---
  if (mappingModal) {
    mappingModal.addEventListener('show', () => {
      mappingCurrentPage = 1;
      renderPage();
    });
  }

  // --- Expose function to get mapping rectangles for backend submission ---
  window.getMappingAreasForSubmission = function() {
    // Returns array of { page, x0, y0, x1, y1 }
    return mappingRectangles.slice();
  };

  // Optionally, call window.getMappingAreasForSubmission() before submitting your PDF to backend
  // and include JSON.stringify([...]) as the value for the "mapping_areas" field.
})();
