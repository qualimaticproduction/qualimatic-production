/* =====================================================================
   QUALIMATIC PRODUCTION · LA SALLE DE PROJECTION (livraison d'un film)

   Le défilement pilote le plan-séquence façade → hall → salle → écran.
   La scène (images + repères suivis) est la même pour tous les couples :
   chaque page ne fournit que sa configuration (window.QM_SEANCE).

   Ce qui est privé (lien du film, fichiers, mot personnel) est chiffré
   dans cfg.coffre (AES-GCM, clé dérivée du code d'accès par PBKDF2) :
   sans le code, ces informations restent illisibles, même en lisant le
   code de la page. Le coffre se fabrique avec outils/nouvelle-seance.html.
   ===================================================================== */

(function () {
  'use strict';

  var cfg = window.QM_SEANCE || {};
  var lang = cfg.lang === 'en' ? 'en' : 'fr';

  /* Le bouton « Laisser un avis » de toutes les séances. Pour envoyer le couple directement sur
     le formulaire d'avis, coller ici le lien de la fiche Google Business Profile
     (Google Business Profile, « Demander des avis », de la forme https://g.page/r/…/review).
     En attendant, le lien ouvre la fiche Google de Qualimatic Production. */
  var AVIS_GOOGLE = 'https://g.page/r/CSqpltxsOMflEBM/review';   // lien direct « laisser un avis » de la fiche Google (Charly, 17/11/2026)

  var T = {
    fr: {
      presente: 'présente',
      defiler: 'Faites défiler pour entrer',
      raccourci: 'Aller au film',
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
      toutes: 'Accès client',
      toutesUrl: '../../acces-client.html',
      mot: ['Un mot', 'pour vous'],
      fichiers: ['Vos', 'fichiers'],
      fichiersIntro: 'Téléchargez-les dès maintenant et gardez-en deux copies, l’une sur votre ordinateur, l’autre sur un disque externe.',
      bientot: 'Bientôt disponible',
      telecharger: 'Télécharger',
      affiche: 'L’affiche',
      afficheDetail: 'Haute définition, prête à imprimer',
      partager: ['Partager', 'la séance'],
      partagerTexte: 'Envoyez ce lien et votre code à vos proches. Ils entreront dans la même salle que vous.',
      copier: 'Copier le lien',
      copie: 'Lien copié',
      apres: ['Et', 'maintenant'],
      apresTexte: 'Si le film vous a touchés, quelques mots de votre part comptent beaucoup. Ils aident d’autres couples à me trouver.',
      avis: 'Laisser un avis sur Google',
      site: '../../index.html',
      siteNom: 'Retour au site'
    },
    en: {
      presente: 'presents',
      defiler: 'Scroll to step inside',
      raccourci: 'Go to the film',
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
      toutes: 'Client access',
      toutesUrl: '../../acces-client.html',
      mot: ['A few words', 'for you'],
      fichiers: ['Your', 'files'],
      fichiersIntro: 'Download them now and keep two copies, one on your computer, one on an external drive.',
      bientot: 'Coming soon',
      telecharger: 'Download',
      affiche: 'The poster',
      afficheDetail: 'High resolution, ready to print',
      partager: ['Share', 'the screening'],
      partagerTexte: 'Send this link and your code to your loved ones. They will step into the same theatre.',
      copier: 'Copy the link',
      copie: 'Link copied',
      apres: ['And', 'now'],
      apresTexte: 'If the film moved you, a few words from you mean a lot. They help other couples find me.',
      avis: 'Leave a Google review',
      site: '../../index.html',
      siteNom: 'Back to the website'
    }
  }[lang];

  function ech(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function duo(caps, script) { return '<span class="duo__caps">' + ech(caps) + '</span>' + (script ? '<span class="duo__script">' + ech(script) + '</span>' : ''); }

  var racine = new URL(cfg.racine || '../', location.href);          // le dossier seances/
  var sceneUrl = new URL(cfg.scene || 'scene/scene.json', racine);
  var logoUrl = new URL('../assets/logo-blanc.png', racine).href;

  /* ---------- Construction de la page ---------- */

  var hote = document.querySelector('[data-seance]') || document.body;
  var ferme = !!cfg.coffre;

  hote.insertAdjacentHTML('beforeend',
    '<a class="raccourci etiquette est-cache" href="#seance">' + T.raccourci + '</a>' +
    '<section class="salle" data-salle aria-label="' + ech(cfg.titre) + '">' +
      '<div class="salle__scene">' +
        '<canvas aria-hidden="true"></canvas>' +
        '<div class="affiche"><div class="affiche__bloc">' +
          '<p class="affiche__presente etiquette"><img src="' + logoUrl + '" alt="Qualimatic Production" width="3400" height="987">' + T.presente + '</p>' +
          '<h1>' + duo(cfg.titre, cfg.sousTitre) + '</h1>' +
        '</div></div>' +
        '<p class="salle__defiler etiquette">' + T.defiler + '</p>' +
        '<p class="salle__legende" data-legende data-de="13.4" data-a="16.6">' + T.installez + '</p>' +
        '<div class="ecran" id="seance">' +
          '<div class="carton">' +
            '<p class="carton__sur">' + T.privee + '</p>' +
            '<h2>' + duo(cfg.titre, cfg.sousTitre) + '</h2>' +
            '<button class="carton__lancer" type="button"><span class="carton__disque"><svg viewBox="0 0 10 12" aria-hidden="true"><path d="M0 0 10 6 0 12z"/></svg></span><span>' + T.lancer + '</span></button>' +
            (cfg.realisateur ? '<p class="carton__de">' + T.unFilmDe + ' ' + ech(cfg.realisateur) + '</p>' : '') +
          '</div>' +
          '<div class="projection"></div>' +
        '</div>' +
        '<p class="salle__tourner etiquette">' + T.tourner + '</p>' +
        '<div class="salle__charge" aria-hidden="true"></div>' +
      '</div>' +
    '</section>' +
    (ferme ?
      '<div class="guichet" role="dialog" aria-modal="true" aria-labelledby="billet-titre">' +
        '<form class="billet" novalidate>' +
          '<p class="etiquette">' + T.privee + '</p>' +
          '<h2 id="billet-titre">' + duo(cfg.titre, cfg.sousTitre) + '</h2>' +
          '<label class="billet__champ" for="billet-code">' + T.code + '</label>' +
          '<input class="billet__code" id="billet-code" name="code" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" required>' +
          '<p class="billet__erreur" role="alert" aria-live="polite"></p>' +
          '<button class="billet__entrer" type="submit">' + T.entrer + '</button>' +
          '<p class="billet__aide">' + T.aide + '</p>' +
        '</form>' +
        '<a class="guichet__retour" href="' + T.toutesUrl + '">← ' + T.toutes + '</a>' +
      '</div>' : '')
  );

  if (ferme) document.documentElement.classList.add('est-ferme');

  var salle = document.querySelector('[data-salle]');
  var scn = salle.querySelector('.salle__scene');
  var canvas = scn.querySelector('canvas');
  var ctx = canvas.getContext('2d', { alpha: false });
  var affiche = scn.querySelector('.affiche');
  var defiler = scn.querySelector('.salle__defiler');
  var ecran = scn.querySelector('.ecran');
  var lancer = scn.querySelector('.carton__lancer');
  var projection = scn.querySelector('.projection');
  var charge = scn.querySelector('.salle__charge');
  var legendes = Array.prototype.slice.call(scn.querySelectorAll('[data-legende]'));
  var raccourci = document.querySelector('.raccourci');

  // Contenu privé : rempli une fois le coffre ouvert (ou tout de suite s'il n'y en a pas)
  var secret = ferme ? null : (cfg.prive || {});

  function ecrireApres() {
    var s = secret || {};
    var mot = s.mot || {};
    var fichiers = (s.fichiers || []).slice();
    if (cfg.afficheHD) fichiers.push({ titre: T.affiche, detail: T.afficheDetail, lien: cfg.afficheHD, telecharger: true });

    var lignes = fichiers.map(function (f) {
      return '<li><div><strong>' + ech(f.titre) + '</strong>' + (f.detail ? '<span>' + ech(f.detail) + '</span>' : '') + '</div>' +
        (f.lien
          ? '<a class="bouton" href="' + ech(f.lien) + '" ' + (f.telecharger ? 'download' : 'target="_blank" rel="noopener"') + '>' + T.telecharger + '</a>'
          : '<span class="bouton est-a-venir" aria-disabled="true">' + T.bientot + '</span>') + '</li>';
    }).join('');

    var html =
      '<section class="apres"><div class="apres__dedans">' +
        (mot.paragraphes && mot.paragraphes.length ?
          '<article class="bloc lettre vient"><h2>' + duo(T.mot[0], T.mot[1]) + '</h2>' +
            (mot.salutation ? '<p>' + ech(mot.salutation) + '</p>' : '') +
            mot.paragraphes.map(function (p) { return '<p>' + ech(p) + '</p>'; }).join('') +
            (mot.signature ? '<p class="lettre__signature">' + ech(mot.signature) + '</p>' : '') +
          '</article>' : '') +
        (fichiers.length ?
          '<section class="bloc vient"><h2>' + duo(T.fichiers[0], T.fichiers[1]) + '</h2><p>' + T.fichiersIntro + '</p><ul class="fichiers">' + lignes + '</ul></section>' : '') +
        '<section class="bloc vient"><h2>' + duo(T.partager[0], T.partager[1]) + '</h2><p>' + T.partagerTexte + '</p>' +
          '<div class="actions"><button class="bouton" type="button" data-copier>' + T.copier + '</button></div></section>' +
        '<section class="bloc vient"><h2>' + duo(T.apres[0], T.apres[1]) + '</h2><p>' + T.apresTexte + '</p><div class="actions">' +
          '<a class="bouton" href="' + ech(s.avis || cfg.avis || AVIS_GOOGLE) + '" target="_blank" rel="noopener">' + T.avis + '</a>' +
          '<a class="bouton" href="' + T.site + '">' + T.siteNom + '</a></div></section>' +
      '</div></section>' +
      '<footer class="bas"><a href="' + T.site + '"><img src="' + logoUrl + '" alt="Qualimatic Production" width="3400" height="987" loading="lazy"></a>' +
        '<a class="bas__toutes" href="' + T.toutesUrl + '">' + T.toutes + '</a></footer>';
    salle.insertAdjacentHTML('afterend', html);

    var copier = document.querySelector('[data-copier]');
    copier.addEventListener('click', function () {
      var url = location.href.split('#')[0];
      var fait = function () { copier.textContent = T.copie; setTimeout(function () { copier.textContent = T.copier; }, 2200); };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(fait, function () { window.prompt(T.copier, url); });
      else window.prompt(T.copier, url);
    });

    var els = document.querySelectorAll('.vient');
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(els, function (el) { el.classList.add('est-vu'); }); return; }
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('est-vu'); io.unobserve(e.target); } });
    }, { threshold: .15 });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }

  /* ---------- Le guichet : code d'accès ---------- */

  var MEMO = 'qm_seance_' + (cfg.slug || location.pathname);

  // Majuscules, accents, espaces et tirets ne comptent pas : « Rideau-5184 » = « rideau 5184 »
  function normaliser(code) { return String(code).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function ouvrirCoffre(coffre, code) {
    var b64 = coffre.slice(coffre.indexOf(':') + 1);
    var octets = Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); });
    var sel = octets.slice(0, 16), iv = octets.slice(16, 28), donnees = octets.slice(28);
    return crypto.subtle.importKey('raw', new TextEncoder().encode(normaliser(code)), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      })
      .then(function (cle) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, cle, donnees); })
      .then(function (clair) { return JSON.parse(new TextDecoder().decode(clair)); });
  }

  function deverrouiller(donnees, anime) {
    secret = donnees;
    ecrireApres();
    document.documentElement.classList.remove('est-ferme');
    var g = document.querySelector('.guichet');
    if (g) {
      if (anime) { g.classList.add('est-ouvert'); setTimeout(function () { g.remove(); }, 900); }
      else g.remove();
    }
    debutLettres = performance.now();
    if (raccourci) raccourci.classList.remove('est-cache');
  }

  var debutLettres = ferme ? Infinity : 0;   // moment où l'enseigne s'allume et où les lettres se posent

  if (ferme) {
    var billet = document.querySelector('.billet');
    var champ = billet.querySelector('input');
    var erreur = billet.querySelector('.billet__erreur');
    var bouton = billet.querySelector('button');

    billet.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!normaliser(champ.value)) { champ.focus(); return; }
      bouton.disabled = true; bouton.textContent = T.verif; erreur.textContent = '';
      ouvrirCoffre(cfg.coffre, champ.value).then(function (donnees) {
        try { localStorage.setItem(MEMO, champ.value); } catch (err) { /* navigation privée */ }
        deverrouiller(donnees, true);
      }, function () {
        erreur.textContent = T.erreur;
        billet.classList.remove('tremble'); void billet.offsetWidth; billet.classList.add('tremble');
        bouton.disabled = false; bouton.textContent = T.entrer;
        champ.select();
      });
    });

    // Code déjà saisi (sur cet appareil, ou à l'instant sur la page Accès client) : on entre directement
    var garde = null;
    try { garde = sessionStorage.getItem(MEMO) || localStorage.getItem(MEMO); } catch (err) { /* navigation privée */ }
    if (garde) {
      ouvrirCoffre(cfg.coffre, garde).then(function (donnees) {
        try { localStorage.setItem(MEMO, garde); } catch (err) { /* navigation privée */ }
        deverrouiller(donnees, false);
      }, function () {
        try { localStorage.removeItem(MEMO); sessionStorage.removeItem(MEMO); } catch (err) { /* navigation privée */ }
        champ.focus();
      });
    } else {
      setTimeout(function () { champ.focus({ preventScroll: true }); }, 600);
    }
  } else {
    ecrireApres();
    if (raccourci) raccourci.classList.remove('est-cache');
  }

  /* ---------- Le moteur de la salle ---------- */

  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FOND = '#0C0507';
  var TENUE_DEBUT = .03;   // part du défilement où l'on reste devant la façade
  var TENUE_FIN = .07;     // part du défilement où l'on reste face à l'écran

  var scene, W, H, total;
  var images = [];
  var chargees = 0;
  var imgAffiche = null, enseigne = null;
  var vw = 0, vh = 0, dpr = 1, petit = false;
  var cible = 0, courant = 0, dessine = -1;
  var enLecture = false;

  function borne(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function adoucir(t) { return t * t * (3 - 2 * t); }

  fetch(sceneUrl).then(function (r) { return r.json(); }).then(function (s) {
    scene = s; W = s.w; H = s.h; total = s.count;
    // téléphone : la série d'images légère (la façade d'ouverture reste en grand)
    petit = !!s.framesPetit && Math.min(window.innerWidth, window.innerHeight) < 600;
    mesurer();
    chargerImages();
  });

  if (cfg.affiche) {
    var ia = new Image();
    ia.onload = function () { imgAffiche = ia; dessine = -1; };
    ia.src = cfg.affiche;
  }

  // L'enseigne : le logo de Charly, teinté lumière chaude, posé en néon sur le bandeau de la façade
  (function () {
    var il = new Image();
    il.onload = function () {
      var c = document.createElement('canvas'); c.width = il.naturalWidth; c.height = il.naturalHeight;
      var x = c.getContext('2d');
      x.drawImage(il, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#FFF0DC'; x.fillRect(0, 0, c.width, c.height);
      enseigne = c; dessine = -1;
    };
    il.src = new URL('enseigne.png', sceneUrl).href;
  })();

  // Les polices doivent être prêtes avant d'écrire sur le fronton
  if (document.fonts && document.fonts.load) {
    document.fonts.load('500 40px "Imbue"').then(function () { dessine = -1; });
  }

  function urlImage(i) {
    var dossier = petit && i > 0 ? scene.framesPetit : scene.frames;
    var n = String(i); while (n.length < scene.pad) n = '0' + n;
    return new URL(dossier + n + '.' + scene.ext, sceneUrl).href;
  }

  // Ordre progressif : quelques images réparties sur toute la séquence d'abord, puis on
  // densifie. Le défilement reste possible pendant le chargement.
  function ordre() {
    var vu = {}, liste = [];
    [32, 16, 8, 4, 2, 1].forEach(function (pas) {
      for (var i = 0; i < total; i += pas) if (!vu[i]) { vu[i] = 1; liste.push(i); }
    });
    if (!vu[total - 1]) liste.push(total - 1);
    return liste;
  }

  function chargerImages() {
    var liste = ordre(), suivant = 0;
    var pomper = function () {
      if (suivant >= liste.length) return;
      var i = liste[suivant++];
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () {
        var fini = function () {
          images[i] = img; chargees++;
          if (i === 0) {
            if (!ferme && !debutLettres) debutLettres = performance.now();
            scn.classList.add('est-prete');
          }
          if (charge) charge.style.transform = 'scaleX(' + (chargees / total) + ')';
          if (chargees === total) scn.classList.add('est-chargee');
          dessine = -1;
          pomper();
        };
        if (img.decode) img.decode().then(fini, fini); else fini();
      };
      img.onerror = pomper;
      img.src = urlImage(i);
    };
    for (var k = 0; k < 6; k++) pomper();
  }

  function imageProche(i) {
    if (images[i]) return images[i];
    for (var d = 1; d < total; d++) {
      if (images[i - d]) return images[i - d];
      if (images[i + d]) return images[i + d];
    }
    return null;
  }

  /* Défilement → image */

  function course() {
    var haut = salle.getBoundingClientRect().top + window.scrollY;
    return { haut: haut, long: salle.offsetHeight - scn.offsetHeight };
  }
  function avancee() {
    var c = course();
    return c.long > 0 ? borne((window.scrollY - c.haut) / c.long, 0, 1) : 0;
  }
  function imagePour(p) { return borne((p - TENUE_DEBUT) / (1 - TENUE_DEBUT - TENUE_FIN), 0, 1) * (total - 1); }

  /* Cadrage : sur un écran large la vidéo couvre tout. Sur un écran étroit (téléphone),
     on garde visible la zone utile (roi) de chaque moment, quitte à laisser des marges. */

  function zoneUtile(f) {
    var k = scene.roi;
    if (f <= k[0][0]) return k[0].slice(1);
    for (var j = 1; j < k.length; j++) {
      if (f <= k[j][0]) {
        var a = k[j - 1], b = k[j];
        var t = adoucir((f - a[0]) / (b[0] - a[0]));
        return [1, 2, 3, 4].map(function (n) { return a[n] + (b[n] - a[n]) * t; });
      }
    }
    return k[k.length - 1].slice(1);
  }

  function camera(f) {
    var r = zoneUtile(f);
    var couvre = Math.max(vw / W, vh / H);
    var s = Math.min(couvre, vw / (r[2] * W), vh / (r[3] * H));
    var dw = W * s, dh = H * s;
    var ox = vw / 2 - (r[0] + r[2] / 2) * dw;
    var oy = vh / 2 - (r[1] + r[3] / 2) * dh;
    ox = dw >= vw ? borne(ox, vw - dw, 0) : (vw - dw) / 2;
    oy = dh >= vh ? borne(oy, vh - dh, 0) : (vh - dh) * .46;
    return { s: s, ox: ox, oy: oy, dw: dw, dh: dh };
  }

  // Rectangle suivi (vitrine, fronton, enseigne, écran) à l'image f, en pixels d'écran
  function suivi(nom, f, cam) {
    var t = scene.tracks[nom];
    if (!t) return null;
    var i = f - t.from;
    if (i < 0 || i > t.rects.length - 1) return null;
    var i0 = Math.floor(i), i1 = Math.min(i0 + 1, t.rects.length - 1), u = i - i0;
    var a = t.rects[i0], b = t.rects[i1];
    var r = [0, 1, 2, 3].map(function (n) { return a[n] + (b[n] - a[n]) * u; });
    return { x: cam.ox + r[0] * cam.dw, y: cam.oy + r[1] * cam.dh, w: r[2] * cam.dw, h: r[3] * cam.dh, vie: i / (t.rects.length - 1) };
  }

  /* Dessin */

  function mesurer() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = scn.clientWidth; vh = scn.clientHeight;
    canvas.width = Math.round(vw * dpr);
    canvas.height = Math.round(vh * dpr);
    dessine = -1;
  }

  // L'affiche du film, derrière la vitre des deux vitrines
  function dessinerAffiche(r) {
    if (!imgAffiche || !r) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    var pr = imgAffiche.width / imgAffiche.height, rr = r.w / r.h;
    var pw = pr > rr ? r.h * pr : r.w, ph = pr > rr ? r.h : r.w / pr;
    ctx.drawImage(imgAffiche, r.x + (r.w - pw) / 2, r.y + (r.h - ph) / 2, pw, ph);
    var g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, 'rgba(255,244,228,0.18)');
    g.addColorStop(.45, 'rgba(255,244,228,0)');
    g.addColorStop(1, 'rgba(20,10,8,0.2)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  // Le fronton : les lettres se posent une à une, comme sur un vrai tableau
  function dessinerFronton(r, now) {
    var lignes = cfg.marquise;
    if (!r || !lignes || !lignes.length) return;
    var texte = (Array.isArray(lignes) ? lignes.join('   ·   ') : String(lignes)).toUpperCase();
    var montre = calme && isFinite(debutLettres) ? texte.length : Math.floor(borne((now - debutLettres - 900) / 55, 0, texte.length));
    if (!montre) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = '#2A0A12';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    var taille = r.h * .56;
    var police = function () {
      ctx.font = '500 ' + taille + 'px "Imbue", "Didot", Georgia, serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = (taille * .14) + 'px';
    };
    police();
    var large = ctx.measureText(texte).width, max = r.w * .9;
    if (large > max) { taille *= max / large; police(); large = ctx.measureText(texte).width; }
    ctx.fillText(texte.slice(0, montre), r.x + (r.w - large) / 2, r.y + r.h * .53);
    ctx.restore();
  }

  // L'enseigne au néon : quelques hésitations à l'allumage, puis elle tient
  function allumage(now) {
    if (!isFinite(debutLettres)) return 0;
    if (calme) return 1;
    var t = now - debutLettres - 250;
    if (t < 0) return 0;
    if (t < 70) return .9;
    if (t < 190) return 0;
    if (t < 250) return .6;
    if (t < 420) return 0;
    return borne(.35 + (t - 420) / 500, 0, 1);
  }
  function dessinerEnseigne(r, vue, now) {
    if (!enseigne || !r) return;
    var a = allumage(now);
    if (a <= 0) return;
    ctx.save();
    if (vue) { ctx.beginPath(); ctx.rect(vue.x, vue.y, vue.w, vue.h); ctx.clip(); }
    var lw = r.w * .8, lh = lw * enseigne.height / enseigne.width;
    if (lh > r.h * .5) { lh = r.h * .5; lw = lh * enseigne.width / enseigne.height; }
    var lx = r.x + (r.w - lw) / 2, ly = r.y + (r.h - lh) / 2;
    ctx.globalAlpha = a;
    ctx.shadowColor = 'rgba(255, 176, 110, .95)';
    ctx.shadowBlur = lh * 1.1;
    ctx.drawImage(enseigne, lx, ly, lw, lh);
    ctx.shadowBlur = lh * .35;
    ctx.drawImage(enseigne, lx, ly, lw, lh);
    ctx.restore();
  }

  // Halo d'ambiance autour de l'image quand elle ne remplit pas l'écran :
  // l'image réduite à quelques pixels puis agrandie donne un flou très doux
  var ambiance = document.createElement('canvas');
  ambiance.width = 32; ambiance.height = 18;
  var actx = ambiance.getContext('2d');
  function dessinerAmbiance(img, force) {
    actx.drawImage(img, 0, 0, ambiance.width, ambiance.height);
    var s = Math.max(vw / ambiance.width, vh / ambiance.height) * 1.15;
    var w = ambiance.width * s, h = ambiance.height * s;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = force;
    ctx.drawImage(ambiance, (vw - w) / 2, (vh - h) / 2, w, h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(12,5,7,0.45)';
    ctx.fillRect(0, 0, vw, vh);
  }

  function dessiner(f, now) {
    var cam = camera(f);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = FOND;
    ctx.fillRect(0, 0, vw, vh);

    var i0 = Math.floor(f), u = f - i0;
    var a = imageProche(i0);
    var bandes = cam.dh < vh - 1;
    // plus discret face à l'écran blanc, pour ne pas délaver les marges
    if (a && bandes) dessinerAmbiance(a, f >= scene.tracks.screen.from ? .1 : .55);
    if (a) ctx.drawImage(a, cam.ox, cam.oy, cam.dw, cam.dh);
    // fondu entre deux images voisines : le mouvement reste fluide à 12 images par seconde
    if (u > .02 && i0 + 1 < total && images[i0 + 1]) {
      ctx.globalAlpha = u;
      ctx.drawImage(images[i0 + 1], cam.ox, cam.oy, cam.dw, cam.dh);
      ctx.globalAlpha = 1;
    }

    // affiches, fronton et enseigne restent dans l'image, jamais dans les marges
    ctx.save();
    ctx.beginPath(); ctx.rect(cam.ox, cam.oy, cam.dw, cam.dh); ctx.clip();
    dessinerAffiche(suivi('posterL', f, cam));
    dessinerAffiche(suivi('posterR', f, cam));
    dessinerFronton(suivi('marquee', f, cam), now);
    dessinerEnseigne(suivi('enseigne', f, cam), suivi('enseigneVue', f, cam), now);
    ctx.restore();

    // bords fondus quand la vidéo ne remplit pas la hauteur (téléphone)
    if (bandes) {
      var fondu = Math.min(cam.dh * .18, 90);
      var g = ctx.createLinearGradient(0, cam.oy, 0, cam.oy + fondu);
      g.addColorStop(0, 'rgba(12,5,7,0.78)'); g.addColorStop(1, 'rgba(12,5,7,0)');
      ctx.fillStyle = g; ctx.fillRect(0, cam.oy - 1, vw, fondu + 1);
      g = ctx.createLinearGradient(0, cam.oy + cam.dh - fondu, 0, cam.oy + cam.dh);
      g.addColorStop(0, 'rgba(12,5,7,0)'); g.addColorStop(1, 'rgba(12,5,7,0.78)');
      ctx.fillStyle = g; ctx.fillRect(0, cam.oy + cam.dh - fondu, vw, fondu + 1);
    }

    poserEcran(suivi('screen', f, cam));
  }

  // Le carton « Lancer la séance » et le lecteur suivent l'écran pendant l'avancée
  function poserEcran(r) {
    if (!r) {
      ecran.style.opacity = 0;
      ecran.style.visibility = 'hidden';
      ecran.classList.remove('est-actif');
      scn.classList.remove('est-devant-ecran');
      return;
    }
    var k = scene.tracks.screen.rects.length - 1;
    var alpha = enLecture ? 1 : borne((r.vie * k - 3) / 12, 0, 1);
    ecran.style.visibility = 'visible';
    ecran.style.opacity = alpha;
    ecran.style.left = r.x + 'px';
    ecran.style.top = r.y + 'px';
    ecran.style.width = r.w + 'px';
    ecran.style.height = r.h + 'px';
    ecran.style.setProperty('--u', Math.min(r.w / 900, r.h / 450).toFixed(4));
    ecran.classList.toggle('est-actif', alpha > .6);
    scn.classList.toggle('est-devant-ecran', alpha > .6 && r.vie > .7);
  }

  function majCalques(p, f) {
    var sortie = borne(1 - p / TENUE_DEBUT, 0, 1);
    if (affiche) affiche.style.opacity = sortie;
    if (defiler) defiler.style.opacity = sortie;
    var sec = f / scene.fps;
    legendes.forEach(function (el) {
      var de = parseFloat(el.dataset.de), a = parseFloat(el.dataset.a);
      el.style.opacity = borne(Math.min(sec - de, a - sec) / .6, 0, 1);
    });
    if (raccourci && !document.documentElement.classList.contains('est-ferme')) raccourci.classList.toggle('est-cache', p > .9);
  }

  /* Boucle */

  var dernierP = -1;
  function boucle(now) {
    window.requestAnimationFrame(boucle);
    if (!scene) return;
    var p = avancee();
    cible = imagePour(p);
    var ecart = cible - courant;
    courant = calme || Math.abs(ecart) < .01 ? cible : courant + ecart * .16;
    var lettresEnCours = isFinite(debutLettres) && now - debutLettres < 6000;
    if (courant !== dessine || lettresEnCours || p !== dernierP) {
      dessiner(courant, now);
      majCalques(p, courant);
      dessine = courant; dernierP = p;
    }
  }
  window.requestAnimationFrame(boucle);

  var minuterie;
  window.addEventListener('resize', function () {
    clearTimeout(minuterie);
    minuterie = setTimeout(function () { if (scene) mesurer(); }, 120);
  });

  /* Aller directement au film */

  function allerAEcran() {
    var c = course();
    window.scrollTo({ top: c.haut + c.long, behavior: 'instant' });
    if (scene) courant = total - 1;
  }
  if (raccourci) raccourci.addEventListener('click', function (e) { e.preventDefault(); allerAEcran(); });

  /* Le lecteur : chargé seulement au clic, rien n'est demandé à l'hébergeur
     de la vidéo tant que le couple n'a pas lancé la séance. */

  function fabriquerLecteur() {
    var film = (secret && secret.film) || {};
    if (film.mp4) {
      var v = document.createElement('video');
      v.src = film.mp4; v.controls = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('controlslist', 'nodownload');
      return v;
    }
    var src = null;
    if (film.vimeo) src = 'https://player.vimeo.com/video/' + encodeURIComponent(film.vimeo) + '?autoplay=1&title=0&byline=0&portrait=0&dnt=1';
    else if (film.bunny) src = film.bunny + (film.bunny.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=true&preload=true';
    else if (film.youtube) src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(film.youtube) + '?autoplay=1&mute=0&cc_load_policy=0&iv_load_policy=3&rel=0&playsinline=1';
    if (!src) return null;
    var cadre = document.createElement('iframe');
    cadre.src = src;
    cadre.title = cfg.titre || 'Film';
    cadre.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    cadre.allowFullscreen = true;
    return cadre;
  }

  lancer.addEventListener('click', function () {
    var lecteur = fabriquerLecteur();
    if (!lecteur) return;
    if (scene && courant < total - 2) allerAEcran();
    projection.appendChild(lecteur);
    enLecture = true;
    ecran.classList.add('est-en-lecture');
    dessine = -1;
    try { localStorage.setItem(MEMO + '_vu', '1'); } catch (e) { /* navigation privée */ }
  });

  // Visite suivante : le lien « Aller au film » est mis en avant
  try { if (localStorage.getItem(MEMO + '_vu') && raccourci) raccourci.classList.add('est-revenu'); } catch (e) { /* navigation privée */ }
})();
