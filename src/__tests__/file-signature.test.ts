import sharp from 'sharp';
import {
  ALLOWED_MIME_TYPES,
  isAllowedMimeType,
  sniffMimeType,
  verifyFileType,
} from '@/lib/file-signature';

/**
 * Les fixtures d'images sont produites par Sharp plutôt qu'écrites à la main :
 * un test qui valide une signature contre des octets que le test a lui-même
 * inventés ne prouve rien sur les fichiers réels.
 *
 * Les formats REFUSÉS, eux, sont forgés : c'est précisément ce que Sharp ne
 * doit jamais avoir l'occasion de décoder.
 */
describe('file-signature', () => {
  let jpeg: Buffer;
  let png: Buffer;
  let gif: Buffer;
  let webp: Buffer;

  beforeAll(async () => {
    const square = () =>
      sharp({
        create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 30, b: 30 } },
      });
    jpeg = await square().jpeg().toBuffer();
    png = await square().png().toBuffer();
    gif = await square().gif().toBuffer();
    webp = await square().webp().toBuffer();
  });

  describe('sniffMimeType — formats autorisés', () => {
    it('reconnaît un JPEG', () => expect(sniffMimeType(jpeg)).toBe('image/jpeg'));
    it('reconnaît un PNG', () => expect(sniffMimeType(png)).toBe('image/png'));
    it('reconnaît un GIF', () => expect(sniffMimeType(gif)).toBe('image/gif'));
    it('reconnaît un WebP', () => expect(sniffMimeType(webp)).toBe('image/webp'));

    it('reconnaît un PDF', () => {
      expect(sniffMimeType(Buffer.from('%PDF-1.7\n%âãÏÓ\n'))).toBe('application/pdf');
    });

    it('reconnaît la variante GIF87a', () => {
      // Sharp n'émet que du GIF89a ; la 87a reste valide et doit passer.
      const gif87a = Buffer.concat([Buffer.from('GIF87a', 'ascii'), Buffer.alloc(16)]);
      expect(sniffMimeType(gif87a)).toBe('image/gif');
    });
  });

  describe('sniffMimeType — ce qui doit être refusé', () => {
    it("refuse un AVIF (le vecteur d'attaque visé : conteneur ISO-BMFF)", () => {
      // 4 octets de taille, puis "ftyp", puis la marque de format "avif".
      const avif = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]),
        Buffer.from('ftypavif', 'ascii'),
        Buffer.alloc(16),
      ]);
      expect(sniffMimeType(avif)).toBeNull();
    });

    it('refuse un HEIC', () => {
      const heic = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from('ftypheic', 'ascii'),
        Buffer.alloc(16),
      ]);
      expect(sniffMimeType(heic)).toBeNull();
    });

    it("refuse un RIFF qui n'est pas un WebP (un WAV commence par les mêmes octets)", () => {
      const wav = Buffer.concat([
        Buffer.from('RIFF', 'ascii'),
        Buffer.from([0x24, 0x08, 0x00, 0x00]),
        Buffer.from('WAVE', 'ascii'),
        Buffer.alloc(16),
      ]);
      expect(sniffMimeType(wav)).toBeNull();
    });

    it('refuse un SVG (XSS stocké : jamais décodé, jamais servi)', () => {
      expect(
        sniffMimeType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))
      ).toBeNull();
    });

    it('refuse un TIFF', () => {
      expect(sniffMimeType(Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00]))).toBeNull();
    });

    it('refuse un buffer vide', () => expect(sniffMimeType(Buffer.alloc(0))).toBeNull());

    it('refuse un fichier tronqué avant la fin de sa signature', () => {
      expect(sniffMimeType(png.subarray(0, 4))).toBeNull();
    });

    it('refuse un RIFF tronqué avant la marque WEBP', () => {
      // Couvre le cas où « RIFF » matche mais l'offset 8 sort du buffer.
      expect(sniffMimeType(Buffer.from('RIFF1234', 'ascii'))).toBeNull();
    });

    it('refuse du texte quelconque', () => {
      expect(sniffMimeType(Buffer.from('pas un fichier image du tout'))).toBeNull();
    });
  });

  describe('verifyFileType', () => {
    it('accepte un contenu conforme au type déclaré', () => {
      expect(verifyFileType(jpeg, 'image/jpeg')).toEqual({ ok: true, type: 'image/jpeg' });
    });

    it('refuse un AVIF annoncé en JPEG — le contournement que la route subissait', () => {
      const avif = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20]),
        Buffer.from('ftypavif', 'ascii'),
        Buffer.alloc(16),
      ]);
      expect(verifyFileType(avif, 'image/jpeg')).toEqual({
        ok: false,
        reason: 'unrecognized',
        detected: null,
      });
    });

    it('refuse un PNG annoncé en JPEG et signale le type réel', () => {
      expect(verifyFileType(png, 'image/jpeg')).toEqual({
        ok: false,
        reason: 'mismatch',
        detected: 'image/png',
      });
    });

    it('refuse un PDF annoncé en image', () => {
      expect(verifyFileType(Buffer.from('%PDF-1.4'), 'image/png')).toEqual({
        ok: false,
        reason: 'mismatch',
        detected: 'application/pdf',
      });
    });

    it('refuse un type déclaré hors liste blanche même si le contenu est valide', () => {
      expect(verifyFileType(png, 'image/svg+xml')).toEqual({
        ok: false,
        reason: 'mismatch',
        detected: 'image/png',
      });
    });

    it('accepte chacun des types de la liste blanche avec son contenu réel', () => {
      const fixtures: Array<[Buffer, string]> = [
        [jpeg, 'image/jpeg'],
        [png, 'image/png'],
        [gif, 'image/gif'],
        [webp, 'image/webp'],
        [Buffer.from('%PDF-1.4'), 'application/pdf'],
      ];
      // Toute la liste blanche est couverte : un format ajouté sans fixture
      // fait échouer ce test.
      expect(fixtures.map(([, type]) => type).sort()).toEqual([...ALLOWED_MIME_TYPES].sort());
      for (const [buffer, type] of fixtures) {
        expect(verifyFileType(buffer, type)).toEqual({ ok: true, type });
      }
    });
  });

  describe('isAllowedMimeType', () => {
    it('accepte les types de la liste blanche', () => {
      for (const type of ALLOWED_MIME_TYPES) expect(isAllowedMimeType(type)).toBe(true);
    });

    it('refuse les autres', () => {
      for (const type of ['image/svg+xml', 'image/avif', 'image/heic', 'text/html', '']) {
        expect(isAllowedMimeType(type)).toBe(false);
      }
    });
  });
});
