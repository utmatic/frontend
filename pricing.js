// Pricing data for monthly and yearly billing
const pricingData = {
  monthly: [
    { price: "$79", billed: "billed monthly" },
    { price: "$399", billed: "billed monthly" },
    { price: "$799", billed: "billed monthly" }
  ],
  yearly: [
    { price: "$65", billed: "billed yearly" },   // No dollar amount in billed text
    { price: "$329", billed: "billed yearly" },
    { price: "$659", billed: "billed yearly" }
  ]
};

const billingToggle = document.getElementById('billing-toggle');
let yearly = false;

function updatePricing() {
  const prices = yearly ? pricingData.yearly : pricingData.monthly;
  document.getElementById('lite-price').textContent = prices[0].price;
  document.getElementById('lite-billed').textContent = prices[0].billed;
  document.getElementById('pro-price').textContent = prices[1].price;
  document.getElementById('pro-billed').textContent = prices[1].billed;
  document.getElementById('premium-price').textContent = prices[2].price;
  document.getElementById('premium-billed').textContent = prices[2].billed;
}

// Toggle switch logic
billingToggle.addEventListener('click', function () {
  yearly = !yearly;
  billingToggle.classList.toggle('yearly', yearly);
  updatePricing();
});

// Initial pricing
updatePricing();
