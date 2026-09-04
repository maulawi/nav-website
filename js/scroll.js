/* ================= Reveal-on-scroll =================
   On desktop/tablet, sections Navie actually visits (everything in NAVIE_STOPS except
   hero) are excluded here — their .reveal elements are instead woken up by
   js/content-reveal.js in response to Navie's arrival, so content only appears once
   Navie has actually landed and shown its message. Hero reveals immediately, same as
   always. Every other section is now a Navie stop (Prepare and Whop Access included),
   so this generic path currently only ever handles Hero on desktop/tablet. On mobile
   there's no travel lane at all (see NAVIE_MOBILE_BREAKPOINT in js/navie.js), so nothing
   is excluded — every .reveal element uses this plain scroll-triggered path there. */
const navieGatesReveal = window.innerWidth > NAVIE_MOBILE_BREAKPOINT;
const navieGatedSectionIds = navieGatesReveal ? NAVIE_STOPS.filter(s => s.section !== 'hero').map(s => s.section) : [];

const revealEls = Array.from(document.querySelectorAll('.reveal')).filter(el => {
  const section = el.closest('section');
  return !(section && navieGatedSectionIds.includes(section.id));
});
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('in'); });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

/* ================= Nav background on scroll ================= */
const navEl = document.getElementById('nav');
function updateNavScrolled() {
  navEl.classList.toggle('scrolled', window.scrollY > 20);
}

/* ================= Signature route line: draw progress + section-node activation ================= */
const routePath = document.getElementById('routePath');
const routeDot = document.getElementById('routeDot');
const pathLength = routePath.getTotalLength ? routePath.getTotalLength() : 1000;
routePath.style.strokeDasharray = pathLength;

// Place a small node marker on the route for each major section, activating as it's reached.
// Every section is a Navie stop now, so this is just NAVIE_STOPS' order — one source of
// truth for section order, shared with js/navie.js and js/background.js.
const sectionIds = NAVIE_STOPS.map(s => s.section);
const routeSvg = routePath.ownerSVGElement;
const nodeEls = sectionIds.map((id, i) => {
  const frac = i / (sectionIds.length - 1);
  const pt = routePath.getPointAtLength ? routePath.getPointAtLength(pathLength * frac) : { x: 23, y: 0 };
  const ns = "http://www.w3.org/2000/svg";
  const c = document.createElementNS(ns, "circle");
  c.setAttribute("cx", pt.x); c.setAttribute("cy", pt.y); c.setAttribute("r", 3.5);
  c.setAttribute("class", "route-node");
  c.dataset.section = id;
  routeSvg.appendChild(c);
  return c;
});

function updateRouteLine() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0;
  routePath.style.strokeDashoffset = pathLength * (1 - progress);
  const point = routePath.getPointAtLength ? routePath.getPointAtLength(pathLength * progress) : { x: 23, y: 0 };
  routeDot.setAttribute('cx', point.x);
  routeDot.setAttribute('cy', point.y);
}
// Phase 3: both scroll-driven updates above (nav background + route line) used to run on
// every single 'scroll' event, unthrottled. Consolidated into one rAF-gated handler — at
// most once per animation frame no matter how many scroll events the browser fires in
// between — same visual result, less redundant work during fast/trackpad scrolling.
let scrollTickScheduled = false;
window.addEventListener('scroll', () => {
  if (scrollTickScheduled) return;
  scrollTickScheduled = true;
  requestAnimationFrame(() => {
    updateNavScrolled();
    updateRouteLine();
    scrollTickScheduled = false;
  });
});
window.addEventListener('resize', updateRouteLine);

// Same fix as js/navie.js's stopObserver: a ratio threshold can never be reached for a
// section taller than ~2.5x the viewport (Features runs 1600px+), so this used a thin
// center band instead of "40% of the section visible".
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const node = nodeEls.find(n => n.dataset.section === entry.target.id);
    if (node) node.classList.toggle('active', entry.isIntersecting);
  });
}, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
sectionIds.forEach(id => { const el = document.getElementById(id); if (el) sectionObserver.observe(el); });

updateRouteLine();
