/* ================= Demo videos (Hero, Discover, AI, Prepare) =================
   One shared ID list feeds both the reduced-motion guard and the visibility-aware
   playback below, rather than repeating it. */
const DEMO_VIDEO_IDS = ['heroDemoVideo', 'discoverDemoVideo', 'aiVisualVideo', 'prepareDemoVideo'];
const demoVideosReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Respect prefers-reduced-motion: the <video autoplay loop> attributes handle the default
   case natively with no JS at all. This is only the exception: same one-time matchMedia
   check already used in js/navie.js and js/ai-demo.js, not a new reduced-motion system.
   When active, each video pauses on its first frame so its section shows a static image
   either way — poster while loading, that same first frame once loaded — never an empty box. */
if (demoVideosReducedMotion) {
  DEMO_VIDEO_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute('autoplay');
    el.pause();
    try { el.currentTime = 0; } catch (e) { /* not seekable yet — fine, it never started playing */ }
  });
} else {
  /* Four videos now autoplay natively — fine for Hero (visible on load), but
     Discover/AI/Prepare sit below the fold and would otherwise all decode+play the
     instant the page loads even though nobody can see them yet. A small, separate
     IntersectionObserver — independent of js/navie.js's own observer, with no effect on
     Navie's arrival or content-reveal timing — pauses each video while its section is
     well outside the viewport and resumes it as the section approaches, so at most one
     or two are ever actually decoding at once. muted/playsinline/autoplay stay on the
     elements throughout; this only ever calls the native .play()/.pause() methods. */
  const demoVideos = DEMO_VIDEO_IDS.map((id) => document.getElementById(id)).filter(Boolean);
  if (demoVideos.length) {
    const videoVisibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.play().catch(() => {}); // autoplay can still be blocked by the browser; safe to ignore
        } else {
          entry.target.pause();
        }
      });
    }, { rootMargin: '50% 0px 50% 0px' });
    demoVideos.forEach((v) => videoVisibilityObserver.observe(v));
  }
}

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
