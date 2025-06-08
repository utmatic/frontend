// --- Firebase Auth gating for Source Form ---
// ASSUMES:
// - Firebase SDK scripts are loaded in your HTML _before_ this file!
// - This page is /source-form or similar

function getRedirectUrl() {
  // Always redirect back to this page after login
  return window.location.pathname;
}

// --- Gating ---
async function ensureLoggedInAndProBusiness() {
  let formBlockedMsg = null;
  function blockForm(msg) {
    if (!formBlockedMsg) {
      formBlockedMsg = document.createElement('div');
      formBlockedMsg.id = "blocked-msg";
      formBlockedMsg.style.position = "fixed";
      formBlockedMsg.style.top = "0";
      formBlockedMsg.style.left = "0";
      formBlockedMsg.style.width = "100vw";
      formBlockedMsg.style.background = "#fff7f7";
      formBlockedMsg.style.color = "#c00";
      formBlockedMsg.style.zIndex = "10000";
      formBlockedMsg.style.padding = "18px";
      formBlockedMsg.style.fontWeight = "bold";
      formBlockedMsg.style.textAlign = "center";
      formBlockedMsg.innerHTML = msg;
      document.body.appendChild(formBlockedMsg);
    }
    // Hide the form
    const form = document.getElementById('iddForm');
    if (form) form.style.display = 'none';
  }
  try {
    await new Promise(resolve => firebase.auth().onAuthStateChanged(resolve));
    const user = firebase.auth().currentUser;
    if (!user) {
      window.location.href = "/auth.html?redirect=" + encodeURIComponent(getRedirectUrl());
      return;
    }
    const idTokenResult = await user.getIdTokenResult();
    const plan = idTokenResult.claims.plan;
    if (plan === "pro" || plan === "business") {
      if (formBlockedMsg) formBlockedMsg.remove();
      const form = document.getElementById('iddForm');
      if (form) form.style.display = '';
    } else {
      let upgradeLink = '/pricing';
      blockForm(`
        <span>This tool is only available to <b>Pro</b> or <b>Business</b> plan users.</span>
        <br>
        <a href="${upgradeLink}" style="color:#0070f3;text-decoration:underline;">Upgrade your plan</a> 
        or <a href="/dashboard" style="color:#0070f3;text-decoration:underline;">return to dashboard</a>.
      `);
    }
  } catch (e) {
    blockForm("Error checking your account. Please refresh or contact support.");
  }
}

// --- Loading Overlay Logic ---
function showPageLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  }
}
function hidePageLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 400);
  }
}

// ---- Inactivity Timeout Modal Logic ----
let inactivityModal = null;
let inactivityInterval = null;
let inactivityTimeout = null;
let inactivitySessionTimeoutMinutes = null; // fetched from user preference
let inactivityWarningMinutes = null;
let inactivityLimitMs = null;
let inactivityWarningMs = null;

window.addEventListener('DOMContentLoaded', () => {
  showPageLoadingOverlay();

  ensureLoggedInAndProBusiness();

  // --- Make sure conditional fields are hidden on load ---
  if (typeof utmSection !== "undefined" && utmSection) utmSection.style.display = "none";
  if (typeof linkFields !== "undefined" && linkFields) linkFields.style.display = "none";
  lastValidFile = null;
  const span = document.getElementById('file-filename');
  if (span) span.textContent = "No file chosen";
  bindValidationListeners();
  updateJobTypeFields();
  validateForm();

  // --- PRESETS (NEW) ---
  initPresetDropdown();

  // Hide the overlay once everything's loaded (simulate async setup)
  setTimeout(hidePageLoadingOverlay, 600);

  // --- INACTIVITY TIMER START ---
  fetchSessionTimeoutAndStart();
});

