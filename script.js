// main.js

// Guarantee pdfjsViewer is available globally for all UMD/CDN environments (for possible future use)
window.pdfjsViewer =
  window.pdfjsViewer ||
  window.pdfjsDistWebPdf_viewer ||
  window['pdfjs-dist/web/pdf_viewer'] ||
  undefined;

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

// Helper to build a unique hash of form data (for Save/Dirty logic)
function formToHash(form) {
  // Custom serialization: input type, name, value, checked, selectedIndex, file name if any
  let arr = [];
  Array.from(form.elements).forEach(el => {
    if (el.name && !el.disabled && !el.closest('.hidden')) {
      if (el.type === "file") {
        arr.push(el.name + ":" + (el.files[0]?.name || ""));
      } else if (el.type === "checkbox" || el.type === "radio") {
        arr.push(el.name + ":" + (el.checked ? "1" : "0"));
      } else if (el.tagName === "SELECT") {
        arr.push(el.name + ":" + el.selectedIndex);
      } else {
        arr.push(el.name + ":" + el.value);
      }
    }
  });
  return arr.join("|");
}

function updateFileListStatus(tabId, name, saved, jobType) {
  let item = fileList.querySelector(`[data-tab="${tabId}"]`);
  if (!item) {
    item = document.createElement("li");
    item.dataset.tab = tabId;
    fileList.appendChild(item);
  }
  // Remove ALL checkmarks before adding one (fixes repeated checkmarks and indentation bug)
  item.querySelectorAll(".checkmark").forEach(e => e.remove());
  let nameSpan = item.querySelector('.file-list-name');
  if (!nameSpan) {
    nameSpan = document.createElement('span');
    nameSpan.className = 'file-list-name';
    item.appendChild(nameSpan);
  }
  nameSpan.textContent = name || "Untitled Document";
  // Always ensure nameSpan is the last child
  if (nameSpan.parentNode !== item) {
    item.appendChild(nameSpan);
  }
  if (saved) {
    item.className = "saved";
    const checkSvg = document.createElement('span');
    checkSvg.innerHTML = `<svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
      <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
      <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
    </svg>`;
    // Insert checkmark before nameSpan
    item.insertBefore(checkSvg, nameSpan);
  } else {
    item.className = "";
  }
  processBtn.disabled = ![...fileList.children].every(li => li.classList.contains("saved")) || fileList.childElementCount === 0;
}

