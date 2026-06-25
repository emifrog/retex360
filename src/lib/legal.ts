// Liens légaux (site vitrine / pages légales). Configurable via
// NEXT_PUBLIC_LEGAL_BASE_URL pour ne pas coder en dur un host de déploiement ;
// défaut = site actuel. Pointez-le vers le domaine de production le moment venu.
const base =
  process.env.NEXT_PUBLIC_LEGAL_BASE_URL || 'https://retex360-platform.netlify.app/pages';

export const LEGAL_LINKS = {
  mentionsLegales: `${base}/mentions-legales`,
  cgu: `${base}/cgu`,
  confidentialite: `${base}/confidentialite`,
};
