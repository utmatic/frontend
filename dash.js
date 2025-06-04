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
  return str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\bOf\b|\bFor\b|\bAnd\b|\bTo\b|\bOr\b/g, (w) => w.toLowerCase());
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
      <div class="dashboard-tiles">
        <button class="dashboard-tile dashboard-tile-pdf" type="button">
          <span class="tile-title">PDF Processor</span>
        </button>
        <button class="dashboard-tile dashboard-tile-indd" type="button">
          <span class="tile-title">Indd Processor</span>
        </button>
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

// Debounce function to avoid rapid repeated clicks causing issues
function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

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

    if (view === "dashboard") {
      // Add click handlers to the new button tiles
      const pdfBtn = document.querySelector('.dashboard-tile-pdf');
      const inddBtn = document.querySelector('.dashboard-tile-indd');
      if (pdfBtn) {
        pdfBtn.onclick = () => window.open("https://app.utmatic.com/pdf-form.html", "_self");
      }
      if (inddBtn) {
        inddBtn.onclick = () => window.open("https://app.utmatic.com/source-form.html", "_self");
      }
      const link = document.getElementById("view-full-history");
      if (link) {
        link.onclick = function(e) {
          e.preventDefault();
          window.setView("history");
        };
      }
    }
  }

  // Fetch jobs just once and store in memory
  function fetchJobsOnceAndRender(view = "dashboard") {
    if (jobsLoaded) {
      setView(view);
      return;
    }
    firebase.auth().onAuthStateChanged(async function(user) {
      if (!user) {
        window.location.href = "/login";
        return;
      }
      // Optionally show profile icon
      // (Handled in HTML and in the script in HTML file for sidebar)
      const idToken = await user.getIdToken();
      fetch('https://backend-idd.onrender.com/jobs', {
        headers: { Authorization: "Bearer " + idToken }
      })
        .then(res => res.json())
        .then(data => {
          jobs = data;
          jobsLoaded = true;
          setView(view);
        })
        .catch(err => {
          console.error('Error loading jobs:', err);
          jobs = [];
          jobsLoaded = true;
          setView(view);
        });
    });
  }

  // Debounced version for rapid clicks
  window.setView = debounce(function(view) {
    // Only fetch on first load!
    if (!jobsLoaded) {
      fetchJobsOnceAndRender(view);
    } else {
      setView(view);
    }
  }, 200);

  // Initial load
  fetchJobsOnceAndRender();
});
