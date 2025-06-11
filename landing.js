// Sticky header with background on scroll

window.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header');
  const stickyClass = 'scrolled';

  function handleHeaderBg() {
    if (window.scrollY > 12) {
      header.classList.add(stickyClass);
    } else {
      header.classList.remove(stickyClass);
    }
  }

  handleHeaderBg(); // On load, in case not at top
  window.addEventListener('scroll', handleHeaderBg);
});
