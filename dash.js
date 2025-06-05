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
let jobsLoaded = false; // Track if jobs are already loaded

// --- Preset Management ---
let presets = [];
let presetsLoaded = false;

// --- Time Save & Counter Logic ---
const SECONDS_PER_LINK = 45;
const UNITS = [
  { name: "minutes", label: "Minutes", factor: 60 },
  { name: "hours", label: "Hours", factor: 3600 },
  { name: "days", label: "Days", factor: 86400 }
];
let currentUnit = UNITS[0]; // default to minutes

function computeTimeSaved(jobs, unitObj = currentUnit) {
  if (!Array.isArray(jobs)) return 0;
  const totalLinks = jobs.reduce((sum, job) => sum + (parseInt(job.linkCount) || 0), 0);
  const secondsSaved = totalLinks * SECONDS_PER_LINK;
  return secondsSaved / unitObj.factor;
}

function formatTimeSaved(val, unitObj = currentUnit) {
  if (unitObj.name === "minutes") {
    return Math.round(val).toLocaleString();
  }
  if (unitObj.name === "hours") {
    return (Math.round(val * 10) / 10).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  if (unitObj.name === "days") {
    return (Math.round(val * 100) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
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

// Animate number counter (from 0 to target over 1s)
function animateCounter(elem, targetValue, unitObj) {
  if (!elem) return;
  let start = 0;
  let end = targetValue;
  let duration = 1100;
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
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  }
  window.requestAnimationFrame(step);
}

function updateTimesaveWidget(jobs, unitName) {
  const unitObj = UNITS.find(u => u.name === unitName) || UNITS[0];
  const value = computeTimeSaved(jobs, unitObj);
  const valElem = document.getElementById('timesave-value');
  if (valElem) animateCounter(valElem, value, unitObj);

  // Update active class on unit buttons
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
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };
  return date.toLocaleString('en-US', options);
}

function beautifyJobType(str) {
  if (!str) return "{{job.jobtype}}";
  const s = str.toLowerCase();

  if (s === "add_links_only" || s === "links_only" || s === "add links only" || s === "links only") {
    return "Links only";
  }
  if (s === "add_utm" || s === "utm_only" || s === "utm only" || s === "add utm") {
    return "UTM only";
  }
  if (
    s === "add_links_and_utm" ||
    s === "links_and_utm" ||
    s === "add_links_and_utm" ||
    s === "add links and utm" ||
    s === "links and utm"
  ) {
    return "Links and UTM";
  }

  // fallback: capitalize first word, lowercase the rest
  const fallback = s.replace(/_/g, " ").replace(/\b\w/g, (l, i) => (i === 0 ? l.toUpperCase() : l));
  return fallback;
}

function fileTypeChip(filetype) {
  if (!filetype) return `<span class="file-type-chip">{{job.filetype}}</span>`;
  const type = filetype.trim().toUpperCase();
  if (type === "PDF") {
    return `<span class="file-type-chip">${type}</span>`;
  }
  if (type === "INDD") {
    return `<span class="file-type-chip indd">${type}</span>`;
  }
  return `<span class="file-type-chip">${filetype}</span>`;
}

function renderHistorySnapshot(jobs) {
  if (!jobs || jobs.length === 0) {
    return `<div class="history-list"><div style="text-align:center; font-style:italic; color:var(--gray-400); padding:30px 0;">No history available yet</div></div>`;
  }
  const rows = jobs.slice(0, 5).map(job => `
    <tr>
      <td>${formatDate(job.date)}</td>
      <td>${fileTypeChip(job.filetype)}</td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${beautifyJobType(job.jobtype)}</td>
      <td>
        <a href="${job.processedUrl ?? '#'}" class="download-link" download title="Download file">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        </a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download title="Download report">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        </a>
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
    <tr>
      <td>${formatDate(job.date)}</td>
      <td>${fileTypeChip(job.filetype)}</td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${beautifyJobType(job.jobtype)}</td>
      <td>
        <a href="${job.processedUrl ?? '#'}" class="download-link" download title="Download file">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
        </a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download title="Download report">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke="currentColor" class="download-icon" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        </a>
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
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

// --- PATCH: Presets as Collapsible Table w/ Add New & Close Button ---
function renderPresetsSection(presets) {
  return `
    <section class="presets-section">
      <div class="section-title" style="margin-bottom: 20px;">Presets</div>
      <div class="presets-table-container">
        <table class="presets-table">
          <thead>
            <tr>
              <th style="width:1.5rem"></th>
              <th>Name</th>
              <th style="width:5rem;text-align:center;">Edit</th>
              <th style="width:5rem;text-align:center;">Delete</th>
            </tr>
          </thead>
          <tbody>
            ${presets.length === 0 ? `
              <tr><td colspan="4" style="color:var(--gray-400);text-align:center;font-style:italic;">No presets yet. Create one below!</td></tr>
            ` : presets.map((preset, idx) => `
              <tr class="preset-row" data-preset-id="${preset.id}">
                <td class="collapsible-arrow-cell">
                  <button class="preset-collapse-btn" tabindex="0" aria-expanded="false" aria-controls="preset-details-${preset.id}" title="Show preset details">
                    <span class="collapsible-arrow">&#9654;</span>
                  </button>
                </td>
                <td class="preset-title-cell">${preset.name}</td>
                <td class="preset-edit-cell" style="text-align:center;">
                  <button class="edit-preset-btn" data-preset-id="${preset.id}" title="Edit Preset" aria-label="Edit Preset">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="21" height="21">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                </td>
                <td class="preset-delete-cell" style="text-align:center;">
                  <button class="delete-preset-btn" data-preset-id="${preset.id}" title="Delete Preset" aria-label="Delete Preset">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="21" height="21">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
              <tr class="preset-details-row" id="preset-details-${preset.id}" style="display: none;">
                <td colspan="4" class="preset-details-cell">
                  <div>
                    <div class="preset-formats">
                      <strong>Target Formats:</strong> ${preset.target_formats.map(f => `<code>${f}</code>`).join(', ')}
                    </div>
                    <div class="preset-baseurl"><strong>Base URL:</strong> ${preset.base_url}</div>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <button id="show-add-preset-btn" class="add-preset-btn">
          + Add new
        </button>
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

// Views
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
      <div class="section-title">Processed Jobs History</div>
      ${renderHistory(jobs)}
    </section>
  `,
  settings: () => `
    <section>
      <div class="section-title">Settings</div>
      <div style="color:var(--gray-400);">Settings options will go here.</div>
    </section>
  `,
  presets: () => renderPresetsSection(presets)
};

// Debounce function to avoid rapid repeated clicks causing issues
function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Hide loading overlay utility
function hideLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 450); // slightly more than CSS transition
  }
}

// --- Preset CRUD ---
function getCurrentUserUid() {
  const user = firebase.auth().currentUser;
  return user ? user.uid : null;
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

// --- Preset Form UI Logic ---
function bindPresetsUI() {
  // Collapsible table logic for presets
  document.querySelectorAll('.preset-collapse-btn').forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const arrow = btn.querySelector('.collapsible-arrow');
      const tr = btn.closest('.preset-row');
      const presetId = tr.getAttribute('data-preset-id');
      const detailsRow = document.getElementById('preset-details-' + presetId);
      const expanded = btn.getAttribute('aria-expanded') === 'true';

      // Collapse all others
      document.querySelectorAll('.preset-collapse-btn').forEach(otherBtn => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute('aria-expanded', 'false');
          const otherArrow = otherBtn.querySelector('.collapsible-arrow');
          if (otherArrow) otherArrow.innerHTML = '&#9654;';
          const otherTr = otherBtn.closest('.preset-row');
          const otherId = otherTr.getAttribute('data-preset-id');
          const otherDetailsRow = document.getElementById('preset-details-' + otherId);
          if (otherDetailsRow) otherDetailsRow.style.display = 'none';
        }
      });

      if (!expanded) {
        btn.setAttribute('aria-expanded', 'true');
        if (arrow) arrow.innerHTML = '&#9660;';
        if (detailsRow) detailsRow.style.display = '';
      } else {
        btn.setAttribute('aria-expanded', 'false');
        if (arrow) arrow.innerHTML = '&#9654;';
        if (detailsRow) detailsRow.style.display = 'none';
      }
    };
    // Keyboard accessibility
    btn.onkeydown = function(e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        btn.onclick(e);
      }
    };
  });

  // Handle edit, delete, and form submission
  document.querySelectorAll('.edit-preset-btn').forEach(btn => {
    btn.onclick = function() {
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
  document.querySelectorAll('.delete-preset-btn').forEach(btn => {
    btn.onclick = async function() {
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

  // Add new preset show/hide logic
  const showAddBtn = document.getElementById('show-add-preset-btn');
  const formWrapper = document.getElementById('preset-form-wrapper');
  if (showAddBtn && formWrapper) {
    showAddBtn.onclick = function() {
      formWrapper.style.display = '';
      document.getElementById('preset-form').reset();
      document.getElementById('save-preset-btn').textContent = "Save Preset";
      document.getElementById('cancel-edit-preset-btn').style.display = 'none';
      document.getElementById('preset-id').value = '';
      setTimeout(() => document.getElementById('preset-name').focus(), 50);
    };
  }
  // Close button logic for add/edit preset form
  const closeBtn = document.getElementById('preset-form-close-btn');
  if (closeBtn && formWrapper) {
    closeBtn.onclick = function() {
      formWrapper.style.display = 'none';
      document.getElementById('preset-form').reset();
      document.getElementById('cancel-edit-preset-btn').style.display = 'none';
      document.getElementById('save-preset-btn').textContent = "Save Preset";
    };
  }
  // Hide form on page load
  if (formWrapper) {
    formWrapper.style.display = 'none';
  }
}

// ---- Main app ----
document.addEventListener('DOMContentLoaded', function() {
  const mainView = document.getElementById('dash-main-view');

  // Only bind sidebar button listeners once using event delegation
  const sidebar = document.querySelector('.dash-sidebar');
  if (sidebar) {
    sidebar.addEventListener('click', function(e) {
      const btn = e.target.closest('.dash-sidebar-btn');
      if (btn) {
        e.preventDefault();
        if (!btn.classList.contains('active')) {
          window.setView(btn.dataset.view);
        }
      }
    });
  }

  function setView(view) {
    mainView.innerHTML = views[view]();
    document.querySelectorAll('.dash-sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Bind timesave widget events after rendering dashboard
    if (view === "dashboard" && jobsLoaded) {
      bindTimesaveWidgetEvents(jobs);
      // Animate on first display (with latest value)
      updateTimesaveWidget(jobs, currentUnit.name);
      const link = document.getElementById("view-full-history");
      if (link) {
        link.onclick = function(e) {
          e.preventDefault();
          window.setView("history");
        };
      }
    }
    if (view === "presets" && presetsLoaded) {
      bindPresetsUI();
    }
  }

  // Fetch jobs just once and store in memory
  function fetchJobsOnceAndRender(view = "dashboard") {
    if (jobsLoaded) {
      setView(view);
      hideLoadingOverlay();
      return;
    }
    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      const idToken = await user.getIdToken();
      fetch('https://backend-idd.onrender.com/jobs', {
        headers: { Authorization: "Bearer " + idToken }
      })
        .then(res => res.json())
        .then(data => {
          jobs = data;
          jobsLoaded = true;
          setView(view);
          hideLoadingOverlay();
        })
        .catch(err => {
          console.error('Error loading jobs:', err);
          jobs = [];
          jobsLoaded = true;
          setView(view);
          hideLoadingOverlay();
        });
    });
  }

  // Debounced version for rapid clicks
  window.setView = debounce(function(view) {
    // Only fetch on first load!
    if (view === "presets" && !presetsLoaded) {
      fetchPresetsOnceAndRender(view);
    } else if (view === "dashboard" && !jobsLoaded) {
      fetchJobsOnceAndRender(view);
    } else {
      setView(view);
    }
  }, 200);

  // Initial load
  fetchJobsOnceAndRender();

  // + New dropdown logic
  const dropdownBtn = document.getElementById('new-dropdown-btn');
  const dropdownList = document.getElementById('new-dropdown-list');
  // Handle click and outside click for dropdown
  if (dropdownBtn && dropdownList) {
    // Show/hide on click
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

  // Sign out logic
  const signoutBtn = document.getElementById('signout-btn');
  if (signoutBtn) {
    signoutBtn.addEventListener('click', function() {
      firebase.auth().signOut().then(function() {
        window.location.href = "/login";
      });
    });
  }
});
