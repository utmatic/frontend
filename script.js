const lastFileByTab = {}; // <--- PUT THIS HERE!
window.addEventListener("load", () => {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
  }
});

// Guarantee pdfjsViewer is available globally for all UMD/CDN environments (for possible future use)
window.pdfjsViewer =
  window.pdfjsViewer ||
  window.pdfjsDistWebPdf_viewer ||
  window['pdfjs-dist/web/pdf_viewer'] ||
  undefined;

// SVG ICONS
const TAG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" style="height:1.15em;vertical-align:-0.13em;" stroke-width="1.7" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"/></svg>`;
const LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="height:1.15em;vertical-align:-0.13em;"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>`;

let baseUrlMemory = JSON.parse(localStorage.getItem('baseUrlMemory') || "[]");
function updateBaseUrlMemory(newUrl) {
  if (newUrl && !baseUrlMemory.includes(newUrl)) {
    baseUrlMemory.push(newUrl);
    if (baseUrlMemory.length > 15) baseUrlMemory.shift();
    localStorage.setItem('baseUrlMemory', JSON.stringify(baseUrlMemory));
  }
  let dl = document.getElementById('base-url-datalist');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'base-url-datalist';
    document.body.appendChild(dl);
  }
  dl.innerHTML = baseUrlMemory.map(url => `<option value="${url}">`).join('');
}
updateBaseUrlMemory("");
let docCount = 1;
const MAX_DOCS = 5;
const MAX_TARGET_ROWS = 5;
const tabBar = document.getElementById("tab-bar");
const tabContents = document.getElementById("tab-contents");
const fileList = document.getElementById("file-list");
const processBtn = document.getElementById("process-btn");

// Track per-tab last saved state for Save/Dirty logic
let tabLastSavedState = {};

// PDF Previewer Zoom Button Listeners
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("zoom-in-btn").addEventListener("click", () => {
    if (pdfZoomLevel < pdfZoomMax) {
      pdfZoomLevel = Math.min(pdfZoomLevel + pdfZoomStep, pdfZoomMax);
      renderPage();
    }
  });
  document.getElementById("zoom-out-btn").addEventListener("click", () => {
    if (pdfZoomLevel > pdfZoomMin) {
      pdfZoomLevel = Math.max(pdfZoomLevel - pdfZoomStep, pdfZoomMin);
      renderPage();
    }
  });
  // No need to call updateZoomDisplay() anymore
});

function showSpinner() { 
  document.getElementById('loader').classList.add('active');
}
function hideSpinner() { 
  document.getElementById('loader').classList.remove('active');
}
function getTabCount() { return tabBar.querySelectorAll(".tab[data-tab]").length; }
function updateDeleteTabButtons() {
  const tabs = tabBar.querySelectorAll(".tab[data-tab]");
  const count = tabs.length;
  tabs.forEach(tab => {
    const delBtn = tab.querySelector(".delete-tab");
    if (delBtn) {
      delBtn.disabled = (count === 1);
      if (count === 1) {
        delBtn.setAttribute("disabled", "true");
        delBtn.style.opacity = "0.3";
        delBtn.style.cursor = "not-allowed";
      } else {
        delBtn.removeAttribute("disabled");
        delBtn.style.opacity = "";
        delBtn.style.cursor = "";
      }
    }
  });
}
function updateAddTabButton() {
  const addTabBtn = document.getElementById("add-tab");
  const numDocs = getTabCount();
  addTabBtn.disabled = numDocs >= MAX_DOCS;
  addTabBtn.style.opacity = numDocs >= MAX_DOCS ? "0.5" : "1";
  addTabBtn.style.cursor = numDocs >= MAX_DOCS ? "not-allowed" : "pointer";
}
function updateTabBarCount() {
  const numTabs = getTabCount();
  tabBar.setAttribute('data-tabs', numTabs);
  updateDeleteTabButtons();
}
function setActiveTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
  document.querySelectorAll(".tab-bar .tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`.tab-content#${tabId}`)?.classList.add("active");
  document.querySelector(`.tab-bar .tab[data-tab="${tabId}"]`)?.classList.add("active");
}

function formToHash(form) {
  // Collect all input, select, and textarea values (ignoring hidden/disabled)
  let data = [];
  form.querySelectorAll('input, select, textarea').forEach(input => {
    if (input.type === "file") {
      data.push(input.name + "=" + (input.files[0]?.name || ""));
    } else if (!input.closest('.hidden') && !input.disabled) {
      // For checkboxes and radios, use checked state; else use value
      if (input.type === "checkbox" || input.type === "radio") {
        data.push(input.name + "=" + input.checked);
      } else {
        data.push(input.name + "=" + input.value);
      }
    }
  });
  return data.join("&");
}

