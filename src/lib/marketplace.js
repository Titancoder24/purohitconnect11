import { supabase } from "./supabase";

async function invokeMarketplace(body) {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.functions.invoke("purohit-marketplace", { body });
  if (error) throw error;
  return data || {};
}

export async function fetchMarketplacePoojas() {
  return invokeMarketplace({ kind: "poojas" });
}

export async function fetchMarketplacePriests(filters = {}) {
  return invokeMarketplace({ kind: "priests", ...filters });
}

export async function fetchMarketplaceProfile(priestIdOrSlug) {
  const identifier = String(priestIdOrSlug || "");
  return invokeMarketplace({
    kind: "profile",
    ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
      ? { priest_id: identifier }
      : { priest_slug: identifier }),
  });
}
