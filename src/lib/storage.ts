import { createAdminClient } from '@/lib/supabase/server';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Couche d'accès au stockage des pièces jointes, avec bascule de backend :
 *  - Scaleway Object Storage (S3, souverain UE) si les variables SCALEWAY_S3_*
 *    sont configurées ;
 *  - sinon Supabase Storage (comportement historique).
 *
 * Le bucket est privé dans les deux cas : aucune lecture publique. Les lectures
 * passent par des URLs signées générées côté serveur, APRÈS que le REX parent a
 * été chargé via le client RLS de l'utilisateur — l'accès aux pièces jointes
 * hérite donc de la visibilité du REX (modèle inchangé par la migration vers S3).
 *
 * La clé d'objet (`storage_path`, stockée en base) est identique sur les deux
 * backends : `rex-attachments/<user_id>/<timestamp>-<rand>.<ext>`.
 */
export const ATTACHMENTS_BUCKET = 'rex-attachments';

// 1 hour: long enough for a page session, short enough to limit URL leakage.
const DEFAULT_TTL_SECONDS = 3600;

// ---- Backend Scaleway (S3) -------------------------------------------------
const SCW = {
  endpoint: process.env.SCALEWAY_S3_ENDPOINT, // ex: https://s3.fr-par.scw.cloud
  region: process.env.SCALEWAY_S3_REGION, // ex: fr-par
  bucket: process.env.SCALEWAY_S3_BUCKET,
  accessKeyId: process.env.SCALEWAY_S3_ACCESS_KEY,
  secretAccessKey: process.env.SCALEWAY_S3_SECRET_KEY,
};
const useScaleway = Boolean(
  SCW.endpoint && SCW.region && SCW.bucket && SCW.accessKeyId && SCW.secretAccessKey
);

let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: SCW.endpoint,
      region: SCW.region,
      forcePathStyle: true, // host stable: <endpoint>/<bucket>/<key>
      credentials: {
        accessKeyId: SCW.accessKeyId as string,
        secretAccessKey: SCW.secretAccessKey as string,
      },
    });
  }
  return s3Client;
}

/** Derive the WebP thumbnail object path from an original attachment path. */
export function thumbnailPathFor(storagePath: string): string {
  return storagePath.replace(/\.[^.]+$/, '_thumb.webp');
}

/** Upload an attachment object. Returns true on success. */
export async function putAttachmentObject(
  storagePath: string,
  body: Buffer,
  contentType: string
): Promise<boolean> {
  if (useScaleway) {
    try {
      await s3().send(
        new PutObjectCommand({
          Bucket: SCW.bucket,
          Key: storagePath,
          Body: body,
          ContentType: contentType,
        })
      );
      return true;
    } catch {
      return false;
    }
  }
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, body, { contentType, upsert: false });
  return !error;
}

/** Sign a single object path. Returns null if signing fails. */
export async function signAttachmentUrl(
  storagePath: string,
  expiresIn: number = DEFAULT_TTL_SECONDS
): Promise<string | null> {
  if (useScaleway) {
    try {
      return await getSignedUrl(
        s3(),
        new GetObjectCommand({ Bucket: SCW.bucket, Key: storagePath }),
        { expiresIn }
      );
    } catch {
      return null;
    }
  }
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

  if (useScaleway) {
    // S3 has no batch presign — sign locally in parallel (no network per URL).
    await Promise.all(
      storagePaths.map(async (path) => {
        try {
          const url = await getSignedUrl(
            s3(),
            new GetObjectCommand({ Bucket: SCW.bucket, Key: path }),
            { expiresIn }
          );
          urls.set(path, url);
        } catch {
          /* skip this object */
        }
      })
    );
    return urls;
  }

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
 * Remove attachment objects (best-effort). Used for cross-user cleanup (e.g. an
 * admin deleting a REX whose attachments were uploaded by others). Deleting a
 * non-existent key is a no-op on both backends.
 */
export async function removeAttachmentObjects(storagePaths: string[]): Promise<void> {
  if (storagePaths.length === 0) return;

  if (useScaleway) {
    try {
      await s3().send(
        new DeleteObjectsCommand({
          Bucket: SCW.bucket,
          Delete: { Objects: storagePaths.map((Key) => ({ Key })), Quiet: true },
        })
      );
    } catch {
      /* best-effort */
    }
    return;
  }

  const admin = createAdminClient();
  await admin.storage.from(ATTACHMENTS_BUCKET).remove(storagePaths);
}
