/* ================= Navie: a purposeful journey through the page, not random drift =================
   Each stop = a destination in Navie's journey through the NavGate story.
   `side` says which lane Navie rests in ('left' or 'right') — the ACTUAL horizontal
   position is no longer a per-stop guess: it's computed at arrival time by centering
   Navie inside --navie-lane (base.css), the guaranteed-empty strip every section
   reserves via .section-inner. That's what makes this the root fix rather than another
   coordinate tweak — the layout itself leaves Navie somewhere to stand, so positioning
   here is just "which lane, how far down."
   `y` is "how far down this section" (0-100), read both as vh (fixed widget) and as a
   fraction of the section's own document height (SVG path in js/background.js) — same
   meaning, two coordinate spaces.
   Navie's position is driven frame-by-frame by travelToPosition(), a JS animation loop
   that glides it along a gentle curve from wherever it currently is to the new stop —
   not a CSS transition — so a lane switch reads as one continuous flight across the page
   rather than a jump, and the arc echoes the dashed .navie-path-line it travels beside.
   The bubble/pop/`navie:arrived` event only fire once that glide has actually finished.
   pop: which arrival flourish plays (matches the CSS .pop-* classes)
   loop: an optional continuous animation that keeps playing while Navie is at this stop */
const NAVIE_MOBILE_BREAKPOINT = 860; // below this, there's no lane at all — Navie parks bottom-center instead

// Order matches the page's narrative structure (IDEA -> PROBLEM -> DISCOVER -> PLAN ->
// HOW IT WORKS -> GENERATE -> PREPARE -> START/WAITLIST -> JOURNEY), which is also the
// DOM order in index.html — background.js and content-reveal.js both derive their own
// ordering from this array, so this is the one place the whole route is defined.
const NAVIE_STOPS = [
  { section: 'hero',          side: 'right', y: 88, pop: 'pop-fly',    line1: "Hi! I'm Navie.",                    line2: "Your AI travel companion." },
  { section: 'problem',       side: 'left',  y: 50, pop: 'pop-fly',    line1: "Too many tabs?",                    line2: "Let me simplify that." },
  { section: 'discover',      side: 'right', y: 82, pop: 'pop-fly',    line1: "Found somewhere interesting.",      line2: "Want to explore?" },
  { section: 'features',      side: 'right', y: 12, pop: 'pop-bounce', line1: "Everything you need for the trip.", line2: "All in one place." },
  { section: 'how-it-works',  side: 'left',  y: 76, pop: 'pop-fly',    line1: "Discover. Plan.",                   line2: "Let's go →" },
  { section: 'ai-section',    side: 'right', y: 42, pop: 'pop-think',  line1: "Tell me where you want to go.",     line2: "I'll help plan the rest.", loop: 'thinking-loop' },
  { section: 'prepare',       side: 'left',  y: 50, pop: 'pop-fly',    line1: "One last thing.",                   line2: "Let's get you ready." },
  { section: 'whop-access',   side: 'right', y: 50, pop: 'pop-bounce', line1: "Ready when you are.",                line2: "Let's begin." },
  { section: 'final-cta',     side: 'left',  y: 42, pop: 'pop-settle', line1: "Ready for your next journey?",      line2: "Let's go →" },
];

const navieTeaser = document.getElementById('navieTeaser');
const navieBotWrap = document.getElementById('navieBotWrap');
const navieBubble = document.getElementById('navieBubble');
const nbLine1 = document.getElementById('nbLine1');
const nbLine2 = document.getElementById('nbLine2');

// Reads the CURRENT --navie-lane value (it changes across the tablet breakpoints in
// responsive.css), so positioning always matches whatever width the layout actually
// reserved — never a value guessed or hardcoded here.
function getLanePx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--navie-lane');
  return parseFloat(raw) || 0;
}

// Populated below (inside the `if (navieTeaser)` guard) and called from js/main.js's
// resize handler, so Navie's resting spot stays correct if the window is resized
// across the mobile-lane breakpoint or across a lane-width tier change.
let navieRepositionOnResize = null;

