import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "add_catalog_item",
  title: "Add item to catalog",
  description:
    "Add a new item (item code, description, unit of measure) to the item master catalog. Search first to avoid duplicates.",
  inputSchema: {
    item_code: z.string().describe("Item code, e.g. TRM-1042."),
    description: z.string().describe("Standardized item description."),
    uom: z.string().optional().describe("Unit of measure, e.g. PCS, MTR, YDS."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ item_code, description, uom }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const client = supabaseForUser(ctx);

    const code = item_code.trim();
    const desc = description.trim();
    if (!code || !desc) return errorResult("item_code and description are required.");

    const { data: existing, error: lookupError } = await client
      .from("material_catalog")
      .select("id, item_code, description, uom");
    if (lookupError) return errorResult(lookupError.message);

    const norm = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");
    const duplicate = (existing ?? []).find(
      (row) => norm(row.item_code ?? "") === norm(code) && norm(row.description ?? "") === norm(desc),
    );
    if (duplicate) return textResult({ created: false, reason: "duplicate", item: duplicate });

    const { data, error } = await client
      .from("material_catalog")
      .insert({ item_code: code, description: desc, uom: uom?.trim() || "PCS", created_by: ctx.getUserId() })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return textResult({ created: true, item: data });
  },
});
