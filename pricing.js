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

// --- Plan selection and redirect to auth.html (modal logic replaced) ---

document.querySelectorAll('.plan-btn').forEach((btn, idx) => {
  btn.addEventListener('click', (e) => {
    const card = btn.closest('.pricing-card');
    const plan = card.getAttribute('data-plan');
    const interval = yearly ? 'yearly' : 'monthly';
    const priceId = planPriceIds[plan][interval];

    // Store plan & interval in localStorage for the signup page to use
    localStorage.setItem('utm_selected_plan', JSON.stringify({ plan, interval, priceId }));

    // Redirect to signup page
    window.location.href = '/auth.html';
  });
});

/*
  --- Modal Signup and Stripe Checkout Logic ---
  The modal logic is now obsolete and removed as plan selection now redirects to /auth.html.
  All signup and Stripe checkout logic should now be handled on the /auth.html page
  by reading from localStorage (utm_selected_plan) after registration.
*/
