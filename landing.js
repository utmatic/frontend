// Accordion functionality
document.querySelectorAll(".accordion-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const content = btn.nextElementSibling;
    const isOpen = content.style.display === "block";
    document.querySelectorAll(".accordion-content").forEach(el => (el.style.display = "none"));
    document.querySelectorAll(".accordion-toggle").forEach(el => (el.textContent = "Learn More"));
    if (!isOpen) {
      content.style.display = "block";
      btn.textContent = "Hide Details";
    }
  });
});
