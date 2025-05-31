const plans = [
  {
    name: "Essential",
    monthly: "$99/mo",
    yearly: "$1,089/yr",
    features: [
      "PDF Processor",
      "10 MB Max File Size",
      "1 User",
      "Standard Processing",
      "Basic Regex",
      "Email Support (48h)"
    ],
    link: "#"
  },
  {
    name: "Pro",
    monthly: "$399/mo",
    yearly: "$4,069/yr",
    features: [
      "PDF + Source Processors",
      "100 MB Max File Size",
      "3 Users",
      "Advanced Processing (4x)",
      "Advanced Regex",
      "Preview Before Download"
    ],
    link: "#"
  },
  {
    name: "Premium",
    monthly: "$799/mo",
    yearly: "$8,149/yr",
    features: [
      "All Processors",
      "250 MB Max File Size",
      "5 Users (+ $39/user)",
      "Lightning Processing (8x)",
      "Custom Regex + Consulting",
      "Slack Support + Beta Access"
    ],
    link: "#"
  }
];

const cardsContainer = document.querySelector(".cards-container");
const toggle = document.getElementById("billing-toggle");
const accordionToggle = document.querySelector(".accordion-toggle");
const accordionContent = document.querySelector(".accordion-content");

function renderCards(isYearly) {
  cardsContainer.innerHTML = "";
  plans.forEach(plan => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = plan.name;

    const price = document.createElement("div");
    price.className = "price";
    price.textContent = isYearly ? plan.yearly : plan.monthly;

    const featureList = document.createElement("ul");
    plan.features.forEach(feature => {
      const li = document.createElement("li");
      li.textContent = feature;
      featureList.appendChild(li);
    });

    const button = document.createElement("button");
    button.textContent = "Sign Up";
    button.onclick = () => window.location.href = plan.link;

    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(featureList);
    card.appendChild(button);

    cardsContainer.appendChild(card);
  });
}

toggle.addEventListener("change", () => renderCards(toggle.checked));
accordionToggle.addEventListener("click", () => {
  accordionContent.style.display = (accordionContent.style.display === "block") ? "none" : "block";
});

// Initial load
renderCards(false);
