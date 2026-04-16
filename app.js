function initBottomNav() {
  const navItems = document.querySelectorAll('.nav-item');
  if (!navItems.length) return;

  const currentPath = window.location.pathname;
  let currentPage = '';

  if (currentPath.includes('home.html') || currentPath === '/' || currentPath === '/index.html') {
    currentPage = 'home';
  } else if (currentPath.includes('queue.html')) {
    currentPage = 'queue';
  } else if (currentPath.includes('transact.html')) {
    currentPage = 'transact';
  } else if (currentPath.includes('card.html')) {
    currentPage = 'card';
  } else if (currentPath.includes('ticket-store.html')) {
    currentPage = 'tickets';
  } else {
    // fallback: match data-page attribute from href
    for (let item of navItems) {
      if (item.getAttribute('data-page') && currentPath.includes(item.getAttribute('data-page'))) {
        currentPage = item.getAttribute('data-page');
        break;
      }
    }
  }

  navItems.forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-page') === currentPage) {
      item.classList.add('active');
    }
  });
}

function loadBottomNav() {
  fetch('bottom-nav.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('bottomNav').innerHTML = html;
      initBottomNav(); // activate after insertion
    });
}