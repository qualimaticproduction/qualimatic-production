# À reprendre : pages « expérience au scroll »

Point d'étape du 1er octobre 2026. Tout le travail est sur la branche `claude/analyse-dlvrd-site-9p1lqq`
(pull request #1).

## 1. Page mariage « visite du château » (démo validée, à refaire en version finale)

Démo : `outils/cinema/demos/mariage-chateau.html` (+ `demos/plume.html`, `demos/LISEZMOI.md`).
Vidéo de la démo : `outils/cinema/source/chateau-16x9.mp4` (720p, 30 s).

### Inspirations pour la nouvelle vidéo (`outils/cinema/inspiration/`)
1. `1-salon-sauge-damier` : boiseries crème, lustre de cristal, sol en damier noir et blanc, velours vert sauge.
2. `2-escalier-pierre-lanterne` : grand escalier de pierre, rampe en fer forgé et or, lanterne, damier → **le hall**.
3. `3-boiserie-miroir-tableaux` : boiseries gris-bleu, cadres dorés éclairés par des lampes à tableau → **le mur des films**.
4. `4-salon-bleu-fenetre-jardin` : soleil par une porte-fenêtre ouverte sur le jardin, lustre → **le salon au livre et le bureau**.
5. `5-villa-allee-cypres` : allée de cyprès, parterres de buis, heure dorée → **l'arrivée en drone**.

### Plan de la version finale (point du 1er octobre 2026)

**Étape 1 : la matière (Charly)**
- [ ] Générer la vidéo v2 avec `prompt-chateau-v2.md`, en 1080p minimum, **16:9 et 9:16**.
      Vérifier image par image : couverture lisible (« Qualimatic », « Tarifs 2027-2028 », logo),
      cadres / pages / feuille vierges, moments d'arrêt vraiment immobiles.
- [ ] **Générer l'image du cachet de cire rouge avec le logo** (vue de dessus, fond uni, haute définition).
- [ ] Choisir : 3 doubles pages (Élégance, Signature, avis) ou 4 (+ options à la carte et infos pratiques,
      il faut alors 3 pages qui tournent dans la vidéo).
- [ ] Miniatures des 3 films (ou extraits de 5 s pour des cadres « vivants »).

**Étape 2 : la construction (Claude)**
- [ ] Repérer les plans fixes et les zones (cadres, couverture, pages, feuille, encrier) dans la nouvelle vidéo.
- [ ] Moteur réutilisable (`assets/mariage/chateau.js` + CSS), intégré en haut de `mariage.html` à la place
      de la vidéo d'en-tête ; FAQ, zones, partenaires et le reste restent en dessous (référencement).
- [ ] Rythme : entrée rapide, scroll total raccourci par rapport à la démo.
- [ ] **Raccourcis Films · Tarifs · Avis · Contact cachés pendant la visite**, affichés une fois la visite
      terminée (et d'emblée pour les visiteurs qui reviennent).
- [ ] Lettre : **case de consentement RGPD** (obligatoire, comme le formulaire actuel), envoi réel par
      Web3Forms (mêmes champs et clé que le formulaire actuel), protection anti-spam, messages d'erreur
      écrits à l'encre, cachet de cire à l'envoi.
- [ ] Films : lecteur Bunny par-dessus la page au clic.
- [ ] Les affiches restent dans les cadres pendant que la caméra repart (suivi du mouvement), au lieu de s'effacer.
- [ ] Version anglaise (`en/wedding.html`) : textes du livre et de la lettre traduits.
- [ ] Deux qualités d'images (téléphone / ordinateur), chargement progressif, image d'attente.
- [ ] Remplacer `overflow-x: hidden` par `overflow-x: clip` sur html/body.
- [ ] Version sans animation (réglage « réduire les animations », connexion lente, échec du script) :
      la page actuelle classique.
- [ ] Mesure d'audience par chapitre (Google Analytics déjà présent sur le site).

**Étape 3 : les essais**
- [ ] Tests sur vrai iPhone (Safari) et Android, ordinateur, tablette.
- [ ] Pull request séparée de la #1 (salle de projection), pour ne pas bloquer l'une avec l'autre.

### Idées en réserve
- Cadres « vivants » (extrait muet en boucle), son d'ambiance facultatif, disponibilité de la date dans la lettre,
  réponse automatique au couple (lettre + cachet), lien « ou appelez-moi / WhatsApp » discret sur le bureau,
  le 4e film « Réseaux sociaux » (petit cadre ou téléphone posé sur le bureau).

## 2. Salle de projection (livraison des films) : en place, à finaliser

- Page des Vibiches : `livraison/les-vibiches/` (code `PREMIERE-1139`), film sur Bunny Stream.
- Outil pour chaque nouveau couple : `outils/cinema/nouvelle-seance.html`.
- [ ] Liens de téléchargement (film 4K, teaser), lien d'avis Google, mot personnel définitif.
- [ ] Accord des Vibiches pour afficher leur affiche dans « Votre séance ».
- [ ] Bunny : domaines autorisés `qualimaticproduction.fr` et `www.qualimaticproduction.fr`.
- [ ] Fusionner la pull request #1, puis tester sur le vrai site (téléphone + ordinateur).
- [ ] Version verticale (9:16) de la vidéo du cinéma pour les téléphones.
