// --- Firebase Auth gating for Source Form ---
// ASSUMES:
// - Firebase SDK scripts are loaded in your HTML _before_ this file!
// - This page is /source-form or similar

function getRedirectUrl() {
  // Always redirect back to this page after login
  return window.location.pathname;
}

// --- LOADING OVERLAY HANDLING ---
const loadingOverlay = document.getElementById("loading-overlay");
const loaderGreeting = document.getElementById("loader-greeting");
const loaderBlurb = document.getElementById("loader-blurb");

function personalizeOverlay(firstName) {
  if (loaderGreeting) loaderGreeting.textContent = `Hi ${firstName}!`;
}

function hideLoadingOverlay() {
  if (loadingOverlay) {
    loadingOverlay.classList.add("hidden");
    setTimeout(() => {
      loadingOverlay.style.display = "none";
    }, 700);
  }
}

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
    // Hide overlay so error is visible
    hideLoadingOverlay();
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
      // Personalize and fade out overlay
      let firstName = "there";
      if (user.displayName) {
        firstName = user.displayName.split(" ")[0];
      } else if (user.email) {
        firstName = user.email.split("@")[0];
      }
      personalizeOverlay(firstName);
      setTimeout(hideLoadingOverlay, 900);

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

window.addEventListener('DOMContentLoaded', ensureLoggedInAndProBusiness);

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
  } else {
    showLinkFields(false);
    rowsContainer.innerHTML = '';
  }
  if (jobType === "add_links_with_utm" || jobType === "add_utm") {
    showUtmFields(true);
  } else {
    showUtmFields(false);
    if (utmSource) utmSource.value = '';
    if (utmMedium) utmMedium.value = '';
    if (utmCampaign) utmCampaign.value = '';
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
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="startnew-icon" width="21" height="21" style="margin-left:7px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0-3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    </a>
    <a href="https://app.utmatic.com/source-form.html" class="startnew-link" id="start-new-link">
      <span>Start new submission</span>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="startnew-icon" width="21" height="21" style="margin-left:7px;">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0-3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
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
    reportLink.innerHTML = `
      See change log
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
        <path stroke-linecap="round" stroke-linejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
      </svg>
    `;
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
    const resp = await fetch("https://backend-idd.onrender.com/upload/", {
      method: "POST",
      body: formData
    });

    const res = await resp.json();
    if (resp.ok && res.file_name) {
      pollStatus(res.file_name);
    } else {
      hideLoader();
      mainFormWrapper.style.pointerEvents = "";
      statusDiv.textContent = "Error: " + (res.error || "Unknown error");
      submitBtn.disabled = false;
    }
  } catch (err) {
    hideLoader();
    mainFormWrapper.style.pointerEvents = "";
    statusDiv.textContent = "Network error: " + err;
    submitBtn.disabled = false;
  }
};

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

window.addEventListener('DOMContentLoaded', () => {
  if (utmSection) utmSection.style.display = "none";
  lastValidFile = null;
  const span = document.getElementById('file-filename');
  if (span) span.textContent = "No file chosen";
  bindValidationListeners();
  updateJobTypeFields();
  validateForm();
});
