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
