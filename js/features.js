/* ================= Features: clickable rows expand description, one active at a time =================
   Rows carry tabindex="0" role="button" aria-expanded="..." in index.html so they're real
   keyboard-operable accordion triggers, not just clickable divs — this activates them the
   same way for mouse, touch, and keyboard (Enter/Space). */
const featureRows = document.querySelectorAll('.feature-row');

function activateFeatureRow(row) {
  featureRows.forEach(r => {
    r.classList.remove('fr-active');
    r.setAttribute('aria-expanded', 'false');
  });
  row.classList.add('fr-active');
  row.setAttribute('aria-expanded', 'true');
}

featureRows.forEach(row => {
  row.addEventListener('click', () => activateFeatureRow(row));
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault(); // stop Space from also scrolling the page
      activateFeatureRow(row);
    }
  });
});
