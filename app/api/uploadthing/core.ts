import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

const f = createUploadthing();

// Helper pour vérifier l'authentification
async function getAuthenticatedUser() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) throw new Error("Non authentifié");
  
  return session.user;
}

// FileRouter pour l'application
export const ourFileRouter = {
  // Route pour les documents REX (PDF, DOCX, etc.)
  rexDocuments: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 5 },
    "application/msword": { maxFileSize: "16MB", maxFileCount: 5 },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
      maxFileCount: 5,
    },
  })
    .middleware(async () => {
      const user = await getAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload terminé pour userId:", metadata.userId);
      console.log("URL du fichier:", file.url);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Route pour les images (photos d'intervention, etc.)
  rexImages: f({
    image: { maxFileSize: "8MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      const user = await getAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image uploadée pour userId:", metadata.userId);
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  // Route pour les pièces jointes générales
  rexAttachments: f({
    pdf: { maxFileSize: "16MB" },
    image: { maxFileSize: "8MB" },
    "application/msword": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "16MB",
    },
    "application/vnd.ms-excel": { maxFileSize: "8MB" },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const user = await getAuthenticatedUser();
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
