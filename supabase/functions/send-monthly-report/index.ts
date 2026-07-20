const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const RECIPIENT_EMAIL = 'ahmadlabib2055@gmail.com'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // --- AUTH GUARD ---
  // Accept either an authenticated user JWT, or the service-role key
  // (used by pg_cron scheduled invocations).
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  let authorized = token === serviceRoleKey
  if (!authorized) {
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data, error } = await anonClient.auth.getClaims(token)
    if (!error && data?.claims) authorized = true
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  try {
    let month: number, year: number

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      month = body.month ?? new Date().getMonth() - 1
      year = body.year ?? new Date().getFullYear()
    } else {
      const now = new Date()
      month = now.getMonth() - 1
      year = now.getFullYear()
      if (month < 0) { month = 11; year-- }
    }

    if (month < 0) { month = 11; year-- }

    const startDate = new Date(year, month, 1).toISOString()
    const endDate = new Date(year, month + 1, 1).toISOString()

    // Fetch requests and items for the month
    const [requestsRes, requestItemsRes] = await Promise.all([
      supabase.from('requests').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('request_items').select('*').gte('created_at', startDate).lt('created_at', endDate),
    ])

    const requests = (requestsRes.data || []).filter((r: any) => (r.approval_status || 'approved') === 'approved')
    const approvedIds = new Set(requests.map((r: any) => r.id))
    const requestItems = (requestItemsRes.data || []).filter((i: any) => approvedIds.has(i.request_id))

    const rawMaterialRequests = requests.filter(r => r.request_no?.startsWith('RM'))
    const generalRequests = requests.filter(r => r.request_no?.startsWith('GS'))
    const returnRequests = requests.filter(r => r.request_no?.startsWith('MR'))

    const getItemsForRequests = (reqs: any[]) => {
      const ids = new Set(reqs.map(r => r.id))
      return requestItems.filter(i => ids.has(i.request_id))
    }

    const rawMaterialItems = getItemsForRequests(rawMaterialRequests)
    const generalItems = getItemsForRequests(generalRequests)
    const returnItems = getItemsForRequests(returnRequests)

    const monthName = MONTHS[month]

    // Group items by description — combine similar items
    function groupItems(items: any[]) {
      const groups: Record<string, { description: string; colors: Set<string>; sizes: Set<string>; unit: string; totalReq: number; totalIssued: number }> = {}
      for (const item of items) {
        const key = (item.description || 'Uncategorized').trim().toLowerCase()
        if (!groups[key]) {
          groups[key] = {
            description: item.description || 'Uncategorized',
            colors: new Set(),
            sizes: new Set(),
            unit: item.unit || 'pcs',
            totalReq: 0,
            totalIssued: 0,
          }
        }
        if (item.color) groups[key].colors.add(item.color)
        if (item.size) groups[key].sizes.add(item.size)
        groups[key].totalReq += Number(item.requested_qty || 0)
        groups[key].totalIssued += Number(item.issued_qty || 0)
      }
      return Object.values(groups)
        .sort((a, b) => a.description.localeCompare(b.description))
        .map(g => ({
          ...g,
          colors: [...g.colors].join(', ') || '-',
          sizes: [...g.sizes].join(', ') || '-',
        }))
    }

    const rmGrouped = groupItems(rawMaterialItems)
    const gsGrouped = groupItems(generalItems)
    const mrGrouped = groupItems(returnItems)

    // Build category table HTML
    const buildCategoryTable = (title: string, icon: string, grouped: any[], reqCount: number) => {
      if (reqCount === 0 && grouped.length === 0) {
        return `
        <div style="margin-bottom:25px;">
          <h3 style="color:#1a1a2e;margin:0 0 10px;font-size:16px;">${icon} ${title}</h3>
          <p style="color:#999;font-size:13px;margin:0;">No records for this month.</p>
        </div>`
      }

      let totalReq = 0, totalIssued = 0
      for (const g of grouped) { totalReq += g.totalReq; totalIssued += g.totalIssued }

      let html = `
      <div style="margin-bottom:25px;">
        <h3 style="color:#1a1a2e;margin:0 0 5px;font-size:16px;">${icon} ${title}</h3>
        <p style="color:#666;font-size:12px;margin:0 0 10px;">${reqCount} request(s) · ${grouped.length} item type(s)</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e0e0e0;">
          <tr style="background:#1a1a2e;color:white;">
            <th style="padding:8px;text-align:left;border:1px solid #333;">#</th>
            <th style="padding:8px;text-align:left;border:1px solid #333;">Description</th>
            <th style="padding:8px;text-align:left;border:1px solid #333;">Colors</th>
            <th style="padding:8px;text-align:left;border:1px solid #333;">Sizes</th>
            <th style="padding:8px;text-align:center;border:1px solid #333;">Unit</th>
            <th style="padding:8px;text-align:right;border:1px solid #333;">Requested</th>
            <th style="padding:8px;text-align:right;border:1px solid #333;">Issued</th>
          </tr>`

      grouped.forEach((g, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#f8f9fa'
        html += `
          <tr style="background:${bg};">
            <td style="padding:6px 8px;border:1px solid #e0e0e0;">${i + 1}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;font-weight:bold;">${g.description}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;">${g.colors}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;">${g.sizes}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:center;">${g.unit}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:right;">${g.totalReq}</td>
            <td style="padding:6px 8px;border:1px solid #e0e0e0;text-align:right;">${g.totalIssued}</td>
          </tr>`
      })

      html += `
          <tr style="background:#f0f0f0;font-weight:bold;">
            <td colspan="5" style="padding:8px;border:1px solid #e0e0e0;text-align:right;">Total</td>
            <td style="padding:8px;border:1px solid #e0e0e0;text-align:right;">${totalReq}</td>
            <td style="padding:8px;border:1px solid #e0e0e0;text-align:right;">${totalIssued}</td>
          </tr>
        </table>
      </div>`

      return html
    }

    const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:750px;margin:0 auto;padding:20px;">
      <div style="background:#1a1a2e;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;">ADEEM UNIFORM</h1>
        <p style="margin:5px 0 0;font-size:14px;opacity:0.9;">Monthly Records — ${monthName} ${year}</p>
      </div>
      <div style="background:white;padding:25px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">

        ${buildCategoryTable('Raw Material Consumption', '🧵', rmGrouped, rawMaterialRequests.length)}
        ${buildCategoryTable('General Supplies Issued', '📦', gsGrouped, generalRequests.length)}
        ${buildCategoryTable('Material Returns', '🔄', mrGrouped, returnRequests.length)}

        <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e0e0e0;text-align:center;color:#999;font-size:12px;">
          <p>This report was auto-generated by GHOUSH Stock Management — Adeem Uniform Factory</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>`

    // Send via Resend gateway
    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'GHOUSH ERP <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `Monthly Records — ${monthName} ${year} | Adeem Uniform`,
        html: emailHtml,
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(`Resend API failed [${response.status}]: ${JSON.stringify(result)}`)
    }

    return new Response(JSON.stringify({ success: true, month: monthName, year }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: unknown) {
    console.error('Error sending monthly report:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
