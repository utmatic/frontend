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

function renderPresetsSection(presets) { /* ... unchanged ... */ }
// ... (rest of presets unchanged for brevity) ...

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
      setupSessionTimeoutModalWatcher();
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
  setupSessionTimeoutModalWatcher();
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
      setupSessionTimeoutModalWatcher();
    } catch (e) {
      console.error('Error loading security settings:', e);
      userSecuritySettings.autoDeleteDays = 0;
      userSecuritySettings.sessionTimeoutMinutes = 0;
      userSecurityLoaded = true;
      setView(view);
      setupSessionTimeoutModalWatcher();
    }
  });
}

// --- PATCH: Session Timeout Modal Logic ---
let sessionTimeoutModal = null;
let sessionTimeoutModalInterval = null;
let sessionTimeoutModalTimer = null;
let sessionTimeoutModalWarningTimer = null;

function setupSessionTimeoutModalWatcher() {
  if (sessionTimeoutModalTimer) {
    clearTimeout(sessionTimeoutModalTimer);
    sessionTimeoutModalTimer = null;
  }
  if (sessionTimeoutModalWarningTimer) {
    clearTimeout(sessionTimeoutModalWarningTimer);
    sessionTimeoutModalWarningTimer = null;
  }
  if (sessionTimeoutModalInterval) {
    clearInterval(sessionTimeoutModalInterval);
    sessionTimeoutModalInterval = null;
  }
  const min = userSecuritySettings.sessionTimeoutMinutes;
  if (!firebase.auth().currentUser || !min || min === 0) {
    return;
  }
  let lastActivity = Date.now();

  window.resetSessionTimeoutModalWatcher = function() {
    lastActivity = Date.now();
    if (sessionTimeoutModal) removeSessionTimeoutModal();
    scheduleSessionTimeoutTimers();
  };

  if (!window.__utmaticSessionModalListenersBound) {
    ["mousemove", "mousedown", "keydown", "scroll", "touchstart"].forEach(evt =>
      window.addEventListener(evt, resetSessionTimeoutModalWatcher, true)
    );
    window.__utmaticSessionModalListenersBound = true;
  }

  function getExpireTime() {
    return lastActivity + min * 60 * 1000;
  }
  function getWarningTime() {
    return getExpireTime() - 5 * 60 * 1000;
  }

  function scheduleSessionTimeoutTimers() {
    if (sessionTimeoutModalTimer) clearTimeout(sessionTimeoutModalTimer);
    if (sessionTimeoutModalWarningTimer) clearTimeout(sessionTimeoutModalWarningTimer);

    const now = Date.now();
    const timeToExpire = getExpireTime() - now;
    const timeToWarning = getWarningTime() - now;

    if (timeToWarning > 0) {
      sessionTimeoutModalWarningTimer = setTimeout(showSessionTimeoutModal, timeToWarning);
    } else if (timeToExpire > 0) {
      showSessionTimeoutModal();
    }

    sessionTimeoutModalTimer = setTimeout(() => {
      removeSessionTimeoutModal();
      firebase.auth().signOut().then(() => {
        window.location.href = "/login?timeout=1";
      });
    }, timeToExpire);
  }

  function showSessionTimeoutModal() {
    if (sessionTimeoutModal) return;

    sessionTimeoutModal = document.createElement('div');
    sessionTimeoutModal.id = "inactivity-modal";
    sessionTimeoutModal.style.position = "fixed";
    sessionTimeoutModal.style.left = 0;
    sessionTimeoutModal.style.top = 0;
    sessionTimeoutModal.style.width = "100vw";
    sessionTimeoutModal.style.height = "100vh";
    sessionTimeoutModal.style.background = "rgba(0,0,0,0.65)";
    sessionTimeoutModal.style.zIndex = "10003";
    sessionTimeoutModal.style.display = "flex";
    sessionTimeoutModal.style.alignItems = "center";
    sessionTimeoutModal.style.justifyContent = "center";

    const modalBox = document.createElement('div');
    modalBox.className = "inactivity-modal-box";
    modalBox.style.background = "#fff";
    modalBox.style.borderRadius = "8px";
    modalBox.style.padding = "32px";
    modalBox.style.maxWidth = "410px";
    modalBox.style.textAlign = "center";
    modalBox.style.boxShadow = "0 4px 32px rgba(0,0,0,0.13)";

    const title = document.createElement('h3');
    title.textContent = "Session Inactivity Warning";
    modalBox.appendChild(title);

    const timeMsg = document.createElement('p');
    timeMsg.className = "inactivity-modal-timer";
    modalBox.appendChild(timeMsg);

    const instr = document.createElement('p');
    instr.textContent = "Please choose to continue your session or log out. If no action is taken, you will be automatically logged out.";
    modalBox.appendChild(instr);

    // Actions
    const btnDiv = document.createElement('div');
    btnDiv.className = "inactivity-modal-actions";

    const continueBtn = document.createElement('button');
    continueBtn.className = "continue-session-btn";
    continueBtn.textContent = "Continue Session";

    const logoutBtn = document.createElement('button');
    logoutBtn.className = "logout-btn";
    logoutBtn.textContent = "Log Out";

    btnDiv.appendChild(continueBtn);
    btnDiv.appendChild(logoutBtn);
    modalBox.appendChild(btnDiv);

    sessionTimeoutModal.appendChild(modalBox);
    document.body.appendChild(sessionTimeoutModal);

    // Timer logic (5 min countdown)
    let secondsLeft = 5 * 60;
    function updateCountdown() {
      let min = Math.floor(secondsLeft / 60);
      let sec = Math.floor(secondsLeft % 60);
      timeMsg.innerHTML = `Your session will expire due to inactivity in <span>${min}:${String(sec).padStart(2, "0")}</span>.`;
    }
    updateCountdown();

    sessionTimeoutModalInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(sessionTimeoutModalInterval);
        removeSessionTimeoutModal();
        firebase.auth().signOut().then(() => {
          window.location.href = "/login?timeout=1";
        });
        return;
      }
      updateCountdown();
    }, 1000);

    continueBtn.onclick = function () {
      clearInterval(sessionTimeoutModalInterval);
      removeSessionTimeoutModal();
      window.resetSessionTimeoutModalWatcher();
    };

    logoutBtn.onclick = function () {
      clearInterval(sessionTimeoutModalInterval);
      removeSessionTimeoutModal();
      firebase.auth().signOut().then(() => {
        window.location.href = "/login?timeout=1";
      });
    };
  }

  function removeSessionTimeoutModal() {
    if (sessionTimeoutModal) {
      document.body.removeChild(sessionTimeoutModal);
      sessionTimeoutModal = null;
    }
    if (sessionTimeoutModalInterval) {
      clearInterval(sessionTimeoutModalInterval);
      sessionTimeoutModalInterval = null;
    }
  }

  scheduleSessionTimeoutTimers();
}

firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    if (userSecurityLoaded) setupSessionTimeoutModalWatcher();
  } else {
    if (sessionTimeoutModalTimer) clearTimeout(sessionTimeoutModalTimer);
    if (sessionTimeoutModalWarningTimer) clearTimeout(sessionTimeoutModalWarningTimer);
    if (sessionTimeoutModalInterval) clearInterval(sessionTimeoutModalInterval);
    if (sessionTimeoutModal) {
      document.body.removeChild(sessionTimeoutModal);
      sessionTimeoutModal = null;
    }
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
        setupSessionTimeoutModalWatcher();
      } catch (e) {
        console.error('Error loading security settings:', e);
        userSecuritySettings.autoDeleteDays = 0;
        userSecuritySettings.sessionTimeoutMinutes = 0;
        userSecurityLoaded = true;
        securityDone = true;
        tryHideOverlayAndShowDashboard();
        setupSessionTimeoutModalWatcher();
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
