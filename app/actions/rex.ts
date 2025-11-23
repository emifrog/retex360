"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import {
  RexFormSchema,
  RexCreateSchema,
  RexUpdateSchema,
  type RexFormData,
} from "@/lib/validations/rex";

export async function createRex(data: RexFormData) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  // Récupérer l'utilisateur complet
  const { data: user } = await supabase
    .from('users')
    .select('id, sdis_id')
    .eq('id', session.user.id)
    .single();

  if (!user?.sdis_id) {
    throw new Error("Utilisateur sans SDIS associé");
  }

  // Validation des données
  const validated = RexCreateSchema.parse(data);

  try {
    // Créer le REX
    const { data: rex, error: rexError } = await supabase
      .from('rex')
      .insert({
        title: validated.title,
        type: validated.type,
        date: validated.date.toISOString(),
        location: validated.location,
        description: validated.description,
        context: validated.context || null,
        actions: validated.actions || null,
        results: validated.results || null,
        analysis: validated.analysis,
        recommendations: validated.recommendations || null,
        gravity: validated.gravity,
        visibility: validated.visibility,
        resources: validated.resources || null,
        status: validated.status || 'BROUILLON',
        author_id: session.user.id,
        sdis_id: user.sdis_id,
      })
      .select()
      .single();

    if (rexError) throw rexError;

    // Créer les tags si fournis
    if (validated.tags && validated.tags.length > 0) {
      for (const tag of validated.tags) {
        // Créer ou récupérer le tag
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tag.name)
          .single();

        let tagId: string;

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tag.name })
            .select('id')
            .single();

          if (tagError) throw tagError;
          tagId = newTag.id;
        }

        // Lier le tag au REX
        await supabase
          .from('rex_tags')
          .insert({
            rex_id: rex.id,
            tag_id: tagId,
          });
      }
    }

    // Créer les pièces jointes si fournies
    if (validated.attachments && validated.attachments.length > 0) {
      const attachmentsToInsert = validated.attachments.map(attachment => ({
        rex_id: rex.id,
        name: attachment.name,
        url: attachment.url,
        type: attachment.type,
        size: attachment.size,
      }));

      await supabase
        .from('rex_attachments')
        .insert(attachmentsToInsert);
    }

    revalidatePath('/rex');
    return { success: true, rex };
  } catch (error) {
    console.error("Erreur création REX:", error);
    throw new Error("Impossible de créer le REX");
  }
}

export async function updateRex(rexId: string, data: Partial<RexFormData>) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  // Validation des données
  const validated = RexUpdateSchema.parse({ ...data, id: rexId });

  // Vérifier que l'utilisateur est l'auteur du REX
  const { data: existingRex } = await supabase
    .from('rex')
    .select('author_id')
    .eq('id', rexId)
    .single();

  if (!existingRex) {
    throw new Error("REX introuvable");
  }

  if (existingRex.author_id !== session.user.id) {
    throw new Error("Non autorisé à modifier ce REX");
  }

  try {
    // Mettre à jour le REX
    const updateData: any = {};
    
    if (validated.title) updateData.title = validated.title;
    if (validated.type) updateData.type = validated.type;
    if (validated.date) updateData.date = validated.date.toISOString();
    if (validated.location) updateData.location = validated.location;
    if (validated.description) updateData.description = validated.description;
    if (validated.context !== undefined) updateData.context = validated.context;
    if (validated.actions !== undefined) updateData.actions = validated.actions;
    if (validated.results !== undefined) updateData.results = validated.results;
    if (validated.analysis) updateData.analysis = validated.analysis;
    if (validated.recommendations !== undefined) updateData.recommendations = validated.recommendations;
    if (validated.gravity) updateData.gravity = validated.gravity;
    if (validated.visibility) updateData.visibility = validated.visibility;
    if (validated.resources !== undefined) updateData.resources = validated.resources;
    if (validated.status) updateData.status = validated.status;

    const { data: rex, error: rexError } = await supabase
      .from('rex')
      .update(updateData)
      .eq('id', rexId)
      .select()
      .single();

    if (rexError) throw rexError;

    // Gérer les tags si fournis
    if (validated.tags) {
      // Supprimer les anciens tags
      await supabase
        .from('rex_tags')
        .delete()
        .eq('rex_id', rexId);

      // Ajouter les nouveaux tags
      for (const tag of validated.tags) {
        const { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tag.name)
          .single();

        let tagId: string;

        if (existingTag) {
          tagId = existingTag.id;
        } else {
          const { data: newTag, error: tagError } = await supabase
            .from('tags')
            .insert({ name: tag.name })
            .select('id')
            .single();

          if (tagError) throw tagError;
          tagId = newTag.id;
        }

        await supabase
          .from('rex_tags')
          .insert({
            rex_id: rexId,
            tag_id: tagId,
          });
      }
    }

    // Gérer les pièces jointes si fournies
    if (validated.attachments) {
      // Supprimer les anciennes pièces jointes
      await supabase
        .from('rex_attachments')
        .delete()
        .eq('rex_id', rexId);

      // Ajouter les nouvelles pièces jointes
      if (validated.attachments.length > 0) {
        const attachmentsToInsert = validated.attachments.map(attachment => ({
          rex_id: rexId,
          name: attachment.name,
          url: attachment.url,
          type: attachment.type,
          size: attachment.size,
        }));

        await supabase
          .from('rex_attachments')
          .insert(attachmentsToInsert);
      }
    }

    revalidatePath(`/rex/${rexId}`);
    revalidatePath('/rex');
    return { success: true, rex };
  } catch (error) {
    console.error("Erreur mise à jour REX:", error);
    throw new Error("Impossible de mettre à jour le REX");
  }
}

