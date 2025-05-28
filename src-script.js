const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const submitBtn = document.getElementById('submitBtn');
const loader = document.getElementById('loader');
const mainFormWrapper = document.getElementById('main-form-wrapper');
const resultScreen = document.getElementById('result-screen');
const resultBtns = document.getElementById('result-btns');
const startNewBtn = document.getElementById('start-new-btn');
const linkFields = document.getElementById('link-fields');
const rowsContainer = document.getElementById('target-base-rows');

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