function updateFileListStatus(tabId, name, saved, jobType) {
  let item = fileList.querySelector(`[data-tab="${tabId}"]`);
  if (!item) {
    item = document.createElement("li");
    item.dataset.tab = tabId;
    fileList.appendChild(item);
  }

  // --- FIX: Always fully reset the item to avoid 'drifting' rightward ---
  item.innerHTML = "";

  // Job icons
  let jobIcons = document.createElement('span');
  jobIcons.className = 'job-icons';
  if (jobType === "utm_only") {
    jobIcons.innerHTML = TAG_ICON;
  } else if (jobType === "links_and_utm") {
    jobIcons.innerHTML = LINK_ICON;
  }
  item.appendChild(jobIcons);

  // Saved checkmark
  if (saved) {
    const checkSvg = document.createElement('span');
    checkSvg.innerHTML = `<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>`;
    item.appendChild(checkSvg);
    item.className = "saved";
  } else {
    item.className = "";
  }

  // Filename (always at the end)
  let nameSpan = document.createElement('span');
  nameSpan.className = 'file-list-name';
  nameSpan.textContent = name || "Untitled Document";
  item.appendChild(nameSpan);

  // Disable processBtn unless all docs are saved
  processBtn.disabled = ![...fileList.children].every(li => li.classList.contains("saved")) || fileList.childElementCount === 0;
}