function fetchSessionTimeoutAndStart() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    if (typeof firebase.firestore !== "function") return;
    try {
      const db = firebase.firestore();
      const doc = await db.collection('userSecurity').doc(user.uid).get();
      let min = 6; // Default 6 min for testing
      if (doc.exists) {
        const data = doc.data();
        if (typeof data.sessionTimeoutMinutes === "number") {
          min = data.sessionTimeoutMinutes;
        }
      }
      inactivitySessionTimeoutMinutes = min;
      if (!min || min === 0) {
        // "Never" timeout, don't start inactivity watcher
        return;
      }
      // Use 5 min warning, or max 1 min warning if sessionTimeoutMinutes < 6
      inactivityWarningMinutes = min > 5 ? 5 : (min > 1 ? 1 : 0);
      inactivityLimitMs = min * 60 * 1000;
      inactivityWarningMs = inactivityWarningMinutes * 60 * 1000;
      startInactivityTimer();
    } catch (e) {
      // If error, just default to 6 min as fallback
      inactivitySessionTimeoutMinutes = 6;
      inactivityWarningMinutes = 5;
      inactivityLimitMs = 6 * 60 * 1000;
      inactivityWarningMs = 5 * 60 * 1000;
      startInactivityTimer();
    }
  });
}

function startInactivityTimer() {
  clearTimeout(inactivityTimeout);
  clearInterval(inactivityInterval);

  // Only reset timer on activity if modal is NOT open
  function activityHandler() {
    if (!inactivityModal) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(showInactivityModal, inactivityLimitMs - inactivityWarningMs);
    }
  }

  window.addEventListener('mousemove', activityHandler);
  window.addEventListener('keydown', activityHandler);
  window.addEventListener('click', activityHandler);

  startInactivityTimer._activityHandler = activityHandler;

  inactivityTimeout = setTimeout(showInactivityModal, inactivityLimitMs - inactivityWarningMs);
}

function showInactivityModal() {
  // Prevent multiple modals
  if (inactivityModal) return;

  inactivityModal = document.createElement('div');
  inactivityModal.id = "inactivity-modal";

  const modalBox = document.createElement('div');
  modalBox.className = "inactivity-modal-box";

  // Modal heading: Automatic logout in
  const heading = document.createElement('h3');
  heading.textContent = "Session expires in";
  modalBox.appendChild(heading);

  // Big timer value
  const timerBig = document.createElement('div');
  timerBig.className = "inactivity-modal-timer-big";
  modalBox.appendChild(timerBig);

  // Action row
  const actions = document.createElement('div');
  actions.className = 'inactivity-modal-actions';

  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.className = "continue-session-btn";
  continueBtn.textContent = "Continue working";
  actions.appendChild(continueBtn);

  modalBox.appendChild(actions);
  inactivityModal.appendChild(modalBox);
  document.body.appendChild(inactivityModal);

  // Timer logic (countdown)
  let secondsLeft = inactivityWarningMs / 1000;
  function updateCountdown() {
    let min = Math.floor(secondsLeft / 60);
    let sec = Math.floor(secondsLeft % 60);
    timerBig.textContent = `${min}:${String(sec).padStart(2, "0")}`;
  }
  updateCountdown();

  inactivityInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(inactivityInterval);
      handleLogoutFromInactivity();
      return;
    }
    updateCountdown();
  }, 1000);

  continueBtn.onclick = function () {
    clearInterval(inactivityInterval);
    if (inactivityModal) {
      document.body.removeChild(inactivityModal);
      inactivityModal = null;
    }
    startInactivityTimer();
  };
}

function handleLogoutFromInactivity() {
  if (inactivityModal) {
    document.body.removeChild(inactivityModal);
    inactivityModal = null;
  }
  // Remove event listeners to prevent memory leaks
  window.removeEventListener('mousemove', startInactivityTimer._activityHandler);
  window.removeEventListener('keydown', startInactivityTimer._activityHandler);
  window.removeEventListener('click', startInactivityTimer._activityHandler);

  // Log out Firebase, then redirect
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function () {
      window.location.href = "/auth.html";
    });
  } else {
    window.location.href = "/auth.html";
  }
}

// --- Save and Restore Form State for "Return to your submission" functionality ---
let previousSubmissionData = null;

function saveFormState() {
  previousSubmissionData = {
    file: lastValidFile,
    job_type: form.job_type.value,
    rows: [],
    utm: {
      utm_source: utmSource ? utmSource.value : '',
      utm_medium: utmMedium ? utmMedium.value : '',
      utm_campaign: utmCampaign ? utmCampaign.value : ''
    }
  };
  const tfInputs = rowsContainer.querySelectorAll('input[name="target_formats[]"]');
  const buInputs = rowsContainer.querySelectorAll('input[name="base_urls[]"]');
  for (let i = 0; i < tfInputs.length; i++) {
    previousSubmissionData.rows.push({
      tf: tfInputs[i].value,
      bu: buInputs[i].value
    });
  }
}

