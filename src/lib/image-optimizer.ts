import sharp from 'sharp';
import { logger } from '@/lib/logger';

interface OptimizeResult {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
  originalSize: number;
  optimizedSize: number;
}

interface ThumbnailResult {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;
const QUALITY = 80;

/**
 * Optimize an image: resize if too large, convert to WebP, compress.
 */
export async function optimizeImage(
  inputBuffer: Buffer,
  originalType: string
): Promise<OptimizeResult> {
  const originalSize = inputBuffer.length;

  // Skip non-image files (PDF, etc.)
  if (!originalType.startsWith('image/')) {
    return {
      buffer: inputBuffer,
      contentType: originalType,
      width: 0,
      height: 0,
      originalSize,
      optimizedSize: originalSize,
    };
  }

  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Keep animated GIFs as-is (sharp doesn't handle animation well)
    if (originalType === 'image/gif') {
      return {
        buffer: inputBuffer,
        contentType: originalType,
        width,
        height,
        originalSize,
        optimizedSize: originalSize,
      };
    }

    let pipeline = sharp(inputBuffer).rotate(); // Auto-rotate based on EXIF

    // Resize if exceeds max dimensions
    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for best compression
    const optimizedBuffer = await pipeline
      .webp({ quality: QUALITY, effort: 4 })
      .toBuffer();

    const optimizedMeta = await sharp(optimizedBuffer).metadata();

    logger.info(
      `Image optimized: ${originalSize} → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / originalSize) * 100)}% reduction)`
    );

    return {
      buffer: optimizedBuffer,
      contentType: 'image/webp',
      width: optimizedMeta.width || width,
      height: optimizedMeta.height || height,
      originalSize,
      optimizedSize: optimizedBuffer.length,
    };
  } catch (error) {
    logger.error('Image optimization failed, using original:', error);
    return {
      buffer: inputBuffer,
      contentType: originalType,
      width: 0,
      height: 0,
      originalSize,
      optimizedSize: originalSize,
    };
  }
}

/**
 * Generate a thumbnail for an image.
 */
export async function generateThumbnail(
  inputBuffer: Buffer,
  originalType: string
): Promise<ThumbnailResult | null> {
  if (!originalType.startsWith('image/') || originalType === 'image/gif') {
    return null;
  }

  try {
    const thumbnailBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: 70, effort: 4 })
      .toBuffer();

    const meta = await sharp(thumbnailBuffer).metadata();

    return {
      buffer: thumbnailBuffer,
      contentType: 'image/webp',
      width: meta.width || THUMBNAIL_WIDTH,
      height: meta.height || THUMBNAIL_HEIGHT,
    };
  } catch (error) {
    logger.error('Thumbnail generation failed:', error);
    return null;
  }
}
