// Load header (only if the page has it)
function loadHeader() {
  const header = document.getElementById("header");
  if (!header) return;

  fetch("header.html")
    .then(res => res.text())
    .then(data => {
      header.innerHTML = data;
    });
}

// Load bottom navigation
function loadBottomNav() {
  const nav = document.getElementById("bottomNav");
  if (!nav) return;

  fetch("bottom-nav.html")
    .then(res => res.text())
    .then(data => {
      nav.innerHTML = data;
    });
}

// Simple navigation
function goTo(page) {
  window.location.href = page;
}
