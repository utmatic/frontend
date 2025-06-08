// --- Firebase config (replace with your real config if needed) ---
const firebaseConfig = {
  apiKey: "AIzaSyC2Z6UcvqkwBPYzoFMhxc7JFeJHeeNpr3U",
  authDomain: "utmatic.firebaseapp.com",
  projectId: "utmatic",
  storageBucket: "utmatic.firebasestorage.app",
  messagingSenderId: "106080752806",
  appId: "1:106080752806:web:217a463a446a850cf71067",
  measurementId: "G-7JD0EVYF7M"
};

if (typeof firebase === 'undefined') {
  throw new Error('Firebase SDK not loaded! Add the Firebase script before dash.js.');
}

firebase.initializeApp(firebaseConfig);

let jobs = [];
let jobsLoaded = false;
let presets = [];
let presetsLoaded = false;

// PATCH: Security/Retention settings
let userSecuritySettings = {
  sessionTimeoutMinutes: null // PATCH: session timeout value in minutes (null = not loaded)
};
let userSecurityLoaded = false;
let sessionTimeoutTimer = null;
let sessionTimeoutWarningTimer = null;

const SECONDS_PER_LINK = 30;
const UNITS = [
  { name: "minutes", label: "Minutes", factor: 60 },
  { name: "hours", label: "Hours", factor: 3600 },
  { name: "days", label: "Days", factor: 86400 }
];
let currentUnit = UNITS[0];

function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 450);
  }
}

function computeTimeSaved(jobs, unitObj = currentUnit) {
  if (!Array.isArray(jobs)) return 0;
  const totalLinks = jobs.reduce((sum, job) => sum + (parseInt(job.linkCount) || 0), 0);
  const secondsSaved = totalLinks * SECONDS_PER_LINK;
  return secondsSaved / unitObj.factor;
}
function formatTimeSaved(val, unitObj = currentUnit) {
  if (unitObj.name === "minutes") return Math.round(val).toLocaleString();
  if (unitObj.name === "hours")
    return (Math.round(val * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (unitObj.name === "days")
    return (Math.round(val * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return val.toLocaleString();
}
function renderTimesaveWidget(jobs) {
  const initialVal = formatTimeSaved(computeTimeSaved(jobs, currentUnit), currentUnit);
  return `
    <div class="timesave-widget">
      <div class="timesave-label">Time Saved</div>
      <div class="timesave-main">
        <span class="timesave-value" id="timesave-value">${initialVal}</span>
        <span class="timesave-unit-toggle">
          ${UNITS.map(unit =>
            `<button class="timesave-unit-btn${unit.name === currentUnit.name ? " active" : ""}" data-unit="${unit.name}">${unit.label}</button>`
          ).join("")}
        </span>
      </div>
    </div>
  `;
}
function animateCounter(elem, targetValue, unitObj) {
  if (!elem) return;
  let start = 0;
  let end = targetValue;
  let duration = 900;
  let startTimestamp = null;
  let decimals = unitObj.name === "minutes" ? 0 : (unitObj.name === "hours" ? 1 : 2);
  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const value = start + (end - start) * progress;
    elem.textContent = value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    if (progress < 1) window.requestAnimationFrame(step);
  }
  window.requestAnimationFrame(step);
}
function updateTimesaveWidget(jobs, unitName) {
  const unitObj = UNITS.find(u => u.name === unitName) || UNITS[0];
  const value = computeTimeSaved(jobs, unitObj);
  const valElem = document.getElementById('timesave-value');
  if (valElem) animateCounter(valElem, value, unitObj);
  document.querySelectorAll('.timesave-unit-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.unit === unitObj.name);
  });
  currentUnit = unitObj;
}
function bindTimesaveWidgetEvents(jobs) {
  document.querySelectorAll('.timesave-unit-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const unitName = btn.dataset.unit;
      updateTimesaveWidget(jobs, unitName);
    };
  });
}
function formatDate(dateInput) {
  if (!dateInput) return "{{job.date}}";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "{{job.date}}";
  const options = {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true
  };
  return date.toLocaleString('en-US', options);
}
function beautifyJobType(str) {
  if (!str) return "{{job.jobtype}}";
  const s = str.toLowerCase();
  if (s === "add_links_only" || s === "links_only" || s === "add links only" || s === "links only") return "Links only";
  if (s === "add_utm" || s === "utm_only" || s === "utm only" || s === "add utm") return "UTM only";
  if (
    s === "add_links_and_utm" || s === "links_and_utm" ||
    s === "add_links_and_utm" || s === "add links and utm" || s === "links and utm" ||
    s === "add_links_with_utm" || s === "add links with utm"
  ) return "Links and UTM";
  const fallback = s.replace(/_/g, " ").replace(/\b\w/g, (l, i) => (i === 0 ? l.toUpperCase() : l));
  return fallback;
}
function fileTypeChip(filetype) {
  if (!filetype) return `<span class="file-type-chip">{{job.filetype}}</span>`;
  const type = filetype.trim().toUpperCase();
  if (type === "PDF") return `<span class="file-type-chip">${type}</span>`;
  if (type === "INDD") return `<span class="file-type-chip indd">${type}</span>`;
  return `<span class="file-type-chip">${filetype}</span>`;
}

