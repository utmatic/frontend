// --- INDD Source File Processor Script ---

const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const downloadsDiv = document.getElementById('downloads');
const submitBtn = document.getElementById('submitBtn');
const loader = document.getElementById('loader');

form.onsubmit = async (e) => {
  e.preventDefault();
  statusDiv.textContent = "";
  downloadsDiv.innerHTML = "";
  submitBtn.disabled = true;

  // Show spinner
  loader.classList.add('active');

  const formData = new FormData(form);

  // If "Add links only" is checked, send a flag
  if (document.getElementById('disable_utm').checked) {
    formData.set('disable_utm', 'true');
    // Optionally clear UTM fields if you want
    formData.set('source', '');
    formData.set('medium', '');
    formData.set('campaign', '');
  }

  statusDiv.textContent = "Uploading and initializing job...";
  try {
    const resp = await fetch("https://backend-idd.onrender.com/process", {
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
      const resp = await fetch(`https://backend-idd.onrender.com/job_status/${jobId}`);
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