// ---- MULTI-FILE UPLOAD ON CHOOSE FILE ----
function renderFormFields(form, tabId, docName, fileObj) {
  // PDF Upload
  const pdfField = document.createElement("div");
  pdfField.className = "field-group";
  const pdfLabel = document.createElement("label");
  pdfLabel.htmlFor = "file";
  pdfLabel.textContent = "Upload PDF";
  const fileInputWrapper = document.createElement("div");
  fileInputWrapper.className = "custom-file-input-wrapper";
  const fileInputLabel = document.createElement("label");
  fileInputLabel.className = "custom-file-input-label";
  fileInputLabel.textContent = "Choose File";
  fileInputLabel.setAttribute("tabindex", "0");
  // MULTIPLE attribute here!
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".pdf,application/pdf";
  fileInput.name = "file"; // FIXED: must match backend
  fileInput.id = "file";
  fileInput.required = true;
  fileInput.className = "custom-file-input";
  fileInput.tabIndex = -1;
  fileInput.multiple = true;

  const fileNameSpan = document.createElement("span");
  fileNameSpan.className = "custom-file-filename";
  fileNameSpan.textContent = "No file chosen";

  // --- PATCH: Track last selected file for dialog cancel ---
  let lastFile = fileObj instanceof File ? fileObj : null;

  if (fileObj instanceof File) {
    const dt = new DataTransfer();
    dt.items.add(fileObj);
    fileInput.files = dt.files;
    lastFileByTab[tabId] = fileObj; 
    fileNameSpan.textContent = fileObj.name;
    setTimeout(() => {
      const filenameInput = form.querySelector("input[name='filename']");
      if (filenameInput) {
        let base = fileObj.name.replace(/\.pdf$/i, "");
        filenameInput.value = base;
        const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
        if (tabLabel) tabLabel.textContent = base;
        let jtSelect = form.querySelector('select[name="job_type"]');
        let jt = jtSelect ? jtSelect.value : "";
        updateFileListStatus(tabId, base, false, jt);
      }
    });
  }

  fileInput.addEventListener('click', function() {
    fileInput.dataset.prevValue = fileInput.value;
    fileInput.dataset.lastName = fileNameSpan.textContent;
  });

  fileInput.addEventListener("change", function() {
    const files = Array.from(fileInput.files);

    if (files.length > 0) {
      lastFileByTab[tabId] = files[0];
      if (files.length > 1) {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInput.files = dt.files;
        fileNameSpan.textContent = files[0].name;
        fileNameSpan.style.opacity = "1";
        const filenameInput = form.querySelector("input[name='filename']");
        if (filenameInput) {
          let base = files[0].name.replace(/\.pdf$/i, "");
          filenameInput.value = base;
          const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
          if (tabLabel) tabLabel.textContent = base;
          let jtSelect = form.querySelector('select[name="job_type"]');
          let jt = jtSelect ? jtSelect.value : "";
          updateFileListStatus(tabId, base, false, jt);
          tabLastSavedState[tabId] = "";
          checkDirtyAndUpdateSaveBtn();
        }
        let slots = MAX_DOCS - getTabCount();
        for (let i = 1; i < files.length && slots > 0; ++i, --slots) {
          createTab(files[i]);
        }
      } else {
        fileNameSpan.textContent = files[0].name;
        fileNameSpan.style.opacity = "1";
        const filenameInput = form.querySelector("input[name='filename']");
        if (filenameInput) {
          let base = files[0].name.replace(/\.pdf$/i, "");
          filenameInput.value = base;
          const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
          if (tabLabel) tabLabel.textContent = base;
          let jtSelect = form.querySelector('select[name="job_type"]');
          let jt = jtSelect ? jtSelect.value : "";
          updateFileListStatus(tabId, base, false, jt);
          tabLastSavedState[tabId] = "";
          checkDirtyAndUpdateSaveBtn();
        }
      }
    } else {
      const prevFile = lastFileByTab[tabId];
      if (prevFile instanceof File) {
        const dt = new DataTransfer();
        dt.items.add(prevFile);
        fileInput.files = dt.files;
        lastFileByTab[tabId] = prevFile;
        fileNameSpan.textContent = prevFile.name;
        fileNameSpan.style.opacity = "1";
        const filenameInput = form.querySelector("input[name='filename']");
        if (filenameInput) {
          let base = prevFile.name.replace(/\.pdf$/i, "");
          filenameInput.value = base;
          const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
          if (tabLabel) tabLabel.textContent = base;
          let jtSelect = form.querySelector('select[name="job_type"]');
          let jt = jtSelect ? jtSelect.value : "";
          updateFileListStatus(tabId, base, false, jt);
        }
      } else {
        fileNameSpan.textContent = "No file chosen";
        fileNameSpan.style.opacity = "0.6";
        const filenameInput = form.querySelector("input[name='filename']");
        if (filenameInput) filenameInput.value = "";
        const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
        if (tabLabel) tabLabel.textContent = "";
        updateFileListStatus(tabId, "", false, "");
      }
    }
  });

  fileInputLabel.appendChild(fileInput);
  fileInputWrapper.appendChild(fileInputLabel);
  fileInputWrapper.appendChild(fileNameSpan);
  pdfField.appendChild(pdfLabel);
  pdfField.appendChild(fileInputWrapper);

  form.appendChild(pdfField);

  // --- Job Type Row ---
  const jobTypeRow = document.createElement("div");
  jobTypeRow.className = "field-row";
  jobTypeRow.style.display = "flex";
  jobTypeRow.style.gap = "1rem";
  jobTypeRow.style.alignItems = "center";

  // Job Type Field
  const jobTypeField = document.createElement("div");
  jobTypeField.className = "field-group job-type-group";
  jobTypeField.style.flex = "1";
  jobTypeField.style.minWidth = 0;
  const jobTypeLabel = document.createElement("label");
  jobTypeLabel.htmlFor = "job_type";
  jobTypeLabel.textContent = "Job Type";
  const jobTypeSelect = document.createElement("select");
  jobTypeSelect.name = "job_type";
  jobTypeSelect.required = true;
  jobTypeSelect.style.width = "100%";
  jobTypeSelect.style.boxSizing = "border-box";

  [
    { value: "", label: "Select one", icon: "" },
    { value: "utm_only", label: "Add UTM Only", icon: TAG_ICON },
    { value: "links_and_utm", label: "Add Links and UTM", icon: LINK_ICON }
  ].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    jobTypeSelect.appendChild(option);
  });

  jobTypeField.appendChild(jobTypeLabel);
  jobTypeField.appendChild(jobTypeSelect);

  // Only append jobTypeField (no mapping tool in row)
  jobTypeRow.appendChild(jobTypeField);
  form.appendChild(jobTypeRow);

  // --- Target Format & Base URL dynamic rows ---
  const targetBaseRowsWrapper = document.createElement("div");
  targetBaseRowsWrapper.className = "field-row-wrapper hidden";
  form.appendChild(targetBaseRowsWrapper);
  const addNewRowBtn = document.createElement("button");
  addNewRowBtn.type = "button";
  addNewRowBtn.className = "add-new-row-btn";
  addNewRowBtn.textContent = "+ Add new";
  addNewRowBtn.style.marginLeft = "0";
  addNewRowBtn.style.marginBottom = "0.18em";
  addNewRowBtn.style.marginTop = "0";
  addNewRowBtn.style.display = "block";
  targetBaseRowsWrapper.appendChild(addNewRowBtn);
  addTargetBaseRow(targetBaseRowsWrapper, form);
  function addTargetBaseRow(wrapper, form) {
    const fieldRow = document.createElement("div");
    fieldRow.className = "field-row";

    // Target Format
    const tfGroup = document.createElement("div");
    tfGroup.className = "field-group";
    tfGroup.style.flex = "1";
    tfGroup.style.minWidth = 0;
    const tfInput = document.createElement("input");
    tfInput.type = "text";
    tfInput.name = "target_format";
    tfInput.placeholder = "Target Format";
    tfInput.required = true;
    tfInput.style.width = "100%";
    tfInput.style.boxSizing = "border-box";
    tfGroup.appendChild(tfInput);

    // Base URL
    const buGroup = document.createElement("div");
    buGroup.className = "field-group base-url-group";
    buGroup.style.flex = "1";
    buGroup.style.minWidth = 0;
    const buInput = document.createElement("input");
    buInput.type = "text";
    buInput.name = "base_url";
    buInput.placeholder = "Base URL";
    buInput.required = true;
    buInput.setAttribute('list', 'base-url-datalist');
    buInput.style.width = "100%";
    buInput.style.boxSizing = "border-box";
    buGroup.appendChild(buInput);

    // Actions column: info icon for first row, delete for other rows
    const delCol = document.createElement("div");
    delCol.className = "delete-col";
    if (wrapper.querySelectorAll(".field-row").length === 0) {
      // FIRST row: Info icon and popup
      const infoBtn = document.createElement("button");
      infoBtn.type = "button";
      infoBtn.className = "info-icon-btn base-url-info-btn";
      infoBtn.tabIndex = 0;
      infoBtn.setAttribute("aria-label", "How to use Base URL and Target Formats?");
      infoBtn.style.display = "none"; // will show only for Add Links and UTM

      infoBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="info-svg"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`;

      const infoPopup = document.createElement("div");
      infoPopup.className = "info-popup base-url-info-popup";
      infoPopup.innerHTML = `
<b>Target Format</b><br>
This defines the pattern of items you want to link in your document.  
Use <b>N</b> for numbers, <b>L</b> for letters:
<ul style="margin: 0.5em 0 0.5em 1.2em; padding: 0;">
  <li><code>NNNLL</code> → <code>123AB</code></li>
  <li><code>LLLNN</code> → <code>ABC12</code></li>
</ul><br>
<b>Base URL</b><br>
The starting part of your link, like:<br>
<code>https://example.com/landing-page</code><br><br>
<b>Result</b><br>
Each match is combined with the Base URL:<br>
<code>https://example.com/landing-page123AB</code>
      `;
      delCol.appendChild(infoBtn);
      delCol.appendChild(infoPopup);

      // Show/hide info icon based on job type
      function updateInfoIconVisibility() {
        if (jobTypeSelect && jobTypeSelect.value === "links_and_utm") {
          infoBtn.style.display = "flex";
        } else {
          infoBtn.style.display = "none";
        }
      }
      jobTypeSelect.addEventListener('change', updateInfoIconVisibility);
      updateInfoIconVisibility();
      infoBtn.addEventListener('mouseenter', () => { infoPopup.style.display = 'block'; });
      infoBtn.addEventListener('mouseleave', () => { infoPopup.style.display = 'none'; });
      infoBtn.addEventListener('focus', () => { infoPopup.style.display = 'block'; });
      infoBtn.addEventListener('blur', () => { infoPopup.style.display = 'none'; });

    } else {
      // Other rows: Delete button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✕";
      removeBtn.className = "remove-btn";
      removeBtn.style.background = "none";
      removeBtn.style.border = "none";
      removeBtn.style.color = "#f43f5e";
      removeBtn.style.fontSize = "1.25rem";
      removeBtn.style.cursor = "pointer";
      removeBtn.title = "Remove row";
      removeBtn.addEventListener("click", function() {
        fieldRow.remove();
        updateAddNewRowBtn();
        validateForm(form);
        checkDirtyAndUpdateSaveBtn();
      });
      delCol.appendChild(removeBtn);
    }

    // Add the groups to the row and wrapper
    fieldRow.appendChild(tfGroup);
    fieldRow.appendChild(buGroup);
    fieldRow.appendChild(delCol);
    wrapper.appendChild(fieldRow);
    updateAddNewRowBtn();
    updateBaseUrlMemory("");

    // Attach dirty-check listeners to these new fields
    tfInput.addEventListener('input', checkDirtyAndUpdateSaveBtn);
    tfInput.addEventListener('change', checkDirtyAndUpdateSaveBtn);
    buInput.addEventListener('input', checkDirtyAndUpdateSaveBtn);
    buInput.addEventListener('change', checkDirtyAndUpdateSaveBtn);
  }
  function updateAddNewRowBtn() {
    const numRows = targetBaseRowsWrapper.querySelectorAll(".field-row").length;
    addNewRowBtn.disabled = numRows >= MAX_TARGET_ROWS;
  }
  addNewRowBtn.addEventListener("click", function() {
    addTargetBaseRow(targetBaseRowsWrapper, form);
    updateAddNewRowBtn();
  });

  // --- UTM Parameters group ---
  const utmLabel = document.createElement("span");
  utmLabel.className = "utm-label";
  utmLabel.textContent = "UTM Parameters";
  form.appendChild(utmLabel);
  const utmRow = document.createElement("div");
  utmRow.className = "utm-row";
  [
    { id: "source", placeholder: "Source", required: true },
    { id: "medium", placeholder: "Medium", required: true },
    { id: "campaign", placeholder: "Campaign", required: true }
  ].forEach(field => {
    const group = document.createElement("div");
    group.className = "field-group";
    const input = document.createElement("input");
    input.type = "text";
    input.name = field.id;
    input.placeholder = field.placeholder;
    input.required = true;
    group.appendChild(input);
    utmRow.appendChild(group);
  });
  form.appendChild(utmRow);

  const utmContentGroup = document.createElement("div");
  utmContentGroup.className = "field-group utm-content-group";
  const utmContentWrapper = document.createElement("div");
  utmContentWrapper.className = "input-icon-wrapper";
  const utmContentInput = document.createElement("input");
  utmContentInput.type = "text";
  utmContentInput.name = "utm_content";
  utmContentInput.placeholder = "Content (automatic)";
  utmContentInput.readOnly = true;
  utmContentInput.style.backgroundColor = "#f9f9f9";
  utmContentInput.style.cursor = "not-allowed";
  utmContentWrapper.appendChild(utmContentInput);

  // SVG info icon as a button
  const infoBtn = document.createElement("button");
  infoBtn.type = "button";
  infoBtn.className = "info-icon-btn";
  infoBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="info-svg"><path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>`;
  const infoPopup = document.createElement("div");
  infoPopup.className = "info-popup";
  infoPopup.innerHTML = `
    <strong>Why UTM Content Is Set Automatically</strong><br><br>
    The <b>utm_content</b> value is auto-filled to help you see which item was clicked in your analytics.<br><br>
    - If the link text is a product or part number like <code>5610-2164</code>, that’s what will be used.<br>
    - If the link text is a general phrase like <code>Learn More</code>, the tool uses the last part of the URL instead.<br><br>
    <strong>Example:</strong><br>
    A link labeled <code>Learn More</code> that points to <code>https://example.com/product-line/x500</code> will use <code>x500</code> as the UTM Content.
  `;
  utmContentWrapper.appendChild(infoBtn);
  utmContentWrapper.appendChild(infoPopup);
  utmContentGroup.appendChild(utmContentWrapper);
  form.appendChild(utmContentGroup);

  const filenameGroup = document.createElement("div");
  filenameGroup.className = "field-group";
  const filenameLabel = document.createElement("label");
  filenameLabel.htmlFor = "filename";
  filenameLabel.textContent = "Document Name";
  const filenameInput = document.createElement("input");
  filenameInput.type = "text";
  filenameInput.name = "filename";
  filenameInput.id = "filename";
  filenameInput.placeholder = "MyFileName";
  filenameInput.required = true;
  filenameInput.value = docName || '';
  filenameGroup.appendChild(filenameLabel);
  filenameGroup.appendChild(filenameInput);
  form.appendChild(filenameGroup);

  // --- Mapping Tool as Text+SVG (now at the bottom, above underline) ---
  const mappingToolLink = document.createElement("span");
  mappingToolLink.id = "open-mapping-modal-link";
  mappingToolLink.style.display = "none";
  mappingToolLink.style.cursor = "pointer";
  mappingToolLink.style.color = "#2563eb";
  mappingToolLink.style.fontWeight = "500";
  mappingToolLink.style.marginBottom = "1.3em";
  mappingToolLink.style.alignSelf = "flex-start";
  mappingToolLink.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:1.2em;height:1.2em;vertical-align:-0.21em;margin-right:0.4em;"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>Open mapping tool`;

  // --- Underline Checkbox ---
  const underlineWrapper = document.createElement("div");
  underlineWrapper.className = "checkbox-wrapper hidden";
  underlineWrapper.style.marginBottom = "0.75rem";
  underlineWrapper.style.marginTop = "-0.5rem";
  const underlineInput = document.createElement("input");
  underlineInput.type = "checkbox";
  underlineInput.name = "underline";
  underlineInput.id = "underline";
  const underlineLabel = document.createElement("label");
  underlineLabel.htmlFor = "underline";
  underlineLabel.textContent = "Add underline to links?";
  underlineWrapper.appendChild(underlineInput);
  underlineWrapper.appendChild(underlineLabel);

  // Insert mappingToolLink just above underlineWrapper
  form.appendChild(mappingToolLink);
  form.appendChild(underlineWrapper);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "form-actions";
  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "Save";
  saveBtn.className = "save-btn";
  saveBtn.disabled = true;
  actionsDiv.appendChild(saveBtn);
  form.appendChild(actionsDiv);

  // --- Mapping tool logic (at the bottom, above underline) ---
  function updateMappingToolLinkState() {
    // Only active if jobType is "links_and_utm" and a file is uploaded
    const enabled = jobTypeSelect.value === "links_and_utm" && fileInput.files.length > 0;
    mappingToolLink.classList.toggle("active", enabled);
    mappingToolLink.style.cursor = enabled ? "pointer" : "not-allowed";
    mappingToolLink.style.opacity = enabled ? "1" : "0.6";
    mappingToolLink.style.color = enabled ? "#2563eb" : "#888";
    mappingToolLink.style.userSelect = enabled ? "auto" : "none";
    mappingToolLink.style.display = jobTypeSelect.value === "links_and_utm" ? "inline-flex" : "none";
  }
  jobTypeSelect.addEventListener("change", updateMappingToolLinkState);
  fileInput.addEventListener("change", updateMappingToolLinkState);
  updateMappingToolLinkState();

  mappingToolLink.addEventListener("click", function () {
    if (mappingToolLink.classList.contains("active")) {
      const mappingModal = document.getElementById('mapping-modal');
      if (mappingModal) {
        mappingModal.classList.add('show');
        const mainFileInput = fileInput;
        const mappingFileInput = document.getElementById('mapping-file-input');
        if (mainFileInput && mappingFileInput && mainFileInput.files.length > 0) {
          const dt = new DataTransfer();
          dt.items.add(mainFileInput.files[0]);
          mappingFileInput.files = dt.files;
          mappingFileInput.dispatchEvent(new Event('change'));
        }
      }
    }
  });

  // --- Save/Dirty logic ---
  tabLastSavedState[tabId] = "";

  function checkDirtyAndUpdateSaveBtn() {
    let current = formToHash(form);
    let dirty = current !== tabLastSavedState[tabId] && saveBtn.dataset.justSaved !== "1";
    saveBtn.disabled = !formIsValid(form, tabId) || !dirty;
    const filenameInput = form.querySelector("input[name='filename']");
    const jobTypeSelect = form.querySelector("select[name='job_type']");
    updateFileListStatus(
      tabId,
      filenameInput ? filenameInput.value : "",
      !dirty, // true if saved, false if dirty
      jobTypeSelect ? jobTypeSelect.value : ""
    );
  }
  function formIsValid(form, tabId) {
    let valid = true;
    form.querySelectorAll("input, select").forEach(input => {
      if (
        !input.closest(".hidden") &&
        input.required &&
        (
          (input.type === "file" && !(input.files.length > 0 || lastFileByTab[tabId]))
          ||
          (input.type !== "file" && !input.value.trim())
        )
      ) {
        valid = false;
      }
    });
    return valid;
  }
  form.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', checkDirtyAndUpdateSaveBtn);
    el.addEventListener('change', checkDirtyAndUpdateSaveBtn);
  });

  form.addEventListener("submit", function(e) {
    e.preventDefault();
    const filenameInput = form.querySelector("input[name='filename']");
    const name = filenameInput?.value || docName;
    const jt = jobTypeSelect.value;
    updateFileListStatus(tabId, name, true, jt);
    tabLastSavedState[tabId] = formToHash(form);
    saveBtn.disabled = true;
    saveBtn.dataset.justSaved = "1";
    setTimeout(()=>{ saveBtn.dataset.justSaved = ""; }, 500);
  });

  jobTypeSelect.addEventListener("change", function() {
    const show = jobTypeSelect.value === "links_and_utm";
    targetBaseRowsWrapper.classList.toggle("hidden", !show);
    underlineWrapper.classList.toggle("hidden", !show);
    targetBaseRowsWrapper.querySelectorAll("input[name='target_format'], input[name='base_url']").forEach(input => {
      input.required = show;
    });
    underlineInput.required = false;
    const filenameInput = form.querySelector("input[name='filename']");
    updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
    checkDirtyAndUpdateSaveBtn();
    updateMappingToolLinkState(); // Ensure mapping tool visibility updates
  });

  filenameInput.addEventListener("input", () => {
    const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
    tabLabel.textContent = filenameInput.value || `Document ${tabId.replace(/doc-/, '')}`;
    updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
    checkDirtyAndUpdateSaveBtn();
  });

  fileInput.addEventListener("change", function() {
    if (fileInput.files && fileInput.files.length > 0) {
      let base = fileInput.files[0].name.replace(/\.pdf$/i, "");
      filenameInput.value = base;
      const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
      if (tabLabel) tabLabel.textContent = base;
      updateFileListStatus(tabId, base, false, jobTypeSelect.value);
      tabLastSavedState[tabId] = "";
      checkDirtyAndUpdateSaveBtn();
      updateMappingToolLinkState(); // Ensure mapping tool visibility updates
    }
  });

  updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
  checkDirtyAndUpdateSaveBtn();
}

