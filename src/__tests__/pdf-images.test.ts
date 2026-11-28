/**
 * @jest-environment node
 */
import sharp from 'sharp';
import { toPdfJpeg, loadPdfImages, PDF_IMAGE_MAX_SIDE } from '@/lib/pdf/images';

/**
 * Les photos n'apparaissaient jamais dans le PDF : toute image envoyée est
 * stockée en WebP, format que la bibliothèque de génération n'accepte pas
 * (JPEG et PNG seulement). Elles étaient téléchargées à chaque export, puis
 * écartées sans message.
 */
describe('PDF — photos jointes', () => {
  const isJpeg = (buffer: Buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  let webp: Buffer;
  let largeWebp: Buffer;
  let transparentPng: Buffer;

  beforeAll(async () => {
    webp = await sharp({
      create: { width: 320, height: 200, channels: 3, background: { r: 200, g: 30, b: 30 } },
    })
      .webp()
      .toBuffer();
    largeWebp = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 0, g: 80, b: 160 } },
    })
      .webp()
      .toBuffer();
    transparentPng = await sharp({
      create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer();
  });

  describe('toPdfJpeg', () => {
    it('convertit une image WebP en JPEG', async () => {
      const jpeg = await toPdfJpeg(webp);
      expect(isJpeg(jpeg)).toBe(true);
      const meta = await sharp(jpeg).metadata();
      expect(meta.format).toBe('jpeg');
      expect(meta.width).toBe(320);
    });

    it('réduit une grande photo sans la déformer', async () => {
      const meta = await sharp(await toPdfJpeg(largeWebp)).metadata();
      expect(meta.width).toBe(PDF_IMAGE_MAX_SIDE);
      expect(meta.height).toBe(Math.round((PDF_IMAGE_MAX_SIDE * 3000) / 4000));
    });

    it('pose un fond blanc sous une image transparente', async () => {
      // Le JPEG n'a pas de transparence : sans fond, le transparent devient noir.
      const { data } = await sharp(await toPdfJpeg(transparentPng))
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect(data[0]).toBeGreaterThan(240);
      expect(data[1]).toBeGreaterThan(240);
      expect(data[2]).toBeGreaterThan(240);
    });

    it("refuse ce qui n'est pas une image", async () => {
      await expect(toPdfJpeg(Buffer.from('pas une image'))).rejects.toThrow();
    });
  });

  describe('loadPdfImages', () => {
    it('rend chaque photo sous une forme que le PDF sait afficher', async () => {
      const images = await loadPdfImages(
        [
          { name: 'facade.webp', url: 'https://stockage.test/facade' },
          { name: 'sitac.webp', url: 'https://stockage.test/sitac' },
        ],
        { fetchBytes: async () => webp }
      );
      expect(images.map((i) => i.name)).toEqual(['facade.webp', 'sitac.webp']);
      for (const image of images) {
        expect(image.url).toMatch(/^data:image\/jpeg;base64,/);
        const bytes = Buffer.from(image.url.split(',')[1], 'base64');
        expect(isJpeg(bytes)).toBe(true);
      }
    });

    it("garde les autres photos quand l'une est illisible ou introuvable", async () => {
      const failures: string[] = [];
      const images = await loadPdfImages(
        [
          { name: 'bonne.webp', url: 'ok' },
          { name: 'abimee.webp', url: 'corrompue' },
          { name: 'absente.webp', url: 'introuvable' },
          { name: 'bonne-2.webp', url: 'ok' },
        ],
        {
          fetchBytes: async (url) => {
            if (url === 'introuvable') throw new Error('404');
            return url === 'corrompue' ? Buffer.from('xx') : webp;
          },
          onError: (name) => failures.push(name),
        }
      );
      expect(images.map((i) => i.name)).toEqual(['bonne.webp', 'bonne-2.webp']);
      expect(failures.sort()).toEqual(['abimee.webp', 'absente.webp']);
    });

    it('conserve l’ordre des pièces jointes', async () => {
      // Les conversions sont lancées ensemble : la plus rapide ne doit pas passer devant.
      const images = await loadPdfImages(
        [
          { name: '1', url: 'lente' },
          { name: '2', url: 'rapide' },
        ],
        {
          fetchBytes: async (url) => {
            if (url === 'lente') await new Promise((r) => setTimeout(r, 30));
            return webp;
          },
        }
      );
      expect(images.map((i) => i.name)).toEqual(['1', '2']);
    });

    it('ne fait rien sans photo', async () => {
      expect(await loadPdfImages([], { fetchBytes: async () => webp })).toEqual([]);
    });
  });
});
