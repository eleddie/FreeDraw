function setActiveButton(buttonId) {
  document.querySelectorAll(".toolbar button").forEach((button) => {
    button.classList.remove("active");
  });
  document.getElementById(buttonId).classList.add("active");
}
