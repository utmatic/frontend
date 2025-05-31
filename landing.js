// --- Interactive Time Savings Widget ---

const docSlider = document.getElementById('num-docs');
const linksSlider = document.getElementById('links-per-doc');
const docValue = document.getElementById('num-docs-value');
const linksValue = document.getElementById('links-per-doc-value');
const hoursDisplay = document.getElementById('timesave-hours');

function updateTimeSaved() {
  const docs = parseInt(docSlider.value, 10);
  const links = parseInt(linksSlider.value, 10);
  // Assume 1 minute wasted per manual hyperlink
  const totalMinutes = docs * links;
  const hours = Math.round(totalMinutes / 60);
  docValue.textContent = docs;
  linksValue.textContent = links;
  hoursDisplay.textContent = `~${hours > 0 ? hours : '<1'}`;
}

docSlider.addEventListener('input', updateTimeSaved);
linksSlider.addEventListener('input', updateTimeSaved);

// Initialize on load
updateTimeSaved();

// --- Nav sign up button leads to placeholder ---
const signupBtn = document.querySelector('.signup-btn');
if (signupBtn) {
  signupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Sign up/sign in coming soon!');
    // location.href = "/signup"; // Replace with real signup route when ready
  });
}

// Plan buttons
document.querySelectorAll('.plan-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Sign up or contact sales coming soon!');
    // location.href = "/signup"; // Replace with real signup route when ready
  });
});
