const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const loader = document.getElementById('loader');
const mainFormWrapper = document.getElementById('main-form-wrapper');
const resultScreen = document.getElementById('result-screen');
const resultBtns = document.getElementById('result-btns');
const startNewBtn = document.getElementById('start-new-btn');

// File input display
document.getElementById('file').addEventListener('change', function() {
  const span = document.getElementById('file-filename');
  if (this.files && this.files.length > 0) {
    span.textContent = this.files[0].name;
  } else {
    span.textContent = "No file chosen";
  }
});

// --- Dynamic Target Format & Base URL Rows ---
const linkFields = document.getElementById('link-fields');
const rowsContainer = document.getElementById('target-base-rows');
const addRowBtn = document.getElementById('add-row-btn');
const MAX_ROWS = 5;

function createRow(tfValue = '', buValue = '') {
  const row = document.createElement('div');
  row.className = 'field-row side-by-side-fields';
  // Target Format
  const tfGroup = document.createElement('div');
  tfGroup.className = 'field-group';
  const tfInput = document.createElement('input');
  tfInput.type = 'text';
  tfInput.name = 'target_formats[]';
  tfInput.placeholder = 'Target Format';
  tfInput.required = true;
  tfInput.value = tfValue;
  tfGroup.appendChild(tfInput);
  // Base URL
  const buGroup = document.createElement('div');
  buGroup.className = 'field-group';
  const buInput = document.createElement('input');
  buInput.type = 'text';
  buInput.name = 'base_urls[]';
  buInput.placeholder = 'Base URL';
  buInput.required = true;
  buInput.value = buValue;
  buGroup.appendChild(buInput);
  row.appendChild(tfGroup);
  row.appendChild(buGroup);

  // Only show delete button for rows after the first
  setTimeout(() => {
    const rows = rowsContainer.querySelectorAll('.field-row');
    if (rows.length > 0 || rowsContainer.childElementCount > 0) {
      // If this is not the very first row, show delete button
      if (rowsContainer.childElementCount > 0) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-row-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Remove row';
        delBtn.onclick = function() {
          row.remove();
          updateRowControls();
        };
        row.appendChild(delBtn);
      }
    }
    updateRowControls();
  }, 0);
  return row;
}

function updateRowControls() {
  const rows = rowsContainer.querySelectorAll('.field-row');
  addRowBtn.disabled = rows.length >= MAX_ROWS;
}

function showLinkFields(show) {
  linkFields.style.display = show ? "block" : "none";
  // Ensure at least one row exists when showing
  if (show && rowsContainer.childElementCount === 0) {
    rowsContainer.appendChild(createRow());
  }
  updateDeleteButtons();
  updateRowControls();
  // Set required only if visible
  const allInputs = linkFields.querySelectorAll('input');
  allInputs.forEach(input => input.required = show);
}

function updateDeleteButtons() {
  const rows = Array.from(rowsContainer.querySelectorAll('.field-row'));
  rows.forEach((row, idx) => {
    let delBtn = row.querySelector('.delete-row-btn');
    if (idx === 0) {
      if (delBtn) delBtn.remove();
    } else {
      if (!delBtn) {
        delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-row-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Remove row';
        delBtn.onclick = function() {
          row.remove();
          updateDeleteButtons();
          updateRowControls();
        };
        row.appendChild(delBtn);
      }
    }
  });
}

addRowBtn.onclick = function() {
  if (rowsContainer.childElementCount < MAX_ROWS) {
    rowsContainer.appendChild(createRow());
    updateDeleteButtons();
    updateRowControls();
  }
};

// --- Job type logic for showing/hiding fields
function updateJobTypeFields() {
  const jobType = document.getElementById('job_type').value;
  // Show/hide Target Format & Base URL
  if (jobType === "add_links_only" || jobType === "add_links_with_utm") {
    showLinkFields(true);
  } else {
    showLinkFields(false);
    // Remove all rows if hiding
    rowsContainer.innerHTML = '';
  }
  // Show/hide UTM parameters
  const utmRow = document.getElementById('utm-row');
  const utmLabel = document.getElementById('utm-label');
  if (jobType === "add_links_only") {
    utmRow.style.display = "none";
    utmLabel.style.display = "none";
    document.getElementById('utm_source').required = false;
    document.getElementById('utm_medium').required = false;
    document.getElementById('utm_campaign').required = false;
  } else {
    utmRow.style.display = "";
    utmLabel.style.display = "";
    document.getElementById('utm_source').required = true;
    document.getElementById('utm_medium').required = true;
    document.getElementById('utm_campaign').required = true;
  }
}
document.getElementById('job_type').addEventListener('change', updateJobTypeFields);
window.addEventListener('DOMContentLoaded', () => {
  updateJobTypeFields();
});

// --- Helper for showing/hiding loader overlay ---
function showLoader() {
  loader.classList.add('active');
}
function hideLoader() {
  loader.classList.remove('active');
}

// --- Show result screen ---
function showResultScreen(processedUrl, reportUrl) {
  mainFormWrapper.style.display = 'none';
  resultScreen.style.display = 'flex';
  resultBtns.innerHTML = '';
  if (processedUrl) {
    const btn = document.createElement('a');
    btn.href = processedUrl;
    btn.download = "";
    btn.innerHTML = '<button class="process-btn">Download Processed INDD</button>';
    resultBtns.appendChild(btn);
  }
  if (reportUrl) {
    const btn = document.createElement('a');
    btn.href = reportUrl;
    btn.download = "";
    btn.innerHTML = '<button class="process-btn">Download Hyperlink Report</button>';
    resultBtns.appendChild(btn);
  }
}

// --- Start new submission ---
startNewBtn.onclick = function() {
  window.location.href = "https://app.utmatic.com/source-form.html";
};

form.onsubmit = async (e) => {
  e.preventDefault();
  statusDiv.textContent = "";
  submitBtn.disabled = true;

  // Prepare FormData
  const formData = new FormData();

  // File
  if (form.file.files.length > 0) {
    formData.append("file", form.file.files[0]);
  }

  // Job type
  const jobType = form.job_type.value;
  formData.append("job_type", jobType);

  // Target formats and base urls (as CSV strings, or you could repeat fields)
  if (jobType === "add_links_only" || jobType === "add_links_with_utm") {
    // Collect all row values
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
    // You may want to join as CSV or send as repeated fields. Here, join as comma-separated.
    formData.append("target_formats", tfValues.join(","));
    formData.append("base_url", buValues[0] || "");
  }

  // UTM params
  if (jobType !== "add_links_only") {
    formData.append("utm_source", form.utm_source.value);
    formData.append("utm_medium", form.utm_medium.value);
    formData.append("utm_campaign", form.utm_campaign.value);
  }

  // Show loader
  showLoader();
  mainFormWrapper.style.pointerEvents = "none";
  try {
    const resp = await fetch("https://backend-idd.onrender.com/upload/", {
      method: "POST",
      body: formData
    });

    const res = await resp.json();
    if (resp.ok && res.job_id) {
      pollStatus(res.job_id);
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

async function pollStatus(jobId) {
  async function check() {
    try {
      const resp = await fetch(`https://backend-idd.onrender.com/job_status/${jobId}`);
      const res = await resp.json();
      if ((res.processed_ready || res.report_ready) && (res.processed_url || res.report_url)) {
        hideLoader();
        showResultScreen(res.processed_url, res.report_url);
        submitBtn.disabled = false;
        mainFormWrapper.style.pointerEvents = "";
        return;
      }
    } catch (e) {
      // Ignore and retry
    }
    setTimeout(check, 4000);
  }
  check();
}
