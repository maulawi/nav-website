/* ================= Ambient background: generate once, sized to full document height =================
   Draws the decorative flight-route map (routes, nodes, coordinate labels, compass roses) plus
   Navie's own travel path, using the waypoints defined by NAVIE_STOPS in js/navie.js. */
function buildAmbientBackground() {
  const totalHeight = document.body.scrollHeight;
  const width = 1000;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${totalHeight}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", totalHeight);

  // Determine which vertical bands are "navy" sections, to tint route lines appropriately there
  const navySections = document.querySelectorAll('section.navy');
  const navyBands = Array.from(navySections).map(s => {
    const rect = s.getBoundingClientRect();
    const top = rect.top + window.scrollY;
    return { top, bottom: top + rect.height };
  });
  function isInNavyBand(y) { return navyBands.some(b => y >= b.top && y <= b.bottom); }

  // A handful of long, gently curving "flight routes" spanning the page
  const routeDefs = [
    `M -50,${totalHeight*0.03} C ${width*0.3},${totalHeight*0.08} ${width*0.5},${totalHeight*0.02} ${width+50},${totalHeight*0.1}`,
    `M -50,${totalHeight*0.22} C ${width*0.2},${totalHeight*0.30} ${width*0.7},${totalHeight*0.16} ${width+50},${totalHeight*0.26}`,
    `M -50,${totalHeight*0.45} C ${width*0.35},${totalHeight*0.40} ${width*0.6},${totalHeight*0.52} ${width+50},${totalHeight*0.47}`,
    `M -50,${totalHeight*0.68} C ${width*0.25},${totalHeight*0.75} ${width*0.75},${totalHeight*0.62} ${width+50},${totalHeight*0.7}`,
    `M -50,${totalHeight*0.9} C ${width*0.4},${totalHeight*0.85} ${width*0.6},${totalHeight*0.97} ${width+50},${totalHeight*0.92}`,
  ];
  routeDefs.forEach((d, i) => {
    const midY = totalHeight * [0.06, 0.24, 0.47, 0.7, 0.9][i];
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "amb-route" + (isInNavyBand(midY) ? " amb-route-navy" : ""));
    svg.appendChild(path);
  });

  // Small route nodes scattered near the routes
  const nodeYs = [0.06,0.15,0.24,0.33,0.47,0.58,0.7,0.8,0.9];
  nodeYs.forEach((frac, i) => {
    const cx = 80 + (i % 3) * 340 + (i * 37) % 200;
    const cy = totalHeight * frac;
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", 2.5);
    c.setAttribute("class", "amb-node");
    svg.appendChild(c);
  });

  // Faint coordinate-style labels
  const coordSamples = ["36.8° N, 10.1° E","35.6° N, 139.7° E","-8.3° S, 115.1° E","31.6° N, 8.0° W","41.9° N, 12.5° E","25.2° N, 55.3° E"];
  coordSamples.forEach((txt, i) => {
    const y = totalHeight * (0.1 + i * 0.15);
    const x = i % 2 === 0 ? 40 : width - 190;
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", x); t.setAttribute("y", y);
    t.setAttribute("class", "amb-coord" + (isInNavyBand(y) ? " navy-zone" : ""));
    t.textContent = txt;
    svg.appendChild(t);
  });

  // A couple of very faint compass roses
  [0.18, 0.6, 0.95].forEach(frac => {
    const cy = totalHeight * frac;
    const cx = frac === 0.6 ? width - 90 : 70;
    const g = document.createElementNS(ns, "g");
    const circle = document.createElementNS(ns, "circle");
    circle.setAttribute("cx", cx); circle.setAttribute("cy", cy); circle.setAttribute("r", 26);
    circle.setAttribute("class", "amb-compass");
    g.appendChild(circle);
    const line1 = document.createElementNS(ns, "line");
    line1.setAttribute("x1", cx); line1.setAttribute("y1", cy-26); line1.setAttribute("x2", cx); line1.setAttribute("y2", cy+26);
    line1.setAttribute("class", "amb-compass");
    g.appendChild(line1);
    const line2 = document.createElementNS(ns, "line");
    line2.setAttribute("x1", cx-26); line2.setAttribute("y1", cy); line2.setAttribute("x2", cx+26); line2.setAttribute("y2", cy);
    line2.setAttribute("class", "amb-compass");
    g.appendChild(line2);
    svg.appendChild(g);
  });

  // Navie's own travel path — real waypoints computed from each stop's actual section
  // position (not guessed), confined to the gutters, connected by gentle dashed curves.
  // Below NAVIE_MOBILE_BREAKPOINT, Navie no longer travels side-to-side (see
  // computeTargetPosition in js/navie.js), so the route line is skipped there rather
  // than drawing a diagonal across a narrow screen.
  if (window.innerWidth > NAVIE_MOBILE_BREAKPOINT) {
    // Same lane-centering math as computeTargetPosition() in js/navie.js — this is the
    // one place both the bot's actual resting spot and this decorative path are derived
    // from, so the path always draws through wherever Navie really stands.
    const navieTeaserEl = document.getElementById('navieTeaser');
    const lanePx = getLanePx();
    const teaserWidthPx = (navieTeaserEl && navieTeaserEl.getBoundingClientRect().width) || 168;
    const laneInset = Math.max(8, (lanePx - teaserWidthPx) / 2);
    const vw = window.innerWidth;
    function laneCenterFrac(side) {
      const center = side === 'left' ? laneInset + teaserWidthPx / 2 : vw - laneInset - teaserWidthPx / 2;
      return center / vw;
    }

    const navieWaypointPositions = NAVIE_STOPS.map(stop => {
      const el = document.getElementById(stop.section);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const docY = sectionTop + rect.height * (stop.y / 100);
      const svgX = laneCenterFrac(stop.side) * width;
      return { x: svgX, y: docY, navy: isInNavyBand(docY) };
    }).filter(Boolean);

    navieWaypointPositions.forEach((pt, i) => {
      const dot = document.createElementNS(ns, "circle");
      dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y); dot.setAttribute("r", 4);
      dot.setAttribute("class", "navie-path-node" + (pt.navy ? " navy-zone" : ""));
      svg.appendChild(dot);

      if (i > 0) {
        const prev = navieWaypointPositions[i - 1];
        // Gentle curve between consecutive stops rather than a straight connector
        const midY = (prev.y + pt.y) / 2;
        const bow = (i % 2 === 0 ? 1 : -1) * Math.min(60, Math.abs(pt.y - prev.y) * 0.15);
        const d = `M ${prev.x},${prev.y} C ${prev.x + bow},${midY} ${pt.x + bow},${midY} ${pt.x},${pt.y}`;
        const link = document.createElementNS(ns, "path");
        link.setAttribute("d", d);
        link.setAttribute("class", "navie-path-line" + ((prev.navy || pt.navy) ? " navy-zone" : ""));
        svg.appendChild(link);
      }
    });
  }

  const wrap = document.getElementById("ambientBg");
  wrap.innerHTML = "";
  wrap.style.height = totalHeight + "px";
  wrap.appendChild(svg);
}

/* ================= Ambient drifting particles (fixed viewport, independent of scroll) ================= */
function buildParticles() {
  const field = document.getElementById("particleField");
  field.innerHTML = "";
  // Phase 3: trimmed (was 16/8) — even at low opacity and a slow 18-34s drift, 16
  // simultaneously-moving points across the full viewport added up to more perceptible
  // motion than "barely perceptible atmosphere" calls for.
  const count = window.innerWidth < 700 ? 5 : 10;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle" + (i % 3 === 0 ? " navy-particle" : "");
    p.style.left = Math.random() * 100 + "%";
    p.style.top = Math.random() * 100 + "%";
    p.style.animationDuration = (18 + Math.random() * 16) + "s";
    p.style.animationDelay = (Math.random() * -20) + "s";
    field.appendChild(p);
  }
}
