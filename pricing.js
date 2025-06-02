const pricingData = {
  monthly: [
    { price: "$79", billed: "billed monthly" },
    { price: "$399", billed: "billed monthly" },
    { price: "$699", billed: "billed monthly" }
  ],
  yearly: [
    { price: "$66", billed: "billed yearly" },
    { price: "$339", billed: "billed yearly" },
    { price: "$595", billed: "billed yearly" }
  ]
};

const billingToggle = document.getElementById('billing-toggle');
let yearly = false;

function flashPrices() {
  const priceEls = [
    document.getElementById('starter-price'),
    document.getElementById('builder-price'),
    document.getElementById('enterprise-price')
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
    document.getElementById('starter-billed'),
    document.getElementById('builder-billed'),
    document.getElementById('enterprise-billed')
  ];
  document.getElementById('starter-price').textContent = prices[0].price;
  document.getElementById('starter-billed').textContent = prices[0].billed;
  document.getElementById('builder-price').textContent = prices[1].price;
  document.getElementById('builder-billed').textContent = prices[1].billed;
  document.getElementById('enterprise-price').textContent = prices[2].price;
  document.getElementById('enterprise-billed').textContent = prices[2].billed;

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
