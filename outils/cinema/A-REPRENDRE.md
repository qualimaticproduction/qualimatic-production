# À reprendre : pages « expérience au scroll »

Point d'étape du 29 septembre 2026. Tout le travail est sur la branche `claude/analyse-dlvrd-site-9p1lqq`
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

### À ne pas oublier
- [ ] **Retirer les raccourcis en haut à droite (Films · Tarifs · Avis · Contact) pendant l'expérience.**
      Sinon les visiteurs cliquent directement sur « Tarifs » et ratent la visite.
      Les afficher seulement une fois toute l'animation déroulée (et éventuellement dès l'arrivée
      pour les visiteurs qui reviennent, mémorisé sur leur appareil).
- [ ] Nouvelle vidéo en bonne qualité (1080p minimum, idéalement 4K), en 16:9 **et** 9:16,
      avec les mêmes plans fixes : cadres, couverture, livre ouvert, bureau (feuille vierge + encrier).
- [ ] Vraies miniatures des 3 films dans les cadres + lecture dans un lecteur par-dessus la page (Bunny).
- [ ] Envoi réel de la lettre (Web3Forms, comme le formulaire actuel), puis cachet de cire.
- [ ] Intégrer dans `mariage.html` : l'expérience en haut, puis FAQ, zones, partenaires en dessous (SEO).
- [ ] Remplacer `overflow-x: hidden` par `overflow-x: clip` sur html/body (sinon l'effet « collé » au scroll casse).
- [ ] Vérifier les contenus : formules, avis choisis, textes du livre.

### Idées d'amélioration proposées
- Cadres « vivants » : un extrait muet de chaque film en boucle dans le cadre au lieu d'une image fixe.
- Son d'ambiance facultatif (bouton « Activer le son ») : oiseaux dans le jardin, pas dans le hall,
  froissement des pages, plume qui gratte, cachet qui se pose.
- Disponibilité de la date : dans la lettre, dès que la date est écrite, « Cette date est encore libre »
  (liste des dates réservées tenue à jour).
- Une page « Options à la carte & en pratique » dans le livre, et la plaquette PDF en marque-page.
- Réponse automatique au couple après l'envoi, dans le même style (lettre + cachet).
- Version allégée si la connexion est lente, et version sans animation (accessibilité, Google).
- Mesurer jusqu'où les visiteurs vont dans la visite, pour ajuster la longueur.

## 2. Salle de projection (livraison des films) : en place, à finaliser

- Page des Vibiches : `livraison/les-vibiches/` (code `PREMIERE-1139`), film sur Bunny Stream.
- Outil pour chaque nouveau couple : `outils/cinema/nouvelle-seance.html`.
- [ ] Liens de téléchargement (film 4K, teaser), lien d'avis Google, mot personnel définitif.
- [ ] Accord des Vibiches pour afficher leur affiche dans « Votre séance ».
- [ ] Bunny : domaines autorisés `qualimaticproduction.fr` et `www.qualimaticproduction.fr`.
- [ ] Fusionner la pull request #1, puis tester sur le vrai site (téléphone + ordinateur).
- [ ] Version verticale (9:16) de la vidéo du cinéma pour les téléphones.
