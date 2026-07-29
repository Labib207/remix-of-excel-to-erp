import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "search_items",
  title: "Search item catalog",
  description:
    "Search the item master catalog by item code or description. Use this to find the exact standardized description before referencing an item.",
  inputSchema: {
    search: z.string().optional().describe("Text to match in item code or description."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("material_catalog")
      .select("id, item_code, description, uom, created_at")
      .order("description", { ascending: true })
      .limit(Math.min(limit ?? 50, 200));

    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`item_code.ilike.${s},description.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ items: data ?? [] });
  },
});
