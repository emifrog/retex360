import { createAdminClient } from '@/lib/supabase/server';

/**
 * Helpers for the private `rex-attachments` bucket.
 *
 * The bucket is private (see migration 012): objects are NOT world-readable.
 * Reads are served through short-lived signed URLs generated server-side with
 * the service role. This is safe because every call site signs URLs only AFTER
 * the parent REX has been loaded through the user's RLS-bound client — i.e.
 * attachment access inherits REX visibility.
 */
export const ATTACHMENTS_BUCKET = 'rex-attachments';

// 1 hour: long enough for a page session, short enough to limit URL leakage.
const DEFAULT_TTL_SECONDS = 3600;

/** Derive the WebP thumbnail object path from an original attachment path. */
export function thumbnailPathFor(storagePath: string): string {
  return storagePath.replace(/\.[^.]+$/, '_thumb.webp');
}

/** Sign a single object path. Returns null if signing fails. */
export async function signAttachmentUrl(
  storagePath: string,
  expiresIn: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  return error || !data ? null : data.signedUrl;
}

/** Sign many object paths at once. Returns a Map of path -> signed URL. */
export async function signAttachmentUrls(
  storagePaths: string[],
  expiresIn: number = DEFAULT_TTL_SECONDS
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (storagePaths.length === 0) return urls;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrls(storagePaths, expiresIn);
  if (error || !data) return urls;

  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/**
 * Remove attachment objects with the service role. Used for cross-user cleanup
 * (e.g. an admin deleting a REX whose attachments were uploaded by others),
 * which the own-folder storage policy would otherwise block.
 */
export async function removeAttachmentObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;
  const admin = createAdminClient();
  await admin.storage.from(ATTACHMENTS_BUCKET).remove(storagePaths);
}