function createTab(fileObj) {
  const tabId = `doc-${docCount}`;
  const tabBtn = document.createElement("button");
  tabBtn.className = "tab";
  tabBtn.setAttribute("type", "button");
  tabBtn.setAttribute("title", `Switch to ${tabId}`);
  tabBtn.dataset.tab = tabId;
  const tabLabel = document.createElement("span");
  tabLabel.className = "tab-label";
  tabLabel.textContent = `Document ${docCount}`;
  tabBtn.appendChild(tabLabel);
  const delBtn = document.createElement("button");
  delBtn.setAttribute("type", "button");
  delBtn.className = "delete-tab";
  delBtn.setAttribute("title", "Delete tab");
  delBtn.dataset.tab = tabId;
  delBtn.innerHTML = "&times;";
  tabBtn.appendChild(delBtn);
  tabBtn.addEventListener("click", function(e) {
    if (e.target.classList.contains("delete-tab")) return;
    setActiveTab(tabId);
  });
  tabBar.insertBefore(tabBtn, document.getElementById("add-tab"));
  const tabContent = document.createElement("div");
  tabContent.className = "tab-content";
  tabContent.id = tabId;
  const form = document.createElement("form");
  form.setAttribute("autocomplete", "off");
  renderFormFields(form, tabId, `Document ${docCount}`, fileObj);
  tabContent.appendChild(form);
  tabContents.appendChild(tabContent);
  setActiveTab(tabId);
  docCount++;
  updateAddTabButton();
  updateTabBarCount();
  updateDeleteTabButtons();
}
// Initial tab
createTab();

