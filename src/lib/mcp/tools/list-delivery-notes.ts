import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_delivery_notes",
  title: "List delivery notes",
  description:
    "List delivery acknowledgments (delivery notes). Optionally include their line items or filter by request id.",
  inputSchema: {
    request_id: z.string().optional().describe("Only delivery notes for this request id."),
    include_items: z.boolean().optional().describe("Include line items for each note."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ request_id, include_items, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const client = supabaseForUser(ctx);

    let query = client
      .from("delivery_acknowledgments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 50, 200));
    if (request_id) query = query.eq("request_id", request_id);

    const { data: notes, error } = await query;
    if (error) return errorResult(error.message);
    if (!include_items) return textResult({ delivery_notes: notes ?? [] });

    const ids = (notes ?? []).map((n) => n.id);
    const { data: items, error: itemsError } = ids.length
      ? await client.from("delivery_items").select("*").in("acknowledgment_id", ids)
      : { data: [], error: null as null };
    if (itemsError) return errorResult(itemsError.message);

    return textResult({
      delivery_notes: (notes ?? []).map((n) => ({
        ...n,
        items: (items ?? []).filter((i) => i.acknowledgment_id === n.id),
      })),
    });
  },
});
