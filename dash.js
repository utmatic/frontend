const views = {
  dashboard: `
    <section>
      <h2>Welcome to your Dashboard</h2>
      <p>This is your main dashboard view.</p>
      <!-- Add dashboard widgets/stats here -->
    </section>
  `,
  history: `
    <section>
      <h2>History</h2>
      <p>Here you can see your activity history.</p>
      <!-- Add history content here -->
    </section>
  `,
  settings: `
    <section>
      <h2>Settings</h2>
      <p>Manage your preferences here.</p>
      <!-- Add settings form or options here -->
    </section>
  `
};

const sidebarBtns = document.querySelectorAll('.sidebar-btn');
const mainHeader = document.getElementById('main-header');
const mainView = document.getElementById('main-view');

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
