function setActiveButton(buttonId) {
  document
    .querySelectorAll(".toolbar .toolbar-section button")
    .forEach((button) => {
      button.classList.remove("active");
    });
  document.getElementById(buttonId).classList.add("active");
}
