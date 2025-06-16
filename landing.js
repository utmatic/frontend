// --- Pricing toggle and display logic ---

const pricingData = {
  monthly: [
    { price: "$49", billed: "billed monthly" },
    { price: "$249", billed: "billed monthly" },
    { price: "$399", billed: "billed monthly" }
  ],
  yearly: [
    { price: "$39", billed: "billed yearly" },
    { price: "$209", billed: "billed yearly" },
    { price: "$329", billed: "billed yearly" }
  ]
};

// Stripe Price IDs from your sheet (monthly/yearly)
const planPriceIds = {
  essential: {
    monthly: "price_1RVlcBA1uqHbiiTSf4HB0twq",
    yearly:  "price_1RVlboA1uqHbiiTSQksqTkzZ"
  },
  pro: {
    monthly: "price_1RVlaQA1uqHbiiTSB3acZJah",
    yearly:  "price_1RVlaiA1uqHbiiTSe7KTn6YD"
  },
  business: {
    monthly: "price_1RVm0iA1uqHbiiTSBnAQv09f",
    yearly:  "price_1RVm14A1uqHbiiTSvc3HnFnV"
  }
};

const billingToggle = document.getElementById('billing-toggle');
let yearly = false;

function flashPrices() {
  const priceEls = [
    document.getElementById('essential-price'),
    document.getElementById('pro-price'),
    document.getElementById('business-price')
  ];
  const flashClass = yearly ? 'flash-yellow' : 'flash-blue';

  priceEls.forEach(el => {
    el.classList.remove('flash-yellow', 'flash-blue');
    void el.offsetWidth; // Force reflow for animation restart
    el.classList.add(flashClass);
    setTimeout(() => el.classList.remove(flashClass), 400);
  });
}

function animateOnScroll() {
  const observer = new window.IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        obs.unobserve(entry.target); // Animate only once
      }
    });
  }, {
    threshold: 0.15
  });

  document.querySelectorAll('.scroll-animate').forEach(el => {
    observer.observe(el);
  });
}

// Run on page load
window.addEventListener('DOMContentLoaded', animateOnScroll);

function updatePricing(options = { animate: false }) {
  const prices = yearly ? pricingData.yearly : pricingData.monthly;
  const billedEls = [
    document.getElementById('essential-billed'),
    document.getElementById('pro-billed'),
    document.getElementById('business-billed')
  ];
  document.getElementById('essential-price').textContent = prices[0].price;
  document.getElementById('essential-billed').textContent = prices[0].billed;
  document.getElementById('pro-price').textContent = prices[1].price;
  document.getElementById('pro-billed').textContent = prices[1].billed;
  document.getElementById('business-price').textContent = prices[2].price;
  document.getElementById('business-billed').textContent = prices[2].billed;

  // Update billed text color
  billedEls.forEach(el => {
    if (yearly) {
      el.classList.add('yearly');
    } else {
      el.classList.remove('yearly');
    }
  });

  // Only animate if requested (not on first load)
  if (options.animate) flashPrices();
}

// Toggle switch logic
billingToggle.addEventListener('click', function () {
  yearly = !yearly;
  billingToggle.classList.toggle('yearly', yearly);
  updatePricing({ animate: true });
});

// Initial pricing (no animation)
updatePricing();

// --- Plan selection and SPA modal logic for signup/login ---

document.querySelectorAll('.plan-btn').forEach((btn, idx) => {
  btn.addEventListener('click', (e) => {
    const card = btn.closest('.pricing-card');
    const plan = card.getAttribute('data-plan');
    const interval = yearly ? 'yearly' : 'monthly';
    const priceId = planPriceIds[plan][interval];

    // Store plan & interval in localStorage for the signup page to use
    localStorage.setItem('utm_selected_plan', JSON.stringify({ plan, interval, priceId }));

    // Open the signup modal overlay, not a redirect!
    if (typeof showAuthOverlay === 'function') {
      showAuthOverlay('signup');
    } else {
      // fallback: redirect if modal logic not loaded
      window.location.href = '/signup';
    }
  });
});

// --- SPA Auth Overlay Modal Logic ---
(function(){
  // Auth overlay/modal elements
  const overlay = document.getElementById('auth-overlay');
  const closeBtn = document.getElementById('auth-close-btn');
  const signinBtn = document.getElementById('header-signin-btn');
  const signupBtn = document.getElementById('header-signup-btn');

  // Helper functions for showing/hiding the overlay
  window.showAuthOverlay = function(tab) {
    if (!overlay) return;
    overlay.classList.remove('hidden');
    overlay.focus && overlay.focus();
    document.body.style.overflow = 'hidden';
    // Set tab, update URL
    if (tab === 'signup') {
      if (typeof showSignup === 'function') showSignup({ pushState: true });
    } else {
      if (typeof showSignin === 'function') showSignin({ pushState: true });
    }
  };
  function hideOverlay(pushState = true) {
    if (!overlay) return;
    overlay.classList.add('hidden');
    if (pushState) window.history.pushState({}, '', '/');
    document.body.style.overflow = '';
  }

  // Show overlay if URL is /login or /signup on load
  function checkURLForAuth() {
    if (window.location.pathname === '/login') {
      window.showAuthOverlay('signin');
    } else if (window.location.pathname === '/signup') {
      window.showAuthOverlay('signup');
    } else {
      hideOverlay(false);
    }
  }

  // Header button clicks
  if (signinBtn) {
    signinBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.showAuthOverlay('signin');
    });
  }
  if (signupBtn) {
    signupBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.showAuthOverlay('signup');
    });
  }
  // Close button
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      hideOverlay();
    });
  }
  // Click outside auth-card closes overlay
  if (overlay) {
    overlay.addEventListener('mousedown', function(e) {
      if (e.target === overlay) hideOverlay();
    });
  }
  // ESC closes overlay
  document.addEventListener('keydown', function(e) {
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape' || e.key === 'Esc') {
      hideOverlay();
    }
  });
  // Listen for popstate (back/forward)
  window.addEventListener('popstate', function() {
    checkURLForAuth();
  });

  // Initial check
  checkURLForAuth();
})();

