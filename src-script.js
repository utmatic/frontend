const form = document.getElementById('iddForm');
const statusDiv = document.getElementById('status');
const downloadsDiv = document.getElementById('downloads');
const submitBtn = document.getElementById('submitBtn');

form.onsubmit = async (e) => {
  e.preventDefault();
  statusDiv.textContent = "";
  downloadsDiv.innerHTML = "";
  submitBtn.disabled = true;

  const formData = new FormData(form);

  // Remove fields based on job type for classic backend compatibility
  const jobType = form.job_type.value;

  // For "Add UTM", do not send target_formats or base_url
  if (jobType === "add_utm") {
    formData.delete("target_formats");
    formData.delete("base_url");
  }

  // For "Add links only", do not send UTM parameters
  if (jobType === "add_links_only") {
    formData.delete("utm_source");
    formData.delete("utm_medium");
    formData.delete("utm_campaign");
  }

  // For "Add UTM", we should still make sure UTM params are present
  // (Fields will always be present unless hidden by HTML, so nothing needed here)

  statusDiv.textContent = "Uploading and initializing job...";
  try {
    const resp = await fetch("https://backend-idd.onrender.com/upload/", {
      method: "POST",
      body: formData
    });

    const res = await resp.json();
    if (resp.ok && res.job_id) {
      statusDiv.textContent = "Processing your file, please wait...";
      pollStatus(res.job_id);
    } else {
      statusDiv.textContent = "Error: " + (res.error || "Unknown error");
      submitBtn.disabled = false;
    }
  } catch (err) {
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
