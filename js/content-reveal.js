/* ================= Content reveal, synchronized to Navie's arrival =================
   Navie is meant to feel like the guide through this page, not something floating over
   it: for every section Navie actually visits (all of NAVIE_STOPS except hero), that
   section's primary content stays hidden — same .reveal/.in system as everywhere else,
   see css/animations.css — until js/navie.js dispatches `navie:arrived` for it. That
   event fires the moment Navie's speech bubble starts appearing, so the felt order is
   always: Navie lands -> message -> (short pause) -> content wakes up.

   This module owns NO IntersectionObserver of its own — js/scroll.js already excludes
   these sections' elements from its generic one, and the only trigger here is the event
   above. That keeps there from ever being two systems racing to reveal the same element.

   Hero is deliberately not in NAVIE_GATED_SECTIONS: it's visible immediately on load,
   exactly as before. Every other section (including Prepare and Whop Access, both now
   real Navie stops) is gated the same way.

   Fast scrolling: js/navie.js already cancels a stale stop's pending arrival (and thus
   its event) the moment a newer one supersedes it, so this module only ever hears about
   the section the user is actually looking at. On top of that, if a second arrival event
   lands while this module's own short pre-reveal pause is still running, that pause is
   restarted for the new section — so a quick scroll never leaves a queue of reveals
   waiting to fire one after another. */

const NAVIE_GATED_SECTIONS = NAVIE_STOPS.filter(s => s.section !== 'hero').map(s => s.section);
const navieContentReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const navieGateActiveForReveal = window.innerWidth > NAVIE_MOBILE_BREAKPOINT; // mobile keeps the old toast + plain reveal, untouched

const revealedSections = new Set();
let pendingRevealTimer = null;

function asElementArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.flatMap(asElementArray);
  if (x instanceof NodeList || x instanceof HTMLCollection) return Array.from(x);
  return [x];
}

// Reveals each step in order, `gapMs` apart. A "step" can be one element, a NodeList
// (e.g. all six feature rows), or an array of elements to reveal together. Where a step
// is itself a .reveal-stagger group, the existing nth-child transition-delay rules in
// css/animations.css add their own fine-grained stagger on top of this — reused as-is,
// not duplicated.
function revealSequence(steps, gapMs) {
  steps.forEach((group, i) => {
    setTimeout(() => {
      asElementArray(group).forEach(el => el && el.classList && el.classList.add('in'));
    }, i * gapMs);
  });
}

// One ordered sequence per gated section, built lazily (only once, right when needed)
// so a missing/renamed element just quietly does nothing rather than throwing on load.
const SECTION_SEQUENCES = {
  problem: () => [
    [document.querySelector('#problem h2'), document.querySelector('#problem .divider')],
    document.querySelectorAll('#problem p'),
  ],
  features: () => [
    [document.querySelector('#features .eyebrow'), document.querySelector('#features h2')],
    document.querySelector('.features-lead > p'),
    document.querySelectorAll('.feature-row'),
    document.querySelector('.features-proof'),
  ],
  'how-it-works': () => [
    [document.querySelector('#how-it-works .eyebrow'), document.querySelector('#how-it-works h2')],
    document.querySelectorAll('.step'),
  ],
  'ai-section': () => [
    document.querySelector('#ai-section .eyebrow'),
    document.querySelector('#ai-section h2'),
    document.querySelector('#ai-section .ai-copy > p.reveal:not(.eyebrow)'),
    [document.getElementById('aiDemo'), document.querySelector('.ai-visual')],
    document.querySelector('#ai-section .hero-ctas'),
  ],
  discover: () => [
    [document.querySelector('#discover .eyebrow'), document.querySelector('#discover h2')],
    document.querySelector('.discover-copy > p.reveal:not(.eyebrow)'),
    [document.querySelector('.discover-tags'), document.querySelector('#discover .btn-ghost')],
    document.querySelector('.discover-visual'),
  ],
  prepare: () => [
    [document.querySelector('#prepare .eyebrow'), document.querySelector('#prepare h2')],
    document.querySelector('#prepare p'),
    document.querySelector('.prepare-visual'),
  ],
  'whop-access': () => [
    document.querySelector('.whop-badge'),
    document.querySelector('#whop-access h2'),
    document.querySelector('#whop-access p:not(.fine-print)'),
    document.querySelector('#whop-access .btn-row'),
    document.querySelector('#whop-access .fine-print'),
  ],
  'final-cta': () => [
    document.querySelector('#final-cta h2'),
    document.querySelector('#final-cta p'),
    document.querySelector('#final-cta .btn-row'),
  ],
};

// Index of the "AI demo card" step above (0-based) — used to start its own scripted
// sequence at the moment its container's reveal actually fires, never before.
const AI_DEMO_STEP_INDEX = 3;

if (navieGateActiveForReveal) {
  document.addEventListener('navie:arrived', (e) => {
    const section = e.detail && e.detail.section;
    if (!section || !NAVIE_GATED_SECTIONS.includes(section) || revealedSections.has(section)) return;
    const buildSteps = SECTION_SEQUENCES[section];
    if (!buildSteps) return;

    // A newer arrival always takes priority over a still-pending one — this is what
    // keeps fast scrolling from stacking up reveals.
    clearTimeout(pendingRevealTimer);

    const startDelay = navieContentReducedMotion ? 0 : 450; // "message registers first" pause
    pendingRevealTimer = setTimeout(() => {
      if (revealedSections.has(section)) return;
      revealedSections.add(section);

      const steps = buildSteps();
      const gap = navieContentReducedMotion ? 0 : 130;
      revealSequence(steps, gap);

      if (section === 'ai-section') {
        setTimeout(() => { if (typeof triggerAiDemo === 'function') triggerAiDemo(); }, gap * AI_DEMO_STEP_INDEX);
      }
    }, startDelay);
  });
}
