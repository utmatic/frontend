(function() {
  let mappingModal = document.getElementById('mapping-modal');
  let openMappingModalBtn = document.getElementById('open-mapping-modal-btn');
  let closeMappingModalBtn = document.getElementById('close-mapping-modal');
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
  let mappingFilenameSpan = document.getElementById('mapping-filename');
  let mappingStartPageInput = document.getElementById('mapping-start-page');
  let mappingEndPageInput = document.getElementById('mapping-end-page');
  let applyAreaBtn = document.getElementById('apply-area-btn');
  let pageInfo = document.getElementById('page-info');
  let altPagesCheckbox = document.getElementById('mapping-alternate-pages');
  let mainFileInput = document.getElementById('file');
  let lastDragRect = null;
  let lastDragPage = null;

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

      page.render({ canvasContext: mappingCtx, viewport: viewport }).promise.then(() => {
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

  function renderMappingsList() {
    mappingsListEl.innerHTML = '';
    if (!mappingRectangles.length) return;

    // Group mappings by area
    let grouped = [];
    mappingRectangles.forEach(rect => {
      let group = grouped.find(g =>
        g.x0 === rect.x0 && g.y0 === rect.y0 && g.x1 === rect.x1 && g.y1 === rect.y1
      );
      if (group) {
        group.pages.push(rect.page + 1);
      } else {
        grouped.push({
          x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1,
          pages: [rect.page + 1]
        });
      }
    });
    // For each group, display as page range(s)
    grouped.forEach(group => {
      group.pages.sort((a, b) => a - b);
      let ranges = [];
      let rangeStart = group.pages[0];
      let rangeEnd = group.pages[0];
      for (let i = 1; i < group.pages.length; i++) {
        if (group.pages[i] === rangeEnd + 1) {
          rangeEnd = group.pages[i];
        } else {
          ranges.push([rangeStart, rangeEnd]);
          rangeStart = group.pages[i];
          rangeEnd = group.pages[i];
        }
      }
      ranges.push([rangeStart, rangeEnd]);
      ranges.forEach(r => {
        const li = document.createElement('li');
        const coordString = `(${Math.round(group.x0)}, ${Math.round(group.y0)}, w=${Math.round(group.x1-group.x0)}, h=${Math.round(group.y1-group.y0)})`;
        li.textContent = r[0] === r[1]
          ? `Page ${r[0]}: ${coordString}`
          : `Pages ${r[0]}-${r[1]}: ${coordString}`;
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.onclick = () => {
          mappingRectangles = mappingRectangles.filter(rect =>
            !(rect.x0 === group.x0 && rect.y0 === group.y0 && rect.x1 === group.x1 && rect.y1 === group.y1 &&
              rect.page + 1 >= r[0] && rect.page + 1 <= r[1])
          );
          renderMappingsList();
          renderPage();
        };
        li.appendChild(removeBtn);
        mappingsListEl.appendChild(li);
      });
    });
  }

  if (openMappingModalBtn) {
    openMappingModalBtn.onclick = async () => {
      mappingModal.classList.add('show');
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
  // Support closing modal on background click
  mappingModal.addEventListener('mousedown', function(e) {
    if (e.target === mappingModal) mappingModal.classList.remove('show');
  });

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
  if (applyAreaBtn) {
    applyAreaBtn.onclick = () => {
      if (!pdfDoc || !lastDragRect) return;
      let startPage = parseInt(mappingStartPageInput.value, 10) || mappingCurrentPage;
      let endPage = parseInt(mappingEndPageInput.value, 10) || mappingCurrentPage;
      if (startPage < 1) startPage = 1;
      if (endPage > mappingTotalPages) endPage = mappingTotalPages;
      if (endPage < startPage) [startPage, endPage] = [endPage, startPage];

      let x0 = lastDragRect.x0, y0 = lastDragRect.y0, x1 = lastDragRect.x1, y1 = lastDragRect.y1;

      let useAlt = altPagesCheckbox && altPagesCheckbox.checked;
      let pageIndices = [];
      for (let i = startPage - 1; i <= endPage - 1; i++) {
        if (!useAlt || ((i - (startPage - 1)) % 2 === 0)) {
          pageIndices.push(i);
        }
      }

      pageIndices.forEach(pageIdx => {
        mappingRectangles.push({
          page: pageIdx,
          x0, y0, x1, y1
        });
      });
      renderMappingsList();
      renderPage();
    };
  }
  if (saveMappingsBtn) {
    saveMappingsBtn.onclick = () => {
      const mappingData = JSON.stringify(mappingRectangles);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([mappingData], { type: "application/json" }));
      a.download = (mappingFilenameSpan.textContent || "mapping-areas") + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      document.body.removeChild(a);
    };
  }
  // Canvas drawing
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
        const x0 = Math.min(startX, endX) / scale;
        const y0 = Math.min(startY, endY) / scale;
        const x1 = Math.max(startX, endX) / scale;
        const y1 = Math.max(startY, endY) / scale;
        lastDragRect = { x0, y0, x1, y1 };
        lastDragPage = mappingCurrentPage;
      });
    };
    pdfMappingCanvas.onmouseleave = () => {
      if (isDrawing) {
        isDrawing = false;
        mappingRectangleDiv.style.display = 'none';
      }
    };
  }
  if (mainFileInput) {
    mainFileInput.onchange = () => {
      pdfDoc = null;
      mappingRectangles.length = 0;
      if (mappingFilenameSpan) mappingFilenameSpan.textContent = "";
      renderMappingsList();
    };
  }
})();
