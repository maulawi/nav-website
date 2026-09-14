/* ================= GA4 conversion CTA tracking =================
   Maps existing data-cta attributes (already present on the CTA links,
   used for nothing else previously) to the GA4 events NavGate wants to
   track. Event delegation on document click — no markup/layout changes,
   no PII collected (only the event name and a static cta/product name). */
const CTA_TRACKING_MAP = {
  'nav': { event: 'navgate_cta_click', params: { cta_name: 'try_navgate_free' } },
  'hero-primary': { event: 'navgate_cta_click', params: { cta_name: 'try_navgate_free' } },
  'whop-primary': { event: 'navgate_cta_click', params: { cta_name: 'try_navgate_free' } },
  'final-primary': { event: 'navgate_cta_click', params: { cta_name: 'try_navgate_free' } },
  'hero-secondary': { event: 'navgate_cta_click', params: { cta_name: 'access_on_whop' } },
  'whop-secondary': { event: 'navgate_cta_click', params: { cta_name: 'access_on_whop' } },
  'final-secondary': { event: 'navgate_cta_click', params: { cta_name: 'access_on_whop' } },
  'final-other-product': { event: 'navgate_product_click', params: { product_name: 'ai_travel_starter_kit' } },
};

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-cta]');
  if (!target) return;
  const mapping = CTA_TRACKING_MAP[target.getAttribute('data-cta')];
  if (!mapping || typeof gtag !== 'function') return;
  gtag('event', mapping.event, mapping.params);
});
