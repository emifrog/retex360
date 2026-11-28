import sharp from 'sharp';

/**
 * Photos jointes, préparées pour le PDF.
 *
 * Toute image envoyée est stockée en WebP (`image-optimizer.ts`). Or
 * `@react-pdf/renderer` n'accepte que le JPEG et le PNG : les photos étaient
 * téléchargées à chaque export, puis écartées sans message. Aucun PDF n'en
 * contenait.
 *
 * Elles sont donc converties en JPEG au moment de l'export, et remises au
 * gabarit sous forme d'URI `data:` — il n'a plus rien à télécharger lui-même.
 */

/** Plus grand côté d'une photo dans le PDF. Au-delà, elle n'apporte que du poids. */
export const PDF_IMAGE_MAX_SIDE = 1400;

export async function toPdfJpeg(input: Buffer | Uint8Array): Promise<Buffer> {
  return (
    sharp(input)
      // Applique l'orientation EXIF avant qu'elle ne soit perdue à la conversion.
      .rotate()
      .resize({
        width: PDF_IMAGE_MAX_SIDE,
        height: PDF_IMAGE_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // Le JPEG n'a pas de transparence : sans fond, elle devient noire.
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  );
}

export interface PdfImageSource {
  name: string;
  url: string;
}

async function fetchImageBytes(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Téléchargement refusé (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Télécharge et convertit les photos. Une photo illisible ou introuvable est
 * signalée par `onError` et laissée de côté : elle ne doit pas faire échouer
 * l'export de tout le dossier.
 */
export async function loadPdfImages(
  sources: readonly PdfImageSource[],
  options: {
    fetchBytes?: (url: string) => Promise<Buffer | Uint8Array>;
    onError?: (name: string, error: unknown) => void;
  } = {}
): Promise<PdfImageSource[]> {
  const fetchBytes = options.fetchBytes ?? fetchImageBytes;

  const converted = await Promise.all(
    sources.map(async ({ name, url }) => {
      try {
        const jpeg = await toPdfJpeg(await fetchBytes(url));
        return { name, url: `data:image/jpeg;base64,${jpeg.toString('base64')}` };
      } catch (error) {
        options.onError?.(name, error);
        return null;
      }
    })
  );

  return converted.filter((image): image is PdfImageSource => image !== null);
}
