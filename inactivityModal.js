// ---- Reusable Inactivity Timeout Modal Logic (Big Timer Style, Cross-tab Sync) ----

// CONFIGURE this if your login fallback page is different:
const INACTIVITY_LOGOUT_REDIRECT = "/auth.html";

// --- Modal state ---
let inactivityModal = null;
let inactivityInterval = null;
let inactivityTimeout = null;
let inactivitySessionTimeoutMinutes = null;
let inactivityWarningMinutes = null;
let inactivityLimitMs = null;
let inactivityWarningMs = null;
let inactivitySyncLock = false;

// --- Multi-tab sync events ---
const MODAL_EVENT_KEY = "inactivity-modal-event-v1";
const LOGOUT_EVENT_KEY = "inactivity-logout-event-v1";

// --- Main starter ---
function fetchSessionTimeoutAndStart() {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;
    if (typeof firebase.firestore !== "function") return;
    try {
      const db = firebase.firestore();
      const doc = await db.collection('userSecurity').doc(user.uid).get();
      let min = 6; // Default 6 min for testing
      if (doc.exists) {
        const data = doc.data();
        if (typeof data.sessionTimeoutMinutes === "number") {
          min = data.sessionTimeoutMinutes;
        }
      }
      inactivitySessionTimeoutMinutes = min;
      if (!min || min === 0) return; // "Never" timeout, don't start inactivity watcher
      inactivityWarningMinutes = min > 5 ? 5 : (min > 1 ? 1 : 0);
      inactivityLimitMs = min * 60 * 1000;
      inactivityWarningMs = inactivityWarningMinutes * 60 * 1000;
      startInactivityTimer();
    } catch {
      inactivitySessionTimeoutMinutes = 6;
      inactivityWarningMinutes = 5;
      inactivityLimitMs = 6 * 60 * 1000;
      inactivityWarningMs = 5 * 60 * 1000;
      startInactivityTimer();
    }
  });
}

// --- Timer logic ---
function startInactivityTimer() {
  clearTimeout(inactivityTimeout);
  clearInterval(inactivityInterval);

  function activityHandler() {
    if (!inactivityModal) {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(() => {
        broadcastModalShow();
        showInactivityModal();
      }, inactivityLimitMs - inactivityWarningMs);
    }
  }

  window.addEventListener('mousemove', activityHandler);
  window.addEventListener('keydown', activityHandler);
  window.addEventListener('click', activityHandler);

  startInactivityTimer._activityHandler = activityHandler;
  inactivityTimeout = setTimeout(() => {
    broadcastModalShow();
    showInactivityModal();
  }, inactivityLimitMs - inactivityWarningMs);
}

