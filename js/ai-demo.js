/* ================= AI section: scripted prompt -> processing -> result sequence ================= */
const aiDemo = document.getElementById('aiDemo');
const aiProcessing = document.getElementById('aiProcessing');
const aiResult = document.getElementById('aiResult');
let aiSequenceRun = false;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function runAiSequence() {
  if (aiSequenceRun) return;
  aiSequenceRun = true;
  if (prefersReducedMotion) {
    aiProcessing.classList.add('show');
    aiResult.classList.add('show');
    return;
  }
  setTimeout(() => aiProcessing.classList.add('show'), 700);
  setTimeout(() => { aiProcessing.classList.remove('show'); aiResult.classList.add('show'); }, 2200);
}

// Exposed the same way js/navie.js exposes navieRepositionOnResize: a plain global hook
// that js/content-reveal.js calls once the AI demo card actually becomes visible, so the
// scripted sequence never starts while it's still sitting at opacity:0.
let triggerAiDemo = runAiSequence;

// On desktop/tablet the AI section's content (including this card) is gated behind
// Navie's arrival — see js/content-reveal.js — so this element's own scroll position
// isn't a reliable signal of visibility there; only wire up the plain scroll-triggered
// version on mobile, where the section still reveals the old way (js/scroll.js).
if (aiDemo && window.innerWidth <= NAVIE_MOBILE_BREAKPOINT) {
  const aiObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) runAiSequence(); });
  }, { threshold: 0.5 });
  aiObserver.observe(aiDemo);
}
