/* Qualimatic Production · effets au défilement de l'accueil et de la page À propos (preview v10)
   Complète refonte.js (en-tête, menu, apparitions, vitesses, carton, formulaire). */
(function () {
  'use strict';

  var d = document;
  var calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function borne(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function tous(sel, dans) { return Array.prototype.slice.call((dans || d).querySelectorAll(sel)); }
  function adoucir(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  function lire(v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }

  /* écritures groupées : on mesure tout, puis on écrit une seule fois, et seulement ce qui change */
  var memoire = new WeakMap();
  var aEcrire = [];
  function ecrire(el, prop, val) {
    var m = memoire.get(el);
    if (!m) { m = {}; memoire.set(el, m); }
    if (m[prop] === val) return;
    m[prop] = val;
    aEcrire.push(el, prop, val);
  }
  function vider() {
    for (var i = 0; i < aEcrire.length; i += 3) aEcrire[i].style.setProperty(aEcrire[i + 1], aEcrire[i + 2]);
    aEcrire.length = 0;
  }
  function texte(el, txt) { if (el.textContent !== txt) el.textContent = txt; }

  var entete = d.getElementById('entete');
  var vitesse = 0;               // vitesse de défilement lissée (px par image)
  var dernierY = window.scrollY;

  /* =====================================================================
     L'ENCRE : chaque mot s'écrit quand on arrive dessus
     ===================================================================== */
  var encres = tous('.encre').map(function (bloc) {
    var mots = [];
    (function marcher(noeud) {
      Array.prototype.slice.call(noeud.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = d.createDocumentFragment();
          n.textContent.split(/([ \t\n\r]+)/).forEach(function (morceau) {
            if (!morceau) return;
            if (/^[ \t\n\r]+$/.test(morceau)) { frag.appendChild(d.createTextNode(morceau)); return; }
            var s = d.createElement('span');
            s.className = 'mot';
            s.textContent = morceau;
            frag.appendChild(s);
            mots.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          marcher(n);
        }
      });
    })(bloc);
    return { bloc: bloc, mots: mots, n: -1 };
  });
  function majEncres(h) {
    encres.forEach(function (e) {
      var r = e.bloc.getBoundingClientRect();
      if (r.bottom < -h || r.top > 2 * h) return;
      var p = borne((h * .88 - r.top) / (r.height + h * .42), 0, 1);
      var n = Math.round(p * e.mots.length * 1.08);
      if (n === e.n) return;
      e.n = n;
      e.mots.forEach(function (m, i) { m.classList.toggle('est-encre', i < n); });
    });
  }

  /* =====================================================================
     ACCUEIL · LA MONTAGNE : la brume se lève, trois mots en sortent,
     puis elle recouvre tout et devient le papier
     ===================================================================== */
  var ouverture = d.querySelector('.ouverture');
  var oFixe = ouverture ? ouverture.querySelector('.ouverture__fixe') : null;
  function majOuverture(h) {
    var r = ouverture.getBoundingClientRect();
    if (r.bottom <= 0) {
      ecrire(entete, '--logo-o', '1');
      entete.classList.remove('entete--encre');
      return;
    }
    var p = borne(-r.top / (r.height - h), 0, 1);
    var s = oFixe;
    ecrire(s, '--zoom', (1.04 + p * .2).toFixed(4));
    ecrire(s, '--my', (-p * h * .05).toFixed(1) + 'px');
    ecrire(s, '--lum', (.9 - p * .14).toFixed(3));

    var l = borne(p / .34, 0, 1);
    ecrire(s, '--lo', (1 - adoucir(l)).toFixed(3));
    ecrire(s, '--ls', (1 + l * .24).toFixed(4));
    ecrire(s, '--lb', (l * 12).toFixed(2) + 'px');

    // plus de mots sur la forêt : la brume monte tout de suite et ouvre sur les trois univers
    var b = borne((p - .12) / .72, 0, 1);
    ecrire(s, '--bo', borne(b * 1.7, 0, 1).toFixed(3));
    ecrire(s, '--by', ((1 - adoucir(b)) * 58 - 2).toFixed(2) + '%');
    ecrire(s, '--bs', (1 + b * .3).toFixed(3));

    // la brume claire couvre tout : l'en-tête passe à l'encre pour rester lisible
    ecrire(s, '--io', borne(1 - p * 6, 0, 1).toFixed(3));

    ecrire(entete, '--logo-o', p > .32 ? '1' : '0');
    entete.classList.toggle('entete--encre', b > .86);
  }

  /* =====================================================================
     ACCUEIL · LES TROIS UNIVERS : chaque feuillet glisse sur le précédent,
     les images vont plus vite que le texte
     ===================================================================== */
  var univers = d.querySelector('.univers');
  var uFixe = univers ? univers.querySelector('.univers__fixe') : null;
  var feuillets = tous('.feuillet');
  var profondeurs = feuillets.map(function (f) { return tous('[data-profondeur]', f); });
  var videosFeuillets = feuillets.map(function (f) { return tous('video', f); });
  var reperes = tous('[data-repere]');
  var plages = [[.2, .42], [.58, .8]];   // le mariage est déjà posé, culinaire puis corporate glissent dessus
  var actifUnivers = -1;
  function majUnivers(h, w) {
    var r = univers.getBoundingClientRect();
    if (r.top > h * 1.2 || r.bottom < -h * .2) return;
    var p = borne(-r.top / (r.height - h), 0, 1);
    var e = [1];
    plages.forEach(function (pl) { e.push(adoucir(borne((p - pl[0]) / (pl[1] - pl[0]), 0, 1))); });
    var actif = 0;
    feuillets.forEach(function (f, i) {
      var ei = e[i];
      var suivant = i + 1 < e.length ? e[i + 1] : 0;
      if (ei > .5) actif = i;
      ecrire(f, '--e', ei.toFixed(4));
      ecrire(f, '--recul', suivant.toFixed(4));
      ecrire(f, 'visibility', (ei <= 0 || suivant >= 1) ? 'hidden' : 'visible');
      // une fois posé, le feuillet dérive encore un peu jusqu'à l'arrivée du suivant
      var fin = i ? plages[i - 1][1] : 0;
      var prochain = i < plages.length ? plages[i][0] : 1;
      var tenue = borne((p - fin) / (prochain - fin), 0, 1);
      profondeurs[i].forEach(function (el) {
        var k = parseFloat(el.dataset.profondeur);
        ecrire(el, '--dx', ((1 - ei) * k * w * .16 - tenue * k * w * .018).toFixed(1) + 'px');
      });
      if (i === feuillets.length - 1) ecrire(f, '--trace', adoucir(borne((p - .8) / .12, 0, 1)).toFixed(3));
    });
    if (actif !== actifUnivers) {
      actifUnivers = actif;
      uFixe.setAttribute('data-actif', actif);
      reperes.forEach(function (li) { li.classList.toggle('est-actif', +li.dataset.repere === actif); });
      videosFeuillets.forEach(function (liste, i) {
        liste.forEach(function (v) { if (i === actif) { v.preload = 'auto'; lire(v); } else v.pause(); });
      });
    }
    ecrire(uFixe, '--ro', p < .995 ? '1' : '0');
  }

  /* =====================================================================
     ACCUEIL · LA PELLICULE : deux bandes en sens contraire, qui penchent
     avec la vitesse du défilement
     ===================================================================== */
  var pellicule = d.querySelector('.pellicule');
  var bandes = tous('.pellicule__bande');
  function majPellicule(h, w) {
    var r = pellicule.getBoundingClientRect();
    if (r.bottom < -100 || r.top > h + 100) return;
    var p = borne((h - r.top) / (h + r.height), 0, 1);
    bandes.forEach(function (b) {
      var sens = Number(b.dataset.sens);
      var portee = Math.max(0, (b.offsetWidth - w) / 2);
      ecrire(b, '--px', ((p - .5) * 2 * portee * .9 * sens).toFixed(1) + 'px');
      ecrire(b, '--sk', borne(-vitesse * .14 * sens, -7, 7).toFixed(2) + 'deg');
    });
  }

  /* =====================================================================
     À PROPOS · LA COUVERTURE : vu dans le viseur, les lettres s'écartent
     ===================================================================== */
  var couverture = d.querySelector('.couverture');
  var cFixe = couverture ? couverture.querySelector('.couverture__fixe') : null;
  var lettres = tous('.couverture__lettre');
  var timecode = d.querySelector('[data-timecode]');
  function majCouverture(h, w) {
    var r = couverture.getBoundingClientRect();
    if (r.bottom <= 0) { ecrire(entete, '--logo-o', '1'); return; }
    var p = borne(-r.top / (r.height - h), 0, 1);
    var s = cFixe;
    var milieu = (lettres.length - 1) / 2;
    lettres.forEach(function (l, i) {
      ecrire(l, '--lx', ((i - milieu) * p * w * .07).toFixed(1) + 'px');
      ecrire(l, '--ly', (-Math.abs(i - milieu) * p * h * .04).toFixed(1) + 'px');
    });
    ecrire(s, '--cp', p.toFixed(4));
    ecrire(s, '--cz', (1 + p * .1).toFixed(4));
    ecrire(s, '--vz', (1 + p * .12).toFixed(4));
    ecrire(s, '--co', borne(1 - (p - .6) / .4, 0, 1).toFixed(3));
    ecrire(entete, '--logo-o', p > .5 ? '1' : '0');
    if (timecode) {
      var images = Math.floor(window.scrollY / 3) + 12;
      var sec = Math.floor(images / 25);
      texte(timecode, '00:' + deux(Math.floor(sec / 60) % 60) + ':' + deux(sec % 60) + ':' + deux(images % 25));
    }
  }

  /* =====================================================================
     À PROPOS · LA ROUTE : le chemin se trace, le van le suit
     ===================================================================== */
  var route = d.querySelector('.route__trajet');
  var chemin = route ? route.querySelector('.route__chemin') : null;
  var traceFond = chemin ? chemin.querySelector('.route__fond') : null;
  var trace = chemin ? chemin.querySelector('.route__trace') : null;
  var van = route ? route.querySelector('.route__van') : null;
  var etapes = route ? tous('.etape', route) : [];
  var longueur = 0;
  var sensVan = 1;
  function dessinerRoute() {
    if (!route) return;
    var W = route.offsetWidth, H = route.offsetHeight;
    var etroit = W < 700;
    chemin.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    chemin.setAttribute('width', W);
    chemin.setAttribute('height', H);
    var points = [[etroit ? 26 : W * .5, 0]];
    etapes.forEach(function (et, k) {
      var y = et.offsetTop + Math.min(et.offsetHeight / 2, 140);
      var x = etroit ? (k % 2 ? 34 : 18) : (et.classList.contains('etape--g') ? W * .66 : W * .34);
      points.push([x, y]);
    });
    points.push([etroit ? 26 : W * .5, H]);
    var dPath = 'M' + points[0][0].toFixed(1) + ' ' + points[0][1].toFixed(1);
    for (var i = 1; i < points.length; i++) {
      var a = points[i - 1], b = points[i], dy = (b[1] - a[1]) * .5;
      dPath += ' C' + a[0].toFixed(1) + ' ' + (a[1] + dy).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + (b[1] - dy).toFixed(1) + ' ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    }
    traceFond.setAttribute('d', dPath);
    trace.setAttribute('d', dPath);
    longueur = trace.getTotalLength();
    trace.style.strokeDasharray = longueur;
  }
  function majRoute(h) {
    var r = route.getBoundingClientRect();
    if (r.bottom < -h || r.top > 2 * h || !longueur) return;
    var p = borne((h * .62 - r.top) / r.height, 0, 1);
    ecrire(trace, 'stroke-dashoffset', (longueur * (1 - p)).toFixed(1));
    var pt = trace.getPointAtLength(longueur * p);
    var avant = trace.getPointAtLength(Math.max(0, longueur * p - 6));
    if (Math.abs(pt.x - avant.x) > .4) sensVan = pt.x < avant.x ? 1 : -1; // le van regarde vers la gauche
    ecrire(van, 'transform', 'translate(' + pt.x.toFixed(1) + 'px, ' + pt.y.toFixed(1) + 'px) translate(-50%, -88%) scaleX(' + sensVan + ') rotate(' + borne(vitesse * .25, -4, 4).toFixed(2) + 'deg)');
    etapes.forEach(function (et) {
      var re = et.getBoundingClientRect();
      if (re.top < h * .78) et.classList.add('est-atteinte');
    });
  }

  /* =====================================================================
     À PROPOS · L'ÉTALONNAGE : du rush brut à l'image finale, au défilement
     (on peut aussi faire glisser la ligne)
     ===================================================================== */
  var etalonnages = tous('.etalonnage').map(function (el) {
    var e = { el: el, libre: true };
    function placer(x) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--coupe', (borne((x - r.left) / r.width, 0, 1) * 100).toFixed(2) + '%');
    }
    el.addEventListener('pointerdown', function (ev) { e.libre = false; el.setPointerCapture(ev.pointerId); placer(ev.clientX); });
    el.addEventListener('pointermove', function (ev) { if (!e.libre && ev.buttons) placer(ev.clientX); });
    return e;
  });
  function majEtalonnages(h) {
    etalonnages.forEach(function (e) {
      if (!e.libre) return;
      var r = e.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > h) return;
      var p = adoucir(borne((h * .85 - r.top) / (h * .7), 0, 1));
      ecrire(e.el, '--coupe', (94 - p * 88).toFixed(2) + '%');
    });
  }

  /* =====================================================================
     À PROPOS · JE NE SUIS PAS / JE SUIS : la rature se trace au défilement
     ===================================================================== */
  var ratures = tous('.paire');
  function majRatures(h) {
    ratures.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > h + 50) return;
      var b = borne((h * .82 - r.top) / (h * .3), 0, 1);
      ecrire(el, '--b', b.toFixed(3));
      ecrire(el, '--o', adoucir(borne((b - .55) / .45, 0, 1)).toFixed(3));
    });
  }

  /* ---------- la corde à linge balance avec la vitesse du défilement ---------- */
  var cordes = tous('.corde');
  function majCordes() {
    cordes.forEach(function (c) { ecrire(c, '--vent', borne(vitesse * .5, -9, 9).toFixed(2) + 'deg'); });
  }

  /* =====================================================================
     CULINAIRE, CORPORATE · une progression par section, lue par le CSS
     data-progres="collant"  : 0 → 1 pendant que la section reste collée à l'écran
     data-progres="traverse" : 0 → 1 de son entrée en bas à sa sortie en haut
     data-progres="entree"   : 0 → 1 de son entrée en bas jusqu'à data-duree écrans plus loin
     ===================================================================== */
  var progres = tous('[data-progres]').map(function (el) {
    return { el: el, mode: el.dataset.progres, duree: parseFloat(el.dataset.duree || '0.8'), p: -1, compteurs: tous('[data-compteur]', el), seuilEntete: el.dataset.entete ? parseFloat(el.dataset.entete) : null };
  });
  function majProgres(h) {
    progres.forEach(function (o) {
      var r = o.el.getBoundingClientRect();
      if (r.bottom < -h * .5 || r.top > h * 1.5) return;
      var p;
      if (o.mode === 'collant') p = -r.top / Math.max(1, r.height - h);
      else if (o.mode === 'traverse') p = (h - r.top) / (h + r.height);
      else p = (h - r.top) / (h * o.duree);
      p = borne(p, 0, 1);
      // data-entete="0.4" : passé ce seuil la section est sombre en plein écran, l'en-tête passe en clair
      if (o.seuilEntete !== null) entete.classList.toggle('entete--clair', r.top <= 4 && r.bottom > 70 && p > o.seuilEntete);
      if (Math.abs(o.p - p) < .0004) return;
      o.p = p;
      ecrire(o.el, '--p', p.toFixed(4));
      o.compteurs.forEach(function (c) {
        var total = parseInt(c.dataset.total, 10) || 1;
        texte(c, deux(Math.min(total, Math.floor(p * total) + 1)));
      });
    });
  }

  /* ---------- corporate : la poussière dans la lumière de l'atelier ---------- */
  var poussieres = tous('canvas.poussiere').map(function (c) {
    var parts = [];
    for (var i = 0; i < 110; i++) {
      parts.push({ x: Math.random(), y: Math.random(), r: .4 + Math.random() * 1.7, v: .00025 + Math.random() * .0009, a: .15 + Math.random() * .55, ph: Math.random() * 6.283 });
    }
    return { c: c, ctx: c.getContext('2d'), parts: parts, w: 0, h: 0 };
  });
  function majPoussiere(t) {
    poussiereActive = false;
    poussieres.forEach(function (o) {
      var r = o.c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (!calme) poussiereActive = true;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = o.c.clientWidth, h = o.c.clientHeight;
      if (o.w !== w || o.h !== h) { o.w = w; o.h = h; o.c.width = w * dpr; o.c.height = h * dpr; o.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
      var ctx = o.ctx;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#FFE3C2';
      o.parts.forEach(function (p) {
        if (!calme) {
          p.y -= p.v;
          p.x += Math.sin(t / 2400 + p.ph) * .00025;
          if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        }
        ctx.globalAlpha = p.a * (.55 + .45 * Math.sin(t / 1100 + p.ph));
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, 6.283);
        ctx.fill();
      });
    });
  }

  /* ---------- corporate : le convoyeur file, les photos filent avec la vitesse ---------- */
  var lignes = tous('.ligne');
  function majLignes() {
    var flou = (Math.round(Math.min(Math.abs(vitesse) * .1, 5) * 2) / 2).toFixed(1) + 'px';
    lignes.forEach(function (l) { ecrire(l, '--flou', flou); });
  }

  /* ---------- corporate : la loupe passe sur la table lumineuse ---------- */
  var loupes = tous('.table-lum__plateau').map(function (plateau) {
    var loupe = plateau.querySelector('.loupe');
    var verre = loupe ? loupe.querySelector('.loupe__verre') : null;
    var diapos = plateau.querySelector('.diapos');
    if (!verre || !diapos) return null;
    var clone = diapos.cloneNode(true);
    clone.classList.add('diapos--loupe');
    clone.setAttribute('aria-hidden', 'true');
    tous('img', clone).forEach(function (img) { img.alt = ''; });
    verre.appendChild(clone);
    return { plateau: plateau, loupe: loupe, diapos: diapos, clone: clone, section: plateau.closest('[data-progres]') };
  }).filter(Boolean);
  function majLoupes() {
    loupes.forEach(function (o) {
      if (!o.loupe.offsetWidth) return;  // masquée sur mobile
      var pl = o.plateau.getBoundingClientRect();
      if (pl.bottom < 0 || pl.top > window.innerHeight) return;
      var mp = memoire.get(o.section); var p = mp && mp['--p'] ? parseFloat(mp['--p']) : 0;
      var q = adoucir(borne((p - .22) / .5, 0, 1));
      var dr = o.diapos.getBoundingClientRect();
      var dx0 = dr.left - pl.left, dy0 = dr.top - pl.top;
      var cx = dx0 + dr.width * (.06 + q * .88), cy = dy0 + dr.height * .5;
      var t = o.loupe.offsetWidth, s = 2.3;
      ecrire(o.loupe, 'transform', 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)');
      ecrire(o.clone, 'width', dr.width + 'px');
      ecrire(o.clone, 'transform', 'translate(' + (t / 2 - (cx - dx0) * s).toFixed(1) + 'px,' + (t / 2 - (cy - dy0) * s).toFixed(1) + 'px) scale(' + s + ')');
    });
  }

  /* ---------- corporate : le compteur de temps avance avec la page (data-temps="durée en secondes") ---------- */
  var temps = tous('[data-temps]').map(function (el) { return { el: el, duree: parseFloat(el.dataset.temps) || 60, dernier: '' }; });
  function majTemps(h) {
    var course = Math.max(1, d.documentElement.scrollHeight - h);
    var images = Math.round(borne(window.scrollY / course, 0, 1) * temps[0].duree * 24);
    temps.forEach(function (o) {
      var s = Math.floor(images / 24);
      var t = '00:' + deux(Math.floor(s / 60)) + ':' + deux(s % 60) + ':' + deux(images % 24);
      if (t !== o.dernier) { o.dernier = t; o.el.textContent = t; }
    });
  }

  /* ---------- le bouton son d'un film d'ouverture (data-son="#id-de-la-video") ---------- */
  tous('[data-son]').forEach(function (bouton) {
    var film = d.querySelector(bouton.dataset.son);
    var texte = bouton.querySelector('span');
    if (!film) return;
    bouton.addEventListener('click', function () {
      film.muted = !film.muted;
      if (!film.muted) { try { film.volume = 1; } catch (e) {} lire(film); }
      bouton.setAttribute('aria-pressed', String(!film.muted));
      if (texte) texte.textContent = film.muted ? 'Activer le son' : 'Couper le son';
    });
  });

  /* =====================================================================
     LA BOUCLE
     ===================================================================== */
  function tout() {
    var h = window.innerHeight, w = window.innerWidth;
    var y = window.scrollY;
    vitesse += ((y - dernierY) - vitesse) * .12;
    dernierY = y;
    if (encres.length && !calme) majEncres(h);
    if (ouverture && oFixe) majOuverture(h);
    if (univers && uFixe) majUnivers(h, w);
    if (pellicule && bandes.length) majPellicule(h, w);
    if (couverture && cFixe) majCouverture(h, w);
    if (route && longueur) majRoute(h);
    if (etalonnages.length) majEtalonnages(h);
    if (ratures.length) majRatures(h);
    if (cordes.length) majCordes();
    if (progres.length) majProgres(h);
    if (lignes.length) majLignes();
    if (loupes.length) majLoupes();
    if (temps.length) majTemps(h);
    if (poussieres.length) majPoussiere(window.performance ? window.performance.now() : Date.now());
    vider();
  }
  var poussiereActive = false, enCours = false, dernierEtat = '';
  function boucle() {
    tout();
    var etat = window.scrollY + ':' + window.innerHeight + ':' + window.innerWidth;
    var bouge = etat !== dernierEtat;
    dernierEtat = etat;
    // on continue tant que la page bouge, que l'élan retombe, ou que la poussière vole
    if (bouge || Math.abs(vitesse) > .05 || poussiereActive) window.requestAnimationFrame(boucle);
    else { enCours = false; vitesse = 0; }
  }
  function planifier() {
    if (enCours) return;
    enCours = true;
    window.requestAnimationFrame(boucle);
  }

  dessinerRoute();
  var minuterieRoute = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(minuterieRoute);
    minuterieRoute = window.setTimeout(dessinerRoute, 150);
  });
  window.addEventListener('load', dessinerRoute);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(dessinerRoute);

  // ?capture : pas de boucle (les captures headless n'en font pas tourner), l'état suit le défilement
  var capture = new URLSearchParams(window.location.search).has('capture');
  if (capture) {
    var figer = function () { vitesse = 0; dernierY = window.scrollY; tout(); vitesse = 0; };
    window.addEventListener('scroll', figer, { passive: true });
    window.addEventListener('load', function () { window.setTimeout(figer, 500); window.setTimeout(figer, 1200); });
    figer();
  } else {
    if (calme) tous('.encre .mot').forEach(function (m) { m.classList.add('est-encre'); });
    planifier();
    window.addEventListener('scroll', planifier, { passive: true });
    window.addEventListener('resize', planifier);
    window.addEventListener('load', planifier);
    if ('ResizeObserver' in window) new ResizeObserver(planifier).observe(d.body);
  }
})();
