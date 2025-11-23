"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createRex(data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");
  
  const { data: userData } = await supabase
    .from("users")
    .select("sdis_id")
    .eq("id", user.id)
    .single();

  if (!userData?.sdis_id) throw new Error("Utilisateur sans SDIS");

  const { data: rex, error } = await supabase
    .from("rex")
    .insert({
      title: data.title,
      type: data.type,
      intervention_date: data.intervention_date,
      location: data.location,
      description: data.description,
      context: data.context,
      actions: data.actions,
      outcome: data.outcome,
      lessons: data.lessons,
      recommendations: data.recommendations,
      gravity: data.gravity,
      visibility: data.visibility || "PRIVE",
      resources: data.resources,
      category: data.category,
      status: data.status || "BROUILLON",
      author_id: user.id,
      sdis_id: userData.sdis_id,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath("/dashboard/rex");
  return { success: true, rex };
}

export async function updateRex(rexId: string, data: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: existingRex } = await supabase
    .from("rex")
    .select("author_id")
    .eq("id", rexId)
    .single();

  if (!existingRex) throw new Error("REX introuvable");
  if (existingRex.author_id !== user.id) throw new Error("Non autorisé");

  const updateData: any = {};
  if (data.title) updateData.title = data.title;
  if (data.type) updateData.type = data.type;
  if (data.intervention_date) updateData.intervention_date = data.intervention_date;
  if (data.location) updateData.location = data.location;
  if (data.description) updateData.description = data.description;
  if (data.context) updateData.context = data.context;
  if (data.actions) updateData.actions = data.actions;
  if (data.outcome) updateData.outcome = data.outcome;
  if (data.lessons) updateData.lessons = data.lessons;
  if (data.recommendations) updateData.recommendations = data.recommendations;
  if (data.gravity) updateData.gravity = data.gravity;
  if (data.visibility) updateData.visibility = data.visibility;
  if (data.resources) updateData.resources = data.resources;
  if (data.category) updateData.category = data.category;
  if (data.status) updateData.status = data.status;

  const { data: rex, error } = await supabase
    .from("rex")
    .update(updateData)
    .eq("id", rexId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/rex/${rexId}`);
  revalidatePath("/dashboard/rex");
  return { success: true, rex };
}

export async function deleteRex(rexId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: existingRex } = await supabase
    .from("rex")
    .select("author_id")
    .eq("id", rexId)
    .single();

  if (!existingRex) throw new Error("REX introuvable");
  if (existingRex.author_id !== user.id) throw new Error("Non autorisé");

  const { error } = await supabase.from("rex").delete().eq("id", rexId);
  if (error) throw error;

  revalidatePath("/dashboard/rex");
  return { success: true };
}

export async function getRexById(rexId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("sdis_id")
    .eq("id", user.id)
    .single();

  const { data: rex, error } = await supabase
    .from("rex")
    .select(`
      *,
      author:users!rex_author_id_fkey(id, name, email, rank, unit),
      sdis:sdis_id(id, name, code, region),
      comments(
        *,
        author:users!comments_author_id_fkey(id, name, rank)
      ),
      attachments(*)
    `)
    .eq("id", rexId)
    .single();

  if (error || !rex) throw new Error("REX introuvable");

  // Check visibility permissions
  const canView =
    rex.author_id === user.id ||
    rex.visibility === "NATIONAL" ||
    (rex.visibility === "SDIS" && rex.sdis_id === userData?.sdis_id);

  if (!canView) throw new Error("Non autorisé à voir ce REX");

  return rex;
}

export async function getRexList(filters?: {
  search?: string;
  type?: string;
  gravity?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("sdis_id")
    .eq("id", user.id)
    .single();

  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("rex")
    .select(`
      *,
      author:users!rex_author_id_fkey(id, name, rank),
      sdis:sdis_id(id, name, code)
    `, { count: "exact" });

  // Visibility filter
  query = query.or(`author_id.eq.${user.id},visibility.eq.NATIONAL,and(visibility.eq.SDIS,sdis_id.eq.${userData?.sdis_id})`);

  // Additional filters
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.gravity) query = query.eq("gravity", filters.gravity);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data: rexList, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

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
}

export async function validateRex(rexId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "ADMIN" && userData?.role !== "VALIDATOR") {
    throw new Error("Non autorisé à valider ce REX");
  }

  const { data: rex, error } = await supabase
    .from("rex")
    .update({
      status: "VALIDE",
      validated_at: new Date().toISOString(),
      validated_by_id: user.id,
    })
    .eq("id", rexId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/rex/${rexId}`);
  revalidatePath("/dashboard/rex");
  return { success: true, rex };
}

export async function rejectRex(rexId: string, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("Non authentifié");

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (userData?.role !== "ADMIN" && userData?.role !== "VALIDATOR") {
    throw new Error("Non autorisé à rejeter ce REX");
  }

  const { data: rex, error } = await supabase
    .from("rex")
    .update({
      status: "REJETE",
      rejection_reason: reason,
    })
    .eq("id", rexId)
    .select()
    .single();

  if (error) throw error;

  revalidatePath(`/dashboard/rex/${rexId}`);
  revalidatePath("/dashboard/rex");
  return { success: true, rex };
}
