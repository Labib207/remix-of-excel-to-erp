import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description:
    "List production orders (order no, style, customer, quantity, dates). Optionally filter by a search term matching order no, style or customer.",
  inputSchema: {
    search: z.string().optional().describe("Text to match in order no, style no, style name or customer."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("orders")
      .select(
        "id, order_no, style_no, style_name, customer, quantity, shade, fabric_type, status, order_date, delivery_date, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 50, 200));

    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(
        `order_no.ilike.${s},style_no.ilike.${s},style_name.ilike.${s},customer.ilike.${s}`,
      );
    }

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ orders: data ?? [] });
  },
});