// Tab deletion logic
document.addEventListener("click", function (e) {
  if (e.target.classList && e.target.classList.contains("delete-tab")) {
    if (e.target.hasAttribute('disabled')) return;
    const tabId = e.target.dataset.tab;
    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);
    const fileItem = document.querySelector(`.file-list [data-tab="${tabId}"]`);
    if (tab) tab.remove();
    if (content) content.remove();
    if (fileItem) fileItem.remove();
    const remainingTabs = Array.from(tabBar.querySelectorAll(".tab[data-tab]"));
    let newActive = null;
    if (remainingTabs.length) {
      newActive = remainingTabs[remainingTabs.length-1];
    }
    if (newActive) setActiveTab(newActive.dataset.tab);
    updateAddTabButton();
    updateTabBarCount();
    updateDeleteTabButtons();
  }
});
updateTabBarCount();

// Multi-document processing and preview
let lastProcessedForms = [];
processBtn.addEventListener("click", async function() {
  if (processBtn.disabled) return;
  showSpinner();

  // Collect all saved docs
  const docTabs = Array.from(tabBar.querySelectorAll(".tab[data-tab]"));
  const tabData = [];
  for (const tab of docTabs) {
    const tabId = tab.dataset.tab;
    const tabContent = document.getElementById(tabId);
    if (!tabContent) continue;
    const form = tabContent.querySelector("form");
    if (!form) continue;
    if (!fileList.querySelector(`li[data-tab="${tabId}"].saved`)) continue;
    tabData.push({ form, tabId });
  }
  if (!tabData.length) {
    hideSpinner();
    return;
  }

  lastProcessedForms = tabData.map(({form, tabId}) => {
    let values = {};
    Array.from(form.elements).forEach(el => {
      if (el.name) {
        if (el.type === "file") {
        } else if (el.type === "checkbox" || el.type === "radio") {
          values[el.name] = el.checked;
        } else {
          values[el.name] = el.value;
        }
      }
    });
    return {
      tabId,
      values
    };
  });

  // Prepare all preview requests
  const previewDocsToShow = [];
  let encounteredError = null;
  const API_BASE = "https://utmatic-backend.onrender.com";
  for (let i = 0; i < tabData.length; ++i) {
    const { form, tabId } = tabData[i];
    const formData = new FormData(form);
    if (formData.has("underline")) formData.set("underline", form.querySelector('input[name="underline"]').checked ? "true" : "false");
    try {
      const res = await fetch(`${API_BASE}/preview`, {
        method: "POST",
        body: formData
      });
      if (!res.ok) {
        const errorText = await res.text();
        encounteredError = `Document "${formData.get("filename") || `#${i+1}`}" failed: ${errorText}`;
        break;
      }
      const blob = await res.blob();
      const name = formData.get("filename") || `Document ${i+1}`;
      const url = URL.createObjectURL(blob);
      previewDocsToShow.push({ name, blob, url, _tempUrl: url, formData });
    } catch (err) {
      encounteredError = `Document "${formData.get("filename") || `#${i+1}`}" failed: ${err}`;
      break;
    }
  }

  hideSpinner();

  if (encounteredError) {
    alert(encounteredError);
    previewDocsToShow.forEach(doc => { if (doc._tempUrl) URL.revokeObjectURL(doc._tempUrl); });
    return;
  }

  openPdfPreviewer(previewDocsToShow, 0);
});