if (navieTeaser) {
  const navieReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const POP_CLASSES = ['pop-fly', 'pop-bounce', 'pop-think', 'pop-settle'];

  let currentStopIndex = -1;
  let arrivalTimer = null;    // the pending "settle, then show bubble" timeout from the most recent travel
  let travelFrame = null;     // the in-flight requestAnimationFrame id for the current glide

  const TRAVEL_DURATION = 2000; // ms — a slow, visible glide, not a snap
  const SETTLE_PAUSE = 200;     // ms — a small breath between landing and the bubble popping up

  // Phase 3: was a symmetric ease-in-out (slow launch, slow arrival). Switched to a pure
  // ease-out — immediate departure, gentle deceleration into the settle — which is what
  // "approach -> decelerate -> settle" actually describes; a slow launch read as
  // hesitation rather than travel. Same TRAVEL_DURATION, only the curve changed.
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // Glides the teaser from its current on-screen spot to (toLeft, toTop) along a gentle
  // quadratic arc — the same "curved connector between stops" language as the dashed
  // .navie-path-line in js/background.js — rather than a straight interpolation. Cancels
  // any glide already in progress so a fast scroll can never leave two running at once.
  function travelToPosition(toLeft, toTop, duration, onDone) {
    cancelAnimationFrame(travelFrame);
    const from = navieTeaser.getBoundingClientRect();
    const fromLeft = from.left, fromTop = from.top;
    const dx = toLeft - fromLeft, dy = toTop - fromTop;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) { navieTeaser.style.left = toLeft + 'px'; navieTeaser.style.top = toTop + 'px'; onDone && onDone(); return; }

    const bow = Math.min(90, dist * 0.22);
    const perpX = -dy / dist, perpY = dx / dist;
    const ctrlLeft = (fromLeft + toLeft) / 2 + perpX * bow;
    const ctrlTop = (fromTop + toTop) / 2 + perpY * bow;

    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const e = easeOutCubic(t);
      const inv = 1 - e;
      navieTeaser.style.left = (inv * inv * fromLeft + 2 * inv * e * ctrlLeft + e * e * toLeft) + 'px';
      navieTeaser.style.top = (inv * inv * fromTop + 2 * inv * e * ctrlTop + e * e * toTop) + 'px';
      if (t < 1) {
        travelFrame = requestAnimationFrame(frame);
      } else {
        onDone && onDone();
      }
    }
    travelFrame = requestAnimationFrame(frame);
  }

  // Final safety net only (see request #10 in the original ask, and the follow-up: "the
  // safe-zone fallback can remain as a final safety net, but it should rarely need to
  // activate after the layout is fixed"). With a real reserved lane this should basically
  // never fire — it exists for the rare case a section's own content (a badge with a
  // negative offset, say) still reaches into the lane at some viewport size. If it does,
  // nudge Navie to hug the true viewport edge instead of the lane's center.
  function findSafeLeft(centeredLeft, sectionEl, teaserWidth, teaserHeight, top, side) {
    if (!sectionEl) return centeredLeft;
    const teaserRect = { left: centeredLeft, right: centeredLeft + teaserWidth, top, bottom: top + teaserHeight };
    const footerEl = document.querySelector('footer');
    const guarded = sectionEl.querySelectorAll(
      'h1,h2,h3,.btn,.video-frame,.feature-row,.features-proof,.ai-demo,.discover-index,.whop-panel,.prepare-checklist,.journey-wrap,.float-badge,.final-more'
    );
    const guardedList = footerEl ? [...guarded, footerEl.querySelector('.footer-brand'), footerEl.querySelector('.footer-grid')].filter(Boolean) : Array.from(guarded);
    const hit = guardedList.some(el => {
      const r = el.getBoundingClientRect();
      return !(teaserRect.right < r.left || teaserRect.left > r.right || teaserRect.bottom < r.top || teaserRect.top > r.bottom);
    });
    if (!hit) return centeredLeft;
    const vw = window.innerWidth;
    return side === 'left' ? 4 : vw - teaserWidth - 4;
  }

  // Second half of the safety net: keeps Navie's vertical extent inside its own section
  // (and never past the footer, for the last one). A stop's `y` is tuned by hand against
  // that stop's actual message length, so this is a backstop for the rare case a message
  // changes and nobody re-checks the geometry — not the primary mechanism.
  function clampTop(top, teaserHeight, sectionEl) {
    if (!sectionEl) return top;
    const rect = sectionEl.getBoundingClientRect();
    const footerEl = document.querySelector('footer');
    const footerTop = footerEl ? footerEl.getBoundingClientRect().top : Infinity;
    const margin = 16;
    const maxBottom = Math.min(rect.bottom, footerTop) - margin;
    const minTop = rect.top + margin;
    let clamped = Math.min(top, maxBottom - teaserHeight);
    return Math.max(clamped, minTop);
  }

  // Pure computation of a stop's resting position: centered inside the lane on the
  // stop's side, at the stop's (clamped) vertical position. No DOM writes — used both to
  // kick off a glide there (arriveAt) and to snap there instantly (resize).
  function computeTargetPosition(stop, sectionEl) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const lanePx = getLanePx();
    const teaserBox = navieTeaser.getBoundingClientRect();
    const teaserWidth = teaserBox.width || 168;
    const teaserHeight = teaserBox.height || 220;
    const top = clampTop(vh * (stop.y / 100), teaserHeight, sectionEl);

    // Center Navie inside the lane, with a small sane minimum margin from the true edge.
    const inset = Math.max(8, (lanePx - teaserWidth) / 2);
    let left = stop.side === 'left' ? inset : vw - inset - teaserWidth;
    left = findSafeLeft(left, sectionEl, teaserWidth, teaserHeight, top, stop.side);
    return { left, top };
  }

  // Snaps the teaser straight to a stop's resting position, no glide — used only by the
  // resize handler, where an animated re-travel would be distracting.
  function snapToPosition(stop, sectionEl) {
    const mobileLane = window.innerWidth <= NAVIE_MOBILE_BREAKPOINT;
    navieTeaser.classList.toggle('navie-mobile-lane', mobileLane);
    if (mobileLane || navieReducedMotion) return;
    cancelAnimationFrame(travelFrame);
    const pos = computeTargetPosition(stop, sectionEl);
    navieTeaser.style.top = pos.top + 'px';
    navieTeaser.style.bottom = 'auto';
    navieTeaser.style.right = 'auto';
    navieTeaser.style.left = pos.left + 'px';
  }

  // Fires once Navie has actually settled at a stop (after the glide + a short pause):
  // plays the arrival flourish, shows the bubble, and tells the rest of the page.
  // Mobile has no lane to travel through (Navie stays parked in its fixed corner, see
  // .navie-mobile-lane in responsive.css) but otherwise runs this exact same path, so
  // its message updates and bubble shows the same way desktop's does.
  function settleAt(stop) {
    void navieBotWrap.offsetWidth; // reflow, so the pop animation replays even on repeat visits
    navieBotWrap.classList.add(stop.pop);
    if (stop.loop) navieBotWrap.classList.add(stop.loop);

    navieTeaser.classList.add('navie-arrived');

    // Let the rest of the page know Navie has actually landed and is showing its
    // message — this is what js/content-reveal.js listens for to wake up that
    // section's content. Navie's own systems (path, lane, safe-zone) don't touch
    // this event at all; it's a one-way notification outward.
    document.dispatchEvent(new CustomEvent('navie:arrived', { detail: { section: stop.section } }));
  }

  function arriveAt(stopIndex) {
    if (stopIndex === currentStopIndex) return;
    currentStopIndex = stopIndex;
    const stop = NAVIE_STOPS[stopIndex];
    const sectionEl = document.getElementById(stop.section);

    // A fast scroll can call arriveAt() again before the previous stop's glide/settle has
    // finished. Cancel both the in-flight glide and the pending settle timer — otherwise
    // the OLD stop's bubble/pop/event would still fire late, after Navie has already
    // visibly moved on to a newer stop (a "backlog").
    clearTimeout(arrivalTimer);
    cancelAnimationFrame(travelFrame);

    // Leaving: hide the bubble immediately — it should never show mid-travel
    navieTeaser.classList.remove('navie-arrived');
    navieBotWrap.classList.remove(...POP_CLASSES, 'thinking-loop');

    // Set the new stop's message text NOW (invisibly — the bubble stays opacity:0 until
    // .navie-arrived is added below) so the width/height computed below (and by
    // computeTargetPosition) reflect the size Navie will actually be once it arrives,
    // not the previous stop's leftover text/height.
    nbLine1.textContent = stop.line1;
    nbLine2.textContent = stop.line2;

    const mobileLane = window.innerWidth <= NAVIE_MOBILE_BREAKPOINT;
    navieTeaser.classList.toggle('navie-mobile-lane', mobileLane);
    if (mobileLane) {
      // No lane to travel through on mobile — Navie stays parked in its fixed corner
      // (see .navie-mobile-lane in responsive.css) and just settles right away.
      arrivalTimer = setTimeout(() => settleAt(stop), 0);
      return;
    }
    if (navieReducedMotion) {
      snapToPosition(stop, sectionEl);
      arrivalTimer = setTimeout(() => settleAt(stop), 0);
      return;
    }

    // Travel: a slow curved glide carries Navie the whole way, including across the page
    // when this stop is on the opposite lane from the last one — echoing the dashed path
    // it travels beside rather than sliding in a straight line. The bubble/pop/event only
    // fire once this glide has actually finished (plus a short settle pause) — never before.
    const target = computeTargetPosition(stop, sectionEl);
    travelToPosition(target.left, target.top, TRAVEL_DURATION, () => {
      arrivalTimer = setTimeout(() => settleAt(stop), SETTLE_PAUSE);
    });
  }

  navieRepositionOnResize = () => {
    if (currentStopIndex < 0) return;
    const stop = NAVIE_STOPS[currentStopIndex];
    snapToPosition(stop, document.getElementById(stop.section));
  };

  // A ratio-based threshold (e.g. 0.5 = "half the section is visible") can never fire for
  // a section taller than 2x the viewport — Features runs well over 1600px, taller than
  // most real browser viewports, so a 0.5 threshold there is literally unreachable and
  // Navie (and anything gated on its arrival) would never trigger. rootMargin shrinks the
  // observed viewport to a thin band around the middle instead, so "arrive when this
  // section crosses the center of the screen" works the same regardless of the section's
  // own height — threshold 0 just means "as soon as any part enters that band".
  //
  // CONFIRMED BUG, FIXED HERE: when two adjacent stop-sections are both short enough that
  // BOTH cross that thin band at once (e.g. landing exactly on a short section's top edge,
  // with a taller one starting right where it ends), the browser reports both as
  // intersecting in the SAME callback batch. Blindly calling arriveAt() for each in order
  // meant the later one always cancelled the earlier one's still-in-flight glide/settle
  // before it ever finished — the earlier stop's arrival (and anything gated on it) was
  // silently skipped. Fix: when several stops intersect in one batch, arrive at whichever
  // one's actual center is closest to the true viewport center, not "whichever came last
  // in the loop" — that's the one the user is really looking at.
  const stopObserver = new IntersectionObserver((entries) => {
    const intersecting = entries.filter(e => e.isIntersecting);
    if (!intersecting.length) return;
    const viewportCenter = window.innerHeight / 2;
    let best = intersecting[0];
    let bestDist = Infinity;
    intersecting.forEach(entry => {
      const rect = entry.target.getBoundingClientRect();
      const dist = Math.abs((rect.top + rect.height / 2) - viewportCenter);
      if (dist < bestDist) { bestDist = dist; best = entry; }
    });
    const idx = NAVIE_STOPS.findIndex(s => s.section === best.target.id);
    if (idx !== -1) arriveAt(idx);
  }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
  NAVIE_STOPS.forEach(s => { const el = document.getElementById(s.section); if (el) stopObserver.observe(el); });

  // First appearance: fade/float Navie in once the hero is actually visible
  const entranceObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) navieTeaser.classList.add('navie-in'); });
  }, { threshold: 0.1 });
  const heroEl = document.getElementById('hero');
  if (heroEl) entranceObserver.observe(heroEl);

  // Touch-friendly: tapping Navie re-shows the current stop's message if it was dismissed
  navieBotWrap.addEventListener('click', () => {
    navieTeaser.classList.add('navie-arrived');
  });
}
