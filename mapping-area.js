(function() {
  let mappingModal = document.getElementById('mapping-modal');
  let openMappingModalBtn = document.getElementById('open-mapping-modal-btn');
  let closeMappingModalBtn = document.getElementById('close-mapping-modal');
  let pdfMappingCanvas = document.getElementById('mapping-pdf-canvas');
  let mappingCtx = pdfMappingCanvas.getContext('2d');
  let pdfMappingContainer = document.getElementById('pdf-mapping-container');
  let pdfDoc = null;
  let mappingCurrentPage = 1;
  let mappingTotalPages = 1;
  let isDrawing = false;
  let startX, startY, endX, endY;
  let mappingRectangles = [];
  let lastDragRect = null; // {x0, y0, x1, y1, page, name}
  let lastDragName = "";
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
  let mainFileInput = document.getElementById('file');

  // Radio group for even/odd/all
  let mappingPageMode = "all";
  document.getElementById("mapping-all").onchange = function() { if(this.checked) mappingPageMode = "all"; }
  document.getElementById("mapping-even").onchange = function() { if(this.checked) mappingPageMode = "even"; }
  document.getElementById("mapping-odd").onchange = function() { if(this.checked) mappingPageMode = "odd"; }

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

  function clearPendingRectVisual() {
    let pending = pdfMappingContainer.querySelector('.mapping-pending-rect');
    if (pending) pending.remove();
    let label = pdfMappingContainer.querySelector('.mapping-pending-rect-label');
    if (label) label.remove();
  }

  function showPendingRectVisual() {
    clearPendingRectVisual();
    if (!lastDragRect || lastDragRect.page !== mappingCurrentPage) return;
    let { x0, y0, x1, y1 } = lastDragRect;
    let minX = Math.min(x0, x1), minY = Math.min(y0, y1);
    let w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);

    let left = minX;
    let top = minY;
    let width = w;
    let height = h;
    let div = document.createElement('div');
    div.className = 'mapping-pending-rect';
    div.style.left = `${left}px`;
    div.style.top = `${top}px`;
    div.style.width = `${width}px`;
    div.style.height = `${height}px`;
    pdfMappingContainer.appendChild(div);

    // Label with name input
    let labelDiv = document.createElement('div');
    labelDiv.className = 'mapping-pending-rect-label';
    labelDiv.style.left = `${left}px`;
    labelDiv.style.top = `${Math.max(0, top - 29)}px`;

    let nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = "Mapping name (optional)";
    nameInput.value = lastDragName || "";
    nameInput.autocomplete = "off";
    nameInput.addEventListener('input', function() {
      lastDragName = nameInput.value;
    });

    labelDiv.appendChild(nameInput);
    pdfMappingContainer.appendChild(labelDiv);
    nameInput.focus();

    // If click outside before apply, clear
    setTimeout(() => {
      function outsideListener(e) {
        if (!labelDiv.contains(e.target) && !div.contains(e.target)) {
          lastDragRect = null;
          lastDragName = "";
          clearPendingRectVisual();
          document.removeEventListener('mousedown', outsideListener, true);
        }
      }
      document.addEventListener('mousedown', outsideListener, true);
    }, 0);
  }

  function renderAppliedRects() {
    let oldRects = pdfMappingContainer.querySelectorAll('.mapping-applied-rect');
    oldRects.forEach(r => r.remove());
    mappingRectangles.forEach(rect => {
      if (rect.page !== mappingCurrentPage - 1) return;
      let minX = Math.min(rect.x0, rect.x1), minY = Math.min(rect.y0, rect.y1);
      let w = Math.abs(rect.x1 - rect.x0), h = Math.abs(rect.y1 - rect.y0);

      let left = minX;
      let top = minY;
      let width = w;
      let height = h;

      let div = document.createElement('div');
      div.className = 'mapping-applied-rect';
      div.style.left = `${left}px`;
      div.style.top = `${top}px`;
      div.style.width = `${width}px`;
      div.style.height = `${height}px`;
      pdfMappingContainer.appendChild(div);
    });
  }

  function renderPage() {
    if (!pdfDoc) return;
    pdfDoc.getPage(mappingCurrentPage).then(page => {
      let viewport = page.getViewport({ scale: 1.0 });
      pdfMappingCanvas.width = viewport.width;
      pdfMappingCanvas.height = viewport.height;
      page.render({ canvasContext: mappingCtx, viewport: viewport }).promise.then(() => {
        renderAppliedRects();
        showPendingRectVisual();
      });
    });
    updatePageInfo();
  }

  function isFullRangeOddOrEven(rangeArr, mode) {
    if (!rangeArr.length || (mode !== 'even' && mode !== 'odd')) return false;
    let parity = mode === 'even' ? 0 : 1;
    for (let p of rangeArr) {
      if (p % 2 !== parity) return false;
    }
    return true;
  }

  function renderMappingsList() {
    mappingsListEl.innerHTML = '';
    if (!mappingRectangles.length) {
      saveMappingsBtn.style.display = "none";
      return;
    }
    // Group mappings by area + mode + name
    let grouped = [];
    mappingRectangles.forEach(rect => {
      let group = grouped.find(g =>
        g.x0 === rect.x0 && g.y0 === rect.y0 && g.x1 === rect.x1 && g.y1 === rect.y1 &&
        g.mode === rect.mode && (g.name || "") === (rect.name || "")
      );
      if (group) {
        group.pages.push(rect.page + 1);
      } else {
        grouped.push({
          x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1,
          mode: rect.mode,
          name: rect.name || "",
          pages: [rect.page + 1]
        });
      }
    });
    grouped.forEach(group => {
      group.pages.sort((a, b) => a - b);
      let first = group.pages[0], last = group.pages[group.pages.length - 1];
      let isContiguous = true;
      for (let i = 1; i < group.pages.length; i++) {
        if (group.pages[i] !== group.pages[i-1] + 1) {
          isContiguous = false;
          break;
        }
      }
      let modeStr = "";
      if(group.mode === "even") modeStr = " (even only)";
      if(group.mode === "odd") modeStr = " (odd only)";
      let rangeStr = "";
      if (group.pages.length === 1) {
        rangeStr = `Page ${group.pages[0]}${modeStr}`;
      } else if (isContiguous || isFullRangeOddOrEven(group.pages, group.mode)) {
        rangeStr = `Pages ${first}-${last}${modeStr}`;
      } else {
        rangeStr = `Pages ${group.pages.join(", ")}${modeStr}`;
      }
      // Compose mapping label: range, then mapping name bold if present
      let labelMain = `<span class="mapping-label-main">${rangeStr}</span>`;
      let label = group.name
        ? `${labelMain}: <span class="mapping-name">${escapeHTML(group.name)}</span>`
        : labelMain;
      const li = document.createElement('li');
      li.innerHTML = label;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.onclick = () => {
        mappingRectangles = mappingRectangles.filter(rect =>
          !(
            rect.x0 === group.x0 && rect.y0 === group.y0 && rect.x1 === group.x1 && rect.y1 === group.y1 &&
            rect.mode === group.mode && (rect.name || "") === (group.name || "") &&
            group.pages.includes(rect.page + 1)
          )
        );
        renderMappingsList();
        renderPage();
      };
      li.appendChild(removeBtn);
      mappingsListEl.appendChild(li);
    });
    // Show Save Mappings button and move below mapping list
    saveMappingsBtn.style.display = "block";
    setTimeout(() => {
      let listBottom = mappingsListEl.getBoundingClientRect().bottom;
      let parentRect = mappingsListEl.parentNode.getBoundingClientRect();
      saveMappingsBtn.style.marginTop = "18px";
      if (listBottom && parentRect) {
        let idealTop = listBottom - parentRect.top + 18;
        saveMappingsBtn.style.position = "absolute";
        saveMappingsBtn.style.top = `${idealTop}px`;
      } else {
        saveMappingsBtn.style.position = "relative";
        saveMappingsBtn.style.top = "";
      }
    }, 5);
  }

  function escapeHTML(str) {
    return (str || "").replace(/[&<>"']/g, function(m) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      })[m];
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
          lastDragRect = null;
          lastDragName = "";
          clearPendingRectVisual();
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
      clearPendingRectVisual();
      lastDragRect = null;
      lastDragName = "";
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
  if (applyAreaBtn) {
    applyAreaBtn.onclick = () => {
      if (!pdfDoc || !lastDragRect) return;
      let startPage = parseInt(mappingStartPageInput.value, 10) || mappingCurrentPage;
      let endPage = parseInt(mappingEndPageInput.value, 10) || mappingCurrentPage;
      if (startPage < 1) startPage = 1;
      if (endPage > mappingTotalPages) endPage = mappingTotalPages;
      if (endPage < startPage) [startPage, endPage] = [endPage, startPage];
      let x0 = lastDragRect.x0, y0 = lastDragRect.y0, x1 = lastDragRect.x1, y1 = lastDragRect.y1;
      let name = lastDragName || "";
      let mode = mappingPageMode;
      let pageIndices = [];
      for (let i = startPage - 1; i <= endPage - 1; i++) {
        if (
          mode === "all" ||
          (mode === "even" && ((i + 1) % 2 === 0)) ||
          (mode === "odd" && ((i + 1) % 2 === 1))
        ) {
          pageIndices.push(i);
        }
      }
      // Don't add if no pages selected
      if (pageIndices.length === 0) {
        lastDragRect = null;
        lastDragName = "";
        clearPendingRectVisual();
        return;
      }
      pageIndices.forEach(pageIdx => {
        mappingRectangles.push({
          page: pageIdx,
          x0, y0, x1, y1,
          mode: mode,
          name: name
        });
      });
      renderMappingsList();
      renderPage();
      lastDragRect = null;
      lastDragName = "";
      clearPendingRectVisual();
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
  let dragMinDistance = 4; // px
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
      const minDist = dragMinDistance;
      if (Math.abs(endX - startX) < minDist || Math.abs(endY - startY) < minDist) {
        // Not enough drag, don't create mapping area
        lastDragRect = null;
        lastDragName = "";
        clearPendingRectVisual();
        return;
      }
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
        lastDragRect = { x0, y0, x1, y1, page: mappingCurrentPage };
        lastDragName = "";
        showPendingRectVisual();
      });
    };
    pdfMappingCanvas.onmouseleave = () => {
      if (isDrawing) {
        isDrawing = false;
        mappingRectangleDiv.style.display = 'none';
        lastDragRect = null;
        lastDragName = "";
        clearPendingRectVisual();
      }
    };
  }
  if (mainFileInput) {
    mainFileInput.onchange = () => {
      pdfDoc = null;
      mappingRectangles.length = 0;
      if (mappingFilenameSpan) mappingFilenameSpan.textContent = "";
      renderMappingsList();
      lastDragRect = null;
      lastDragName = "";
      clearPendingRectVisual();
    };
  }
})();
