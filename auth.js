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
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
}

function showSignup() {
  tabSignin.classList.remove('active');
  tabSignup.classList.add('active');
  signinForm.style.display = 'none';
  signupForm.style.display = '';
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
}

tabSignin.addEventListener('click', showSignin);
tabSignup.addEventListener('click', showSignup);

// --- Sign up: Validate, create user, then call backend for Stripe checkout ---
signupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  if (signupStatus) signupStatus.textContent = '';
  const email = document.getElementById('signup-email').value.trim();
  const first_name = document.getElementById('signup-first').value.trim();
  const last_name = document.getElementById('signup-last').value.trim();
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
  if (!first_name || !last_name) {
    signupStatus.textContent = "Please enter your first and last name.";
    return;
  }

  // Get plan info from localStorage (set by pricing.js)
  let planData;
  try {
    planData = JSON.parse(localStorage.getItem('utm_selected_plan') || '{}');
  } catch(e) {
    planData = {};
  }
  const { plan, interval, priceId } = planData;

  if (!plan || !interval || !priceId) {
    signupStatus.textContent = "Plan selection missing. Please go back and select a plan.";
    return;
  }

  try {
    // DO NOT create Firebase Auth user here!
  
    // Call backend to create Stripe Checkout session
    signupStatus.textContent = "Redirecting to checkout...";
    const res = await fetch('https://utmatic-backend.onrender.com/api/create-checkout-session', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        company,
        plan,
        interval,
        price_id: priceId,
        first_name,
        last_name
      })
    });
    const data = await res.json();
    if (res.ok && data.checkout_url) {
      // Optionally: clear the plan from storage so re-signup doesn't auto-retrigger
      localStorage.removeItem('utm_selected_plan');
      window.location.href = data.checkout_url;
    } else {
      signupStatus.textContent = data.error || 'Something went wrong creating checkout session.';
    }
  } catch (err) {
    if (err && err.code === 'auth/email-already-in-use') {
      signupStatus.textContent = "This email is already in use. Please sign in instead.";
    } else if (err && err.message) {
      signupStatus.textContent = err.message;
    } else {
      signupStatus.textContent = "Sign up failed. Please try again.";
    }
  }
});

// --- Sign in with Firebase Auth ---
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

// --- Google Sign In/Up ---
function googleSignInHandler(isSignup) {
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then(async result => {
      if (isSignup) {
        // Handle Google signup + Stripe checkout
        let planData;
        try {
          planData = JSON.parse(localStorage.getItem('utm_selected_plan') || '{}');
        } catch(e) {
          planData = {};
        }
        const { plan, interval, priceId } = planData;
        const email = result.user.email || "";
        if (!plan || !interval || !priceId) {
          signupStatus.textContent = "Plan selection missing. Please go back and select a plan.";
          return;
        }
        signupStatus.textContent = "Redirecting to checkout...";
        // Company can't be collected from Google, so use placeholder
        const res = await fetch('https://utmatic-backend.onrender.com/api/create-checkout-session', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            company: "", // Optionally prompt later
            plan,
            interval,
            price_id: priceId
            // No first_name/last_name from Google by default
          })
        });
        const data = await res.json();
        if (res.ok && data.checkout_url) {
          localStorage.removeItem('utm_selected_plan');
          window.location.href = data.checkout_url;
        } else {
          signupStatus.textContent = data.error || 'Something went wrong creating checkout session.';
        }
      } else {
        // Google sign-in: send to dashboard
        window.location.href = "/dashboard";
      }
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

// --- Forgot password link ---
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
