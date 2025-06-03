// --- Pricing toggle and display logic ---

const pricingData = {
  monthly: [
    { price: "$79", billed: "billed monthly" },
    { price: "$399", billed: "billed monthly" },
    { price: "$699", billed: "billed monthly" }
  ],
  yearly: [
    { price: "$63", billed: "billed yearly" },
    { price: "$320", billed: "billed yearly" },
    { price: "$560", billed: "billed yearly" }
  ]
};

// Stripe Price IDs from your sheet (monthly/yearly)
const planPriceIds = {
  essential: {
    monthly: "price_1RVlcBA1uqHbiiTSf4HB0twq",
    yearly:  "price_1RVlcBA1uqHbiiTSqksqTkzZ"
  },
  pro: {
    monthly: "price_1RVlaQA1uqHbiiTSB3aczJah",
    yearly:  "price_1RVlaQA1uqHbiiTSe7KTn6YD"
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

// --- Modal Signup and Stripe Checkout Logic ---

const modalBackdrop = document.getElementById('signup-modal-backdrop');
const modalForm = document.getElementById('signup-modal-form');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalPlanDesc = document.getElementById('modal-plan-desc');
const modalError = document.getElementById('modal-error');
const modalEmail = document.getElementById('modal-email');
const modalCompany = document.getElementById('modal-company');
const modalPassword = document.getElementById('modal-password');
const modalSubmitBtn = document.getElementById('modal-submit-btn');

let selectedPlan = null;
let selectedInterval = null;

function openSignupModal(plan, interval) {
  selectedPlan = plan;
  selectedInterval = interval;
  // Update modal title
  modalPlanDesc.textContent = `Sign up to continue with the ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${interval}) plan.`;
  modalError.textContent = '';
  modalForm.reset();
  modalBackdrop.classList.add('active');
  modalEmail.focus();
}

function closeSignupModal() {
  modalBackdrop.classList.remove('active');
  selectedPlan = null;
  selectedInterval = null;
}

// Modal close button & backdrop click
modalCloseBtn.addEventListener('click', closeSignupModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeSignupModal();
});

// Prevent modal form click from closing
modalForm.addEventListener('click', (e) => e.stopPropagation());

// Handle plan button clicks
document.querySelectorAll('.plan-btn').forEach((btn, idx) => {
  btn.addEventListener('click', (e) => {
    const card = btn.closest('.pricing-card');
    const plan = card.getAttribute('data-plan');
    const interval = yearly ? 'yearly' : 'monthly';
    openSignupModal(plan, interval);
  });
});

// Handle signup form submit -> call backend and redirect to Stripe
modalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  modalError.textContent = '';
  modalSubmitBtn.disabled = true;
  modalSubmitBtn.textContent = 'Redirecting...';

  const email = modalEmail.value.trim();
  const company = modalCompany.value.trim();
  const password = modalPassword.value;
  const plan = selectedPlan;
  const interval = selectedInterval;
  const priceId = planPriceIds[plan][interval];

  // Validate
  if (!email || !company || !password || !plan || !interval || !priceId) {
    modalError.textContent = 'Please fill in all fields.';
    modalSubmitBtn.disabled = false;
    modalSubmitBtn.textContent = 'Continue to Checkout';
    return;
  }

  try {
    // TODO: Change this to your actual backend URL if not served from same domain.
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        company,
        plan,
        interval,
        price_id: priceId
      })
    });
    const data = await res.json();
    if (res.ok && data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      modalError.textContent = data.error || 'Something went wrong.';
      modalSubmitBtn.disabled = false;
      modalSubmitBtn.textContent = 'Continue to Checkout';
    }
  } catch (err) {
    modalError.textContent = 'Network error, please try again.';
    modalSubmitBtn.disabled = false;
    modalSubmitBtn.textContent = 'Continue to Checkout';
  }
});
