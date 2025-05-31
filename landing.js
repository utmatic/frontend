// Add fade-in effect for cards on load
window.addEventListener("load", () => {
  const cards = document.querySelectorAll(".landing-card");
  cards.forEach((card, index) => {
    card.style.opacity = 0;
    card.style.transform = "translateY(20px)";
    setTimeout(() => {
      card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
      card.style.opacity = 1;
      card.style.transform = "translateY(0)";
    }, 200 * index);
  });
});

// Add hover interaction for cards (subtle scale effect)
document.querySelectorAll(".landing-card").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    card.style.transform = "scale(1.02)";
    card.style.transition = "transform 0.3s ease";
  });
  card.addEventListener("mouseleave", () => {
    card.style.transform = "scale(1)";
  });
});

// Smooth scroll back to top on footer click (if you want to add a back-to-top option)
const footer = document.querySelector(".landing-footer");
footer.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Accordion functionality
document.querySelectorAll(".accordion-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
      btn.textContent = "Learn More";
    } else {
      content.style.display = "block";
      btn.textContent = "Hide Details";
    }
  });
});