// PATCH: Add delete button to each row and bind logic
function renderHistorySnapshot(jobs) {
  if (!jobs || jobs.length === 0) {
    return `<div class="history-list"><div style="text-align:center; font-style:italic; color:var(--gray-400); padding:30px 0;">No history available yet</div></div>`;
  }
  const rows = jobs.slice(0, 5).map(job => `
    <tr data-job-id="${job.id}">
      <td>${formatDate(job.date)}</td>
      <td>${fileTypeChip(job.filetype)}</td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${beautifyJobType(job.jobtype)}</td>
      <td>
        <a href="${job.processedUrl ?? '#'}" class="download-link" download title="Download file">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"/></svg>
        </a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download title="Download report">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"/></svg>
        </a>
      </td>
      <td>
        <button class="history-delete-btn" data-job-id="${job.id}" data-job-type="${job.filetype}" title="Delete document" aria-label="Delete document">&times;</button>
      </td>
    </tr>
  `).join("");
  return `
    <div class="history-list">
      <table class="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>File Type</th>
            <th>Document Name</th>
            <th>Job Type</th>
            <th>Downloads</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function renderHistory(jobs) {
  if (!jobs || jobs.length === 0) {
    return `<div class="history-list"><div style="text-align:center; font-style:italic; color:var(--gray-400); padding:30px 0;">No history available yet</div></div>`;
  }
  const rows = jobs.map(job => `
    <tr data-job-id="${job.id}">
      <td>${formatDate(job.date)}</td>
      <td>${fileTypeChip(job.filetype)}</td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${beautifyJobType(job.jobtype)}</td>
      <td>
        <a href="${job.processedUrl ?? '#'}" class="download-link" download title="Download file">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"/></svg>
        </a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download title="Download report">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"/></svg>
        </a>
      </td>
      <td>
        <button class="history-delete-btn" data-job-id="${job.id}" data-job-type="${job.filetype}" title="Delete document" aria-label="Delete document">&times;</button>
      </td>
    </tr>
  `).join("");
  return `
    <div class="history-list">
      <table class="history-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>File Type</th>
            <th>Document Name</th>
            <th>Job Type</th>
            <th>Downloads</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// PATCH: Delete job via backend API (not Firestore SDK)
async function deleteJobBackend(jobId, jobType) {
  // jobType: "INDD" or "PDF" (case-insensitive)
  const user = firebase.auth().currentUser;
  if (!user) throw new Error("No user");
  // Determine correct type for backend API
  let typeParam = "";
  if (jobType && typeof jobType === "string") {
    const t = jobType.trim().toLowerCase();
    if (t === "indd") typeParam = "indd";
    else if (t === "pdf") typeParam = "pdf";
    else throw new Error("Unknown job type");
  } else {
    throw new Error("Missing job type");
  }
  const idToken = await user.getIdToken();
  const response = await fetch(`https://backend-idd.onrender.com/jobs/${typeParam}/${encodeURIComponent(jobId)}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + idToken
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to delete job: " + errorText);
  }
  // Remove job from local jobs array
  jobs = jobs.filter(j => j.id !== jobId);
}

// PATCH: Bind delete button listeners for history tables
function bindHistoryDeleteButtons() {
  document.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.onclick = async function(e) {
      e.preventDefault();
      const jobId = btn.dataset.jobId;
      const jobType = btn.dataset.jobType;
      if (!jobId || !jobType) return;
      if (!window.confirm('Delete this document from your history?')) return;
      // Remove row from DOM immediately (optimistic UI)
      const row = btn.closest('tr');
      if (row) row.remove();
      try {
        await deleteJobBackend(jobId, jobType);
      
        // --- Log the deletion in Firestore ---
        const user = firebase.auth().currentUser;
        if (user) {
          const db = firebase.firestore();
          await db.collection('deletedDocsLog').add({
            jobId: jobId,
            jobType: jobType,
            deletedByUid: user.uid,
            deletedByEmail: user.email,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (err) {
        alert("Failed to delete. Please refresh or try again.\n\n" + (err.message || err));
      }
    };
  });
}

function renderPresetsSection(presets) {
  return `
    <section class="presets-section">
      <div class="section-title" style="margin-bottom: 18px;">Presets</div>
      <div class="presets-list-container">
        <div class="add-preset-link-row">
          <a class="add-preset-link" id="add-preset-link" href="#">+ Add new</a>
        </div>
        <div class="presets-list">
          ${
            presets.length === 0
              ? `<div style="color:var(--gray-400);text-align:center;font-style:italic;padding:32px 0 18px 0;">No presets yet. Create one above!</div>`
              : presets
                  .map(
                    (preset) => `
            <div class="preset-list-row collapsed" data-preset-id="${preset.id}" tabindex="0">
              <div class="preset-list-content-group">
                <div class="preset-list-name">${preset.name}</div>
                <div class="preset-list-details" style="display:none;">
                  <div class="preset-list-detail-label">Target Formats</div>
                  <div class="preset-list-detail-value">
                    ${preset.target_formats.map(f => `<code>${f}</code>`).join(', ')}
                  </div>
                  <div class="preset-list-detail-label">Base URL</div>
                  <div class="preset-list-detail-value">${preset.base_url}</div>
                </div>
              </div>
              <div class="preset-list-actions">
                <button class="preset-list-action-btn edit" data-preset-id="${preset.id}" title="Edit Preset" aria-label="Edit Preset">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>
                </button>
                <button class="preset-list-action-btn delete" data-preset-id="${preset.id}" title="Delete Preset" aria-label="Delete Preset">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                </button>
              </div>
            </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
      <div class="preset-form-wrapper" id="preset-form-wrapper" style="display:none;">
        <button type="button" class="preset-form-close" id="preset-form-close-btn" title="Close">&times;</button>
        <div class="section-title new-preset-title">New Preset</div>
        <form id="preset-form">
          <div class="field-group">
            <label for="preset-name">Preset Name</label>
            <input type="text" id="preset-name" name="preset-name" required autocomplete="off">
          </div>
          <div class="field-group">
            <label for="preset-target-formats">Target Formats</label>
            <input type="text" id="preset-target-formats" name="preset-target-formats" required placeholder="e.g. NNNN-NNNN, LNNNN-NNNNN, LLLLL-NNN" autocomplete="off">
          </div>
          <div class="field-group">
            <label for="preset-base-url">Base URL</label>
            <input type="text" id="preset-base-url" name="preset-base-url" required placeholder="e.g. https://www.example.com/store/" autocomplete="off">
          </div>
          <input type="hidden" id="preset-id" name="preset-id">
          <div class="form-actions">
            <button type="submit" id="save-preset-btn" class="process-btn">Save Preset</button>
            <button type="button" id="cancel-edit-preset-btn" style="display:none;margin-left:10px;">Cancel</button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function bindPresetsUI() {
  // Add new link logic (top of list)
  const addPresetLink = document.getElementById('add-preset-link');
  const formWrapper = document.getElementById('preset-form-wrapper');
  if (addPresetLink && formWrapper) {
    addPresetLink.onclick = function(e) {
      e.preventDefault(); // Prevent default link action if <a> tag is used
      formWrapper.style.display = '';
      const presetForm = document.getElementById('preset-form');
      if (presetForm) presetForm.reset();
      const saveBtn = document.getElementById('save-preset-btn');
      if (saveBtn) saveBtn.textContent = "Save Preset";
      const cancelBtn = document.getElementById('cancel-edit-preset-btn');
      if (cancelBtn) cancelBtn.style.display = 'none';
      const presetIdInput = document.getElementById('preset-id');
      if (presetIdInput) presetIdInput.value = '';
      setTimeout(() => {
        const nameInput = document.getElementById('preset-name');
        if (nameInput) nameInput.focus();
      }, 50);
    };
  }

  // Collapsible row logic: click row to expand/collapse details (ignore edit/delete button clicks)
  document.querySelectorAll('.preset-list-row').forEach(row => {
    row.addEventListener('click', function(e) {
      if (e.target.closest('.preset-list-action-btn')) return;
      const details = row.querySelector('.preset-list-details');
      const expanded = row.classList.contains('expanded');
      document.querySelectorAll('.preset-list-row').forEach(r => {
        r.classList.remove('expanded');
        r.classList.add('collapsed');
        const d = r.querySelector('.preset-list-details');
        if (d) d.style.display = 'none';
      });
      if (!expanded) {
        row.classList.add('expanded');
        row.classList.remove('collapsed');
        if (details) details.style.display = 'block';
      }
    });
    row.addEventListener('keydown', function(e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        row.click();
      }
    });
  });

  document.querySelectorAll('.preset-list-action-btn.edit').forEach(btn => {
    btn.onclick = function(e) {
      e.stopPropagation();
      const presetId = btn.dataset.presetId;
      const preset = presets.find(p => p.id === presetId);
      if (preset) {
        document.getElementById('preset-form-wrapper').style.display = '';
        document.getElementById('preset-name').value = preset.name;
        document.getElementById('preset-target-formats').value = preset.target_formats.join(', ');
        document.getElementById('preset-base-url').value = preset.base_url;
        document.getElementById('preset-id').value = preset.id;
        document.getElementById('cancel-edit-preset-btn').style.display = '';
        document.getElementById('save-preset-btn').textContent = "Update Preset";
        document.getElementById('preset-name').focus();
      }
    };
  });
  document.querySelectorAll('.preset-list-action-btn.delete').forEach(btn => {
    btn.onclick = async function(e) {
      e.stopPropagation();
      const presetId = btn.dataset.presetId;
      if (window.confirm("Delete this preset?")) {
        await deletePreset(presetId);
        presetsLoaded = false;
        await fetchPresetsOnceAndRender("presets");
      }
    };
  });
  const presetForm = document.getElementById('preset-form');
  if (presetForm) {
    presetForm.onsubmit = async function(e) {
      e.preventDefault();
      const name = document.getElementById('preset-name').value.trim();
      const targetFormatsStr = document.getElementById('preset-target-formats').value.trim();
      const target_formats = targetFormatsStr.split(',').map(s => s.trim()).filter(Boolean);
      const base_url = document.getElementById('preset-base-url').value.trim();
      const id = document.getElementById('preset-id').value;
      if (!name || !target_formats.length || !base_url) {
        alert("Please provide all fields.");
        return;
      }
      await savePreset({ id, name, target_formats, base_url });
      presetsLoaded = false;
      await fetchPresetsOnceAndRender("presets");
      presetForm.reset();
      document.getElementById('cancel-edit-preset-btn').style.display = 'none';
      document.getElementById('save-preset-btn').textContent = "Save Preset";
      document.getElementById('preset-form-wrapper').style.display = 'none';
    };
  }
  const cancelBtn = document.getElementById('cancel-edit-preset-btn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      document.getElementById('preset-form').reset();
      cancelBtn.style.display = 'none';
      document.getElementById('save-preset-btn').textContent = "Save Preset";
      document.getElementById('preset-form-wrapper').style.display = 'none';
    };
  }
  const closeBtn = document.getElementById('preset-form-close-btn');
  if (closeBtn && formWrapper) {
    closeBtn.onclick = function() {
      formWrapper.style.display = 'none';
      document.getElementById('preset-form').reset();
      document.getElementById('cancel-edit-preset-btn').style.display = 'none';
      document.getElementById('save-preset-btn').textContent = "Save Preset";
    };
  }
  if (formWrapper) {
    formWrapper.style.display = 'none';
  }
}

// --- PATCH: Security/Privacy Screen ---
function renderSecuritySection(securitySettings = {}) {
  const { sessionTimeoutMinutes } = securitySettings;
  // Session timeout options (in minutes)
  const sessionTimeoutOptions = [
    { value: 6, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 180, label: "3 hours" },
    { value: 360, label: "6 hours" },
    { value: 0, label: "Never" }
  ];
  const selectedSessionTimeout = typeof sessionTimeoutMinutes === "number" ? sessionTimeoutMinutes : 0;

  return `
    <section class="security-section">
      <div class="section-title">Security & Data Retention</div>
      <form id="security-settings-form" style="max-width:420px;margin:18px 0;">
        <div class="field-group">
          <label for="session-timeout-select" style="font-weight:500;">Log me out after inactivity:</label>
          <select id="session-timeout-select" name="session-timeout-minutes" style="width:100%;margin-top:12px;padding:11px;border-radius:8px;font-size:1.08em;">
            ${sessionTimeoutOptions.map(opt => `<option value="${opt.value}"${selectedSessionTimeout === opt.value ? " selected" : ""}>${opt.label}</option>`).join('')}
          </select>
          <div style="color:var(--gray-400);margin-top:8px;">
            You'll be automatically logged out if you're inactive for the selected time.<br>
            <b>Note:</b> This helps protect your account if you leave your device unattended.
          </div>
        </div>
        <button type="submit" class="process-btn" style="margin-top:22px;">Save</button>
      </form>
      <div id="security-settings-message" style="margin-top:10px;color:var(--gray-400);"></div>
      <div id="session-timeout-warning"></div>
    </section>
  `;
}
function bindSecurityUI() {
  const form = document.getElementById('security-settings-form');
  if (!form) return;
  form.onsubmit = async function(e) {
    e.preventDefault();
    const sessionTimeoutSelect = document.getElementById('session-timeout-select');
    if (!sessionTimeoutSelect) return;
    const sessionTimeoutValue = parseInt(sessionTimeoutSelect.value, 10);
    const msg = document.getElementById('security-settings-message');
    try {
      await saveUserSecuritySettings({ sessionTimeoutMinutes: sessionTimeoutValue });
      userSecuritySettings.sessionTimeoutMinutes = sessionTimeoutValue;
      setupSessionTimeoutWatcher();
      if (msg) {
        msg.textContent = "Saved! Your security settings have been updated.";
        msg.style.color = "#4d89f9";
        setTimeout(() => { msg.textContent = ""; }, 2500);
      }
    } catch (err) {
      if (msg) {
        msg.textContent = "Failed to save your settings. Please try again.";
        msg.style.color = "#e74c3c";
      }
    }
  };
  setupSessionTimeoutWatcher();
}
async function saveUserSecuritySettings({ sessionTimeoutMinutes }) {
  const uid = getCurrentUserUid();
  if (!uid) throw new Error("Not logged in");
  const settingsRef = firebase.firestore().collection('userSecurity').doc(uid);
  await settingsRef.set(
    { sessionTimeoutMinutes: sessionTimeoutMinutes },
    { merge: true }
  );
}
async function fetchUserSecuritySettingsOnceAndRender(view = "security") {
  if (userSecurityLoaded) {
    setView(view);
    return;
  }
  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      const uid = user.uid;
      const settingsRef = firebase.firestore().collection('userSecurity').doc(uid);
      const doc = await settingsRef.get();
      if (doc.exists) {
        const data = doc.data();
        userSecuritySettings.sessionTimeoutMinutes = typeof data.sessionTimeoutMinutes === "number" ? data.sessionTimeoutMinutes : 0;
      } else {
        userSecuritySettings.sessionTimeoutMinutes = 0;
      }
      userSecurityLoaded = true;
      setView(view);
      setupSessionTimeoutWatcher();
    } catch (e) {
      console.error('Error loading security settings:', e);
      userSecuritySettings.autoDeleteDays = 0;
      userSecuritySettings.sessionTimeoutMinutes = 0;
      userSecurityLoaded = true;
      setView(view);
      setupSessionTimeoutWatcher();
    }
  });
}

// --- PATCH: Session Timeout Logic ---
function setupSessionTimeoutWatcher() {
  if (sessionTimeoutTimer) {
    clearTimeout(sessionTimeoutTimer);
    sessionTimeoutTimer = null;
  }
  if (sessionTimeoutWarningTimer) {
    clearTimeout(sessionTimeoutWarningTimer);
    sessionTimeoutWarningTimer = null;
  }
  const min = userSecuritySettings.sessionTimeoutMinutes;
  if (!firebase.auth().currentUser || !min || min === 0) {
    hideSessionTimeoutWarning();
    return;
  }
  let lastActivity = Date.now();

  window.resetSessionTimeoutWatcher = function() {
    lastActivity = Date.now();
    hideSessionTimeoutWarning();
    scheduleTimers();
  };
  
  if (!window.__utmaticSessionListenersBound) {
    ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt =>
      window.addEventListener(evt, resetSessionTimeoutWatcher, true)
    );
    window.__utmaticSessionListenersBound = true;
  }

  function getExpireTime() {
    return lastActivity + min * 60 * 1000;
  }
  function getWarningTime() {
    return getExpireTime() - 5 * 60 * 1000;
  }

  function scheduleTimers() {
    if (sessionTimeoutTimer) clearTimeout(sessionTimeoutTimer);
    if (sessionTimeoutWarningTimer) clearTimeout(sessionTimeoutWarningTimer);

    const now = Date.now();
    const timeToExpire = getExpireTime() - now;
    const timeToWarning = getWarningTime() - now;

    if (timeToWarning > 0) {
      sessionTimeoutWarningTimer = setTimeout(showSessionTimeoutWarning, timeToWarning);
    } else if (timeToExpire > 0) {
      showSessionTimeoutWarning();
    }

    sessionTimeoutTimer = setTimeout(() => {
      hideSessionTimeoutWarning();
      firebase.auth().signOut().then(() => {
        window.location.href = "/login?timeout=1";
      });
    }, timeToExpire);
  }

  function showSessionTimeoutWarning() {
    const warningEl = document.getElementById('session-timeout-warning');
    if (!warningEl) return;
    const now = Date.now();
    const expireAt = getExpireTime();
    let remaining = Math.max(0, Math.floor((expireAt - now) / 1000));
    function format(n) {
      const m = Math.floor(n / 60);
      const s = n % 60;
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    }
    function update() {
      remaining = Math.max(0, Math.floor((expireAt - Date.now()) / 1000));
      if (remaining <= 0) {
        warningEl.style.display = "none";
        return;
      }
      warningEl.style.display = "block";
      warningEl.innerHTML =
        `<span>You will be logged out in <b>${format(remaining)}</b> due to inactivity.</span>`;
      sessionTimeoutWarningTimer = setTimeout(update, 1000);
    }
    update();
  }

  function hideSessionTimeoutWarning() {
    const warningEl = document.getElementById('session-timeout-warning');
    if (warningEl) {
      warningEl.style.display = "none";
      warningEl.innerHTML = "";
    }
    if (sessionTimeoutWarningTimer) {
      clearTimeout(sessionTimeoutWarningTimer);
      sessionTimeoutWarningTimer = null;
    }
  }
  
  scheduleTimers();
}

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    if (userSecurityLoaded) setupSessionTimeoutWatcher();
  } else {
    if (sessionTimeoutTimer) clearTimeout(sessionTimeoutTimer);
    if (sessionTimeoutWarningTimer) clearTimeout(sessionTimeoutWarningTimer);
    hideSessionTimeoutWarning();
  }
});

// PATCH: Firestore user settings helpers
function getCurrentUserUid() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
}

// --- PATCH: Add to views map ---
const views = {
  dashboard: () => `
    <section>
      ${renderTimesaveWidget(jobs)}
      <div class="section-title" style="margin-top:40px;">Recent History</div>
      ${renderHistorySnapshot(jobs)}
      <div style="margin-top: 16px;"><a href="#" id="view-full-history" class="download-link">View full history →</a></div>
    </section>
  `,
  history: () => `
    <section>
      <div class="section-title">History</div>
      ${renderHistory(jobs)}
    </section>
  `,
  settings: () => `
    <section>
      <div class="section-title">Settings</div>
      <div style="color:var(--gray-400);">Settings options will go here.</div>
    </section>
  `,
  presets: () => renderPresetsSection(presets),
  security: () => renderSecuritySection(userSecuritySettings)
};

function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 450);
  }
}

async function fetchPresetsOnceAndRender(view = "presets") {
  if (presetsLoaded) {
    setView(view);
    return;
  }
  firebase.auth().onAuthStateChanged(async function(user) {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      const uid = user.uid;
      const presetsRef = firebase.firestore().collection('userPresets').doc(uid).collection('presets');
      const snapshot = await presetsRef.get();
      presets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      presetsLoaded = true;
      setView(view);
    } catch (e) {
      console.error('Error loading presets:', e);
      presets = [];
      presetsLoaded = true;
      setView(view);
    }
  });
}
async function savePreset({ id, name, target_formats, base_url }) {
  const uid = getCurrentUserUid();
  if (!uid) return;
  const presetsRef = firebase.firestore().collection('userPresets').doc(uid).collection('presets');
  if (id) {
    await presetsRef.doc(id).set({
      name,
      target_formats,
      base_url,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } else {
    await presetsRef.add({
      name,
      target_formats,
      base_url,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}
async function deletePreset(presetId) {
  const uid = getCurrentUserUid();
  if (!uid || !presetId) return;
  const presetsRef = firebase.firestore().collection('userPresets').doc(uid).collection('presets');
  await presetsRef.doc(presetId).delete();
}

document.addEventListener('DOMContentLoaded', function() {
  const mainView = document.getElementById('dash-main-view');
  const sidebar = document.querySelector('.dash-sidebar');
  let jobsDone = false, presetsDone = false;
  function tryHideOverlayAndShowDashboard() {
    if (jobsDone && presetsDone) {
      setView("dashboard");
      hideLoadingOverlay();
    }
  }
  function fetchAllDataOnLoad() {
    let jobsDone = false, presetsDone = false, securityDone = false;

    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      // --- Fetch jobs ---
      const idToken = await user.getIdToken();
      fetch('https://backend-idd.onrender.com/jobs', {
        headers: { Authorization: "Bearer " + idToken }
      })
        .then(res => res.json())
        .then(data => {
          // PATCH: Add an ID to each job for deletion logic
          jobs = data.map(job => ({
            ...job,
            id: job.document // Use document name as unique ID (matches jobId/file_name)
          }));
          jobsLoaded = true;
          jobsDone = true;
          tryHideOverlayAndShowDashboard();
        })
        .catch(err => {
          console.error('Error loading jobs:', err);
          jobs = [];
          jobsLoaded = true;
          jobsDone = true;
          tryHideOverlayAndShowDashboard();
        });

      // --- Fetch presets ---
      try {
        const uid = user.uid;
        const presetsRef = firebase.firestore().collection('userPresets').doc(uid).collection('presets');
        const snapshot = await presetsRef.get();
        presets = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        presetsLoaded = true;
        presetsDone = true;
        tryHideOverlayAndShowDashboard();
      } catch (e) {
        console.error('Error loading presets:', e);
        presets = [];
        presetsLoaded = true;
        presetsDone = true;
        tryHideOverlayAndShowDashboard();
      }

      // --- Fetch security settings ---
      try {
        const uid = user.uid;
        const settingsRef = firebase.firestore().collection('userSecurity').doc(uid);
        const doc = await settingsRef.get();
        if (doc.exists) {
          const data = doc.data();
          userSecuritySettings.autoDeleteDays = typeof data.autoDeleteDays === "number" ? data.autoDeleteDays : 0;
          userSecuritySettings.sessionTimeoutMinutes = typeof data.sessionTimeoutMinutes === "number" ? data.sessionTimeoutMinutes : 0;
        } else {
          userSecuritySettings.autoDeleteDays = 0;
          userSecuritySettings.sessionTimeoutMinutes = 0;
        }
        userSecurityLoaded = true;
        securityDone = true;
        tryHideOverlayAndShowDashboard();
        setupSessionTimeoutWatcher();
      } catch (e) {
        console.error('Error loading security settings:', e);
        userSecuritySettings.autoDeleteDays = 0;
        userSecuritySettings.sessionTimeoutMinutes = 0;
        userSecurityLoaded = true;
        securityDone = true;
        tryHideOverlayAndShowDashboard();
        setupSessionTimeoutWatcher();
      }
    });

    function tryHideOverlayAndShowDashboard() {
      if (jobsDone && presetsDone && securityDone) {
        setView("dashboard");
        hideLoadingOverlay();
      }
    }
  }

  // --- Call all at page load ---
  fetchAllDataOnLoad();

  // --- Sidebar and setView logic ---
  if (sidebar) {
    sidebar.addEventListener('click', function(e) {
      const btn = e.target.closest('.dash-sidebar-btn');
      if (btn) {
        e.preventDefault();
        if (!btn.classList.contains('active')) {
          if (btn.dataset.view === "security" && !userSecurityLoaded) {
            fetchUserSecuritySettingsOnceAndRender("security");
          } else if (btn.dataset.view === "presets" && !presetsLoaded) {
            fetchPresetsOnceAndRender("presets");
          } else if (btn.dataset.view === "dashboard" && !jobsLoaded) {
            setView("dashboard");
          } else {
            setView(btn.dataset.view);
          }
        }
      }
    });
  }
  function setView(view) {
    mainView.innerHTML = views[view]();
    document.querySelectorAll('.dash-sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    if (view === "dashboard" && jobsLoaded) {
      bindTimesaveWidgetEvents(jobs);
      updateTimesaveWidget(jobs, currentUnit.name);
      const link = document.getElementById("view-full-history");
      if (link) {
        link.onclick = function(e) {
          e.preventDefault();
          window.setView("history");
        };
      }
      bindHistoryDeleteButtons();
    }
    if (view === "history" && jobsLoaded) {
      bindHistoryDeleteButtons();
    }
    if (view === "presets" && presetsLoaded) {
      bindPresetsUI();
    }
    if (view === "security" && userSecurityLoaded) {
      bindSecurityUI();
    }
  }
  window.setView = debounce(function(view) {
    if (view === "security" && !userSecurityLoaded) {
      fetchUserSecuritySettingsOnceAndRender(view);
    } else if (view === "presets" && !presetsLoaded) {
      fetchPresetsOnceAndRender(view);
    } else if (view === "dashboard" && !jobsLoaded) {
      setView(view);
    } else {
      setView(view);
    }
  }, 200);

  const dropdownBtn = document.getElementById('new-dropdown-btn');
  const dropdownList = document.getElementById('new-dropdown-list');
  if (dropdownBtn && dropdownList) {
    dropdownBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdownList.classList.toggle('show');
    });
    document.addEventListener('click', function(e) {
      if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) {
        dropdownList.classList.remove('show');
      }
    });
  }
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', function() {
      firebase.auth().signOut().then(function() {
        window.location.href = "/login";
      });
    });
  }
});
