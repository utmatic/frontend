// Demo job data (matching the new field order)
const jobs = [
  {
    date: "2025-06-01",
    filetype: "PDF",
    document: "Client_Brochure.pdf",
    jobtype: "PDF Processor",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-30",
    filetype: "INDD",
    document: "Quarterly_Report.indd",
    jobtype: "Source Filer Processor",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-30",
    filetype: "PDF",
    document: "Invoice_4721.pdf",
    jobtype: "PDF Processor",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-29",
    filetype: "INDD",
    document: "Magazine_Layout.indd",
    jobtype: "Source Filer Processor",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-28",
    filetype: "INDD",
    document: "Flyer.indd",
    jobtype: "Source Filer Processor",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-27",
    filetype: "PDF",
    document: "Presentation.pdf",
    jobtype: "PDF Processor",
    processedUrl: "#",
    changelogUrl: "#"
  }
];

// Render five most recent jobs for dashboard
function renderHistorySnapshot(jobs) {
  const rows = jobs.slice(0, 5).map(job => `
    <tr>
      <td>${job.date}</td>
      <td><span class="file-type-chip">${job.filetype}</span></td>
      <td>${job.document}</td>
      <td>${job.jobtype}</td>
      <td>
        <a href="${job.processedUrl}" class="download-link" download>File</a>
        <a href="${job.changelogUrl}" class="download-link" download>Log</a>
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

// Render all jobs for history
function renderHistory(jobs) {
  const rows = jobs.map(job => `
    <tr>
      <td>${job.date}</td>
      <td><span class="file-type-chip">${job.filetype}</span></td>
      <td>${job.document}</td>
      <td>${job.jobtype}</td>
      <td>
        <a href="${job.processedUrl}" class="download-link" download>File</a>
        <a href="${job.changelogUrl}" class="download-link" download>Log</a>
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
  dashboard: `
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
  history: `
    <section>
      <div class="section-title">Processed Jobs History</div>
      ${renderHistory(jobs)}
    </section>
  `,
  settings: `
    <section>
      <div class="section-title">Settings</div>
      <div style="color:var(--gray-400);">Settings options will go here.</div>
    </section>
  `
};

const sidebar = document.querySelector('.dash-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mainHeader = document.getElementById('dash-main-header');
const mainView = document.getElementById('dash-main-view');

function bindSidebarBtnListeners() {
  const sidebarBtns = document.querySelectorAll('.dash-sidebar-btn');
  sidebarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setView(btn.dataset.view);
    });
  });
}

function setView(view) {
  mainView.innerHTML = views[view];
  mainHeader.textContent = view.charAt(0).toUpperCase() + view.slice(1);
  // Update sidebar button active state
  document.querySelectorAll('.dash-sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Re-bind sidebar button listeners after every view render (fixes bug)
  bindSidebarBtnListeners();

  // Special: dashboard "View full history" link
  if (view === "dashboard") {
    const link = document.getElementById("view-full-history");
    if (link) {
      link.addEventListener("click", function(e) {
        e.preventDefault();
        setView("history");
      });
    }
  }
}

// Sidebar toggle
let collapsed = false;
sidebarToggle.addEventListener('click', () => {
  collapsed = !collapsed;
  sidebar.classList.toggle('collapsed', collapsed);
  // Rotate arrow for direction
  const arrow = document.getElementById('toggle-arrow');
  if (collapsed) {
    arrow.style.transform = "rotate(180deg)";
    sidebarToggle.title = "Expand sidebar";
  } else {
    arrow.style.transform = "rotate(0deg)";
    sidebarToggle.title = "Collapse sidebar";
  }
});

// Initial render + listeners
setView('dashboard');
