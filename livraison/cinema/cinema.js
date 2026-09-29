/* ============================================
   QUALIMATIC — Salle de projection (page de livraison)
   Le scroll pilote le plan-séquence façade → hall → salle → écran.
   La scène (images + repères suivis) est commune à tous les couples ;
   chaque page client ne fournit que sa configuration (window.QM_CINEMA).
   ============================================ */

(function () {
  'use strict';

  const cfg = window.QM_CINEMA || {};
  const track = document.querySelector('[data-cinema]');
  if (!track) return;

  const stage = track.querySelector('.cinema-stage');
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const intro = stage.querySelector('.cinema-intro');
  const hint = stage.querySelector('.cinema-hint');
  const screenEl = stage.querySelector('.cinema-screen');
  const playBtn = stage.querySelector('.cinema-play');
  const player = stage.querySelector('.cinema-player');
  const loader = stage.querySelector('.cinema-loader');
  const captions = Array.from(stage.querySelectorAll('[data-caption]'));
  const skip = document.querySelector('.cinema-skip');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = '#0d0a09';
  const HOLD_IN = 0.03;   // part du scroll où l'on reste devant la façade
  const HOLD_OUT = 0.07;  // part du scroll où l'on reste face à l'écran

  let scene, W, H, count;
  const frames = [];
  let loaded = 0;
  let poster = null;
  let vw = 0, vh = 0, dpr = 1;
  let target = 0, current = 0, drawn = -1;
  let marqueeStart = 0;
  let playing = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothstep = t => t * t * (3 - 2 * t);

  /* ---------- Chargement ---------- */

  const sceneUrl = new URL(cfg.scene || '../cinema/scene.json', location.href);

  fetch(sceneUrl).then(r => r.json()).then(s => {
    scene = s; W = s.w; H = s.h; count = s.count;
    resize();
    loadFrames();
  });

  if (cfg.poster) {
    const img = new Image();
    img.onload = () => { poster = img; drawn = -1; };
    img.src = cfg.poster;
  }

  // Les polices doivent être prêtes avant d'écrire la marquise sur le canvas
  if (document.fonts && document.fonts.load) {
    document.fonts.load('600 40px "Playfair Display"').then(() => { drawn = -1; });
  }

  function frameUrl(i) {
    return new URL(scene.frames + String(i).padStart(scene.pad, '0') + '.' + scene.ext, sceneUrl).href;
  }

  // Ordre progressif : quelques images réparties sur toute la séquence d'abord,
  // puis on densifie. Le scroll reste possible pendant le chargement.
  function loadOrder() {
    const seen = new Set(), order = [];
    [32, 16, 8, 4, 2, 1].forEach(step => {
      for (let i = 0; i < count; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    });
    if (!seen.has(count - 1)) order.push(count - 1);
    return order;
  }

  function loadFrames() {
    const order = loadOrder();
    let next = 0;
    const pump = () => {
      if (next >= order.length) return;
      const i = order[next++];
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const done = () => {
          frames[i] = img; loaded++;
          if (i === 0) { marqueeStart = performance.now(); stage.classList.add('is-ready'); }
          if (loader) loader.style.transform = `scaleX(${loaded / count})`;
          if (loaded === count) stage.classList.add('is-loaded');
          drawn = -1;
          pump();
        };
        img.decode ? img.decode().then(done, done) : done();
      };
      img.onerror = pump;
      img.src = frameUrl(i);
    };
    for (let k = 0; k < 6; k++) pump();
  }

  function nearestFrame(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < count; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  /* ---------- Scroll → image ---------- */

  function trackRange() {
    const top = track.getBoundingClientRect().top + window.scrollY;
    return { top, len: track.offsetHeight - stage.offsetHeight };
  }

  function scrollProgress() {
    const { top, len } = trackRange();
    return len > 0 ? clamp((window.scrollY - top) / len, 0, 1) : 0;
  }

  function frameForProgress(p) {
    return clamp((p - HOLD_IN) / (1 - HOLD_IN - HOLD_OUT), 0, 1) * (count - 1);
  }

  /* ---------- Cadrage ---------- */

  // Sur un écran large la vidéo couvre tout. Sur un écran étroit (téléphone),
  // on garde visible la zone utile (roi) de chaque moment, quitte à laisser
  // du noir au-dessus et en dessous, comme un format cinéma.
  function roiAt(f) {
    const k = scene.roi;
    if (f <= k[0][0]) return k[0].slice(1);
    for (let j = 1; j < k.length; j++) {
      if (f <= k[j][0]) {
        const a = k[j - 1], b = k[j];
        const t = smoothstep((f - a[0]) / (b[0] - a[0]));
        return [1, 2, 3, 4].map(n => a[n] + (b[n] - a[n]) * t);
      }
    }
    return k[k.length - 1].slice(1);
  }

  function camera(f) {
    const r = roiAt(f);
    const cover = Math.max(vw / W, vh / H);
    const s = Math.min(cover, vw / (r[2] * W), vh / (r[3] * H));
    const dw = W * s, dh = H * s;
    let ox = vw / 2 - (r[0] + r[2] / 2) * dw;
    let oy = vh / 2 - (r[1] + r[3] / 2) * dh;
    ox = dw >= vw ? clamp(ox, vw - dw, 0) : (vw - dw) / 2;
    oy = dh >= vh ? clamp(oy, vh - dh, 0) : (vh - dh) * 0.46;
    return { s, ox, oy, dw, dh };
  }

  // Rectangle suivi (vitrine, marquise, écran) à l'image f, en pixels écran
  function tracked(name, f, cam) {
    const t = scene.tracks[name];
    if (!t) return null;
    const i = f - t.from;
    if (i < 0 || i > t.rects.length - 1) return null;
    const i0 = Math.floor(i), i1 = Math.min(i0 + 1, t.rects.length - 1), u = i - i0;
    const a = t.rects[i0], b = t.rects[i1];
    const r = [0, 1, 2, 3].map(n => a[n] + (b[n] - a[n]) * u);
    return {
      x: cam.ox + r[0] * cam.dw, y: cam.oy + r[1] * cam.dh,
      w: r[2] * cam.dw, h: r[3] * cam.dh,
      life: i / (t.rects.length - 1)
    };
  }

  /* ---------- Dessin ---------- */

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = stage.clientWidth; vh = stage.clientHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    drawn = -1;
  }

  function drawPoster(r) {
    if (!poster || !r) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    const pr = poster.width / poster.height, rr = r.w / r.h;
    const pw = pr > rr ? r.h * pr : r.w, ph = pr > rr ? r.h : r.w / pr;
    ctx.drawImage(poster, r.x + (r.w - pw) / 2, r.y + (r.h - ph) / 2, pw, ph);
    // Reflet de la vitre + halo du rétroéclairage
    const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, 'rgba(255,244,228,0.16)');
    g.addColorStop(0.45, 'rgba(255,244,228,0)');
    g.addColorStop(1, 'rgba(20,10,8,0.18)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  function drawMarquee(r, now) {
    const lines = cfg.marquee;
    if (!r || !lines || !lines.length) return;
    const total = lines.join('').length;
    const shown = reduceMotion ? total : Math.floor(clamp((now - marqueeStart - 350) / 55, 0, total));
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = '#231816';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const rowH = r.h / lines.length;
    let budget = shown;
    lines.forEach((line, n) => {
      let size = rowH * 0.62;
      ctx.font = `600 ${size}px "Playfair Display", Georgia, serif`;
      const spacing = size * 0.16;
      if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
      const wMax = r.w * 0.86;
      const measured = ctx.measureText(line).width;
      if (measured > wMax) {
        size *= wMax / measured;
        ctx.font = `600 ${size}px "Playfair Display", Georgia, serif`;
        if ('letterSpacing' in ctx) ctx.letterSpacing = size * 0.16 + 'px';
      }
      const text = line.slice(0, clamp(budget, 0, line.length));
      budget -= line.length;
      // Les lettres se posent une à une, alignées comme sur un vrai tableau
      const full = ctx.measureText(line).width;
      ctx.textAlign = 'left';
      ctx.fillText(text, r.x + (r.w - full) / 2, r.y + rowH * (n + 0.54));
    });
    ctx.restore();
  }

  // Halo d'ambiance autour de l'image quand elle ne remplit pas l'écran :
  // l'image réduite à quelques pixels puis agrandie donne un flou très doux
  const ambient = document.createElement('canvas');
  ambient.width = 32; ambient.height = 18;
  const actx = ambient.getContext('2d');

  function drawAmbient(img, strength) {
    actx.drawImage(img, 0, 0, ambient.width, ambient.height);
    const s = Math.max(vw / ambient.width, vh / ambient.height) * 1.15;
    const w = ambient.width * s, h = ambient.height * s;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = strength;
    ctx.drawImage(ambient, (vw - w) / 2, (vh - h) / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(13,10,9,0.45)';
    ctx.fillRect(0, 0, vw, vh);
  }

  function draw(f, now) {
    const cam = camera(f);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, vw, vh);

    const i0 = Math.floor(f), u = f - i0;
    const a = nearestFrame(i0);
    const letterbox = cam.dh < vh - 1;
    // Plus discret face à l'écran blanc, pour ne pas délaver les marges
    if (a && letterbox) drawAmbient(a, f >= scene.tracks.screen.from ? 0.1 : 0.55);
    if (a) ctx.drawImage(a, cam.ox, cam.oy, cam.dw, cam.dh);
    // Fondu entre deux images voisines : le mouvement reste fluide à 12 i/s
    if (u > 0.02 && i0 + 1 < count && frames[i0 + 1]) {
      ctx.globalAlpha = u;
      ctx.drawImage(frames[i0 + 1], cam.ox, cam.oy, cam.dw, cam.dh);
      ctx.globalAlpha = 1;
    }

    // Affiches et marquise restent dans l'image, jamais dans les marges
    ctx.save();
    ctx.beginPath(); ctx.rect(cam.ox, cam.oy, cam.dw, cam.dh); ctx.clip();
    drawPoster(tracked('posterL', f, cam));
    drawPoster(tracked('posterR', f, cam));
    drawMarquee(tracked('marquee', f, cam), now);
    ctx.restore();

    // Bords fondus quand la vidéo ne remplit pas la hauteur (téléphone)
    if (letterbox) {
      const fade = Math.min(cam.dh * 0.18, 90);
      let g = ctx.createLinearGradient(0, cam.oy, 0, cam.oy + fade);
      g.addColorStop(0, 'rgba(13,10,9,0.78)'); g.addColorStop(1, 'rgba(13,10,9,0)');
      ctx.fillStyle = g; ctx.fillRect(0, cam.oy - 1, vw, fade + 1);
      g = ctx.createLinearGradient(0, cam.oy + cam.dh - fade, 0, cam.oy + cam.dh);
      g.addColorStop(0, 'rgba(13,10,9,0)'); g.addColorStop(1, 'rgba(13,10,9,0.78)');
      ctx.fillStyle = g; ctx.fillRect(0, cam.oy + cam.dh - fade, vw, fade + 1);
    }

    placeScreen(tracked('screen', f, cam), cam);
  }

  // Le carton « Lancer la séance » et le lecteur suivent l'écran pendant le zoom
  function placeScreen(r) {
    if (!r) {
      screenEl.style.opacity = 0;
      screenEl.style.visibility = 'hidden';
      screenEl.classList.remove('is-interactive');
      stage.classList.remove('is-at-screen');
      return;
    }
    const k = scene.tracks.screen.rects.length - 1;
    const alpha = playing ? 1 : clamp((r.life * k - 4) / 14, 0, 1);
    screenEl.style.visibility = 'visible';
    screenEl.style.opacity = alpha;
    screenEl.style.left = r.x + 'px';
    screenEl.style.top = r.y + 'px';
    screenEl.style.width = r.w + 'px';
    screenEl.style.height = r.h + 'px';
    screenEl.style.setProperty('--u', Math.min(r.w / 900, r.h / 470).toFixed(4));
    screenEl.classList.toggle('is-interactive', alpha > 0.6);
    stage.classList.toggle('is-at-screen', alpha > 0.6);
  }

  function updateOverlays(p, f) {
    const introOut = clamp(1 - p / HOLD_IN, 0, 1);
    if (intro) intro.style.opacity = introOut;
    if (hint) hint.style.opacity = introOut;
    const sec = f / scene.fps;
    captions.forEach(el => {
      const from = parseFloat(el.dataset.from), to = parseFloat(el.dataset.to);
      const edge = 0.6;
      const o = clamp(Math.min(sec - from, to - sec) / edge, 0, 1);
      el.style.opacity = o;
    });
    if (skip) skip.classList.toggle('is-hidden', p > 0.9);
  }

  /* ---------- Boucle ---------- */

  let lastP = -1;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!scene) return;
    const p = scrollProgress();
    target = frameForProgress(p);
    const diff = target - current;
    current = reduceMotion || Math.abs(diff) < 0.01 ? target : current + diff * 0.16;
    const marqueeAnimating = now - marqueeStart < 3500;
    if (current !== drawn || marqueeAnimating || p !== lastP) {
      draw(current, now);
      updateOverlays(p, current);
      drawn = current; lastP = p;
    }
  }
  requestAnimationFrame(loop);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (scene) resize(); }, 120);
  });

  /* ---------- Aller directement au film ---------- */

  function goToScreen() {
    const { top, len } = trackRange();
    window.scrollTo({ top: top + len, behavior: 'instant' });
    if (scene) current = count - 1;
  }

  if (skip) skip.addEventListener('click', e => { e.preventDefault(); goToScreen(); });

  /* ---------- Lecteur ---------- */

  // Le lecteur n'est chargé qu'au clic : rien n'est envoyé à l'hébergeur
  // vidéo tant que le couple n'a pas lancé la séance.
  function embedUrl() {
    if (cfg.vimeo) return `https://player.vimeo.com/video/${cfg.vimeo}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
    if (cfg.bunny) return `${cfg.bunny}${cfg.bunny.includes('?') ? '&' : '?'}autoplay=true&preload=true`;
    if (cfg.youtube) return `https://www.youtube-nocookie.com/embed/${cfg.youtube}?autoplay=1&rel=0&playsinline=1`;
    return null;
  }

  if (playBtn) playBtn.addEventListener('click', () => {
    const src = embedUrl();
    if (!src) return;
    if (scene && current < count - 2) goToScreen();
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = cfg.title ? `Film — ${cfg.title}` : 'Film';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    player.appendChild(frame);
    playing = true;
    screenEl.classList.add('is-playing');
    try { localStorage.setItem('qm_cinema_vu_' + (cfg.slug || location.pathname), '1'); } catch (e) { /* navigation privée */ }
  });

  // Visite suivante : le lien « Aller au film » est mis en avant
  try {
    if (skip && localStorage.getItem('qm_cinema_vu_' + (cfg.slug || location.pathname))) skip.classList.add('is-returning');
  } catch (e) { /* navigation privée */ }
})();
