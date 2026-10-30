/*
 * Bhavik Parmar — scroll pyramid + ambient cube motion + header text fade
 * 15 cubes: rows of 5 / 4 / 3 / 2 / 1
 * One requestAnimationFrame controller for scroll assembly and floating.
 * No backend, storage, cookies, or external libraries.
 */
(() => {
  'use strict';

  const CUBE_SIZE = 72;
  const ROWS = [5, 4, 3, 2, 1];
  const FACES = ['front', 'back', 'left', 'right', 'top', 'bottom'];

  const FLOAT_SETTINGS = {
    idleDelay: 4000,        // Return to floating 4 s after last interaction
    orbitSpeed: 0.00012,    // Radians / ms; ~52 s per revolution
    orbitRadiusX: 310,
    orbitRadiusZ: 245,
    orbitHeight: -100,       // Orbit near the mid-height of the pyramid
    verticalFloat: 12,
    settledFloat: 1.5,     // Tiny drift of placed cubes (in px)
    transitionTime: 1.1,  // Seconds; lower = quicker fade into/out of floating
    scrollResponse: 0.12  // Seconds; smooth scroll-following of cube assembly
  };

  const host = document.getElementById('cubes');
  const nav = [...document.querySelectorAll('.nav-step')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const clamp = (n, min = 0, max = 1) => Math.max(min, Math.min(max, n));
  const ease = t => 1 - Math.pow(1 - clamp(t), 3);
  const mix = (a, b, t) => a + (b - a) * t;
  const fromHex = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mixHex = (a, b, t) => {
    const aa = fromHex(a), bb = fromHex(b);
    return '#' + aa.map((v, i) =>
      Math.round(mix(v, bb[i], t)).toString(16).padStart(2, '0')
    ).join('');
  };

  const themes = [
    { bg: '#f6f5f1', fg: '#1b2633', muted: '#6a7680', accent: '#3659b8', glow: '#d3dce7', panel: '#ffffff' },
    { bg: '#eeeae5', fg: '#1b2633', muted: '#6a7680', accent: '#3659b8', glow: '#d7d5e2', panel: '#ffffff' },
    { bg: '#0d0c15', fg: '#f8f5ff', muted: '#b9b4cb', accent: '#b8a3ff', glow: '#594678', panel: '#75668f' },
    { bg: '#081b1d', fg: '#edfaf6', muted: '#a8c8c6', accent: '#83e3ce', glow: '#306e66', panel: '#a1ddd0' },
    { bg: '#07191b', fg: '#edfaf6', muted: '#a8c8c6', accent: '#83e3ce', glow: '#286458', panel: '#a1ddd0' }
  ];

  // Consistent start positions — no new randomness on page reload.
  const origins = [
    [-288, -150, 22], [257, 156, -37], [-265, 185, -21], [301, -180, 13],
    [-314, 82, 28], [272, -110, -24], [-245, -197, 32], [317, 172, -18],
    [-294, 118, -34], [254, 204, 20], [-278, -144, -14], [313, -78, 29],
    [-255, 189, 0], [284, -179, 30], [327, 90, -22]
  ];
  const hues = [213, 218, 222, 208, 201, 267, 275, 257, 270, 187, 175, 182, 181, 173, 167];
  const cubes = [];

  if (host) {
    let cubeNo = 0;
    ROWS.forEach((count, level) => {
      for (let column = 0; column < count; column++) {
        const el = document.createElement('div');
        el.className = 'cube';
        el.style.setProperty('--hue', String(hues[cubeNo]));
        el.setAttribute('data-layer', String(level));
        el.innerHTML = FACES.map(face => `<i class="cube__face cube__face--${face}"></i>`).join('');
        host.appendChild(el);

        const [sx, sz, turn] = origins[cubeNo];
        cubes.push({
          el, level, column, count,
          start: { x: sx, y: -CUBE_SIZE / 2, z: sz },
          target: {
            x: (column - (count - 1) / 2) * CUBE_SIZE,
            y: -(level + 0.5) * CUBE_SIZE,
            z: 0
          },
          rx: turn * 2.9,
          ry: turn * 5.5,
          rz: turn * 1.8,
          delay: count > 1 ? column * 0.085 : 0
        });
        cubeNo++;
      }
    });
  }

  /* Create soft ground shadows for all 15 cubes */

  cubes.forEach((cube) => {
    const shadow = document.createElement("div");

    shadow.className = "cube-shadow";
    shadow.setAttribute("aria-hidden", "true");

    // Keep shadows before cubes in the DOM
    host.prepend(shadow);

    cube.shadow = shadow;
  });


  // Persistent animation state; only ONE loop renders the pyramid.
  let smoothProgress = clamp(window.scrollY / Math.max(innerHeight, 1), 0, 4);
  let floatStrength = 0; // Slowly build up ambient motion on first load.
  let floatTarget = 1;
  let idleTimer = null;
  let frameId = null;
  let previousFrameTime = 0;
  let lastThemeProgress = NaN;
  let lastActiveNav = -1;

  const targetProgress = () =>
    clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, 4);

  // Update theme only when scroll progress changes; avoid repainting on
  // every floating frame when the visitor is not scrolling.
  function applyTheme(current) {
    if (Math.abs(current - lastThemeProgress) < 0.00001) return;
    lastThemeProgress = current;

    const left = Math.min(4, Math.floor(current));
    const right = Math.min(4, left + 1);
    const fraction = current - left;
    const a = themes[left], b = themes[right];
    const root = document.documentElement;

    ['bg', 'fg', 'muted', 'accent'].forEach(key => {
      root.style.setProperty(`--${key}`, mixHex(a[key], b[key], fraction));
    });
    ['glow', 'panel'].forEach(key => {
      const x = fromHex(a[key]), y = fromHex(b[key]);
      root.style.setProperty(`--${key}-rgb`, x.map((v, i) =>
        Math.round(mix(v, y[i], fraction))
      ).join(' '));
    });

    const active = Math.min(4, Math.round(current));
    if (active !== lastActiveNav) {
      lastActiveNav = active;
      nav.forEach((el, i) => {
        el.classList.toggle('active', i === active);
        if (i === active) el.setAttribute('aria-current', 'location');
        else el.removeAttribute('aria-current');
      });
    }
  }

  // Scroll formation stays authoritative. Ambient movement is blended on top.
  function renderCubes(current, now, ambient) {
    const simplify = reducedMotion.matches;
    const phase = now * FLOAT_SETTINGS.orbitSpeed;

    cubes.forEach((cube, index) => {
      const rawProgress = cube.level === 0 ? 1 :
        clamp((current - (cube.level - 1) - cube.delay) / (1 - cube.delay));
      const t = simplify ? (rawProgress > 0.5 ? 1 : 0) : ease(rawProgress);
      const { start, target } = cube;
      const arc = simplify ? 0 : 160 * Math.sin(Math.PI * t) * (1 - 0.09 * cube.level);

      const baseX = mix(start.x, target.x, t);
      const baseY = mix(start.y, target.y, t) - arc;
      const baseZ = mix(start.z, target.z, t);

      // Individually phased motion: loose cubes revolve around the pyramid.
      // Each cube retains its original target so it can assemble on scroll.

      /* Two orbital paths for better cube separation */

      // Distribute cubes across two orbital bands
      const band = index % 2;
      const slot = Math.floor(index / 2);

      // First band: 8 cubes
      // Second band: 7 cubes
      const slotsInBand = band === 0 ? 8 : 7;

      // Evenly spaced cubes on each orbit
      const angle =
        phase +
        (slot / slotsInBand) * Math.PI * 2 +
        (band === 1 ? 0.35 : 0);

      // Different depths and orbital radii
      const radiusX =
        FLOAT_SETTINGS.orbitRadiusX + band * 25;

      const radiusZ =
        FLOAT_SETTINGS.orbitRadiusZ + band * 25;

      // Separate the orbital paths vertically
      const heightOffset = band * 185;

      const orbitX = Math.cos(angle) * radiusX;

      const orbitZ = Math.sin(angle) * radiusZ;

      const orbitY =
        FLOAT_SETTINGS.orbitHeight -
        heightOffset +
        Math.sin(angle * 1.4) *
        FLOAT_SETTINGS.verticalFloat;


      // Placed cubes stay stacked, but move subtly so the completed
      // pyramid never looks entirely frozen.
      const settledX = Math.cos(angle * 1.3) * FLOAT_SETTINGS.settledFloat;
      const settledY = Math.sin(angle * 1.7) * FLOAT_SETTINGS.settledFloat;
      const settledZ = Math.sin(angle * 1.2) * FLOAT_SETTINGS.settledFloat * 0.5;

      // Blend loose orbital position back to the normal scroll placement.
      // This avoids a sudden jump when a cube becomes part of the pyramid.
      const orbitBlend = ambient * (1 - t);
      const settledBlend = ambient * t;

      const x = mix(baseX, orbitX, orbitBlend) + settledX * settledBlend;
      const y = mix(baseY, orbitY, orbitBlend) + settledY * settledBlend;
      const z = mix(baseZ, orbitZ, orbitBlend) + settledZ * settledBlend;

      const spin = 1 - t;
      const rx = cube.rx * spin + Math.sin(angle) * 3 * orbitBlend;
      const ry = cube.ry * spin + Math.cos(angle) * 4 * orbitBlend;
      const rz = cube.rz * spin + Math.sin(angle * 0.7) * 2 * orbitBlend;

      cube.el.style.transform =
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) ` +
        `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;


      /* Dynamic shadow based on cube height */

      const heightAboveGround = Math.max(
        0,
        -y - CUBE_SIZE / 2
      );

      // Higher cubes produce softer, wider shadows
      const shadowScale =
        1 + heightAboveGround * 0.0025;

      const shadowOpacity =
        0.30 * Math.exp(-heightAboveGround / 175);

      // Shadow stays on the platform plane
      cube.shadow.style.transform = `
  translate3d(
    ${x.toFixed(2)}px,
    -1px,
    ${z.toFixed(2)}px
  )
  rotateX(90deg)
  scale(${shadowScale.toFixed(3)})
`;

      cube.shadow.style.opacity =
        shadowOpacity.toFixed(3);

      cube.el.classList.toggle('is-in-place', t >= 0.997);
    });
  }

  function scheduleFrame() {
    if (!host || document.hidden || frameId !== null) return;
    frameId = requestAnimationFrame(renderFrame);
  }

  function renderFrame(now) {
    frameId = null;
    if (document.hidden) return;

    const dt = previousFrameTime
      ? Math.min((now - previousFrameTime) / 1000, 0.05)
      : 1 / 60;
    previousFrameTime = now;

    const scrollGoal = targetProgress();
    const scrollAlpha = reducedMotion.matches
      ? 1
      : 1 - Math.exp(-dt / FLOAT_SETTINGS.scrollResponse);
    smoothProgress += (scrollGoal - smoothProgress) * scrollAlpha;
    if (Math.abs(scrollGoal - smoothProgress) < 0.00075) {
      smoothProgress = scrollGoal;
    }

    const ambientGoal = reducedMotion.matches ? 0 : floatTarget;
    const ambientAlpha = 1 - Math.exp(-dt / FLOAT_SETTINGS.transitionTime);
    floatStrength += (ambientGoal - floatStrength) * ambientAlpha;
    if (Math.abs(ambientGoal - floatStrength) < 0.001) {
      floatStrength = ambientGoal;
    }

    applyTheme(smoothProgress);
    renderCubes(smoothProgress, now, floatStrength);

    const scrollChanging = Math.abs(scrollGoal - smoothProgress) > 0.00075;
    const floatChanging = Math.abs(ambientGoal - floatStrength) > 0.001;
    const floating = !reducedMotion.matches && floatStrength > 0.001;

    // Sleep while stationary rather than wasting frames.
    if (scrollChanging || floatChanging || floating) scheduleFrame();
  }

  function beginIdleAfterDelay() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      idleTimer = null;
      floatTarget = 1;
      scheduleFrame();
    }, FLOAT_SETTINGS.idleDelay);
  }

  function onActivity() {
    floatTarget = 0;
    beginIdleAfterDelay();
    scheduleFrame();
  }

  function onLeavePage() {
    clearTimeout(idleTimer);
    idleTimer = null;
    floatTarget = 1;
    scheduleFrame();
  }

  if (host) {
    // Pointer stationary for 4 s => float resumes, even if still inside body.
    document.addEventListener('pointermove', onActivity, { passive: true });
    document.addEventListener('pointerdown', onActivity, { passive: true });
    document.documentElement.addEventListener('pointerenter', onActivity);
    document.documentElement.addEventListener('pointerleave', onLeavePage);
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('wheel', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('resize', scheduleFrame);
    reducedMotion.addEventListener?.('change', scheduleFrame);

    document.addEventListener('visibilitychange', () => {
      previousFrameTime = 0;
      if (!document.hidden) scheduleFrame();
    });

    // Render immediately before first animation frame. Float starts on load.
    applyTheme(smoothProgress);
    renderCubes(smoothProgress, performance.now(), 0);
    scheduleFrame();
  }

  // -----------------------------------------------------------------------
  // Transparent header fade: affects chapter content ONLY, never background.
  // Uses your current HTML: .header, .chapter-copy, .chapter-center.
  // -----------------------------------------------------------------------
  const header = document.querySelector('.header');
  const chapterContents = [...document.querySelectorAll('.chapter')]
    .map(chapter => chapter.querySelector('.chapter-copy') ||
      chapter.querySelector('.chapter-center'))
    .filter(Boolean);

  const HEADER_FADE_PX = 16;
  let maskFrame = null;

  function updateChapterMasks() {
    maskFrame = null;
    if (!header) return;

    const headerBottom = header.getBoundingClientRect().bottom;
    chapterContents.forEach(element => {
      const rect = element.getBoundingClientRect();
      const cutoff = Math.max(0, Math.min(rect.height, headerBottom - rect.top));

      if (cutoff <= 0) {
        element.style.maskImage = 'none';
        element.style.webkitMaskImage = 'none';
        return;
      }

      const fadeTo = Math.min(rect.height, cutoff + HEADER_FADE_PX);
      const mask = `linear-gradient(to bottom, transparent 0px, transparent ${cutoff}px, black ${fadeTo}px)`;
      element.style.maskImage = mask;
      element.style.webkitMaskImage = mask;
    });
  }

  function scheduleChapterMask() {
    if (maskFrame === null) {
      maskFrame = requestAnimationFrame(updateChapterMasks);
    }
  }

  if (header && chapterContents.length) {
    window.addEventListener('scroll', scheduleChapterMask, { passive: true });
    window.addEventListener('resize', scheduleChapterMask);
    updateChapterMasks();
  }
})();
