// Demo job data -- replace with real data later
const jobs = [
  {
    date: "2025-06-01",
    filename: "Client_Brochure.pdf",
    filetype: "PDF",
    processor: "PDF Processor",
    status: "Success",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-30",
    filename: "Quarterly_Report.indd",
    filetype: "INDD",
    processor: "Source Filer Processor",
    status: "Success",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-30",
    filename: "Invoice_4721.pdf",
    filetype: "PDF",
    processor: "PDF Processor",
    status: "Success",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-29",
    filename: "Magazine_Layout.indd",
    filetype: "INDD",
    processor: "Source Filer Processor",
    status: "Failed",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-28",
    filename: "Flyer.indd",
    filetype: "INDD",
    processor: "Source Filer Processor",
    status: "Success",
    processedUrl: "#",
    changelogUrl: "#"
  },
  {
    date: "2025-05-27",
    filename: "Presentation.pdf",
    filetype: "PDF",
    processor: "PDF Processor",
    status: "Pending",
    processedUrl: "#",
    changelogUrl: "#"
  }
];

// Util for status chip class
function statusClass(status) {
  if (status === "Success") return "status-chip status-success";
  if (status === "Failed") return "status-chip status-failed";
  if (status === "Pending") return "status-chip status-pending";
  return "status-chip";
}

// Render five most recent jobs for dashboard
function renderHistorySnapshot(jobs) {
  const rows = jobs.slice(0, 5).map(job => `
    <tr>
      <td>${job.date}</td>
      <td>
        <span class="file-type-chip">${job.filetype}</span>
        ${job.filename}
      </td>
      <td><span class="${statusClass(job.status)}">${job.status}</span></td>
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
            <th>File</th>
            <th>Status</th>
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
      <td>
        <span class="file-type-chip">${job.filetype}</span>
        ${job.filename}
      </td>
      <td>${job.processor}</td>
      <td><span class="${statusClass(job.status)}">${job.status}</span></td>
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
            <th>File</th>
            <th>Processor</th>
            <th>Status</th>
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
      <div style="margin-top: 16px;"><a href="#" onclick="window.setView('history');return false;" class="download-link">View full history →</a></div>
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

// Sidebar collapse/expand logic
const sidebar = document.querySelector('.dash-sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarBtns = document.querySelectorAll('.dash-sidebar-btn');
const mainHeader = document.getElementById('dash-main-header');
const mainView = document.getElementById('dash-main-view');

// For global switch from dashboard "View full history" link
window.setView = function(view) {
  setView(view);
};

function setView(view) {
  // Update main content
  mainView.innerHTML = views[view];
  // Update header
  mainHeader.textContent = view.charAt(0).toUpperCase() + view.slice(1);
  // Update sidebar button active state
  sidebarBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

sidebarBtns.forEach(btn => {
  btn.addEventListener('click', () => setView(btn.dataset.view));
});

// Sidebar toggle
let collapsed = false;
sidebarToggle.addEventListener('click', () => {
  collapsed = !collapsed;
  sidebar.classList.toggle('collapsed', collapsed);
  sidebarToggle.innerHTML = collapsed ? '>' : '&lt;';
  sidebarToggle.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
});

// Initial render
setView('dashboard');
