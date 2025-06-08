const INACTIVITY_LOGOUT_REDIRECT = "/login";
const INACTIVITY_MODAL_CSS = "/timeout.css";

(function ensureInactivityModalCss() {
  if (!document.querySelector('link[data-inactivity-modal-css]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = INACTIVITY_MODAL_CSS;
    link.setAttribute('data-inactivity-modal-css', '1');
    document.head.appendChild(link);
  }
})();

let inactivityModal = null;
let inactivityInterval = null;
let inactivityTimeout = null;
let inactivitySessionTimeoutMinutes = null;
let inactivityWarningMinutes = null;
let inactivityLimitMs = null;
let inactivityWarningMs = null;
let inactivitySyncLock = false;

const MODAL_EVENT_KEY = "inactivity-modal-event-v1";
const LOGOUT_EVENT_KEY = "inactivity-logout-event-v1";

function log(...args) {
  console.log("[timeout.js]", ...args);
}

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
      log("Session: " + min + "min, warning in: " + inactivityWarningMinutes + "min");
      startInactivityTimer();
    } catch (e) {
      log("Failed to fetch sessionTimeoutMinutes, using fallback. Error:", e);
      inactivitySessionTimeoutMinutes = 6;
      inactivityWarningMinutes = 5;
      inactivityLimitMs = 6 * 60 * 1000;
      inactivityWarningMs = 5 * 60 * 1000;
      startInactivityTimer();
    }
  });
}

function clearAllInactivityTimers() {
  log("Clearing all inactivity timers.");
  clearTimeout(inactivityTimeout);
  inactivityTimeout = null;
  clearInterval(inactivityInterval);
  inactivityInterval = null;
}

function startInactivityTimer() {
  log("Starting inactivity timer.");
  clearAllInactivityTimers();

  function activityHandler() {
    if (!inactivityModal) {
      log("Activity detected, resetting inactivity timer.");
      clearAllInactivityTimers();
      inactivityTimeout = setTimeout(() => {
        log("Inactivity period reached, showing modal.");
        broadcastModalShow();
        showInactivityModal();
      }, inactivityLimitMs - inactivityWarningMs);
    }
  }

  // Remove previous
  window.removeEventListener('mousemove', startInactivityTimer._activityHandler || (() => {}));
  window.removeEventListener('keydown', startInactivityTimer._activityHandler || (() => {}));
  window.removeEventListener('click', startInactivityTimer._activityHandler || (() => {}));

  window.addEventListener('mousemove', activityHandler);
  window.addEventListener('keydown', activityHandler);
  window.addEventListener('click', activityHandler);

  startInactivityTimer._activityHandler = activityHandler;

  inactivityTimeout = setTimeout(() => {
    log("Inactivity period reached (no activity), showing modal.");
    broadcastModalShow();
    showInactivityModal();
  }, inactivityLimitMs - inactivityWarningMs);
}

function showInactivityModal(secondsOverride) {
  if (inactivityModal) return;
  log("Showing inactivity modal.");
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

  clearInterval(inactivityInterval);
  inactivityInterval = setInterval(() => {
    secondsLeft--;
    if (secondsLeft <= 0) {
      log("Timer hit 0 in modal. Logging out now!");
      clearAllInactivityTimers();
      broadcastLogout();
      handleLogoutFromInactivity();
      return;
    }
    updateCountdown();
  }, 1000);

  continueBtn.onclick = function () {
    log("Continue working clicked.");
    closeInactivityModal();
    clearAllInactivityTimers();
    broadcastModalContinue();
    log("Restarting inactivity timer after continue.");
    startInactivityTimer();
  };
}

window.addEventListener("storage", function(e) {
  if (e.key === MODAL_EVENT_KEY && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);
      if (!data || !data.type) return;
      if (data.type === "show") {
        log("Received MODAL_EVENT_KEY: show");
        if (!inactivityModal) showInactivityModal(data.secondsLeft);
      } else if (data.type === "continue") {
        log("Received MODAL_EVENT_KEY: continue");
        closeInactivityModal();
        clearAllInactivityTimers();
        startInactivityTimer();
      }
    } catch (err) {
      log("Error in storage event:", err);
    }
  }
  if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
    log("Received LOGOUT_EVENT_KEY, logging out in this tab.");
    handleLogoutFromInactivity();
  }
});

function broadcastModalShow() {
  if (inactivitySyncLock) return;
  inactivitySyncLock = true;
  log("Broadcasting modal show.");
  localStorage.setItem(MODAL_EVENT_KEY, JSON.stringify({
    type: "show",
    timestamp: Date.now(),
    secondsLeft: inactivityWarningMs / 1000
  }));
  setTimeout(() => { inactivitySyncLock = false; }, 100);
}

function broadcastModalContinue() {
  log("Broadcasting modal continue.");
  localStorage.setItem(MODAL_EVENT_KEY, JSON.stringify({
    type: "continue",
    timestamp: Date.now()
  }));
}

function broadcastLogout() {
  log("Broadcasting logout.");
  localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());
}

function closeInactivityModal() {
  log("Closing inactivity modal.");
  clearInterval(inactivityInterval);
  inactivityInterval = null;
  if (inactivityModal) {
    if (inactivityModal.parentNode) {
      inactivityModal.parentNode.removeChild(inactivityModal);
    }
    inactivityModal = null;
  }
}

function handleLogoutFromInactivity() {
  log("Logged out due to inactivity.");
  closeInactivityModal();
  clearAllInactivityTimers();
  window.removeEventListener('mousemove', startInactivityTimer._activityHandler || (() => {}));
  window.removeEventListener('keydown', startInactivityTimer._activityHandler || (() => {}));
  window.removeEventListener('click', startInactivityTimer._activityHandler || (() => {}));
  if (window.firebase && firebase.auth) {
    firebase.auth().signOut().then(function () {
      window.location.href = INACTIVITY_LOGOUT_REDIRECT;
    });
  } else {
    window.location.href = INACTIVITY_LOGOUT_REDIRECT;
  }
}

window.fetchSessionTimeoutAndStart = fetchSessionTimeoutAndStart;
