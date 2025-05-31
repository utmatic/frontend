// --- Interactive Time Savings Widget (Per Document) ---
const linksSlider = document.getElementById('links-per-doc');
const linksValue = document.getElementById('links-per-doc-value');
const minutesDisplay = document.getElementById('timesave-minutes');

function updateTimeSaved() {
  const links = parseInt(linksSlider.value, 10);
  // Assume 1 minute wasted per manual hyperlink
  const minutes = links;
  linksValue.textContent = links;
  minutesDisplay.textContent = minutes;
}

linksSlider.addEventListener('input', updateTimeSaved);
updateTimeSaved();

// --- Billing Toggle ---
const billingToggle = document.getElementById('billing-toggle');
const litePrice = document.getElementById('lite-price');
const proPrice = document.getElementById('pro-price');
const premiumPrice = document.getElementById('premium-price');
const liteUser = document.getElementById('lite-additional-user');
const proUser = document.getElementById('pro-additional-user');
const premiumUser = document.getElementById('premium-additional-user');
const monthlyLabel = document.getElementById('monthly-label');
const annualLabel = document.getElementById('annual-label');

const monthly = {
  lite: 79,
  pro: 399,
  premium: 799,
  liteUser: 59,
  proUser: 49,
  premiumUser: 39
};

const annual = {
  lite: Math.round(monthly.lite * 12 * 0.85 / 12),
  pro: Math.round(monthly.pro * 12 * 0.85 / 12),
  premium: Math.round(monthly.premium * 12 * 0.85 / 12),
  liteUser: Math.round(monthly.liteUser * 12 * 0.85 / 12),
  proUser: Math.round(monthly.proUser * 12 * 0.85 / 12),
  premiumUser: Math.round(monthly.premiumUser * 12 * 0.85 / 12)
};

function updatePricingDisplay() {
  if (billingToggle.checked) {
    litePrice.innerHTML = `$${annual.lite}<span class="plan-unit">/mo</span>`;
    proPrice.innerHTML = `$${annual.pro}<span class="plan-unit">/mo</span>`;
    premiumPrice.innerHTML = `$${annual.premium}<span class="plan-unit">/mo</span>`;
    liteUser.textContent = `$${annual.liteUser}/user/mo`;
    proUser.textContent = `$${annual.proUser}/user/mo`;
    premiumUser.textContent = `$${annual.premiumUser}/user/mo`;
    annualLabel.classList.add('active');
    monthlyLabel.classList.remove('active');
  } else {
    litePrice.innerHTML = `$${monthly.lite}<span class="plan-unit">/mo</span>`;
    proPrice.innerHTML = `$${monthly.pro}<span class="plan-unit">/mo</span>`;
    premiumPrice.innerHTML = `$${monthly.premium}<span class="plan-unit">/mo</span>`;
    liteUser.textContent = `$${monthly.liteUser}/user/mo`;
    proUser.textContent = `$${monthly.proUser}/user/mo`;
    premiumUser.textContent = `$${monthly.premiumUser}/user/mo`;
    annualLabel.classList.remove('active');
    monthlyLabel.classList.add('active');
  }
}
billingToggle.addEventListener('change', updatePricingDisplay);
monthlyLabel.addEventListener('click', () => {
  billingToggle.checked = false;
  updatePricingDisplay();
});
annualLabel.addEventListener('click', () => {
  billingToggle.checked = true;
  updatePricingDisplay();
});
updatePricingDisplay();

// --- Nav and Plan Buttons ---
const signupBtn = document.querySelector('.signup-btn');
if (signupBtn) {
  signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Sign up/sign in coming soon!');
    // location.href = "/signup";
  });
}
document.querySelectorAll('.plan-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Sign up or contact sales coming soon!');
    // location.href = "/signup";
  });
});