// --- Modal display logic ---
function showInactivityModal(secondsOverride) {
  if (inactivityModal) return;
  inactivityModal = document.createElement('div');
  inactivityModal.id = "inactivity-modal";
  inactivityModal.style.position = "fixed";
  inactivityModal.style.top = 0;
  inactivityModal.style.left = 0;
  inactivityModal.style.width = "100vw";
  inactivityModal.style.height = "100vh";
  inactivityModal.style.background = "rgba(0,0,0,0.42)";
  inactivityModal.style.zIndex = "10000";
  inactivityModal.style.display = "flex";
  inactivityModal.style.alignItems = "center";
  inactivityModal.style.justifyContent = "center";

  const modalBox = document.createElement('div');
  modalBox.className = "inactivity-modal-box";
  modalBox.style.background = "#fff";
  modalBox.style.borderRadius = "10px";
  modalBox.style.padding = "38px 38px 32px 38px";
  modalBox.style.boxShadow = "0 6px 32px rgba(0,0,0,0.14)";
  modalBox.style.textAlign = "center";
  modalBox.style.maxWidth = "320px";
  modalBox.style.minWidth = "230px";

  const heading = document.createElement('h3');
  heading.textContent = "Session expires in";
  heading.style.fontWeight = "600";
  heading.style.fontSize = "1.31em";
  heading.style.margin = "0 0 10px 0";
  modalBox.appendChild(heading);

  const timerBig = document.createElement('div');
  timerBig.className = "inactivity-modal-timer-big";
  timerBig.style.fontSize = "2.7em";
  timerBig.style.fontWeight = "bold";
  timerBig.style.margin = "20px 0 12px 0";
  timerBig.style.letterSpacing = "1px";
  timerBig.style.color = "#174ea6";
  modalBox.appendChild(timerBig);

  const actions = document.createElement('div');
  actions.className = 'inactivity-modal-actions';

  const continueBtn = document.createElement('button');
  continueBtn.className = "continue-session-btn";
  continueBtn.textContent = "Continue working";
  continueBtn.style.fontSize = "1.08em";
  continueBtn.style.padding = "11px 32px";
  continueBtn.style.marginTop = "14px";
  continueBtn.style.background = "#1a73e8";
  continueBtn.style.color = "#fff";
  continueBtn.style.border = "none";
  continueBtn.style.borderRadius = "4px";
  continueBtn.style.fontWeight = "600";
  continueBtn.style.cursor = "pointer";
  actions.appendChild(continueBtn);

  modalBox.appendChild(actions);
  inactivityModal.appendChild(modalBox);
  document.body.appendChild(inactivityModal);

  // Timer logic (countdown)
  let secondsLeft = typeof secondsOverride === "number" ? secondsOverride : (inactivityWarningMs / 1000);
  function updateCountdown() {
    let min = Math.floor(secondsLeft / 60);
    let sec = Math.floor(secondsLeft % 60);
    timerBig.textContent = `${min}:${String(sec).padStart(2, "0")}`;
  }
  updateCountdown();

  inactivityInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      clearInterval(inactivityInterval);
      broadcastLogout();
      handleLogoutFromInactivity();
      return;
    }
    updateCountdown();
  }, 1000);

  continueBtn.onclick = function () {
    broadcastModalContinue();
    clearInterval(inactivityInterval);
    if (inactivityModal) {
      document.body.removeChild(inactivityModal);
      inactivityModal = null;
    }
    startInactivityTimer();
  };
}

// --- Modal state sync between tabs ---
window.addEventListener("storage", function(e) {
  if (e.key === MODAL_EVENT_KEY && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      if (!data || !data.type) return;
      if (data.type === "show") {
        if (!inactivityModal) showInactivityModal(data.secondsLeft);
      } else if (data.type === "continue") {
        closeInactivityModal();
        startInactivityTimer();
      }
    } catch {}
  }
  if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
    handleLogoutFromInactivity();
  }
});

function broadcastModalShow() {
  if (inactivitySyncLock) return;
  inactivitySyncLock = true;
  // Broadcast the modal show event with the seconds left (syncs timer approx)
  localStorage.setItem(MODAL_EVENT_KEY, JSON.stringify({
    type: "show",
    timestamp: Date.now(),
    secondsLeft: inactivityWarningMs / 1000
  }));
  setTimeout(() => { inactivitySyncLock = false; }, 100);
}

function broadcastModalContinue() {
  localStorage.setItem(MODAL_EVENT_KEY, JSON.stringify({
    type: "continue",
    timestamp: Date.now()
  }));
}

function broadcastLogout() {
  localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
}

// --- Modal close helper ---
function closeInactivityModal() {
  clearInterval(inactivityInterval);
  if (inactivityModal) {
    document.body.removeChild(inactivityModal);
    inactivityModal = null;
  }
}

// --- Log out handler, runs in all tabs ---
function handleLogoutFromInactivity() {
  closeInactivityModal();
  window.removeEventListener('mousemove', startInactivityTimer._activityHandler);
  window.removeEventListener('keydown', startInactivityTimer._activityHandler);
  window.removeEventListener('click', startInactivityTimer._activityHandler);
  // Log out Firebase, then redirect
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function () {
      window.location.href = INACTIVITY_LOGOUT_REDIRECT;
    });
  } else {
    window.location.href = INACTIVITY_LOGOUT_REDIRECT;
  }
}

// --- Export (for ES modules or window global) ---
window.fetchSessionTimeoutAndStart = fetchSessionTimeoutAndStart;

// ---- END Inactivity Timeout Modal Logic ----
