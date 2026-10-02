# Qualimatic Poses

Une appli personnelle pour garder vos inspirations de poses et vous en servir pendant les tournages.
Elle s'installe sur l'écran d'accueil de l'iPhone et fonctionne sans réseau.

Aucun compte, aucun serveur : vos photos et vos fiches restent sur le téléphone.

## Adresse

Une fois le site mis à jour : **https://qualimaticproduction.fr/poses/**

La page n'est pas référencée par Google (balise `noindex`) et ne contient aucune donnée :
chaque téléphone garde ses propres poses.

## Installer sur l'iPhone

1. Ouvrir l'adresse ci-dessus dans **Safari** (pas Chrome).
2. Toucher le bouton **Partager** (le carré avec une flèche vers le haut).
3. Choisir **Sur l'écran d'accueil**, puis **Ajouter**.
4. Toujours ouvrir l'appli depuis cette icône. C'est elle qui garde vos données.

## Sauvegarder

Réglages › **Exporter tout** › **Enregistrer le fichier** › *Enregistrer dans Fichiers* › iCloud Drive.

Le fichier `.zip` contient toutes les photos et un fichier `donnees.json` avec les fiches.
Pour restaurer ou changer de téléphone : Réglages › **Restaurer une sauvegarde**.

## Publier une nouvelle version (pour la personne qui modifie le code)

Changer le numéro de version à deux endroits : `sw.js` (`VERSION`) et `js/version.js`.
Sans ça, les téléphones garderaient l'ancienne version en mémoire.

## Organisation des fichiers

- `index.html` : la page de l'appli
- `css/app.css` : l'apparence (couleurs, polices, mise en page)
- `js/` : le fonctionnement (`views/` contient un fichier par écran)
- `sw.js` : le mode hors connexion
- `fonts/` : Playfair Display et Inter (licence SIL OFL), incluses pour marcher hors ligne
- `icons/` : l'icône ✻
