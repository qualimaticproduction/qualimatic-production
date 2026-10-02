/* ============================================
   QUALIMATIC POSES — nav.js
   Navigation entre les écrans (adresse après le #).
   ============================================ */

/* Aller vers un écran (ajoute une étape à l'historique) */
export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

/* Revenir vers un écran parent (remplace l'étape actuelle) */
export function back(hash) {
  location.replace(hash);
}
