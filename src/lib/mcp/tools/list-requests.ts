import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_requests",
  title: "List material requests",
  description:
    "List material requests with their approval status, TR number and linked order. Filter by approval status or order id.",
  inputSchema: {
    approval_status: z
      .string()
      .optional()
      .describe("One of: pending, approved, not_approved, hold."),
    order_id: z.string().optional().describe("Only requests for this order id."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ approval_status, order_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    let query = supabaseForUser(ctx)
      .from("requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(limit ?? 50, 200));

    if (approval_status) query = query.eq("approval_status", approval_status);
    if (order_id) query = query.eq("order_id", order_id);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return textResult({ requests: data ?? [] });
  },
});
