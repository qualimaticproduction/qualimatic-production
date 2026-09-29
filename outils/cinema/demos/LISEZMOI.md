# Démos de la page mariage

- `mariage-chateau.html` : visite du château au scroll (films dans les cadres, tarifs et avis dans le livre, lettre écrite à la plume et scellée à la cire).
- `plume.html` : la plume seule qui écrit le formulaire.

Ces démos attendent, à côté d'elles :
- `f/000.webp` … `f/360.webp` : la vidéo `source/chateau-16x9.mp4` découpée à 12 i/s
  (`ffmpeg -i source/chateau-16x9.mp4 -vf fps=12 -c:v libwebp -quality 64 -start_number 0 f/%03d.webp`) ;
- `img/film.jpg`, `img/film-complet.jpg`, `img/teaser.jpg` (affiches des films) et `img/plume.webp` (copie de `assets/mariage/plume.webp`).

Plans fixes repérés dans la vidéo (images à 12 i/s) : cadres 138, couverture 204, livre ouvert 248, bureau 345.