function restoreFormState() {
  if (!previousSubmissionData) return;
  form.reset();
  lastValidFile = previousSubmissionData.file;
  const span = document.getElementById('file-filename');
  if (span) span.textContent = lastValidFile ? lastValidFile.name : "No file chosen";
  form.job_type.value = previousSubmissionData.job_type;
  updateJobTypeFields();
  rowsContainer.innerHTML = '';
  if (previousSubmissionData.rows.length > 0) {
    previousSubmissionData.rows.forEach(row => {
      rowsContainer.appendChild(createRow(row.tf, row.bu));
    });
  }
  updateDeleteButtons();
  if (utmSource) utmSource.value = previousSubmissionData.utm.utm_source;
  if (utmMedium) utmMedium.value = previousSubmissionData.utm.utm_medium;
  if (utmCampaign) utmCampaign.value = previousSubmissionData.utm.utm_campaign;
  updateJobTypeFields();
  validateForm();
}

// --- Main script continues as before ---
const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const loader = document.getElementById('loader');
const mainFormWrapper = document.getElementById('main-form-wrapper');
const resultScreen = document.getElementById('result-screen');

const linkFields = document.getElementById('link-fields');
const rowsContainer = document.getElementById('target-base-rows');
const addRowBtn = document.getElementById('add-row-btn');
const MAX_ROWS = 5;

const utmSection = document.getElementById('utm-section');
const utmSource = document.getElementById('utm_source');
const utmMedium = document.getElementById('utm_medium');
const utmCampaign = document.getElementById('utm_campaign');

let lastValidFile = null;

const fileInput = document.getElementById('file');
fileInput.addEventListener('change', function() {
  const span = document.getElementById('file-filename');
  if (this.files && this.files.length > 0) {
    lastValidFile = this.files[0];
    span.textContent = lastValidFile.name;
  } else {
    lastValidFile = null;
    span.textContent = "No file chosen";
  }
  validateForm();
});

form.addEventListener('submit', function(e) {
  if (!lastValidFile) {
    e.preventDefault();
    statusDiv.textContent = "Please select a file to upload.";
    return false;
  }
});

function createRow(tfValue = '', buValue = '') {
  const row = document.createElement('div');
  row.className = 'field-row side-by-side-fields';
  const tfGroup = document.createElement('div');
  tfGroup.className = 'field-group';
  const tfInput = document.createElement('input');
  tfInput.type = 'text';
  tfInput.name = 'target_formats[]';
  tfInput.placeholder = 'Target Format';
  tfInput.required = true;
  tfInput.value = tfValue;
  tfInput.addEventListener('input', validateForm);
  tfGroup.appendChild(tfInput);
  const buGroup = document.createElement('div');
  buGroup.className = 'field-group';
  const buInput = document.createElement('input');
  buInput.type = 'text';
  buInput.name = 'base_urls[]';
  buInput.placeholder = 'Base URL';
  buInput.required = true;
  buInput.value = buValue;
  buInput.addEventListener('input', validateForm);
  buGroup.appendChild(buInput);
  row.appendChild(tfGroup);
  row.appendChild(buGroup);
  return row;
}

function updateDeleteButtons() {
  const rows = Array.from(rowsContainer.querySelectorAll('.field-row'));
  rows.forEach((row, idx) => {
    let delBtn = row.querySelector('.delete-tab');
    if (delBtn) delBtn.remove();
    let placeholder = row.querySelector('.delete-row-placeholder');
    if (placeholder) placeholder.remove();

    if (idx > 0) {
      delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'delete-tab';
      delBtn.innerHTML = '&times;';
      delBtn.title = 'Remove row';
      delBtn.onclick = function() {
        row.remove();
        updateDeleteButtons();
        updateRowControls();
        validateForm();
      };
      row.appendChild(delBtn);
    } else {
      placeholder = document.createElement('button');
      placeholder.type = 'button';
      placeholder.className = 'delete-tab delete-row-placeholder';
      placeholder.innerHTML = '&times;';
      placeholder.disabled = true;
      row.appendChild(placeholder);
    }
  });
  updateRowControls();
}

function updateRowControls() {
  const rows = rowsContainer.querySelectorAll('.field-row');
  addRowBtn.disabled = rows.length >= MAX_ROWS;
}

