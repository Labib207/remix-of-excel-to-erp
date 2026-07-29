import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_requirements",
  title: "List trim chart requirements",
  description:
    "List trim chart requirement lines (required, received and balance quantities) for a given order.",
  inputSchema: {
    order_id: z.string().describe("Order id (uuid) whose trim chart should be listed."),
    limit: z.number().int().optional().describe("Maximum rows to return (default 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const { data, error } = await supabaseForUser(ctx)
      .from("requirements")
      .select("*")
      .eq("order_id", order_id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(Math.min(limit ?? 200, 500));
    if (error) return errorResult(error.message);
    return textResult({ requirements: data ?? [] });
  },
});
