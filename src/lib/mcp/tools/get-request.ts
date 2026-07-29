import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "get_request",
  title: "Get request with items",
  description:
    "Fetch one material request by id or request number, including all of its line items.",
  inputSchema: {
    request_id: z.string().optional().describe("Request id (uuid)."),
    request_no: z.string().optional().describe("Request/document number, e.g. RMR-0012."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ request_id, request_no }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    if (!request_id && !request_no)
      return errorResult("Provide either request_id or request_no.");

    const client = supabaseForUser(ctx);
    let query = client.from("requests").select("*").limit(1);
    query = request_id ? query.eq("id", request_id) : query.eq("request_no", request_no!);

    const { data: requests, error } = await query;
    if (error) return errorResult(error.message);
    const request = requests?.[0];
    if (!request) return errorResult("Request not found.");

    const { data: items, error: itemsError } = await client
      .from("request_items")
      .select("*")
      .eq("request_id", request.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (itemsError) return errorResult(itemsError.message);

    return textResult({ request, items: items ?? [] });
  },
});