// Add tab button now just creates a blank tab:
document.getElementById("add-tab").addEventListener("click", function(e) {
  if (getTabCount() < MAX_DOCS) {
    createTab();
  }
  updateAddTabButton();
  updateTabBarCount();
});

// PDF Previewer logic (MODERN, MODAL)
let pdfDocs = [];
let currentDocIndex = 0;
let currentPage = 1;
let totalPages = 1;
let pdfInstance = null;
let pdfCanvas = null;
let pdfCtx = null;

// --- PDF Previewer Zoom Variables ---
let pdfZoomLevel = 1.0; // 1.0 = 100%
const pdfZoomMin = 0.5; // 50%
const pdfZoomMax = 3.0; // 300%
const pdfZoomStep = 0.1; // 10% step

function getDocName(idx) {
  return pdfDocs[idx]?.name || `Document ${idx+1}`;
}

window.openPdfPreviewer = function(docs, index=0) {
  pdfDocs = docs;
  currentDocIndex = index;
  document.getElementById("pdf-preview-modal-overlay").classList.add("active");
  document.body.style.overflow = "hidden";

  const docSwitch = document.getElementById("pdf-previewer-docswitch");
  const docList = document.getElementById("pdf-previewer-doclist");
  let docNameSpan = docSwitch.querySelector("span");
  if (!docNameSpan) {
    docNameSpan = document.createElement("span");
    docSwitch.prepend(docNameSpan);
  }
  docNameSpan.textContent = getDocName(currentDocIndex);
  docSwitch.title = getDocName(currentDocIndex);

  docList.innerHTML = "";
  pdfDocs.forEach((doc, i) => {
    const div = document.createElement("div");
    div.textContent = getDocName(i);
    div.className = (i === currentDocIndex) ? "active" : "";
    div.onclick = function(e) {
      e.stopPropagation();
      currentDocIndex = i;
      docNameSpan.textContent = getDocName(i);
      docSwitch.title = getDocName(i);
      docSwitch.classList.remove("open");
      docList.style.display = "none";
      loadDocument(currentDocIndex);
    };
    docList.appendChild(div);
  });

  docSwitch.onclick = function(e) {
    if (
      e.target === docSwitch ||
      e.target === docNameSpan ||
      e.target.classList.contains("caret")
    ) {
      docSwitch.classList.toggle("open");
      docList.style.display = docSwitch.classList.contains("open") ? "block" : "none";
    }
  };

  document.addEventListener(
    "click",
    function outsideClick(e) {
      if (!docSwitch.contains(e.target)) {
        docSwitch.classList.remove("open");
        docList.style.display = "none";
      }
    },
    { capture: true, once: true }
  );

  const closeBtn = document.getElementById("pdf-previewer-close");
  if (closeBtn) {
    closeBtn.onclick = window.closePdfPreview;
  }

  const downloadBtn = document.getElementById("download-final-btn");
  if (downloadBtn) {
    downloadBtn.onclick = downloadFinalPdf;
  }

  const prevBtn = document.getElementById("pdf-arrow-prev");
  const nextBtn = document.getElementById("pdf-arrow-next");
  if (prevBtn) prevBtn.onclick = window.prevPage;
  if (nextBtn) nextBtn.onclick = window.nextPage;

  const startNewBtn = document.getElementById("pdf-previewer-startnew");
  if (startNewBtn) startNewBtn.onclick = window.processNew;

  document.getElementById("pdf-preview-page-counter").textContent = "";
  loadDocument(currentDocIndex);
};