// ---- MULTI-FILE UPLOAD ON CHOOSE FILE ----
function renderFormFields(form, tabId, docName, fileObj) {
  // --- Sticky file for this tab ---
  let lastValidFile = fileObj instanceof File ? fileObj : null;

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
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".pdf,application/pdf";
  fileInput.name = "file";
  fileInput.id = "file";
  fileInput.required = true;
  fileInput.className = "custom-file-input";
  fileInput.tabIndex = -1;
  fileInput.multiple = true;
  const fileNameSpan = document.createElement("span");
  fileNameSpan.className = "custom-file-filename";
  fileNameSpan.textContent = lastValidFile ? lastValidFile.name : "No file chosen";
  if (lastValidFile) {
    const dt = new DataTransfer();
    dt.items.add(lastValidFile);
    fileInput.files = dt.files;
    setTimeout(() => {
      const filenameInput = form.querySelector("input[name='filename']");
      if (filenameInput) {
        let base = lastValidFile.name.replace(/\.pdf$/i, "");
        filenameInput.value = base;
        const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
        if (tabLabel) tabLabel.textContent = base;
        let jtSelect = form.querySelector('select[name="job_type"]');
        let jt = jtSelect ? jtSelect.value : "";
        updateFileListStatus(tabId, base, false, jt);
      }
    });
  }

  // --- Sticky file change handler ---
  fileInput.addEventListener("change", function() {
    const files = Array.from(fileInput.files);
    if (files.length > 0) {
      lastValidFile = files[0];
      fileNameSpan.textContent = files[0].name;
      // Update filename and tab label, etc.
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
        form.querySelector('.save-btn').disabled = false;
      }
      // Handle multi-file (tabs) as before
      let slots = MAX_DOCS - getTabCount();
      // NEW: If this is the very first document (only one existing tab, and it's empty), just update the first tab's form instead of making a new tab
      if (getTabCount() === 1 && docCount === 2 && !formToHash(form)) {
        // do nothing, let user fill out the form
      } else {
        for (let i = 1; i < files.length && slots > 0; ++i, --slots) {
          createTab(files[i], /*doNotAutoSelect*/true);
        }
      }
    } else if (lastValidFile) {
      // User canceled dialog, keep previous file name in UI
      fileNameSpan.textContent = lastValidFile.name;
      // No need to update fileInput.files: browsers block setting it programmatically
    } else {
      fileNameSpan.textContent = "No file chosen";
    }
  });

  fileInputLabel.appendChild(fileInput);
  fileInputWrapper.appendChild(fileInputLabel);
  fileInputWrapper.appendChild(fileNameSpan);
  pdfField.appendChild(pdfLabel);
  pdfField.appendChild(fileInputWrapper);
  form.appendChild(pdfField);

  // --- Job Type ---
  const jobTypeField = document.createElement("div");
  jobTypeField.className = "field-group";
  const jobTypeLabel = document.createElement("label");
  jobTypeLabel.htmlFor = "job_type";
  jobTypeLabel.textContent = "Job Type";
  const jobTypeSelect = document.createElement("select");
  jobTypeSelect.name = "job_type";
  jobTypeSelect.id = "job_type";
  jobTypeSelect.required = true;
  [
    { value: "", label: "Select one", icon: "" },
    { value: "utm_only", label: "Add UTM only" },
    { value: "add_links_only", label: "Add links only" },
    { value: "links_and_utm", label: "Add links with UTM" }
  ].forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    jobTypeSelect.appendChild(option);
  });
  jobTypeField.appendChild(jobTypeLabel);
  jobTypeField.appendChild(jobTypeSelect);
  form.appendChild(jobTypeField);

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
    buGroup.className = "field-group";
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
    buInput.addEventListener('change', () => {
      updateBaseUrlMemory(buInput.value.trim());
    });
    // Remove Button (except for first row)
    const delCol = document.createElement("div");
    delCol.className = "delete-col";
    if (wrapper.querySelectorAll(".field-row").length > 0) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "✕";
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
      });
      delCol.appendChild(removeBtn);
    } else {
      delCol.innerHTML = "&nbsp;";
    }
    fieldRow.appendChild(tfGroup);
    fieldRow.appendChild(buGroup);
    fieldRow.appendChild(delCol);
    wrapper.appendChild(fieldRow);
    updateAddNewRowBtn();
    updateBaseUrlMemory("");
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
  const utmGroup = document.createElement("div");
  utmGroup.className = "utm-group"; // Add this as a wrapper
  utmGroup.id = "utm-group";        // Add an id for easy selection/hiding

  const utmLabel = document.createElement("span");
  utmLabel.className = "utm-label";
  utmLabel.textContent = "UTM Parameters";
  utmGroup.appendChild(utmLabel);

  const utmRow = document.createElement("div");
  utmRow.className = "utm-row";
  utmGroup.appendChild(utmRow);

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
  const utmContentGroup = document.createElement("div");
  utmContentGroup.className = "field-group";
  const utmContentInput = document.createElement("input");
  utmContentInput.type = "text";
  utmContentInput.name = "utm_content";
  utmContentInput.placeholder = "Content (automatic)";
  utmContentInput.readOnly = true;
  utmContentInput.style.backgroundColor = "#f9f9f9";
  utmContentInput.style.cursor = "not-allowed";
  utmContentGroup.appendChild(utmContentInput);
  utmGroup.appendChild(utmContentGroup);

  form.appendChild(utmGroup);

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

  // --- Save/Dirty logic ---
  tabLastSavedState[tabId] = "";

  function checkDirtyAndUpdateSaveBtn() {
    let current = formToHash(form);
    let dirty = current !== tabLastSavedState[tabId] && saveBtn.dataset.justSaved !== "1";
    // Update file list dirty/saved status live
    const filenameInput = form.querySelector("input[name='filename']");
    updateFileListStatus(tabId, filenameInput.value, !dirty, jobTypeSelect.value);
    saveBtn.disabled = !formIsValid(form) || !dirty;
  }
  function formIsValid(form) {
    let valid = true;
    form.querySelectorAll("input, select").forEach(input => {
      // Only validate if the input is required and visible (not in a .hidden ancestor)
      if (
        input.required && 
        !input.closest(".hidden") &&
        !input.disabled &&
        (
          (input.type === "file" && !lastValidFile) ||
          (input.type !== "file" && !input.value.trim())
        )
      ) {
        valid = false;
      }
    });
    return valid;
  }
  // Validate and update save button whenever form changes
  form.addEventListener("input", function() {
    checkDirtyAndUpdateSaveBtn();
  });
  form.addEventListener("change", function() {
    checkDirtyAndUpdateSaveBtn();
  });

  // Save handler
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

  // Job type select: update file list with correct icon
  jobTypeSelect.addEventListener("change", function() {
    const jobType = jobTypeSelect.value;
    const needsFormats = jobType === "links_and_utm" || jobType === "add_links_only";
    const needsUtm = jobType === "utm_only" || jobType === "links_and_utm";

    // Toggle rows and underline
    targetBaseRowsWrapper.classList.toggle("hidden", !needsFormats);
    underlineWrapper.classList.toggle("hidden", !needsFormats);

    // Set required for target/base
    targetBaseRowsWrapper.querySelectorAll("input[name='target_format'], input[name='base_url']").forEach(input => {
      input.required = needsFormats;
    });

    // Toggle UTM group and set required for UTM
    const utmGroup = form.querySelector("#utm-group");
    if (utmGroup) {
      utmGroup.classList.toggle("hidden", !needsUtm);
      utmGroup.querySelectorAll("input").forEach(input => {
        input.required = needsUtm && input.name !== "utm_content"; // utm_content is always readonly
      });
    }

    underlineInput.required = false;
    const filenameInput = form.querySelector("input[name='filename']");
    updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
    checkDirtyAndUpdateSaveBtn();
  });

  // When filename is changed, update tab label and file list (don't mark as saved)
  filenameInput.addEventListener("input", () => {
    const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
    tabLabel.textContent = filenameInput.value || `Document ${tabId.replace(/doc-/, '')}`;
    updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
    checkDirtyAndUpdateSaveBtn();
  });

  // File input change: update filename and clear saved state
  fileInput.addEventListener("change", function() {
    if (fileInput.files && fileInput.files.length > 0) {
      let base = fileInput.files[0].name.replace(/\.pdf$/i, "");
      filenameInput.value = base;
      const tabLabel = document.querySelector(`.tab[data-tab="${tabId}"] .tab-label`);
      if (tabLabel) tabLabel.textContent = base;
      updateFileListStatus(tabId, base, false, jobTypeSelect.value);
      tabLastSavedState[tabId] = "";
      saveBtn.disabled = false;
    }
  });

  updateFileListStatus(tabId, filenameInput.value, false, jobTypeSelect.value);
  checkDirtyAndUpdateSaveBtn();

  // --- INTERCEPT FormData for preview/process to use lastValidFile if needed ---
  form.getLastValidFile = () => lastValidFile;
}