function showLinkFields(show) {
  linkFields.style.display = show ? "block" : "none";
  if (show && rowsContainer.childElementCount === 0) {
    rowsContainer.appendChild(createRow());
  }
  updateDeleteButtons();
  const allInputs = linkFields.querySelectorAll('input');
  allInputs.forEach(input => input.required = show);
  validateForm();
}

function showUtmFields(show) {
  if (!utmSection) return;
  utmSection.style.display = show ? "block" : "none";
  if (utmSource) utmSource.required = show;
  if (utmMedium) utmMedium.required = show;
  if (utmCampaign) utmCampaign.required = show;
  validateForm();
}

addRowBtn.onclick = function() {
  if (rowsContainer.childElementCount < MAX_ROWS) {
    rowsContainer.appendChild(createRow());
    updateDeleteButtons();
    validateForm();
  }
};

function updateJobTypeFields() {
  const jobType = document.getElementById('job_type').value;
  if (jobType === "add_links_only" || jobType === "add_links_with_utm") {
    showLinkFields(true);
    // Show Presets dropdown on these job types
    showPresetsDropdown(true);
  } else {
    showLinkFields(false);
    rowsContainer.innerHTML = '';
    showPresetsDropdown(false);
  }
  if (jobType === "add_links_with_utm" || jobType === "add_utm") {
    showUtmFields(true);
  } else {
    showUtmFields(false);
    if (utmSource) utmSource.value = '';
    if (utmMedium) utmMedium.value = '';
    if (utmCampaign) utmCampaign.value = '';
  }
  // If hiding presets, also reset selection
  if (jobType !== "add_links_only" && jobType !== "add_links_with_utm") {
    resetPresetDropdown();
  }
  validateForm();
}

document.getElementById('job_type').addEventListener('change', updateJobTypeFields);

function validateForm() {
  let isValid = true;

  if (!lastValidFile) isValid = false;

  const jobType = document.getElementById('job_type').value;
  if (!jobType) isValid = false;

  if ((jobType === "add_links_only" || jobType === "add_links_with_utm") && linkFields.style.display !== 'none') {
    const tfInputs = rowsContainer.querySelectorAll('input[name="target_formats[]"]');
    const buInputs = rowsContainer.querySelectorAll('input[name="base_urls[]"]');
    if (tfInputs.length === 0 || buInputs.length === 0) isValid = false;
    for (let i = 0; i < tfInputs.length; i++) {
      if (!tfInputs[i].value.trim() || !buInputs[i].value.trim()) {
        isValid = false;
        break;
      }
    }
  }

  if (utmSection && utmSection.style.display !== 'none') {
    if (!utmSource.value.trim() || !utmMedium.value.trim() || !utmCampaign.value.trim()) {
      isValid = false;
    }
  }

  submitBtn.disabled = !isValid;
  submitBtn.style.opacity = isValid ? "1" : "0.65";
  submitBtn.style.cursor = isValid ? "pointer" : "not-allowed";
}

function bindValidationListeners() {
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', validateForm);
  });
  document.getElementById('job_type').addEventListener('change', validateForm);
  document.getElementById('file').addEventListener('change', validateForm);
}

// ----- PRESETS LOGIC -----

let userPresetsCache = [];

function showPresetsDropdown(show) {
  const group = document.getElementById('presets-dropdown-group');
  if (group) group.style.display = show ? '' : 'none';
}

function resetPresetDropdown() {
  const select = document.getElementById('preset_select');
  if (select) {
    select.value = '';
  }
}

// Updated: fill all rows for all target formats in the preset array
function clearRowsAndFill(targetFormats, baseUrl) {
  rowsContainer.innerHTML = '';

  // Convert array to comma-separated string if needed
  let tfString = '';
  if (Array.isArray(targetFormats)) {
    tfString = targetFormats.join(', ');
  } else if (targetFormats && typeof targetFormats === "string") {
    tfString = targetFormats;
  }

  rowsContainer.appendChild(createRow(tfString, baseUrl));
  updateDeleteButtons();
}