window.closePdfPreview = function() {
  document.getElementById("pdf-preview-modal-overlay").classList.remove("active");
  document.body.style.overflow = "";
  if (pdfCanvas) {
    const ctx = pdfCanvas.getContext("2d");
    ctx && ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
  }
  pdfDocs.forEach(doc => { if (doc._tempUrl) URL.revokeObjectURL(doc._tempUrl); });
  pdfDocs = [];
  pdfInstance = null;
  currentDocIndex = 0;
  currentPage = 1;
  totalPages = 1;

  if (window.lastProcessedForms && window.lastProcessedForms.length > 0) {
    document.getElementById("main-form-wrapper").style.display = "";
    window.lastProcessedForms.forEach((tab, idx) => {
      const tabId = `doc-${idx+1}`;
      let content = document.getElementById(tabId);
      if (!content) return;
      let form = content.querySelector("form");
      if (!form) return;
      Object.entries(tab.values).forEach(([name, value]) => {
        let el = form.elements[name];
        if (!el) return;
        if (el.type === "checkbox" || el.type === "radio") {
          el.checked = value;
        } else {
          el.value = value;
        }
      });
    });
  }
};

window.processNew = function() {
  document.getElementById("pdf-preview-modal-overlay").classList.remove("active");
  document.body.style.overflow = "";
  window.lastProcessedForms = [];
  tabContents.innerHTML = "";
  tabBar.querySelectorAll(".tab[data-tab]").forEach(tab => tab.remove());
  fileList.innerHTML = "";
  docCount = 1;
  createTab();
  updateAddTabButton();
  updateTabBarCount();
  setActiveTab("doc-1");
  document.getElementById("main-form-wrapper").style.display = "";
};

