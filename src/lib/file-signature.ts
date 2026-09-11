/**
 * Validation du type réel d'un fichier téléversé par ses octets d'en-tête
 * (« magic bytes »), indépendamment du Content-Type annoncé par le client.
 *
 * `File.type`, dans un multipart, est DÉCLARATIF : il est choisi par le client
 * et ne coûte rien à falsifier. Sharp, lui, ne le lit pas — il détecte le format
 * par le contenu réel. Valider sur le type déclaré tout en décodant le contenu
 * réel laisse donc passer n'importe quel format vers le décodeur : un HEIF/AVIF
 * annoncé `image/jpeg` traverse la liste blanche déclarative et atteint libheif,
 * dont la surface est sans commune mesure avec celle des quatre formats
 * réellement acceptés ici (cf. GHSA-rgj7-g3m4-5g8c sur sharp < 0.35.4).
 *
 * Le contrôle est une LISTE BLANCHE de signatures : tout ce qui n'est pas
 * reconnu est refusé. Les formats jamais prévus (HEIF, AVIF, TIFF, SVG, BMP…)
 * sont donc écartés par construction, sans avoir à les énumérer — et un format
 * apparu après l'écriture de ce module l'est aussi.
 */

export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMimeType(value: string): value is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

/** Compare les octets de `buffer` à `bytes` à partir de `offset`. */
function bytesAt(buffer: Buffer, bytes: readonly number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buffer[offset + i] !== bytes[i]) return false;
  }
  return true;
}

const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF87A = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]; // "GIF87a"
const GIF89A = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]; // "GIF89a"
const RIFF = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"

/**
 * Type réel du contenu, ou `null` si la signature n'est pas dans la liste
 * blanche (fichier tronqué, format non autorisé, ou contenu quelconque).
 */
export function sniffMimeType(buffer: Buffer): AllowedMimeType | null {
  if (bytesAt(buffer, JPEG)) return 'image/jpeg';
  if (bytesAt(buffer, PNG)) return 'image/png';
  if (bytesAt(buffer, GIF87A) || bytesAt(buffer, GIF89A)) return 'image/gif';
  // WebP est un conteneur RIFF : « RIFF » seul ne tranche pas (un WAV commence
  // par les mêmes quatre octets), c'est la marque « WEBP » à l'offset 8 qui
  // identifie le format.
  if (bytesAt(buffer, RIFF) && bytesAt(buffer, WEBP, 8)) return 'image/webp';
  if (bytesAt(buffer, PDF)) return 'application/pdf';
  return null;
}

export type FileTypeCheck =
  | { ok: true; type: AllowedMimeType }
  | { ok: false; reason: 'unrecognized' | 'mismatch'; detected: AllowedMimeType | null };

/**
 * Garde d'upload : le contenu doit être d'un type autorisé ET correspondre au
 * type annoncé. En cas de succès, renvoie le type VÉRIFIÉ — c'est lui qu'il
 * faut utiliser en aval (extension, aiguillage d'optimisation, colonne
 * `file_type`), jamais le type déclaré, pour que plus aucune décision ne
 * dépende d'une valeur fournie par le client.
 */
export function verifyFileType(buffer: Buffer, declaredType: string): FileTypeCheck {
  const detected = sniffMimeType(buffer);
  if (detected === null) return { ok: false, reason: 'unrecognized', detected: null };
  if (detected !== declaredType) return { ok: false, reason: 'mismatch', detected };
  return { ok: true, type: detected };
}