async function initPresetDropdown() {
  // Wait for user to be logged in and Firebase to be ready
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    // Also need Firestore compat SDK loaded!
    if (typeof firebase.firestore !== "function") {
      // Not loaded, skip
      return;
    }
    try {
      const db = firebase.firestore();
      const presetsRef = db.collection('userPresets').doc(user.uid).collection('presets');
      const snapshot = await presetsRef.orderBy('createdAt', 'desc').get();
      userPresetsCache = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        userPresetsCache.push({
          id: doc.id,
          name: data.name,
          target_formats: data.target_formats,
          base_url: data.base_url
        });
      });
      const select = document.getElementById('preset_select');
      if (select) {
        // Remove all except first option
        while (select.options.length > 1) {
          select.remove(1);
        }
        userPresetsCache.forEach((preset, i) => {
          const opt = document.createElement('option');
          opt.value = preset.id;
          opt.textContent = preset.name;
          select.appendChild(opt);
        });
        // When user selects a preset:
        select.onchange = function () {
          const selectedId = this.value;
          const preset = userPresetsCache.find(p => p.id === selectedId);
          if (preset) {
            clearRowsAndFill(
              preset.target_formats,
              preset.base_url || ''
            );
            validateForm();
          }
        };
      }
    } catch (e) {
      // Could not load presets; fail silently for now
    }
  });
}

// ----- END PRESETS LOGIC -----

function showLoader() {
  loader.classList.add('active');
}
function hideLoader() {
  loader.classList.remove('active');
}

function resetForm() {
  form.reset();
  lastValidFile = null;
  const span = document.getElementById('file-filename');
  if (span) span.textContent = "No file chosen";
  rowsContainer.innerHTML = '';
  if (utmSection) utmSection.style.display = "none";
  if (linkFields) linkFields.style.display = "none";
  statusDiv.textContent = "";
  validateForm();
}

function showResultScreen(processedUrl, reportUrl) {
  mainFormWrapper.style.display = 'none';
  resultScreen.style.display = 'flex';

  let resultContent = resultScreen.querySelector('.result-content');
  if (!resultContent) {
    resultContent = document.createElement('div');
    resultContent.className = 'result-content';
    resultScreen.appendChild(resultContent);
  }
  resultContent.innerHTML = `
    <div class="result-heading">
      <div class="result-title-text">Your processed file is ready!</div>
    </div>
    <div class="result-btns" id="result-btns"></div>
    <a href="#" class="result-return-link" id="result-return-link">
      <span>Return to your submission</span>
    </a>
    <a href="https://app.utmatic.com/source-form.html" class="startnew-link" id="start-new-link">
      <span>Start new submission</span>
    </a>
  `;

  const resultBtns = resultContent.querySelector('#result-btns');
  resultBtns.innerHTML = '';
  if (processedUrl) {
    const btn = document.createElement('a');
    btn.href = processedUrl;
    btn.download = "";
    btn.innerHTML = '<button class="process-btn">Download now</button>';
    resultBtns.appendChild(btn);
  }
  if (reportUrl) {
    const reportLink = document.createElement('a');
    reportLink.href = reportUrl;
    reportLink.download = "";
    reportLink.className = 'result-report-link';
    reportLink.textContent = 'See change log';
    resultBtns.appendChild(reportLink);
  }

  const returnLink = resultContent.querySelector('#result-return-link');
  if (returnLink) {
    returnLink.onclick = function(e) {
      e.preventDefault();
      resultScreen.style.display = 'none';
      mainFormWrapper.style.display = '';
      restoreFormState();
    };
  }

  const startNewLink = resultContent.querySelector('#start-new-link');
  if (startNewLink) {
    startNewLink.onclick = function(e) {
      e.preventDefault();
      resetForm();
      window.location.href = "https://app.utmatic.com/source-form.html";
    };
  }
}

