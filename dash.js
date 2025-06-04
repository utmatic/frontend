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

// Format date as "Month D, YYYY h:mm AM/PM"
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

// Convert "add_links_only" to "Add links only"
function beautifyJobType(str) {
  if (!str) return "{{job.jobtype}}";
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bOf\b|\bFor\b|\bAnd\b|\bTo\b|\bOr\b/g, (w) => w.toLowerCase()); // Lowercase common small words
}

// Render PDF/INDD chip with correct color/text
function fileTypeChip(filetype) {
  if (!filetype) return `<span class="file-type-chip">{{job.filetype}}</span>`;
  const type = filetype.trim().toUpperCase();
  if (type === "PDF") {
    return `<span class="file-type-chip">${type}</span>`;
  }
  if (type === "INDD") {
    return `<span class="file-type-chip indd">${type}</span>`;
  }
  // fallback
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
        <a href="${job.processedUrl ?? '#'}" class="download-link" download>File</a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download>Log</a>
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
        <a href="${job.processedUrl ?? '#'}" class="download-link" download>File</a>
        <a href="${job.changelogUrl ?? '#'}" class="download-link" download>Log</a>
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

const views = {
  dashboard: () => `
    <section>
      <div class="section-title">Welcome to your Dashboard</div>
      <div class="dashboard-tiles">
        <a class="dashboard-tile dashboard-tile-pdf" href="https://app.utmatic.com/pdf-form.html">
          <div class="tile-title">PDF Processor</div>
          <div class="tile-desc">Process your PDFs for extraction, conversion, or batch actions.</div>
        </a>
        <a class="dashboard-tile dashboard-tile-indd" href="https://app.utmatic.com/source-form.html">
          <div class="tile-title">Indd Processor</div>
          <div class="tile-desc">Automate tasks for INDD (InDesign) source files.</div>
        </a>
      </div>
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
  `
};

document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.querySelector('.dash-sidebar');
  const mainHeader = document.getElementById('dash-main-header');
  const mainView = document.getElementById('dash-main-view');
  const profileIcon = document.getElementById('profile-icon');

  // Sidebar button listeners
  function bindSidebarBtnListeners() {
    const sidebarBtns = document.querySelectorAll('.dash-sidebar-btn');
    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        window.setView(btn.dataset.view);
      });
    });
  }

  function setView(view) {
    mainView.innerHTML = views[view]();
    if (mainHeader) {
      mainHeader.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    }
    document.querySelectorAll('.dash-sidebar-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
    bindSidebarBtnListeners();

    if (view === "dashboard") {
      const link = document.getElementById("view-full-history");
      if (link) {
        link.addEventListener("click", function(e) {
          e.preventDefault();
          window.setView("history");
        });
      }
    }
  }

  // Fetch jobs for the logged-in user and render dashboard/history
  function fetchJobsAndRender(view = "dashboard") {
    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      // Optionally show profile icon
      if (profileIcon && user.photoURL) {
        profileIcon.innerHTML = `<img src="${user.photoURL}" alt="user" style="width:100%;height:100%;border-radius:50%;">`;
      } else if(profileIcon) {
        profileIcon.innerHTML = `<svg fill="#4d89f9" width="22" height="22" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-2.2 3.6-4 8-4s8 1.8 8 4" /></svg>`;
      }
      const idToken = await user.getIdToken();
      fetch('https://backend-idd.onrender.com/jobs', {
        headers: { Authorization: "Bearer " + idToken }
      })
        .then(res => res.json())
        .then(data => {
          jobs = data;
          setView(view);
        })
        .catch(err => {
          console.error('Error loading jobs:', err);
          jobs = [];
          setView(view);
        });
    });
  }

  fetchJobsAndRender();

  window.setView = function(view) {
    if (view === "dashboard" || view === "history") {
      fetchJobsAndRender(view);
    } else {
      setView(view);
    }
  };

  bindSidebarBtnListeners();
});
