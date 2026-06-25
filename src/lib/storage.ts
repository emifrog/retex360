import { createAdminClient } from '@/lib/supabase/server';

/**
 * Couche d'accès au stockage des pièces jointes, avec bascule de backend :
 *  - Scaleway Object Storage (S3, souverain UE) si les variables SCALEWAY_S3_*
 *    sont configurées ;
 *  - sinon Supabase Storage (comportement historique).
 *
 * Le SDK AWS S3 est importé de façon PARESSEUSE (import dynamique) uniquement
 * quand Scaleway est réellement utilisé : tant que les variables d'env ne sont
 * pas définies, le SDK n'est jamais chargé (zéro coût au démarrage / bundle).
 *
 * Le bucket est privé dans les deux cas : aucune lecture publique. Les lectures
 * passent par des URLs signées générées côté serveur, APRÈS que le REX parent a
 * été chargé via le client RLS de l'utilisateur — l'accès aux pièces jointes
 * hérite donc de la visibilité du REX. La clé d'objet (`storage_path`, stockée
 * en base) est identique sur les deux backends.
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

// Chargé une seule fois, à la première utilisation effective de Scaleway.
interface S3Bits {
  client: import('@aws-sdk/client-s3').S3Client;
  PutObjectCommand: typeof import('@aws-sdk/client-s3').PutObjectCommand;
  GetObjectCommand: typeof import('@aws-sdk/client-s3').GetObjectCommand;
  DeleteObjectsCommand: typeof import('@aws-sdk/client-s3').DeleteObjectsCommand;
  getSignedUrl: typeof import('@aws-sdk/s3-request-presigner').getSignedUrl;
}
let s3BitsPromise: Promise<S3Bits> | null = null;
function s3(): Promise<S3Bits> {
  if (!s3BitsPromise) {
    s3BitsPromise = (async () => {
      const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand } =
        await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const client = new S3Client({
        endpoint: SCW.endpoint,
        region: SCW.region,
        forcePathStyle: true, // host stable: <endpoint>/<bucket>/<key>
        credentials: {
          accessKeyId: SCW.accessKeyId as string,
          secretAccessKey: SCW.secretAccessKey as string,
        },
      });
      return { client, PutObjectCommand, GetObjectCommand, DeleteObjectsCommand, getSignedUrl };
    })();
  }
  return s3BitsPromise;
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
      const { client, PutObjectCommand } = await s3();
      await client.send(
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
      const { client, GetObjectCommand, getSignedUrl } = await s3();
      return await getSignedUrl(
        client,
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
    const { client, GetObjectCommand, getSignedUrl } = await s3();
    await Promise.all(
      storagePaths.map(async (path) => {
        try {
          const url = await getSignedUrl(
            client,
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
      const { client, DeleteObjectsCommand } = await s3();
      await client.send(
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
