/* ============================================
   QUALIMATIC — Salle de projection (page de livraison)

   Le scroll pilote le plan-séquence façade → hall → salle → écran.
   La scène (images + repères suivis) est commune à tous les couples :
   chaque page client ne fournit que sa configuration (window.QM_SEANCE).

   Ce qui est privé (lien du film, fichiers, mot personnel) est chiffré
   dans cfg.coffre (AES-GCM, clé dérivée du code d'accès) : sans le code,
   ces informations sont illisibles, même en lisant le code de la page.
   Le coffre se fabrique avec outils/cinema/nouvelle-seance.html.
   ============================================ */

(function () {
  'use strict';

  const cfg = window.QM_SEANCE || {};
  const lang = cfg.lang === 'en' ? 'en' : 'fr';

  const T = {
    fr: {
      presente: 'Qualimatic Production présente',
      defiler: 'Faites défiler pour entrer',
      skip: 'Aller au film',
      installez: 'Installez-vous…',
      privee: 'Séance privée',
      lancer: 'Lancer la séance',
      unFilmDe: 'un film de',
      tourner: 'Tournez votre téléphone pour le plein écran',
      code: 'Votre code d’accès',
      entrer: 'Entrer dans la salle',
      verif: 'Ouverture…',
      erreur: 'Ce code ne correspond pas. Vérifiez-le et réessayez.',
      aide: 'Le code vous a été envoyé avec le lien de votre séance.',
      toutes: 'Toutes les séances',
      toutesUrl: '../../votre-seance.html',
      mot: ['Un mot', 'pour vous'],
      fichiers: ['Vos', 'fichiers'],
      fichiersIntro: 'Téléchargez-les dès maintenant et gardez-en deux copies : une sur votre ordinateur, une sur un disque externe.',
      bientot: 'Bientôt disponible',
      telecharger: 'Télécharger',
      affiche: 'L’affiche',
      afficheDetail: 'Haute définition, prête à imprimer',
      partager: ['Partager', 'la séance'],
      partagerTexte: 'Envoyez ce lien et votre code à vos proches : ils entreront dans la même salle que vous.',
      copier: 'Copier le lien',
      copie: 'Lien copié',
      apres: ['Et', 'maintenant'],
      apresTexte: 'Si le film vous a touchés, quelques mots de votre part comptent beaucoup : ils aident d’autres couples à me trouver.',
      avis: 'Laisser un avis',
      slogan: 'Discret derrière l’objectif. Présent dans chaque image.',
      site: 'https://www.qualimaticproduction.fr/'
    },
    en: {
      presente: 'Qualimatic Production presents',
      defiler: 'Scroll to step inside',
      skip: 'Go to the film',
      installez: 'Take your seat…',
      privee: 'Private screening',
      lancer: 'Start the screening',
      unFilmDe: 'a film by',
      tourner: 'Turn your phone for full screen',
      code: 'Your access code',
      entrer: 'Enter the theatre',
      verif: 'Opening…',
      erreur: 'This code doesn’t match. Please check it and try again.',
      aide: 'Your code was sent to you with the link to your screening.',
      toutes: 'All screenings',
      toutesUrl: '../../en/your-screening.html',
      mot: ['A few words', 'for you'],
      fichiers: ['Your', 'files'],
      fichiersIntro: 'Download them now and keep two copies: one on your computer, one on an external drive.',
      bientot: 'Coming soon',
      telecharger: 'Download',
      affiche: 'The poster',
      afficheDetail: 'High resolution, ready to print',
      partager: ['Share', 'the screening'],
      partagerTexte: 'Send this link and your code to your loved ones: they will step into the same theatre.',
      copier: 'Copy the link',
      copie: 'Link copied',
      apres: ['And', 'now'],
      apresTexte: 'If the film moved you, a few words from you mean a lot: they help other couples find me.',
      avis: 'Leave a review',
      slogan: 'Discreet behind the lens. Present in every frame.',
      site: 'https://www.qualimaticproduction.fr/en/'
    }
  }[lang];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  // « Les Vibiches » → « Les <em>Vibiches</em> » : le dernier mot en italique, signature de la marque
  const accent = s => {
    const words = String(s || '').trim().split(/\s+/);
    if (words.length < 2) return `<em>${esc(s)}</em>`;
    const last = words.pop();
    return `${esc(words.join(' '))} <em>${esc(last)}</em>`;
  };

  /* ---------- Construction de la page ---------- */

  const root = document.querySelector('[data-seance]') || document.body;
  const locked = !!cfg.coffre;

  root.insertAdjacentHTML('beforeend', `
    <a class="cinema-skip is-hidden" href="#seance">${T.skip}</a>
    <section class="cinema-track" data-cinema aria-label="${esc(cfg.titre)}">
      <div class="cinema-stage">
        <canvas aria-hidden="true"></canvas>
        <div class="cinema-intro">
          <div class="cinema-intro__title">
            <p class="cinema-intro__eyebrow">${T.presente}</p>
            <h1>${accent(cfg.titre)}</h1>
            ${cfg.sousTitre ? `<p>${esc(cfg.sousTitre)}</p>` : ''}
          </div>
        </div>
        <p class="cinema-hint">${T.defiler}</p>
        <p class="cinema-caption" data-caption data-from="8.4" data-to="10.4">${T.installez}</p>
        <div class="cinema-screen" id="seance">
          <div class="cinema-card">
            <p class="cinema-card__eyebrow">${T.privee}</p>
            <h2 class="cinema-card__title">${accent(cfg.titre)}</h2>
            <button class="cinema-play" type="button">
              <span class="cinema-play__disc"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0 10 6 0 12z"/></svg></span>
              <span>${T.lancer}</span>
            </button>
            ${cfg.realisateur ? `<p class="cinema-card__credit">${T.unFilmDe} ${esc(cfg.realisateur)}</p>` : ''}
          </div>
          <div class="cinema-player"></div>
        </div>
        <p class="cinema-rotate">${T.tourner}</p>
        <div class="cinema-loader" aria-hidden="true"></div>
      </div>
    </section>
    ${locked ? `
    <div class="guichet" role="dialog" aria-modal="true" aria-labelledby="guichet-titre">
      <form class="guichet__ticket" novalidate>
        <p class="guichet__eyebrow">${T.privee}</p>
        <h2 class="guichet__title" id="guichet-titre">${accent(cfg.titre)}</h2>
        ${cfg.sousTitre ? `<p class="guichet__sub">${esc(cfg.sousTitre)}</p>` : ''}
        <label class="guichet__label" for="guichet-code">${T.code}</label>
        <input class="guichet__input" id="guichet-code" name="code" type="text" inputmode="text"
               autocomplete="off" autocapitalize="characters" spellcheck="false" required />
        <p class="guichet__error" role="alert" aria-live="polite"></p>
        <button class="guichet__btn" type="submit">${T.entrer}</button>
        <p class="guichet__help">${T.aide}</p>
      </form>
      <a class="guichet__back" href="${T.toutesUrl}">← ${T.toutes}</a>
    </div>` : ''}
  `);

  if (locked) document.documentElement.classList.add('is-locked');

  const track = document.querySelector('[data-cinema]');
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

  // Contenu privé : rempli une fois le coffre ouvert (ou directement s'il n'y en a pas)
  let secret = locked ? null : (cfg.prive || {});

  function renderAfter() {
    const s = secret || {};
    const mot = s.mot || {};
    const files = (s.fichiers || []).slice();
    if (cfg.afficheHD) files.push({ titre: T.affiche, detail: T.afficheDetail, lien: cfg.afficheHD, telecharger: true });

    const fileRows = files.map(f => `
      <li>
        <div><strong>${esc(f.titre)}</strong>${f.detail ? `<span>${esc(f.detail)}</span>` : ''}</div>
        ${f.lien
          ? `<a class="btn" href="${esc(f.lien)}" ${f.telecharger ? `download` : 'target="_blank" rel="noopener"'}>${T.telecharger}</a>`
          : `<span class="btn is-pending" aria-disabled="true">${T.bientot}</span>`}
      </li>`).join('');

    const html = `
      <section class="after">
        <div class="after__inner">
          ${mot.paragraphes && mot.paragraphes.length ? `
          <article class="block letter fade-in">
            <h2><span class="asterisk">✻</span>${esc(T.mot[0])} <em>${esc(T.mot[1])}</em></h2>
            ${mot.salutation ? `<p>${esc(mot.salutation)}</p>` : ''}
            ${mot.paragraphes.map(p => `<p>${esc(p)}</p>`).join('')}
            ${mot.signature ? `<p class="signature">${esc(mot.signature)}</p>` : ''}
          </article>` : ''}
          ${files.length ? `
          <section class="block fade-in">
            <h2><span class="asterisk">✻</span>${esc(T.fichiers[0])} <em>${esc(T.fichiers[1])}</em></h2>
            <p>${T.fichiersIntro}</p>
            <ul class="files">${fileRows}</ul>
          </section>` : ''}
          <section class="block fade-in">
            <h2><span class="asterisk">✻</span>${esc(T.partager[0])} <em>${esc(T.partager[1])}</em></h2>
            <p>${T.partagerTexte}</p>
            <div class="actions"><button class="btn" type="button" data-copy>${T.copier}</button></div>
          </section>
          <section class="block fade-in">
            <h2><span class="asterisk">✻</span>${esc(T.apres[0])} <em>${esc(T.apres[1])}</em></h2>
            <p>${T.apresTexte}</p>
            <div class="actions">
              ${s.avis ? `<a class="btn" href="${esc(s.avis)}" target="_blank" rel="noopener">${T.avis}</a>` : ''}
              <a class="btn" href="${T.site}" target="_blank" rel="noopener">Qualimatic Production</a>
            </div>
          </section>
        </div>
      </section>
      <footer class="foot">
        <a href="${T.site}">Qualimatic Production</a>
        <p>${T.slogan}</p>
        <a class="foot__all" href="${T.toutesUrl}">${T.toutes}</a>
      </footer>`;
    track.insertAdjacentHTML('afterend', html);

    const copy = document.querySelector('[data-copy]');
    copy.addEventListener('click', () => {
      const url = location.href.split('#')[0];
      const done = () => {
        copy.textContent = T.copie;
        setTimeout(() => { copy.textContent = T.copier; }, 2200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => window.prompt(T.copier, url));
      else window.prompt(T.copier, url);
    });

    const els = document.querySelectorAll('.fade-in');
    if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-visible')); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Le guichet : code d'accès ---------- */

  const MEMO = 'qm_seance_' + (cfg.slug || location.pathname);

  // Majuscules, accents, espaces et tirets ne comptent pas : « Rideau-5184 » = « rideau 5184 »
  const normalize = code => String(code).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

  async function openCoffre(coffre, code) {
    const b64 = coffre.slice(coffre.indexOf(':') + 1);
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt = bytes.slice(0, 16), iv = bytes.slice(16, 28), data = bytes.slice(28);
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalize(code)), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  function unlock(data, animate) {
    secret = data;
    renderAfter();
    document.documentElement.classList.remove('is-locked');
    const g = document.querySelector('.guichet');
    if (g) {
      if (animate) { g.classList.add('is-open'); setTimeout(() => g.remove(), 900); }
      else g.remove();
    }
    marqueeStart = performance.now();
    if (skip) skip.classList.remove('is-hidden');
  }

  if (locked) {
    const form = document.querySelector('.guichet__ticket');
    const input = form.querySelector('input');
    const error = form.querySelector('.guichet__error');
    const btn = form.querySelector('button');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!normalize(input.value)) { input.focus(); return; }
      btn.disabled = true; btn.textContent = T.verif; error.textContent = '';
      try {
        const data = await openCoffre(cfg.coffre, input.value);
        try { localStorage.setItem(MEMO, input.value); } catch (err) { /* navigation privée */ }
        unlock(data, true);
      } catch (err) {
        error.textContent = T.erreur;
        form.classList.remove('is-shaking'); void form.offsetWidth; form.classList.add('is-shaking');
        btn.disabled = false; btn.textContent = T.entrer;
        input.select();
      }
    });

    // Code déjà saisi sur cet appareil : on entre directement
    let saved = null;
    try { saved = localStorage.getItem(MEMO); } catch (err) { /* navigation privée */ }
    if (saved) {
      openCoffre(cfg.coffre, saved).then(d => unlock(d, false), () => {
        try { localStorage.removeItem(MEMO); } catch (err) { /* navigation privée */ }
        input.focus();
      });
    } else {
      setTimeout(() => input.focus({ preventScroll: true }), 600);
    }
  } else {
    renderAfter();
    if (skip) skip.classList.remove('is-hidden');
  }

  /* ---------- Moteur de la salle ---------- */

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
  let marqueeStart = locked ? Infinity : 0;
  let playing = false;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothstep = t => t * t * (3 - 2 * t);

  const sceneUrl = new URL(cfg.scene || '../cinema/scene.json', location.href);

  fetch(sceneUrl).then(r => r.json()).then(s => {
    scene = s; W = s.w; H = s.h; count = s.count;
    resize();
    loadFrames();
  });

  if (cfg.affiche) {
    const img = new Image();
    img.onload = () => { poster = img; drawn = -1; };
    img.src = cfg.affiche;
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
          if (i === 0) {
            if (!locked && !marqueeStart) marqueeStart = performance.now();
            stage.classList.add('is-ready');
          }
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

  /* Scroll → image */

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

  /* Cadrage : sur un écran large la vidéo couvre tout. Sur un écran étroit
     (téléphone), on garde visible la zone utile (roi) de chaque moment,
     quitte à laisser des marges au-dessus et en dessous. */

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

  /* Dessin */

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
    const lines = cfg.marquise;
    if (!r || !lines || !lines.length) return;
    const total = lines.join('').length;
    const shown = reduceMotion && isFinite(marqueeStart) ? total
      : Math.floor(clamp((now - marqueeStart - 350) / 55, 0, total));
    if (!shown) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = '#231816';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const rowH = r.h / lines.length;
    let budget = shown;
    lines.forEach((line, n) => {
      let size = rowH * 0.62;
      ctx.font = `600 ${size}px "Playfair Display", Georgia, serif`;
      if ('letterSpacing' in ctx) ctx.letterSpacing = size * 0.16 + 'px';
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

    placeScreen(tracked('screen', f, cam));
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
      el.style.opacity = clamp(Math.min(sec - from, to - sec) / 0.6, 0, 1);
    });
    if (skip && !document.documentElement.classList.contains('is-locked')) skip.classList.toggle('is-hidden', p > 0.9);
  }

  /* Boucle */

  let lastP = -1;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!scene) return;
    const p = scrollProgress();
    target = frameForProgress(p);
    const diff = target - current;
    current = reduceMotion || Math.abs(diff) < 0.01 ? target : current + diff * 0.16;
    const marqueeAnimating = isFinite(marqueeStart) && now - marqueeStart < 3500;
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

  /* Aller directement au film */

  function goToScreen() {
    const { top, len } = trackRange();
    window.scrollTo({ top: top + len, behavior: 'instant' });
    if (scene) current = count - 1;
  }

  if (skip) skip.addEventListener('click', e => { e.preventDefault(); goToScreen(); });

  /* Lecteur : chargé seulement au clic, rien n'est envoyé à l'hébergeur
     vidéo tant que le couple n'a pas lancé la séance. */

  function embedUrl() {
    const film = (secret && secret.film) || {};
    if (film.vimeo) return `https://player.vimeo.com/video/${encodeURIComponent(film.vimeo)}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
    if (film.bunny) return `${film.bunny}${film.bunny.includes('?') ? '&' : '?'}autoplay=true&preload=true`;
    if (film.youtube) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.youtube)}?autoplay=1&rel=0&playsinline=1`;
    return null;
  }

  playBtn.addEventListener('click', () => {
    const src = embedUrl();
    if (!src) return;
    if (scene && current < count - 2) goToScreen();
    const frame = document.createElement('iframe');
    frame.src = src;
    frame.title = cfg.titre || 'Film';
    frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    frame.allowFullscreen = true;
    player.appendChild(frame);
    playing = true;
    screenEl.classList.add('is-playing');
    try { localStorage.setItem(MEMO + '_vu', '1'); } catch (e) { /* navigation privée */ }
  });

  // Visite suivante : le lien « Aller au film » est mis en avant
  try {
    if (localStorage.getItem(MEMO + '_vu')) skip.classList.add('is-returning');
  } catch (e) { /* navigation privée */ }
})();
