import { optimizeImage, generateThumbnail } from '@/lib/image-optimizer';
import sharp from 'sharp';

describe('Image optimizer', () => {
  let testJpegBuffer: Buffer;
  let largePngBuffer: Buffer;

  beforeAll(async () => {
    // Create a small 100x100 red JPEG
    testJpegBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Create a large 3000x2000 image to test resizing
    largePngBuffer = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 0, g: 0, b: 255 } },
    })
      .png()
      .toBuffer();
  });

  describe('optimizeImage', () => {
    it('converts JPEG to WebP', async () => {
      const result = await optimizeImage(testJpegBuffer, 'image/jpeg');
      expect(result.contentType).toBe('image/webp');
      expect(result.optimizedSize).toBeLessThanOrEqual(result.originalSize);
    });

    it('converts PNG to WebP', async () => {
      const result = await optimizeImage(largePngBuffer, 'image/png');
      expect(result.contentType).toBe('image/webp');
    });

    it('resizes images exceeding max dimensions', async () => {
      const result = await optimizeImage(largePngBuffer, 'image/png');
      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1080);
    });

    it('does not upscale small images', async () => {
      const result = await optimizeImage(testJpegBuffer, 'image/jpeg');
      expect(result.width).toBeLessThanOrEqual(100);
      expect(result.height).toBeLessThanOrEqual(100);
    });

    it('passes through non-image files (PDF)', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 fake content');
      const result = await optimizeImage(pdfBuffer, 'application/pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.buffer).toBe(pdfBuffer);
    });

    it('passes through GIF files as-is', async () => {
      const gifBuffer = await sharp({
        create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
      })
        .gif()
        .toBuffer();

      const result = await optimizeImage(gifBuffer, 'image/gif');
      expect(result.contentType).toBe('image/gif');
      expect(result.buffer).toBe(gifBuffer);
    });

    it('achieves meaningful compression', async () => {
      const result = await optimizeImage(largePngBuffer, 'image/png');
      const compressionRatio = 1 - result.optimizedSize / result.originalSize;
      expect(compressionRatio).toBeGreaterThan(0.1); // At least 10% reduction
    });
  });

  describe('generateThumbnail', () => {
    it('generates a WebP thumbnail', async () => {
      const result = await generateThumbnail(testJpegBuffer, 'image/jpeg');
      expect(result).not.toBeNull();
      expect(result!.contentType).toBe('image/webp');
    });

    it('generates thumbnail at 400x400 max', async () => {
      const result = await generateThumbnail(largePngBuffer, 'image/png');
      expect(result).not.toBeNull();
      expect(result!.width).toBeLessThanOrEqual(400);
      expect(result!.height).toBeLessThanOrEqual(400);
    });

    it('returns null for non-image files', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4 fake');
      const result = await generateThumbnail(pdfBuffer, 'application/pdf');
      expect(result).toBeNull();
    });

    it('returns null for GIF files', async () => {
      const gifBuffer = await sharp({
        create: { width: 50, height: 50, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } },
      })
        .gif()
        .toBuffer();

      const result = await generateThumbnail(gifBuffer, 'image/gif');
      expect(result).toBeNull();
    });

    it('thumbnail is much smaller than original', async () => {
      const result = await generateThumbnail(largePngBuffer, 'image/png');
      expect(result).not.toBeNull();
      expect(result!.buffer.length).toBeLessThan(largePngBuffer.length);
    });
  });
});
