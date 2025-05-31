// Subtle landing animation and button focus/hover accent
document.addEventListener('DOMContentLoaded', function() {
  // Animate cards in
  const cards = document.querySelectorAll('.landing-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px) scale(0.97)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.6s cubic-bezier(.33,1.1,.68,1.01), transform 0.5s cubic-bezier(.33,1.1,.68,1.01)';
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, 300 + 110 * i);
  });

  // Focus ring and slight scale on keyboard nav
  cards.forEach(card => {
    card.addEventListener('focus', () => {
      card.style.boxShadow = '0 0 0 4px #dbeafe, 0 3px 16px 0 rgba(37,99,235,0.10)';
      card.style.transform = 'scale(1.045)';
    });
    card.addEventListener('blur', () => {
      card.style.boxShadow = '';
      card.style.transform = '';
    });
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.045)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});