// --- SPA Auth Form Logic ---

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
if (typeof firebase !== "undefined") firebase.initializeApp(firebaseConfig);

// Utility: get redirect param from URL (if present)
function getRedirectParam() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('redirect');
}

// Tab switching (modal version)
const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');
const signinStatus = document.getElementById('signin-status');
const signupStatus = document.getElementById('signup-status');

function showSignin({ pushState = true } = {}) {
  if (!tabSignin || !tabSignup || !signinForm || !signupForm) return;
  tabSignin.classList.add('active');
  tabSignup.classList.remove('active');
  signinForm.style.display = '';
  signupForm.style.display = 'none';
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
  // Update URL to /login if not already at /login
  if (pushState && window.location.pathname !== '/login') {
    history.pushState({}, '', '/login');
  }
}

function showSignup({ pushState = true } = {}) {
  if (!tabSignin || !tabSignup || !signinForm || !signupForm) return;
  tabSignin.classList.remove('active');
  tabSignup.classList.add('active');
  signinForm.style.display = 'none';
  signupForm.style.display = '';
  if (signinStatus) signinStatus.textContent = '';
  if (signupStatus) signupStatus.textContent = '';
  // Update URL to /signup if not already at /signup
  if (pushState && window.location.pathname !== '/signup') {
    history.pushState({}, '', '/signup');
  }
}

if (tabSignin) {
  tabSignin.addEventListener('click', function(e) {
    e.preventDefault();
    showSignin({ pushState: true });
  });
}
if (tabSignup) {
  tabSignup.addEventListener('click', function(e) {
    e.preventDefault();
    showSignup({ pushState: true });
  });
}

// --- SPA-style URL sync: toggle form on browser navigation ---
window.addEventListener('popstate', function() {
  if (window.location.pathname === '/signup') showSignup({ pushState: false });
  else showSignin({ pushState: false });
});

// On initial page load: show correct form based on URL
if (window.location.pathname === '/signup') showSignup({ pushState: false });
else showSignin({ pushState: false });

// --- Sign up: Validate, create user, then call backend for Stripe checkout ---
if (signupForm) {
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
      if (signupStatus) signupStatus.textContent = "Please enter your first and last name.";
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
      if (signupStatus) signupStatus.textContent = "Plan selection missing. Please go back and select a plan.";
      return;
    }

    try {
      // DO NOT create Firebase Auth user here!
      // Call backend to create Stripe Checkout session
      if (signupStatus) signupStatus.textContent = "Redirecting to checkout...";
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
        if (signupStatus) signupStatus.textContent = data.error || 'Something went wrong creating checkout session.';
      }
    } catch (err) {
      if (err && err.code === 'auth/email-already-in-use') {
        if (signupStatus) signupStatus.textContent = "This email is already in use. Please sign in instead.";
      } else if (err && err.message) {
        if (signupStatus) signupStatus.textContent = err.message;
      } else {
        if (signupStatus) signupStatus.textContent = "Sign up failed. Please try again.";
      }
    }
  });
}

// --- Sign in with Firebase Auth ---
if (signinForm) {
  signinForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (signinStatus) signinStatus.textContent = '';
    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      const redirect = getRedirectParam();
      setTimeout(() => {
        if (redirect) {
          window.location.href = redirect;
        } else {
          window.location.href = "/dashboard";
        }
      }, 1000);
    } catch (err) {
      if (signinStatus) signinStatus.textContent = err.message || "Sign in failed.";
    }
  });
}

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
          if (signupStatus) signupStatus.textContent = "Plan selection missing. Please go back and select a plan.";
          return;
        }
        if (signupStatus) signupStatus.textContent = "Redirecting to checkout...";
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
          if (signupStatus) signupStatus.textContent = data.error || 'Something went wrong creating checkout session.';
        }
      } else {
        // Google sign-in: send to dashboard or redirected page
        const redirect = getRedirectParam();
        if (redirect) {
          window.location.href = redirect;
        } else {
          window.location.href = "/dashboard";
        }
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

// --- FAQ Accordion Logic (for landing page) ---
window.addEventListener('DOMContentLoaded', () => {
  // FAQ Accordion logic (works for both columns)
  document.querySelectorAll('.faq-accordion-row').forEach(accordionRow => {
    accordionRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.faq-question');
      if (!btn) return;

      const expanded = btn.getAttribute('aria-expanded') === 'true';
      // Close all other items in both columns (single open at a time)
      accordionRow.querySelectorAll('.faq-question[aria-expanded="true"]').forEach(openBtn => {
        if (openBtn !== btn) {
          openBtn.setAttribute('aria-expanded', 'false');
          const openPanel = document.getElementById(openBtn.getAttribute('aria-controls'));
          if (openPanel) openPanel.hidden = true;
        }
      });

      // Toggle current item
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = expanded;
    });
  });

  // --- Header scroll effect: toggles .scrolled on .header on scroll ---
  window.addEventListener('scroll', function () {
    const header = document.querySelector('.header');
    if (!header) return;
    if (window.scrollY > 18) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
});
