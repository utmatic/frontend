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
// This code assumes the modal and forms are in the DOM as in patched HTML

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