export async function deleteRex(rexId: string) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  // Vérifier que l'utilisateur est l'auteur du REX
  const { data: existingRex } = await supabase
    .from('rex')
    .select('author_id')
    .eq('id', rexId)
    .single();

  if (!existingRex) {
    throw new Error("REX introuvable");
  }

  if (existingRex.author_id !== session.user.id) {
    throw new Error("Non autorisé à supprimer ce REX");
  }

  try {
    const { error } = await supabase
      .from('rex')
      .delete()
      .eq('id', rexId);

    if (error) throw error;

    revalidatePath('/rex');
    return { success: true };
  } catch (error) {
    console.error("Erreur suppression REX:", error);
    throw new Error("Impossible de supprimer le REX");
  }
}

export async function getRexById(rexId: string) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  try {
    const { data: rex, error } = await supabase
      .from('rex')
      .select(`
        *,
        author:author_id (
          id,
          name,
          email,
          rank,
          unit
        ),
        sdis:sdis_id (
          id,
          name,
          number,
          region
        )
      `)
      .eq('id', rexId)
      .single();

    if (error || !rex) {
      throw new Error("REX introuvable");
    }

    // Récupérer les tags
    const { data: tagRelations } = await supabase
      .from('rex_tags')
      .select(`
        tag:tag_id (
          id,
          name
        )
      `)
      .eq('rex_id', rexId);

    // Récupérer les pièces jointes
    const { data: attachments } = await supabase
      .from('rex_attachments')
      .select('*')
      .eq('rex_id', rexId);

    // Récupérer les commentaires
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        *,
        author:author_id (
          id,
          name,
          rank
        )
      `)
      .eq('rex_id', rexId)
      .order('created_at', { ascending: false });

    // Vérifier les permissions de visibilité
    const { data: user } = await supabase
      .from('users')
      .select('sdis_id')
      .eq('id', session.user.id)
      .single();

    const canView =
      rex.author_id === session.user.id ||
      rex.visibility === 'NATIONAL' ||
      (rex.visibility === 'SDIS' && rex.sdis_id === user?.sdis_id);

    if (!canView) {
      throw new Error("Non autorisé à voir ce REX");
    }

    return {
      ...rex,
      tags: tagRelations?.map(tr => tr.tag) || [],
      attachments: attachments || [],
      comments: comments || [],
    };
  } catch (error) {
    console.error("Erreur récupération REX:", error);
    throw new Error("Impossible de récupérer le REX");
  }
}

export async function getRexList(filters?: {
  search?: string;
  type?: string;
  gravity?: string;
  status?: string;
  visibility?: string;
  authorId?: string;
  sdisId?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    // Récupérer l'utilisateur
    const { data: user } = await supabase
      .from('users')
      .select('sdis_id')
      .eq('id', session.user.id)
      .single();

    // Construire la requête
    let query = supabase
      .from('rex')
      .select(`
        *,
        author:author_id (
          id,
          name,
          rank
        ),
        sdis:sdis_id (
          id,
          name,
          number
        )
      `, { count: 'exact' });

    // Filtres de visibilité
    query = query.or(`visibility.eq.NATIONAL,author_id.eq.${session.user.id},and(visibility.eq.SDIS,sdis_id.eq.${user?.sdis_id})`);

    // Filtres additionnels
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }

    if (filters?.gravity) {
      query = query.eq('gravity', filters.gravity);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    if (filters?.authorId) {
      query = query.eq('author_id', filters.authorId);
    }

    if (filters?.sdisId) {
      query = query.eq('sdis_id', filters.sdisId);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,location.ilike.%${filters.search}%`);
    }

    // Pagination et tri
    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: rexList, error, count } = await query;

    if (error) throw error;

    return {
      rexList: rexList || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  } catch (error) {
    console.error("Erreur liste REX:", error);
    throw new Error("Impossible de récupérer la liste des REX");
  }
}

export async function validateRex(rexId: string) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  // Vérifier le rôle de l'utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!user || !['ADMIN', 'VALIDATOR', 'SUPER_ADMIN'].includes(user.role)) {
    throw new Error("Non autorisé à valider ce REX");
  }

  try {
    const { data: rex, error } = await supabase
      .from('rex')
      .update({
        status: 'VALIDE',
        validated_at: new Date().toISOString(),
        validated_by_id: session.user.id,
      })
      .eq('id', rexId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/rex/${rexId}`);
    revalidatePath('/rex');
    return { success: true, rex };
  } catch (error) {
    console.error("Erreur validation REX:", error);
    throw new Error("Impossible de valider le REX");
  }
}

export async function rejectRex(rexId: string, reason?: string) {
  const supabase = createServerActionClient({ cookies });
  
  // Vérifier l'authentification
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error("Non authentifié");
  }

  // Vérifier le rôle de l'utilisateur
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!user || !['ADMIN', 'VALIDATOR', 'SUPER_ADMIN'].includes(user.role)) {
    throw new Error("Non autorisé à rejeter ce REX");
  }

  try {
    const { data: rex, error } = await supabase
      .from('rex')
      .update({
        status: 'REJETE',
        rejection_reason: reason || null,
      })
      .eq('id', rexId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/rex/${rexId}`);
    revalidatePath('/rex');
    return { success: true, rex };
  } catch (error) {
    console.error("Erreur rejet REX:", error);
    throw new Error("Impossible de rejeter le REX");
  }
}
