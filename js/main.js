/* ================= Init: build background after layout settles, rebuild on resize =================
   Orchestration only — the actual work lives in js/background.js (buildAmbientBackground,
   buildParticles) and js/navie.js (navieRepositionOnResize). */
function initAmbient() {
  buildAmbientBackground();
  buildParticles();
}
window.addEventListener('load', () => setTimeout(initAmbient, 60));
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initAmbient();
    if (navieRepositionOnResize) navieRepositionOnResize();
  }, 300);
});
