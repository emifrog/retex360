/**
 * Chemins de stockage des pièces jointes.
 *
 * La route d'upload écrit toujours `rex-attachments/<id du déposant>/<fichier>`.
 * Module sans dépendance : les règles ci-dessous sont testées sans avoir à
 * charger un client de stockage.
 */

const ATTACHMENTS_PREFIX = 'rex-attachments/';

/** Chemin de la vignette WebP dérivée d'une pièce jointe. */
export function thumbnailPathFor(storagePath: string): string {
  return storagePath.replace(/\.[^.]+$/, '_thumb.webp');
}

/**
 * Le chemin est-il bien dans le dossier de ce déposant ?
 *
 * Miroir de la policy de la migration 026. Les routes de suppression purgent
 * les fichiers avec le rôle service, qui ignore toute règle d'accès : sans ce
 * contrôle, une ligne pointant vers le fichier d'un autre le ferait effacer.
 */
export function isInUploaderFolder(
  storagePath: string,
  uploaderId: string | null | undefined
): boolean {
  if (!uploaderId) return false;
  if (storagePath.includes('..')) return false;
  return storagePath.startsWith(`${ATTACHMENTS_PREFIX}${uploaderId}/`);
}

/**
 * Objets à purger pour un ensemble de pièces jointes supprimées : le fichier et
 * sa vignette, pour les seules lignes dont le chemin appartient au déposant.
 */
export function purgeablePaths(
  attachments: { storage_path: string; uploaded_by: string | null }[]
): string[] {
  return attachments
    .filter((a) => isInUploaderFolder(a.storage_path, a.uploaded_by))
    .flatMap((a) => [a.storage_path, thumbnailPathFor(a.storage_path)]);
}
