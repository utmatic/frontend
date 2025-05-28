// --- INDD Source File Processor Script ---

const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const downloadsDiv = document.getElementById('downloads');
const submitBtn = document.getElementById('submitBtn');
const loader = document.getElementById('loader');

const API_BASE = "https://utmatic-backend.onrender.com";

form.onsubmit = async (e) => {
  e.preventDefault();
  statusDiv.textContent = "";
  downloadsDiv.innerHTML = "";
  submitBtn.disabled = true;

  // Show spinner
  loader.classList.add('active');

  const formData = new FormData(form);

  // For job_type "links_and_utm", optionally allow disabling UTM fields
  const jobTypeVal = formData.get('job_type');
  if (jobTypeVal === "links_and_utm" && document.getElementById('disable_utm').checked) {
    formData.set('disable_utm', 'true');
    formData.set('source', '');
    formData.set('medium', '');
    formData.set('campaign', '');
  }

  // For fields that are supposed to be lists, convert comma-separated to multiple entries
  // (as FastAPI will expect List[str] for target_format and base_url)
  // Target format
  let targetFormatVal = formData.get('target_format');
  if (targetFormatVal && targetFormatVal.includes(',')) {
    formData.delete('target_format');
    targetFormatVal.split(',').map(s => s.trim()).forEach(fmt => {
      if (fmt) formData.append('target_format', fmt);
    });
  }
  // Base URL
  let baseUrlVal = formData.get('base_url');
  if (baseUrlVal && baseUrlVal.includes(',')) {
    formData.delete('base_url');
    baseUrlVal.split(',').map(s => s.trim()).forEach(url => {
      if (url) formData.append('base_url', url);
    });
  }

  statusDiv.textContent = "Uploading and initializing job...";
  try {
    const resp = await fetch(`${API_BASE}/process`, {
      method: "POST",
      body: formData
    });

    const res = await resp.json();
    if (resp.ok && res.job_id) {
      statusDiv.textContent = "Processing your file, please wait...";
      pollStatus(res.job_id);
    } else {
      loader.classList.remove('active');
      statusDiv.textContent = "Error: " + (res.error || "Unknown error");
      submitBtn.disabled = false;
    }
  } catch (err) {
    loader.classList.remove('active');
    statusDiv.textContent = "Network error: " + err;
    submitBtn.disabled = false;
  }
};

async function pollStatus(jobId) {
  let timer;
  async function check() {
    try {
      const resp = await fetch(`${API_BASE}/job_status/${jobId}`);
      const res = await resp.json();
      if ((res.processed_ready || res.report_ready) && (res.processed_url || res.report_url)) {
        loader.classList.remove('active');
        statusDiv.textContent = "Your files are ready!";
        downloadsDiv.innerHTML = `
          ${res.processed_ready ? `<a href="${res.processed_url}" download><button>Download Processed INDD</button></a>` : ""}
          ${res.report_ready ? `<a href="${res.report_url}" download><button>Download Hyperlink Report</button></a>` : ""}
        `;
        submitBtn.disabled = false;
        return;
      } else {
        statusDiv.textContent = "Still processing... (this may take a minute)";
      }
    } catch (e) {
      statusDiv.textContent = "Waiting for processing (connection issue, retrying...)";
    }
    timer = setTimeout(check, 4000);
  }
  check();
}
