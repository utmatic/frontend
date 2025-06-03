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
firebase.initializeApp(firebaseConfig);

// Tab switching
const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinStatus = document.getElementById('signin-status');
const signupStatus = document.getElementById('signup-status');

function showSignin() {
  tabSignin.classList.add('active');
  tabSignup.classList.remove('active');
  signinForm.style.display = '';
  signupForm.style.display = 'none';
  // Clear status messages
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
}

function showSignup() {
  tabSignin.classList.remove('active');
  tabSignup.classList.add('active');
  signinForm.style.display = 'none';
  signupForm.style.display = '';
  // Clear status messages
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
}

tabSignin.addEventListener('click', showSignin);
tabSignup.addEventListener('click', showSignup);

// Sign up: Validate, store user info, and redirect to pricing
signupForm.addEventListener('submit', function(e) {
  e.preventDefault();
  if (signupStatus) signupStatus.textContent = '';
  const email = document.getElementById('signup-email').value.trim();
  const company = document.getElementById('signup-company').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const tos = signupForm.elements["tos"].checked;

  if (!tos) {
    if (signupStatus) signupStatus.textContent = "You must agree to the Terms and Privacy Policy.";
    return;
  }
  if (password.length < 8) {
    if (signupStatus) signupStatus.textContent = "Password must be at least 8 characters.";
    return;
  }
  if (password !== confirm) {
    if (signupStatus) signupStatus.textContent = "Passwords do not match.";
    return;
  }

  // Save data for pricing page/checkout
  sessionStorage.setItem('utmatic_signup', JSON.stringify({
    email,
    company,
    password
  }));

  // Redirect to pricing page
  window.location.href = "/pricing.html";
});

// Sign in with Firebase Auth
signinForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (signinStatus) signinStatus.textContent = '';
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    if (signinStatus) signinStatus.textContent = "Login successful! Redirecting...";
    setTimeout(() => { window.location.href = "/dashboard"; }, 1000);
  } catch (err) {
    if (signinStatus) signinStatus.textContent = err.message || "Sign in failed.";
  }
});

// Google Sign In/Up (optional, only if enabled in Firebase console)
function googleSignInHandler(isSignup) {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(result => {
      // You may want to check if this is a new user and/or redirect to pricing.
      // For now, just send to dashboard.
      window.location.href = "/dashboard";
    })
    .catch(error => {
      if (isSignup && signupStatus) {
        signupStatus.textContent = error.message || "Google sign up failed.";
      } else if (!isSignup && signinStatus) {
        signinStatus.textContent = error.message || "Google sign in failed.";
      }
    });
}
const googleSigninBtn = document.getElementById('google-signin-btn');
if (googleSigninBtn) {
  googleSigninBtn.addEventListener('click', function(e) {
    e.preventDefault();
    googleSignInHandler(false);
  });
}
const googleSignupBtn = document.getElementById('google-signup-btn');
if (googleSignupBtn) {
  googleSignupBtn.addEventListener('click', function(e) {
    e.preventDefault();
    googleSignInHandler(true);
  });
}

// Forgot password link
const forgotLink = document.querySelector('.forgot-link');
if (forgotLink) {
  forgotLink.addEventListener('click', function(e) {
    e.preventDefault();
    const email = document.getElementById('signin-email').value.trim();
    if (!email) {
      if (signinStatus) signinStatus.textContent = "Enter your email above, then click 'Forgot password?'";
      return;
    }
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => {
        if (signinStatus) signinStatus.textContent = "Password reset email sent.";
      })
      .catch(err => {
        if (signinStatus) signinStatus.textContent = err.message || "Could not send reset email.";
      });
  });
}
