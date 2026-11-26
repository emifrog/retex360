/**
 * Règles d'accès à un REX, côté application.
 *
 * La base reste la garantie (policies RLS et trigger `rex_guard_write`). Ces
 * fonctions en sont le MIROIR : l'interface s'en sert pour ne pas proposer une
 * action que la base refusera, et les routes pour répondre un message lisible.
 * Module sans dépendance, utilisable depuis un composant client comme depuis
 * une route.
 */

export interface RexViewer {
  id: string;
  role: string;
  sdis_id?: string | null;
}

export interface RexAccessFields {
  author_id: string;
  sdis_id: string | null;
  status: string | null;
  rejection_reason?: string | null;
}

/** Admin du SDIS du REX, ou super_admin (transverse). */
function administersRex(viewer: RexViewer, rex: RexAccessFields): boolean {
  if (viewer.role === 'super_admin') return true;
  return viewer.role === 'admin' && Boolean(rex.sdis_id) && viewer.sdis_id === rex.sdis_id;
}

/**
 * Suppression — miroir de la policy « Admins can delete REX » (migration 026).
 *
 * L'auteur supprime ses brouillons et ses REX en attente. Une fois validé, un
 * REX a été approuvé par un tiers et peut être consulté par d'autres SDIS : sa
 * suppression revient aux admins du SDIS.
 */
export function canDeleteRex(viewer: RexViewer | null | undefined, rex: RexAccessFields): boolean {
  if (!viewer) return false;
  if (administersRex(viewer, rex)) return true;
  return viewer.id === rex.author_id && rex.status !== 'validated';
}

/**
 * Motif de rejet à afficher, ou `null`.
 *
 * Montré au seul auteur, et seulement tant que le REX est revenu en brouillon :
 * une fois soumis de nouveau, le motif appartient au passé.
 */
export function rejectionReasonFor(
  viewer: RexViewer | null | undefined,
  rex: RexAccessFields
): string | null {
  if (!viewer || viewer.id !== rex.author_id || rex.status !== 'draft') return null;
  const reason = rex.rejection_reason?.trim();
  return reason ? reason : null;
}
