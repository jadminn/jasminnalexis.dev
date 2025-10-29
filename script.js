// Mobile nav
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('[data-nav]');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
}
// Dynamic year
document.getElementById('year').textContent = new Date().getFullYear();
