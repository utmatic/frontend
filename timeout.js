// ---- Reusable Inactivity Timeout Modal Logic (Big Timer Style, Cross-tab Sync, External CSS) ----

// CONFIGURE this if your login fallback page is different:
const INACTIVITY_LOGOUT_REDIRECT = "/login";
const INACTIVITY_MODAL_CSS = "/timeout.css"; // <-- Path to your CSS file

// --- Inject stylesheet if not present ---
(function ensureInactivityModalCss() {
  if (!document.querySelector('link[data-inactivity-modal-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = INACTIVITY_MODAL_CSS;
    link.setAttribute('data-inactivity-modal-css', '1');
    document.head.appendChild(link);
  }
})();

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
      let min = 6;
      if (doc.exists) {
        const data = doc.data();
        if (typeof data.sessionTimeoutMinutes === "number") {
          min = data.sessionTimeoutMinutes;
        }
      }
      inactivitySessionTimeoutMinutes = min;
      if (!min || min === 0) return;
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

function showInactivityModal(secondsOverride) {
  if (inactivityModal) return;
  inactivityModal = document.createElement('div');
  inactivityModal.id = "inactivity-modal";

  const modalBox = document.createElement('div');
  modalBox.className = "inactivity-modal-box";

  const heading = document.createElement('h3');
  heading.textContent = "Session expires in";
  modalBox.appendChild(heading);

  const timerBig = document.createElement('div');
  timerBig.className = "inactivity-modal-timer-big";
  modalBox.appendChild(timerBig);

  const actions = document.createElement('div');
  actions.className = 'inactivity-modal-actions';

  const continueBtn = document.createElement('button');
  continueBtn.className = "continue-session-btn";
  continueBtn.textContent = "Continue working";
  actions.appendChild(continueBtn);

  modalBox.appendChild(actions);
  inactivityModal.appendChild(modalBox);
  document.body.appendChild(inactivityModal);

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

function closeInactivityModal() {
  clearInterval(inactivityInterval);
  if (inactivityModal) {
    document.body.removeChild(inactivityModal);
    inactivityModal = null;
  }
}

function handleLogoutFromInactivity() {
  closeInactivityModal();
  window.removeEventListener('mousemove', startInactivityTimer._activityHandler);
  window.removeEventListener('keydown', startInactivityTimer._activityHandler);
  window.removeEventListener('click', startInactivityTimer._activityHandler);
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function () {
      window.location.href = INACTIVITY_LOGOUT_REDIRECT;
    });
  } else {
    window.location.href = INACTIVITY_LOGOUT_REDIRECT;
  }
}

window.fetchSessionTimeoutAndStart = fetchSessionTimeoutAndStart;
// ---- END Inactivity Timeout Modal Logic ----
