// Your updated JavaScript

const pricingData = {
  monthly: [
    { price: "$79", billed: "billed monthly" },
    { price: "$399", billed: "billed monthly" },
    { price: "$799", billed: "billed monthly" }
  ],
  yearly: [
    { price: "$65", billed: "billed yearly" },
    { price: "$329", billed: "billed yearly" },
    { price: "$659", billed: "billed yearly" }
  ]
};

const billingToggle = document.getElementById('billing-toggle');
let yearly = false;

function updatePricing() {
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
}

// Toggle switch logic
billingToggle.addEventListener('click', function () {
  yearly = !yearly;
  billingToggle.classList.toggle('yearly', yearly);
  updatePricing();
});

// Initial pricing
updatePricing();
