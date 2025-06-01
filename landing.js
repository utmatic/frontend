// --- Option Selection + Contextual Hero Logic ---
const options = document.querySelectorAll('.option');
const contextHero = document.getElementById('context-hero');
const contextLabel = document.getElementById('context-label');
const contextTitle = document.getElementById('context-title');
const contextDesc = document.getElementById('context-desc');
const questionSection = document.getElementById('question-section');

// Role-specific content
const heroContent = {
  builder: {
    label: 'FOR BUILDERS',
    title: 'Create smarter. Skip the busywork.',
    desc: `You’re already creating the content—building the assets, writing the copy, designing the layouts. But manually adding links to every product, part number, and SKU? That’s hours of tedious work. Let automation handle the links, so you can focus on creating and keep moving forward.`
  },
  distributor: {
    label: 'FOR DISTRIBUTORS',
    title: 'Deploy faster. Track smarter.',
    desc: `You’re distributing the documents—sending them to clients, teams, or campaigns. But updating every link for each new campaign? That’s tedious and error-prone. Instantly update, tag, and deploy campaign-ready docs with automation—no manual edits or mistakes.`
  },
  both: {
    label: 'FOR TEAMS',
    title: 'Work together. Eliminate busywork.',
    desc: `From creating content to distributing assets, your team does it all. Automate the manual link work at every step so you can move faster, reduce errors, and make smarter decisions with campaign-ready documents, every time.`
  }
};

function handleOptionClick(e) {
  const selected = e.currentTarget;
  options.forEach(opt => {
    opt.classList.remove('active');
    opt.querySelector('.option-arrow').textContent = '';
  });
  selected.classList.add('active');
  selected.querySelector('.option-arrow').textContent = '►';

  // Show contextual hero with correct content
  const role = selected.getAttribute('data-role');
  contextLabel.innerHTML = heroContent[role].label + ' <span class="context-caret">&#9660;</span>';
  contextTitle.textContent = heroContent[role].title;
  contextDesc.textContent = heroContent[role].desc;

  // Animate in and scroll to section
  contextHero.style.display = 'block';
  setTimeout(() => {
    contextHero.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  // Optionally focus the time savings widget after a short delay for smooth experience
  setTimeout(() => {
    document.querySelector('.timesave-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 1000);
}

// Attach click handlers
options.forEach(opt => {
  opt.addEventListener('click', handleOptionClick);
});

// --- Timesave Calculator ---
const docsSlider = document.getElementById('docs-created');
const linksSlider = document.getElementById('links-per-doc');
const docsValue = document.getElementById('docs-created-value');
const linksValue = document.getElementById('links-per-doc-value');
const hoursDisplay = document.getElementById('timesave-hours');

function updateTimeSaved() {
  const docs = parseInt(docsSlider.value, 10);
  const links = parseInt(linksSlider.value, 10);
  // Assume 1 minute per link, total time in minutes
  const totalMinutes = docs * links;
  const hours = Math.round(totalMinutes / 60);
  docsValue.textContent = docs;
  linksValue.textContent = links;
  hoursDisplay.textContent = hours > 0 ? hours : '<1';
}
docsSlider.addEventListener('input', updateTimeSaved);
linksSlider.addEventListener('input', updateTimeSaved);
updateTimeSaved();

// --- Nav Sign Up Button (placeholder) ---
document.querySelectorAll('.signup-btn, .nav-link[href="#"]').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    alert('Sign up/sign in coming soon!');
  });
});
