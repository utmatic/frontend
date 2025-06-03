const views = {
  dashboard: `
    <section>
      <div class="section-title">Welcome to your Dashboard</div>
      <div class="dashboard-widgets">
        <div style="color:var(--gray-400);">Dashboard widgets or stats will go here.</div>
      </div>
    </section>
  `,
  history: `
    <section>
      <div class="section-title">History Viewer</div>
      <div class="history-list">
        <table class="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Event</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2025-06-01</td>
              <td>Login</td>
              <td>Success</td>
              <td>IP: 123.45.67.89</td>
            </tr>
            <tr>
              <td>2025-06-01</td>
              <td>File Uploaded</td>
              <td>Success</td>
              <td>report.pdf (1.2MB)</td>
            </tr>
            <tr>
              <td>2025-05-31</td>
              <td>Password Change</td>
              <td>Failed</td>
              <td>Incorrect old password</td>
            </tr>
            <!-- More rows can be dynamically added here -->
          </tbody>
        </table>
      </div>
    </section>
  `,
  settings: `
    <section>
      <div class="section-title">Settings</div>
      <div style="color:var(--gray-400);">Settings options will go here.</div>
    </section>
  `
};

const sidebarBtns = document.querySelectorAll('.dash-sidebar-btn');
const mainHeader = document.getElementById('dash-main-header');
const mainView = document.getElementById('dash-main-view');

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

// Initial render
setView('dashboard');
