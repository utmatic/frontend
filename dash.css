:root {
  --brand-blue: #4d89f9;
  --brand-blue-hover: #3474e0;
  --brand-black: #e4e8ef;
  --brand-white: #232a33;
  --gray-100: #29313a;
  --gray-300: #b3b9c5;
  --gray-400: #7a8597;
  --shadow: 0 8px 32px #000a;
  --font: 'Work Sans', 'Segoe UI', Arial, sans-serif;
  --background-main: #1c232b;
  --background-alt: #222a33;
  --accent-yellow: #ffd33d;
  --transition: 0.18s cubic-bezier(.6,.2,.3,1);
}

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: var(--font);
  background: var(--background-main);
  color: var(--brand-black);
  height: 100%;
}

.dash-root {
  display: flex;
  min-height: 100vh;
  background: var(--background-main);
}

.dash-sidebar {
  background: var(--brand-white);
  width: 260px;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  align-items: start;
  padding: 32px 0 16px 0;
  gap: 16px;
  box-shadow: var(--shadow);
  z-index: 2;
  position: relative;
  transition: width var(--transition), min-width var(--transition);
}
.dash-sidebar.collapsed {
  width: 80px;
  min-width: 80px;
  align-items: center;
  padding-left: 0;
  padding-right: 0;
}
.dash-sidebar .dash-logo {
  width: 200px;
  margin: 0 0 40px 26px;
  transition: opacity var(--transition), margin var(--transition), width var(--transition);
}
.dash-sidebar.collapsed .dash-logo {
  opacity: 0;
  margin: 0;
  width: 0;
  pointer-events: none;
  height: 0;
}
.dash-sidebar-btn {
  background: none;
  border: none;
  padding: 14px 40px 14px 32px;
  color: var(--brand-black);
  font-size: 1.08rem;
  font-family: var(--font);
  border-radius: 16px 0 0 16px;
  text-align: left;
  cursor: pointer;
  letter-spacing: 0.02em;
  transition: background 0.16s, color 0.16s, padding var(--transition), min-width var(--transition);
  width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}
.dash-sidebar-btn .btn-icon {
  display: flex;
  align-items: center;
  margin-right: 0;
  transition: opacity var(--transition), margin var(--transition);
}
.dash-sidebar-btn .btn-label {
  flex: 1;
  white-space: nowrap;
}
.dash-sidebar.collapsed .dash-sidebar-btn {
  padding: 16px 0;
  justify-content: center;
  border-radius: 12px;
  min-width: 0;
  gap: 0;
}
.dash-sidebar.collapsed .dash-sidebar-btn .btn-label {
  display: none;
}
.dash-sidebar-btn.active,
.dash-sidebar-btn:hover {
  background: var(--brand-blue);
  color: #fff;
}
.dash-sidebar-btn.active::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 7px;
  background: var(--accent-yellow);
  border-radius: 6px 0 0 6px;
}

.dash-sidebar-toggle {
  position: absolute;
  top: 18px;
  right: -8px;
  width: 36px;
  height: 48px;
  background: var(--brand-white);
  color: var(--brand-blue);
  border: none;
  border-radius: 0 18px 18px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 1.55em;
  z-index: 10;
  transition: background var(--transition), color var(--transition), right var(--transition);
  outline: none;
  box-shadow: none;
  border: 2px solid var(--gray-100);
  border-left: none;
  padding: 0;
}
.dash-sidebar.collapsed .dash-sidebar-toggle {
  right: -8px;
  left: auto;
  background: var(--brand-white);
  color: var(--brand-blue);
}
.dash-sidebar-toggle:active {
  background: var(--brand-blue);
  color: #fff;
}

/* SVG arrow rotates on collapse */
.dash-sidebar.collapsed #toggle-arrow {
  transform: rotate(180deg);
  transition: transform var(--transition);
}
#toggle-arrow {
  transition: transform var(--transition);
}

.dash-main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--background-main);
  min-width: 0;
}

.dash-header {
  background: var(--background-alt);
  border-bottom: 1px solid var(--gray-100);
  padding: 32px 36px 22px 36px;
  box-shadow: 0 2px 8px #0002;
}

.dash-header h1 {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 600;
  color: var(--brand-black);
  letter-spacing: 0.01em;
}

#dash-main-view {
  padding: 36px;
  flex: 1;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 500;
  margin-bottom: 18px;
  color: var(--brand-blue);
}

.dashboard-cards {
  display: flex;
  gap: 28px;
  margin-bottom: 48px;
}
.dashboard-card {
  background: var(--background-alt);
  color: var(--brand-black);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 36px 30px 26px 30px;
  min-width: 210px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  transition: box-shadow 0.16s, background 0.16s;
  border: 2px solid transparent;
}
.dashboard-card:hover {
  background: var(--brand-blue);
  color: #fff;
  border-color: var(--accent-yellow);
  box-shadow: 0 8px 40px #000a;
}
.dashboard-card .card-title {
  font-weight: 600;
  font-size: 1.15rem;
  margin-bottom: 14px;
}
.dashboard-card .card-desc {
  color: var(--gray-400);
  font-size: 1em;
  margin-bottom: 18px;
}

.history-list {
  border-radius: 14px;
  background: var(--background-alt);
  box-shadow: var(--shadow);
  padding: 24px;
  margin-bottom: 32px;
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
}
.history-table th, .history-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--gray-100);
  font-size: 1em;
}
.history-table th {
  color: var(--gray-300);
  font-weight: 600;
}
.history-table tr:last-child td {
  border-bottom: none;
}
.file-type-chip {
  display: inline-block;
  background: var(--brand-blue);
  color: #fff;
  font-size: 0.93em;
  border-radius: 8px;
  padding: 2px 10px;
  margin-right: 2px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
.status-chip {
  display: inline-block;
  border-radius: 8px;
  padding: 2px 12px;
  font-size: 0.93em;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.status-success { background: #2ecc40; color: #fff; }
.status-failed { background: #ff4d4d; color: #fff; }
.status-pending { background: #ffd33d; color: #222; }
.download-link {
  color: var(--brand-blue);
  text-decoration: none;
  font-weight: 500;
  margin-right: 8px;
  transition: color 0.14s;
}
.download-link:hover {
  text-decoration: underline;
  color: var(--brand-blue-hover);
}

@media (max-width: 1200px) {
  .dash-sidebar {
    width: 210px;
  }
  .dash-sidebar .dash-logo {
    width: 130px;
  }
}

@media (max-width: 1000px) {
  .dashboard-cards {
    flex-direction: column;
    gap: 18px;
  }
}

@media (max-width: 800px) {
  .dash-root {
    flex-direction: column;
  }
  .dash-sidebar {
    flex-direction: row;
    width: 100%;
    height: auto;
    padding: 12px 0;
    align-items: center;
    box-shadow: none;
  }
  .dash-logo {
    margin: 0 24px 0 0;
    width: 120px;
  }
  .dash-sidebar-btn {
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 0.97rem;
  }
}

@media (max-width: 600px) {
  #dash-main-view {
    padding: 12px;
  }
  .dash-header {
    padding: 12px 10px 10px 10px;
  }
  .dashboard-card {
    padding: 18px 14px 14px 14px;
    min-width: 0;
  }
}
