// ...existing code above...

function flashPrices() {
  const priceEls = [
    document.getElementById('starter-price'),
    document.getElementById('builder-price'),
    document.getElementById('enterprise-price')
  ];
  const flashClass = yearly ? 'flash-yellow' : 'flash-blue';

  priceEls.forEach(el => {
    // Remove both flash classes if present
    el.classList.remove('flash-yellow', 'flash-blue');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add(flashClass);
    // Remove the class after animation duration
    setTimeout(() => el.classList.remove(flashClass), 600);
  });
}

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

  // Flash animation!
  flashPrices();
}

// Toggle switch logic
billingToggle.addEventListener('click', function () {
  yearly = !yearly;
  billingToggle.classList.toggle('yearly', yearly);
  updatePricing();
});

// Initial pricing
updatePricing();
