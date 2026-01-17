import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for community packs
export interface CommunityPack {
  id: string;
  name: string;
  description: string | null;
  category: string;
  items: string[];
  creator_name: string;
  upvotes: number;
  plays: number;
  created_at: string;
}

export type CommunityPackInsert = Omit<CommunityPack, "id" | "upvotes" | "plays" | "created_at">;

// Fetch community packs with optional sorting
export async function getCommunityPacks(options?: {
  sortBy?: "upvotes" | "plays" | "created_at";
  category?: string;
  limit?: number;
}) {
  let query = supabase
    .from("community_packs")
    .select("*");

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  if (options?.sortBy) {
    query = query.order(options.sortBy, { ascending: false });
  } else {
    query = query.order("upvotes", { ascending: false });
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching community packs:", error);
    return [];
  }

  return data as CommunityPack[];
}

// Create a new community pack
export async function createCommunityPack(pack: CommunityPackInsert) {
  const { data, error } = await supabase
    .from("community_packs")
    .insert([pack])
    .select()
    .single();

  if (error) {
    console.error("Error creating community pack:", error);
    throw error;
  }

  return data as CommunityPack;
}

// Increment upvotes
export async function upvotePack(packId: string) {
  const { error } = await supabase.rpc("increment_upvotes", { pack_id: packId });

  if (error) {
    // Fallback to direct update if RPC doesn't exist
    const { error: updateError } = await supabase
      .from("community_packs")
      .update({ upvotes: supabase.rpc("upvotes") })
      .eq("id", packId);

    if (updateError) {
      console.error("Error upvoting pack:", updateError);
      throw updateError;
    }
  }
}

// Increment plays
export async function incrementPlays(packId: string) {
  const { data: pack } = await supabase
    .from("community_packs")
    .select("plays")
    .eq("id", packId)
    .single();

  if (pack) {
    await supabase
      .from("community_packs")
      .update({ plays: pack.plays + 1 })
      .eq("id", packId);
  }
}

// Search packs by name
export async function searchCommunityPacks(query: string) {
  const { data, error } = await supabase
    .from("community_packs")
    .select("*")
    .ilike("name", `%${query}%`)
    .order("upvotes", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error searching community packs:", error);
    return [];
  }

  return data as CommunityPack[];
}