form.onsubmit = async (e) => {
  e.preventDefault();
  saveFormState();
  statusDiv.textContent = "";
  submitBtn.disabled = true;

  const formData = new FormData();

  if (lastValidFile) {
    formData.append("file", lastValidFile);
  }

  const jobType = form.job_type.value;
  formData.append("job_type", jobType);

  if (jobType === "add_links_only" || jobType === "add_links_with_utm") {
    const tfInputs = rowsContainer.querySelectorAll('input[name="target_formats[]"]');
    const buInputs = rowsContainer.querySelectorAll('input[name="base_urls[]"]');
    let tfValues = [];
    let buValues = [];
    for (let i = 0; i < tfInputs.length; i++) {
      if (tfInputs[i].value.trim() && buInputs[i].value.trim()) {
        tfValues.push(tfInputs[i].value.trim());
        buValues.push(buInputs[i].value.trim());
      }
    }
    formData.append("target_formats", tfValues.join(","));
    formData.append("base_url", buValues[0] || "");
  }

  if (utmSection && utmSection.style.display !== 'none') {
    formData.append("utm_source", form.utm_source.value);
    formData.append("utm_medium", form.utm_medium.value);
    formData.append("utm_campaign", form.utm_campaign.value);
  }

  showLoader();
  mainFormWrapper.style.pointerEvents = "none";
  try {
    // --- IMPORTANT: SEND AUTHORIZATION HEADER WITH ID TOKEN ---
    const user = firebase.auth().currentUser;
    if (!user) {
      statusDiv.textContent = "You are not logged in.";
      submitBtn.disabled = false;
      hideLoader();
      return;
    }
    const idToken = await user.getIdToken();
    const resp = await fetch("https://backend-idd.onrender.com/upload/", {
      method: "POST",
      body: formData,
      headers: {
        Authorization: "Bearer " + idToken
      }
    });

    // PATCH: handle backend 429 and show message for existing active job
    let res;
    let isJson = false;
    try {
      res = await resp.clone().json();
      isJson = true;
    } catch (_) {
      // Not JSON, fallback to text
      res = await resp.text();
    }
    if (resp.status === 429 && isJson && res.detail) {
      hideLoader();
      mainFormWrapper.style.pointerEvents = "";
      // Show modal, not alert
      showBackendErrorModal(res.detail);
      submitBtn.disabled = false;
      return;
    }

    if (resp.ok && isJson && res.file_name) {
      pollStatus(res.file_name);
    } else {
      hideLoader();
      mainFormWrapper.style.pointerEvents = "";
      statusDiv.textContent = "Error: " + (isJson ? (res.error || res.detail || "Unknown error") : res);
      submitBtn.disabled = false;
    }
  } catch (err) {
    hideLoader();
    mainFormWrapper.style.pointerEvents = "";
    statusDiv.textContent = "Network error: " + err;
    submitBtn.disabled = false;
  }
};

function showBackendErrorModal(msg) {
  // Remove existing if any
  let existing = document.getElementById('backend-error-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'backend-error-modal';
  modal.style.position = "fixed";
  modal.style.left = 0;
  modal.style.top = 0;
  modal.style.width = "100vw";
  modal.style.height = "100vh";
  modal.style.background = "rgba(0,0,0,0.65)";
  modal.style.zIndex = "10003";
  modal.style.display = "flex";
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";

  const box = document.createElement('div');
  box.style.background = "#fff";
  box.style.borderRadius = "8px";
  box.style.padding = "32px";
  box.style.maxWidth = "410px";
  box.style.textAlign = "center";
  box.style.boxShadow = "0 4px 32px rgba(0,0,0,0.13)";

  const title = document.createElement('h3');
  title.textContent = "Job In Progress";
  box.appendChild(title);

  const msgP = document.createElement('p');
  msgP.textContent = msg;
  msgP.style.margin = "16px 0 0 0";
  box.appendChild(msgP);

  const okBtn = document.createElement('button');
  okBtn.textContent = "OK";
  okBtn.style.padding = "8px 22px";
  okBtn.style.background = "#1a73e8";
  okBtn.style.color = "#fff";
  okBtn.style.border = "none";
  okBtn.style.borderRadius = "4px";
  okBtn.style.fontSize = "16px";
  okBtn.style.marginTop = "24px";
  okBtn.style.cursor = "pointer";
  okBtn.onclick = function () {
    modal.remove();
  };

  box.appendChild(okBtn);
  modal.appendChild(box);
  document.body.appendChild(modal);
}

async function pollStatus(fileName) {
  async function check() {
    try {
      const resp = await fetch(`https://backend-idd.onrender.com/job_status/${fileName}`);
      const res = await resp.json();
      if ((res.processed_ready || res.report_ready) && (res.processed_url || res.report_url)) {
        hideLoader();
        showResultScreen(res.processed_url, res.report_url);
        submitBtn.disabled = false;
        mainFormWrapper.style.pointerEvents = "";
        return;
      }
    } catch (e) {
    }
    setTimeout(check, 4000);
  }
  check();
}