window.switchDocument = function(index) {
  currentDocIndex = parseInt(index);
  const docSwitch = document.getElementById("pdf-previewer-docswitch");
  const docNameSpan = docSwitch.querySelector("span");
  docNameSpan.textContent = getDocName(currentDocIndex);
  docSwitch.title = getDocName(currentDocIndex);
  loadDocument(currentDocIndex);
};

async function loadDocument(index) {
  const url = pdfDocs[index].url;
  const loadingTask = pdfjsLib.getDocument(url);
  pdfInstance = await loadingTask.promise;
  currentPage = 1;
  totalPages = pdfInstance.numPages;
  renderPage();
}

async function renderPage() {
  const page = await pdfInstance.getPage(currentPage);
  const viewport = page.getViewport({ scale: pdfZoomLevel });
  pdfCanvas = document.getElementById("pdf-canvas");
  pdfCanvas.height = viewport.height;
  pdfCanvas.width = viewport.width;
  pdfCtx = pdfCanvas.getContext("2d");
  await page.render({ canvasContext: pdfCtx, viewport }).promise;
  document.getElementById("pdf-preview-page-counter").textContent = `Page ${currentPage} / ${totalPages}`;
}

window.nextPage = function() {
  if (currentPage < totalPages) {
    currentPage++;
    renderPage();
  }
};

window.prevPage = function() {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
};

async function downloadFinalPdf() {
  const doc = pdfDocs[currentDocIndex];
  if (!doc) return;
  if (doc.formData) {
    const btn = document.getElementById("download-final-btn");
    btn.disabled = true;
    btn.textContent = "Downloading...";
    const API_BASE = "https://utmatic-backend.onrender.com";
    try {
      const res = await fetch(`${API_BASE}/process`, {
        method: "POST",
        body: doc.formData
      });
      if (!res.ok) {
        const errorText = await res.text();
        alert("Download failed: " + errorText);
        btn.disabled = false;
        btn.textContent = "Download PDF";
        return;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (doc.name?.replace(/[^\w.-]+/g, '_') || 'document') + '.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      document.body.removeChild(a);
    } catch (err) {
      alert("Download failed: " + err);
    }
    btn.disabled = false;
    btn.textContent = "Download PDF";
  } else {
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = (doc.name?.replace(/[^\w.-]+/g, '_') || 'document') + '_preview.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

const observer = new MutationObserver(() => {
  document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(el => {
    el.style.caretColor = '#23272f';
  });
});
observer.observe(document.body, { childList: true, subtree: true });

// Remove all duplicate global jobTypeSelect logic!
// No global jobTypeSelect variable. All 'jobTypeSelect' are now scoped to their form.

// (If you have other global .job-type-group or .mapping-tool-row logic, refactor to use only within renderFormFields or per-tab.)

// Remove the old global DOMContentLoaded jobTypeSelects logic (was for mapping-toggle-wrapper, now obsolete)
