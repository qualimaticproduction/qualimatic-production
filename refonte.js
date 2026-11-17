/* Qualimatic Production · refonte de l'accueil (preview v6) */
(function () {
  'use strict';

  var d = document;
  var racine = d.documentElement;
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ?capture : états figés pour les captures (?o=0.55 ouverture du rideau, ?film=0..3)
  // ?y=1200 : défile jusqu'à cette position après le chargement (tests)
  var parametres = new URLSearchParams(window.location.search);
  var capture = parametres.has('capture');
  if (capture) {
    racine.classList.add('capture');
    racine.style.setProperty('--ecran', (parseInt(parametres.get('h'), 10) || 900) + 'px');
  }
  var fige = calme || capture;

  function borne(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function tous(sel) { return Array.prototype.slice.call(d.querySelectorAll(sel)); }

  /* ---------- Mesure d'audience (Google Analytics 4), seulement après accord ----------
     Le bandeau propose Refuser et Accepter, avec la même simplicité (règles de la CNIL).
     Le choix est gardé 13 mois au plus dans le navigateur, puis redemandé. Le lien
     « Gérer les cookies » du pied de page rouvre le bandeau. GA ne se charge que sur
     le site en ligne : rien n'est envoyé depuis un aperçu local. */
  var CLE_COOKIES = 'qm_cookies';
  var TREIZE_MOIS = 395 * 24 * 3600 * 1000;
  var enLigne = /(^|\.)qualimaticproduction\.fr$/.test(window.location.hostname);
  var audienceChargee = false;
  var bandeau = null;

  function lireChoix() {
    try {
      var c = JSON.parse(window.localStorage.getItem(CLE_COOKIES) || 'null');
      if (c && typeof c.ok === 'boolean' && Date.now() - c.t < TREIZE_MOIS) return c.ok;
    } catch (e) { /* stockage indisponible : on redemandera */ }
    return null;
  }
  function garderChoix(ok) {
    try { window.localStorage.setItem(CLE_COOKIES, JSON.stringify({ ok: ok, t: Date.now() })); } catch (e) { /* navigation privée */ }
  }
  function chargerAudience() {
    if (audienceChargee || !enLigne) return;
    audienceChargee = true;
    var balise = d.createElement('script');
    balise.async = true;
    balise.src = 'https://www.googletagmanager.com/gtag/js?id=G-9P3DYBQH5F';
    d.head.appendChild(balise);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-9P3DYBQH5F');
  }
  function effacerCookiesAudience() {
    var domaine = window.location.hostname.replace(/^www\./, '');
    d.cookie.split(';').forEach(function (c) {
      var nom = c.split('=')[0].trim();
      if (!/^_ga/.test(nom)) return;
      ['', '; domain=' + domaine, '; domain=.' + domaine].forEach(function (s) {
        d.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + s;
      });
    });
  }
  function fermerBandeau() { if (bandeau) bandeau.hidden = true; }
  function montrerBandeau() {
    if (!bandeau) {
      bandeau = d.createElement('div');
      bandeau.className = 'cookies';
      bandeau.setAttribute('role', 'region');
      bandeau.setAttribute('aria-label', 'Cookies de mesure d’audience');
      bandeau.innerHTML =
        '<p class="cookies__texte">Avec votre accord, je mesure l’audience du site avec Google Analytics, pour savoir quelles pages vous intéressent. Aucune publicité. <a href="politique-confidentialite.html#s6">En savoir plus</a></p>' +
        '<div class="cookies__choix"><button type="button" data-cookies="non">Refuser</button><button type="button" data-cookies="oui">Accepter</button></div>';
      bandeau.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cookies]');
        if (!b) return;
        var ok = b.getAttribute('data-cookies') === 'oui';
        garderChoix(ok);
        if (ok) chargerAudience(); else effacerCookiesAudience();
        fermerBandeau();
      });
      d.body.appendChild(bandeau);
    }
    bandeau.hidden = false;
  }
  var choixCookies = lireChoix();
  if (choixCookies === true) chargerAudience();
  else if (choixCookies === null && !capture) window.setTimeout(montrerBandeau, 900);
  tous('[data-gerer-cookies]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); montrerBandeau(); });
  });
  function adoucir(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function deux(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Entrée ---------- */
  function lever() { racine.classList.add('pret'); }
  if (d.fonts && d.fonts.ready) {
    d.fonts.ready.then(function () { window.requestAnimationFrame(lever); });
    window.setTimeout(lever, 1600);
  } else {
    lever();
  }

  /* ---------- Le film de la déchirure ----------
     Écran en hauteur (téléphone) : la version verticale HD. Écran en largeur (ordinateur) :
     la version horizontale tirée du master 4K. Si l'écran change en cours de route
     (téléphone tourné, fenêtre redimensionnée), le film change de version au même instant. */
  var filmDechirure = d.querySelector('.dechirure__film');
  var ecranDebout = window.matchMedia('(orientation: portrait)');
  function choisirVersion() {
    if (!filmDechirure) return;
    // le film est toujours horizontal (choix de Charly, 17/11/2026) ; sur téléphone et petit écran,
    // une version 720p, aussi nette à cette taille et bien plus légère à charger
    var cle = (ecranDebout.matches || window.innerWidth < 900) ? 'portrait' : 'paysage';
    if (filmDechirure.getAttribute('data-version') === cle) return;
    var instant = filmDechirure.currentTime || 0;
    var enLecture = !filmDechirure.paused;
    filmDechirure.setAttribute('data-version', cle);
    filmDechirure.poster = filmDechirure.getAttribute('data-' + cle + '-poster');
    filmDechirure.src = filmDechirure.getAttribute('data-' + cle);
    if (instant > 0) {
      filmDechirure.addEventListener('loadedmetadata', function () {
        try { filmDechirure.currentTime = instant; } catch (e) {}
        if (enLecture) lireFilm();
      }, { once: true });
    }
  }
  choisirVersion();
  if (filmDechirure) {
    if (ecranDebout.addEventListener) ecranDebout.addEventListener('change', choisirVersion);
    else if (ecranDebout.addListener) ecranDebout.addListener(choisirVersion);
  }

  /* ---------- Vidéos : lecture seulement à l'écran ---------- */
  var videos = tous('video');
  videos.forEach(function (v) { v.muted = true; v.playsInline = true; });
  // ?poster : tests de mise en page, les vidéos restent sur leur image d'attente
  if (parametres.has('poster')) videos.forEach(function (v) { v.removeAttribute('src'); v.preload = 'none'; v.load(); });
  function lire(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  var ecranFilms = tous('.films__ecran video');

  if (capture) {
    videos.forEach(function (v) {
      v.pause(); v.preload = 'auto';
      function placer() { try { v.currentTime = Math.min(v.duration * 0.35, 3); } catch (e) {} }
      if (v.readyState >= 1) placer(); else v.addEventListener('loadedmetadata', placer, { once: true });
    });
  } else if ('IntersectionObserver' in window) {
    var veilleVideo = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        var v = e.target;
        if (ecranFilms.indexOf(v) > -1 || v === filmDechirure) return; // gérées par leur section
        if (e.isIntersecting) lire(v); else v.pause();
      });
    }, { rootMargin: '200px 0px' });
    videos.forEach(function (v) { veilleVideo.observe(v); });
  }

  /* ---------- En-tête ---------- */
  var entete = d.getElementById('entete');
  // l'ouverture de la page : rideau (mariage), montagne (accueil) ou couverture (à propos)
  var scene = d.querySelector('.scene, .ouverture, .couverture, .passe, .cinema--atelier');
  var menuOuvert = false;
  var dernierY = window.scrollY;
  function suivreEntete() {
    var y = window.scrollY;
    var finScene = scene ? scene.offsetTop + scene.offsetHeight - window.innerHeight : 0;
    entete.classList.toggle('est-pleine', y > finScene - 10);
    if (!menuOuvert && !capture) {
      if (y > dernierY && y > finScene + 200) entete.classList.add('est-cachee');
      else if (y < dernierY) entete.classList.remove('est-cachee');
    }
    dernierY = y;
  }
  window.addEventListener('scroll', suivreEntete, { passive: true });
  suivreEntete();

  /* ---------- Menu ---------- */
  var boutonMenu = d.querySelector('.entete__menu');
  var menu = d.getElementById('menu');
  function basculerMenu(ouvrir) {
    menuOuvert = ouvrir;
    boutonMenu.setAttribute('aria-expanded', String(ouvrir));
    boutonMenu.setAttribute('aria-label', ouvrir ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.classList.toggle('est-ouvert', ouvrir);
    menu.setAttribute('aria-hidden', String(!ouvrir));
    d.body.classList.toggle('menu-ouvert', ouvrir);
    entete.classList.remove('est-cachee');
  }
  boutonMenu.addEventListener('click', function () { basculerMenu(!menuOuvert); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) basculerMenu(false); });

  /* ---------- Apparitions ---------- */
  var aReveler = tous('.apparait, .leve');
  if (fige || !('IntersectionObserver' in window)) {
    aReveler.forEach(function (el) { el.classList.add('est-vue'); });
  } else {
    // une image masquée par clip-path n'est jamais « visible » : on observe son parent
    var cibles = new Map();
    aReveler.forEach(function (el) {
      var cible = el.classList.contains('leve') ? el.parentElement : el;
      if (!cibles.has(cible)) cibles.set(cible, []);
      cibles.get(cible).push(el);
    });
    var veille = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        (cibles.get(e.target) || []).forEach(function (el) { el.classList.add('est-vue'); });
        veille.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    cibles.forEach(function (liste, cible) { veille.observe(cible); });
  }

  /* ---------- Éléments animés au défilement ---------- */
  var sceneFixe = d.querySelector('.scene__fixe');
  var dechirure = d.querySelector('.dechirure');
  var films = d.querySelector('.films');
  var filmsMain = d.querySelector('.films__main');
  var vitesses = tous('[data-vitesse]');
  var glisses = tous('[data-glisse]');
  var titresFilms = tous('.films__titre');
  var cartesFilms = tous('.carte-film');
  var numFilm = d.querySelector('[data-film-num]');
  var jouerFilm = d.querySelector('.films__jouer');
  var blocsAppel = tous('.appel__bloc');
  var indexFilm = -1;
  var inclinaisons = [-2, 1.5, -1, 2.2];

  function choisirFilm(i, sansAnimation) {
    if (i === indexFilm) return;
    indexFilm = i;
    titresFilms.forEach(function (t, k) { t.classList.toggle('est-actif', k === i); });
    cartesFilms.forEach(function (c, k) { c.classList.toggle('est-actif', k === i); });
    ecranFilms.forEach(function (v, k) {
      v.classList.toggle('est-actif', k === i);
      if (!capture) { if (k === i) lire(v); else v.pause(); }
    });
    if (numFilm) numFilm.textContent = deux(i + 1);
    // le bouton posé sur l'écran ouvre le film du mariage affiché
    if (jouerFilm) {
      var lienFilm = cartesFilms[i] ? cartesFilms[i].querySelector('[data-film]') : null;
      jouerFilm.hidden = !lienFilm;
      if (lienFilm) { jouerFilm.href = lienFilm.href; jouerFilm.dataset.film = lienFilm.dataset.film; }
    }
    if (filmsMain) {
      filmsMain.style.setProperty('--hr', inclinaisons[i] + 'deg');
      if (!sansAnimation) {
        filmsMain.classList.remove('change');
        void filmsMain.offsetWidth;
        filmsMain.classList.add('change');
      }
    }
  }

  /* ---------- Le son de la déchirure ----------
     Le film ne joue que papier ouvert. Le son monte avec l'ouverture et s'éteint quand
     le papier se referme. Un navigateur n'accepte le son qu'après un geste du visiteur
     (clic, toucher, touche) : sans ce geste, le bouton « Activer le son » le permet. */
  var boutonSon = d.querySelector('.dechirure__son');
  var texteSon = boutonSon ? boutonSon.querySelector('.dechirure__son-texte') : null;
  var sonVoulu = true;       // le visiteur peut le couper
  var sonDonne = false;      // un clic sur le bouton vaut autorisation
  var volume = 0;
  var ouvertureFilm = 0;
  function sonPermis() {
    if (sonDonne) return true;
    return !!(navigator.userActivation && navigator.userActivation.hasBeenActive);
  }
  function sonActif() { return sonVoulu && sonPermis(); }
  var etatBouton = null;
  function majBouton() {
    if (!boutonSon) return;
    var actif = sonActif();
    if (actif === etatBouton) return;
    etatBouton = actif;
    boutonSon.setAttribute('aria-pressed', String(actif));
    texteSon.textContent = actif ? 'Couper le son' : 'Activer le son';
  }
  function lireFilm() {
    var p = filmDechirure.play();
    if (p && p.catch) p.catch(function (err) {
      // lecture interrompue par une pause (papier refermé) : rien à corriger
      if (!err || err.name !== 'NotAllowedError') return;
      // son refusé par le navigateur : on repart en muet
      filmDechirure.muted = true; sonDonne = false;
      var q = filmDechirure.play(); if (q && q.catch) q.catch(function () {});
    });
  }
  function reglerFilm(ouv) {
    if (!filmDechirure || capture) return;
    ouvertureFilm = ouv;
    var ouvert = ouv > 0.02;
    if (ouvert && filmDechirure.paused) lireFilm();
    else if (!ouvert && !filmDechirure.paused) filmDechirure.pause();
    var cible = ouvert && sonActif() ? Math.pow(ouv, 1.4) : 0;
    volume += (cible - volume) * 0.12;
    if (cible === 0 && volume < 0.015) { volume = 0; if (!filmDechirure.muted) filmDechirure.muted = true; }
    else if (cible > 0 && filmDechirure.muted) filmDechirure.muted = false;
    try { filmDechirure.volume = borne(volume, 0, 1); } catch (e) {}
    dechirure.classList.toggle('est-ouverte', ouv > 0.55);
    majBouton();
  }
  // sans bouton : le premier geste du visiteur (où qu'il soit sur la page) autorise le son ;
  // si le papier est déjà ouvert, le son part dans ce geste même
  if (filmDechirure && !boutonSon) {
    var geste = function () {
      if (sonDonne) return;
      sonDonne = true;
      if (ouvertureFilm > 0.02) {
        filmDechirure.muted = false;
        if (filmDechirure.paused) lireFilm();
      }
      ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.removeEventListener(t, geste, true); });
    };
    ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { window.addEventListener(t, geste, true); });
  }
  if (boutonSon && filmDechirure) {
    boutonSon.addEventListener('click', function () {
      if (sonActif()) { sonVoulu = false; }
      else {
        sonVoulu = true; sonDonne = true;
        // dans le geste même : le navigateur accepte alors le son
        filmDechirure.volume = 0; filmDechirure.muted = false;
        if (filmDechirure.paused && (ouvertureFilm > 0.02 || fige)) lireFilm();
      }
      etatBouton = null; majBouton();
    });
  }

  function centreSansTranslation(el) {
    var parent = el.offsetParent;
    if (!parent) return null;
    return parent.getBoundingClientRect().top + el.offsetTop + el.offsetHeight / 2;
  }

  function animer() {
    var h = window.innerHeight;
    var w = window.innerWidth;

    // 1. le rideau s'ouvre, la carte se pose puis s'envole
    if (scene && sceneFixe) {
      var rs = scene.getBoundingClientRect();
      if (rs.bottom > 0) {
        var p = borne(-rs.top / (rs.height - h), 0, 1);
        var o = adoucir(borne(p / 0.5, 0, 1));
        var k = adoucir(borne((p - 0.66) / 0.34, 0, 1));
        sceneFixe.style.setProperty('--o', o.toFixed(4));
        sceneFixe.style.setProperty('--to', borne(1 - o * 2.4, 0, 1).toFixed(3));
        sceneFixe.style.setProperty('--io', borne(1 - p * 10, 0, 1).toFixed(3));
        sceneFixe.style.setProperty('--fz', (1.1 - o * 0.06 + k * 0.05).toFixed(4));
        sceneFixe.style.setProperty('--cy', (-k * h * 0.42).toFixed(1) + 'px');
        sceneFixe.style.setProperty('--co', borne(1 - k * 1.15, 0, 1).toFixed(3));
        sceneFixe.style.setProperty('--cs', (1 - k * 0.06).toFixed(4));
        entete.style.setProperty('--logo-o', p > 0.92 ? '1' : '0');
      } else {
        entete.style.setProperty('--logo-o', '1');
      }
    }

    // 2. la déchirure s'ouvre sur le film de Sancerre, le son suit l'ouverture
    if (dechirure) {
      var rd = dechirure.getBoundingClientRect();
      // le film se charge un peu avant d'arriver
      if (filmDechirure && rd.top < h * 2 && rd.bottom > -h && filmDechirure.preload !== 'auto') filmDechirure.preload = 'auto';
      if (rd.bottom > 0 && rd.top < h) {
        // progression pendant que la déchirure est collée à l'écran : s'ouvre, reste ouverte, se referme
        var dp = borne(-rd.top / (rd.height - h), 0, 1);
        var ouv = adoucir(borne(dp / 0.3, 0, 1)) * (1 - adoucir(borne((dp - 0.8) / 0.2, 0, 1)));
        dechirure.style.setProperty('--ouv', ouv.toFixed(4));
        dechirure.style.setProperty('--dz', (1.06 - dp * 0.05).toFixed(4));
        reglerFilm(ouv);
      } else {
        reglerFilm(0);
      }
    }

    // 3. les images montent chacune à leur vitesse
    vitesses.forEach(function (el) {
      var c = centreSansTranslation(el);
      if (c === null || c < -h || c > 2 * h) return;
      var ty = borne(-(c - h / 2) * parseFloat(el.dataset.vitesse), -150, 150);
      el.style.setProperty('--ty', ty.toFixed(1) + 'px');
    });

    // 4. titres dont les mots glissent en sens contraire
    glisses.forEach(function (ligne) {
      var r = ligne.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > h + 100) return;
      var gp = borne((h - r.top) / (h + r.height), 0, 1);
      ligne.style.setProperty('--gx', ((gp - 0.5) * Number(ligne.dataset.glisse) * w * 0.12).toFixed(1) + 'px');
    });

    // 6. la main gantée entre par la gauche et pose le carton « Réserver un appel »
    blocsAppel.forEach(function (bloc) {
      var rb = bloc.getBoundingClientRect();  // le bloc ne bouge pas : mesure stable
      if (rb.top > h + 80 || rb.bottom < -80) return;
      var pa = adoucir(borne((h - rb.top) / (h * 0.7), 0, 1));
      var carton = bloc.firstElementChild;
      carton.style.setProperty('--ax', ((1 - pa) * -Math.min(w * 0.75, 1000)).toFixed(1) + 'px');
      carton.style.setProperty('--ay', ((1 - pa) * 140).toFixed(1) + 'px');
      carton.style.setProperty('--ar', ((1 - pa) * -11).toFixed(2) + 'deg');
    });

    // 5. la main gantée présente chaque film
    if (films && filmsMain) {
      var rf = films.getBoundingClientRect();
      if (rf.bottom > 0 && rf.top < h) {
        var q = borne(-rf.top / (rf.height - h), 0, 1);
        var monte = adoucir(borne((q + 0.02) / 0.1, 0, 1));
        filmsMain.style.setProperty('--hy', ((1 - monte) * 60).toFixed(2) + '%');
        choisirFilm(borne(Math.floor(q * 4), 0, 3));
      }
    }

    window.requestAnimationFrame(animer);
  }

  if (capture) {
    var ouverture = parseFloat(parametres.get('o') || '0.55');
    if (sceneFixe) {
      sceneFixe.style.setProperty('--o', ouverture);
      sceneFixe.style.setProperty('--to', borne(1 - ouverture * 2.4, 0, 1));
      sceneFixe.style.setProperty('--io', '0');
      sceneFixe.style.setProperty('--fz', '1.06');
    }
    if (dechirure) {
      dechirure.style.setProperty('--ouv', parametres.get('d') || '0.72');
      dechirure.classList.toggle('est-ouverte', parseFloat(parametres.get('d') || '0.72') > 0.55);
      majBouton();
    }
    if (filmsMain) filmsMain.style.setProperty('--hy', '0%');
    choisirFilm(borne(parseInt(parametres.get('film') || '0', 10), 0, 3), true);
  } else {
    choisirFilm(0, true);
    if (!calme) window.requestAnimationFrame(animer);
    else if (dechirure) {
      // mouvement réduit : le papier reste ouvert, le film se lance avec le bouton
      dechirure.style.setProperty('--ouv', '1');
      dechirure.classList.add('est-ouverte');
      majBouton();
    }
  }

  /* ---------- Vos mots : les cartes posées sur le plateau ---------- */
  var cartesMots = tous('.carte-mot');
  if (cartesMots.length) {
    var numMot = d.querySelector('[data-mot-num]');
    var im = 0, minuterie = null;
    function poser(i, depuis) {
      var n = cartesMots.length;
      im = (i + n) % n;
      cartesMots.forEach(function (c, k) {
        c.classList.remove('est-actif', 'est-dessous', 'est-partie');
        if (k === im) c.classList.add('est-actif');
        else if (k === (im + 1) % n) c.classList.add('est-dessous');
        if (depuis !== undefined && k === depuis) c.classList.add('est-partie');
        c.setAttribute('aria-hidden', String(k !== im));
      });
      if (numMot) numMot.textContent = deux(im + 1);
    }
    function suivant() { poser(im + 1, im); }
    function programmer() {
      window.clearInterval(minuterie);
      if (!fige) minuterie = window.setInterval(suivant, 7000);
    }
    poser(0);
    programmer();
    d.querySelector('.mots__suivant').addEventListener('click', function () { suivant(); programmer(); });
    var plateau = d.querySelector('.plateau');
    plateau.addEventListener('mouseenter', function () { window.clearInterval(minuterie); });
    plateau.addEventListener('mouseleave', programmer);
    plateau.addEventListener('click', function () { suivant(); programmer(); });
  }

  /* ---------- Échap ferme le menu (et le lecteur s'il est ouvert) ---------- */
  var lecteur = d.getElementById('lecteur');
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (lecteur && !lecteur.hidden) fermerFilm();
    else if (menuOuvert) basculerMenu(false);
  });

  /* ---------- Lecteur YouTube (page d'accueil) ---------- */
  var cadreLecteur = lecteur ? lecteur.querySelector('.lecteur__cadre') : null;
  var retourFocus = null;
  function ouvrirFilm(id) {
    var iframe = d.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&mute=0&cc_load_policy=0&iv_load_policy=3&rel=0&modestbranding=1&playsinline=1';
    iframe.title = 'Film Qualimatic Production';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    cadreLecteur.innerHTML = '';
    cadreLecteur.appendChild(iframe);
    lecteur.hidden = false;
    d.body.classList.add('lecteur-ouvert');
    void lecteur.offsetWidth;
    lecteur.classList.add('est-ouvert');
    lecteur.querySelector('.lecteur__fermer').focus();
  }
  function fermerFilm() {
    lecteur.classList.remove('est-ouvert');
    d.body.classList.remove('lecteur-ouvert');
    window.setTimeout(function () {
      lecteur.hidden = true;
      cadreLecteur.innerHTML = '';
      if (retourFocus) retourFocus.focus({ preventScroll: true });
    }, 450);
  }
  if (lecteur) {
    tous('[data-film]').forEach(function (lien) {
      lien.addEventListener('click', function (e) {
        if (window.location.protocol === 'file:') { lien.target = '_blank'; lien.rel = 'noopener'; return; }
        e.preventDefault();
        retourFocus = lien;
        ouvrirFilm(lien.dataset.film);
      });
    });
    lecteur.addEventListener('click', function (e) {
      if (e.target === lecteur || e.target.closest('.lecteur__fermer')) fermerFilm();
    });
  }

  /* ---------- Bandes à faire glisser (mobile) : l'invitation s'efface au premier geste ---------- */
  tous('.arrets__grille, .partenaires, .formules__cartes, .annexes').forEach(function (bande) {
    function vu() {
      if (bande.scrollLeft > 12) { bande.classList.add('est-glissee'); bande.removeEventListener('scroll', vu); }
    }
    bande.addEventListener('scroll', vu, { passive: true });
  });

  /* ---------- Le formulaire du carton (Web3Forms) ---------- */
  tous('.formulaire').forEach(function (f) {
    var tel = f.querySelector('[name="telephone"]');
    var sujet = f.querySelector('[name="subject"]');
    var retour = f.querySelector('.formulaire__retour');
    var bouton = f.querySelector('[type="submit"]');
    // accueil et à propos : le visiteur choisit son projet (mariage, culinaire, corporate),
    // les libellés du formulaire s'y adaptent (attributs data-mariage, data-culinaire…)
    function majChoix() {
      var choix = f.querySelector('[name="preference"]:checked');
      var appel = !choix || choix.value !== 'Une réponse par mail';
      var projetCoche = f.querySelector('[name="type_projet"]:checked') || f.querySelector('[name="type_projet"]');
      var projet = projetCoche ? projetCoche.value : 'Mariage';
      var cle = projet.toLowerCase();
      tel.required = appel;
      f.classList.toggle('veut-appel', appel);
      sujet.value = (appel ? 'Demande d’appel · ' : 'Demande de réponse par mail · ') + cle;
      Array.prototype.forEach.call(f.querySelectorAll('[data-' + cle + ']'), function (el) {
        el.textContent = el.getAttribute('data-' + cle);
      });
      Array.prototype.forEach.call(f.querySelectorAll('[data-ph-' + cle + ']'), function (el) {
        el.placeholder = el.getAttribute('data-ph-' + cle);
      });
    }
    f.addEventListener('change', function (e) { if (e.target.name === 'preference' || e.target.name === 'type_projet') majChoix(); });
    majChoix();

    // envoi sans quitter la page ; sans JavaScript, le formulaire part normalement
    f.addEventListener('submit', function (e) {
      if (!window.fetch || !window.FormData) return;
      e.preventDefault();
      var donnees = {};
      new FormData(f).forEach(function (valeur, nom) { donnees[nom] = valeur; });
      delete donnees.redirect;
      bouton.disabled = true;
      retour.textContent = 'Envoi en cours…';
      fetch(f.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(donnees)
      })
        .then(function (r) { return r.json(); })
        .then(function (rep) {
          if (!rep || !rep.success) throw new Error('refus');
          f.classList.add('est-envoye');
          retour.textContent = 'Merci, votre message m’est bien parvenu. Je reviens vers vous très vite.';
        })
        .catch(function () {
          bouton.disabled = false;
          retour.textContent = 'L’envoi n’a pas abouti. Vous pouvez m’appeler au 07 71 06 32 18 ou m’écrire directement.';
        });
    });
  });

  /* ---------- Tests : défiler jusqu'à ?y= ---------- */
  if (parametres.get('y')) {
    var allerA = function () { window.scrollTo(0, parseInt(parametres.get('y'), 10) || 0); };
    (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(function () { window.setTimeout(allerA, 300); });
    window.addEventListener('load', function () { window.setTimeout(allerA, 300); });
  }
})();