// Accepts doNotAutoSelect param: if true, do NOT activate the new tab (for multi-upload, etc)
function createTab(fileObj, doNotAutoSelect = false) {
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
  if (!doNotAutoSelect) setActiveTab(tabId); // Only activate new tab if not in batch add
  docCount++;
  updateAddTabButton();
  updateTabBarCount();
  updateDeleteTabButtons();
}
createTab();

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
      // Always activate the leftmost (first) tab after a delete
      newActive = remainingTabs[0];
    }
    if (newActive) setActiveTab(newActive.dataset.tab);
    updateAddTabButton();
    updateTabBarCount();
    updateDeleteTabButtons();
  }
});
updateTabBarCount();

let lastProcessedForms = [];
processBtn.addEventListener("click", async function() {
  if (processBtn.disabled) return;
  showSpinner();

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

  const previewDocsToShow = [];
  let encounteredError = null;
  const API_BASE = "https://utmatic-backend.onrender.com";
  for (let i = 0; i < tabData.length; ++i) {
    const { form, tabId } = tabData[i];
    let formData = new FormData(form);
    // --- Patch FormData to use sticky file if file input is empty but we have a lastValidFile ---
    const fileInput = form.querySelector('input[type="file"][name="file"]');
    const lastValidFile = form.getLastValidFile ? form.getLastValidFile() : null;
    if (fileInput && (!fileInput.files || fileInput.files.length === 0) && lastValidFile) {
      formData.set('file', lastValidFile);
    }
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

document.getElementById("add-tab").addEventListener("click", function(e) {
  if (getTabCount() < MAX_DOCS) {
    createTab(undefined, /*doNotAutoSelect*/true);
  }
  updateAddTabButton();
  updateTabBarCount();
});

let pdfDocs = [];
let currentDocIndex = 0;
let currentPage = 1;
let totalPages = 1;
let pdfInstance = null;
let pdfCanvas = null;
let pdfCtx = null;

let pdfZoomLevel = 1.0;
const pdfZoomMin = 0.5;
const pdfZoomMax = 3.0;
const pdfZoomStep = 0.1;

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

    // Hide caret if only one doc
  if (pdfDocs.length <= 1) {
    docSwitch.classList.add("single-doc");
  } else {
    docSwitch.classList.remove("single-doc");
  }

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
