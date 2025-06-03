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

// Ensure Firebase SDK is loaded before this script!
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// These lines should be in your HTML before this script!

if (typeof firebase === 'undefined') {
  throw new Error('Firebase SDK not loaded! Add the Firebase script before dash.js.');
}

firebase.initializeApp(firebaseConfig);

let jobs = [];

function renderHistorySnapshot(jobs) {
  if (!jobs || jobs.length === 0) {
    return `<div class="history-list"><div style="text-align:center; font-style:italic; color:var(--gray-400); padding:30px 0;">No history available yet</div></div>`;
  }
  const rows = jobs.slice(0, 5).map(job => `
    <tr>
      <td>${job.date ?? "{{job.date}}"}</td>
      <td><span class="file-type-chip${job.filetype === "INDD" ? " indd" : ""}">${job.filetype ?? "{{job.filetype}}"}</span></td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${job.jobtype ?? "{{job.jobtype}}"}</td>
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
      <td>${job.date ?? "{{job.date}}"}</td>
      <td><span class="file-type-chip${job.filetype === "INDD" ? " indd" : ""}">${job.filetype ?? "{{job.filetype}}"}</span></td>
      <td>${job.document ?? "{{job.document}}"}</td>
      <td>${job.jobtype ?? "{{job.jobtype}}"}</td>
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
      <div class="dashboard-cards">
        <div class="dashboard-card" onclick="alert('Go to PDF Processor!')">
          <div class="card-title">PDF Processor</div>
          <div class="card-desc">Process your PDFs for extraction, conversion, or batch actions.</div>
          <div>→</div>
        </div>
        <div class="dashboard-card" onclick="alert('Go to Source Filer Processor!')">
          <div class="card-title">Source Filer Processor</div>
          <div class="card-desc">Automate tasks for INDD (InDesign) source files.</div>
          <div>→</div>
        </div>
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
  const nav = document.querySelector('.dash-nav');
  const mainHeader = document.getElementById('dash-main-header');
  const mainView = document.getElementById('dash-main-view');

  // Nav button listeners
  function bindNavBtnListeners() {
    const navBtns = document.querySelectorAll('.dash-nav-btn');
    navBtns.forEach(btn => {
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
    // Update nav button active state
    document.querySelectorAll('.dash-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });

    // Re-bind nav button listeners after every view render
    bindNavBtnListeners();

    // Dashboard "View full history" link
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
        window.location.href = "/login"; // Or your login page
        return;
      }
      // Optionally display user's name/email somewhere here: user.displayName, user.email
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

  // Initial render + listeners
  fetchJobsAndRender();

  // When switching to dashboard or history, always refresh jobs
  window.setView = function(view) {
    if (view === "dashboard" || view === "history") {
      fetchJobsAndRender(view);
    } else {
      setView(view);
    }
  };

  // Also bind nav buttons on initial load
  bindNavBtnListeners();
});
