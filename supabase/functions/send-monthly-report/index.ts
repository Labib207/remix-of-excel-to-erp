const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend'
const RECIPIENT_EMAIL = 'rabbe7026@gmail.com'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let month: number, year: number

    // Check if called with specific month/year or auto (previous month)
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await req.json()
      month = body.month ?? new Date().getMonth() - 1
      year = body.year ?? new Date().getFullYear()
    } else {
      // Auto mode: previous month
      const now = new Date()
      month = now.getMonth() - 1
      year = now.getFullYear()
      if (month < 0) { month = 11; year-- }
    }

    if (month < 0) { month = 11; year-- }

    const startDate = new Date(year, month, 1).toISOString()
    const endDate = new Date(year, month + 1, 1).toISOString()

    // Fetch all data
    const [ordersRes, requirementsRes, requestsRes, requestItemsRes] = await Promise.all([
      supabase.from('orders').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('requirements').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('requests').select('*').gte('created_at', startDate).lt('created_at', endDate),
      supabase.from('request_items').select('*').gte('created_at', startDate).lt('created_at', endDate),
    ])

    const orders = ordersRes.data || []
    const requirements = requirementsRes.data || []
    const requests = requestsRes.data || []
    const requestItems = requestItemsRes.data || []

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
    const totalOrderQty = orders.reduce((s, o) => s + Number(o.quantity || 0), 0)
    const totalReqQty = requirements.reduce((s, r) => s + Number(r.required_qty || 0), 0)
    const totalReceivedQty = requirements.reduce((s, r) => s + Number(r.received_qty || 0), 0)

    // Group items by description for each category
    function groupItems(items: any[]) {
      const groups: Record<string, any[]> = {}
      for (const item of items) {
        const key = (item.description || 'Uncategorized').trim().toLowerCase()
        if (!groups[key]) groups[key] = []
        groups[key].push(item)
      }
      return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([, items]) => {
        const totalReq = items.reduce((s, it) => s + Number(it.requested_qty || 0), 0)
        const totalIssued = items.reduce((s, it) => s + Number(it.issued_qty || 0), 0)
        const colors = [...new Set(items.map(it => it.color).filter(Boolean))].join(', ')
        const sizes = [...new Set(items.map(it => it.size).filter(Boolean))].join(', ')
        return {
          description: items[0].description || 'Uncategorized',
          colors: colors || '-',
          sizes: sizes || '-',
          unit: items[0].unit || 'pcs',
          lines: items.length,
          totalReq,
          totalIssued,
        }
      })
    }

    const rmGrouped = groupItems(rawMaterialItems)
    const gsGrouped = groupItems(generalItems)
    const mrGrouped = groupItems(returnItems)

    // Build HTML email
    const buildItemTable = (title: string, requests: any[], grouped: any[]) => {
      if (requests.length === 0) return ''
      let html = `<h3 style="color:#1a1a2e;margin:20px 0 10px;">${title} (${requests.length} requests)</h3>`
      
      // Request list
      html += `<table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:13px;">
        <tr style="background:#1a1a2e;color:white;">
          <th style="padding:8px;text-align:left;">Request No</th>
          <th style="padding:8px;text-align:left;">Date</th>
          <th style="padding:8px;text-align:left;">Department</th>
          <th style="padding:8px;text-align:left;">Status</th>
        </tr>`
      for (const r of requests) {
        html += `<tr style="border-bottom:1px solid #eee;">
          <td style="padding:6px 8px;">${r.request_no}</td>
          <td style="padding:6px 8px;">${r.request_date || ''}</td>
          <td style="padding:6px 8px;">${r.department || '-'}</td>
          <td style="padding:6px 8px;">${r.status}</td>
        </tr>`
      }
      html += '</table>'

      // Item category breakdown
      if (grouped.length > 0) {
        html += `<p style="font-weight:bold;color:#555;margin:10px 0 5px;">Item Category Breakdown:</p>`
        html += `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="background:#f0f0f0;">
            <th style="padding:6px 8px;text-align:left;">Description</th>
            <th style="padding:6px 8px;text-align:left;">Colors</th>
            <th style="padding:6px 8px;text-align:left;">Sizes</th>
            <th style="padding:6px 8px;text-align:right;">Req Qty</th>
            <th style="padding:6px 8px;text-align:right;">Issued</th>
          </tr>`
        for (const g of grouped) {
          html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:5px 8px;">${g.description}</td>
            <td style="padding:5px 8px;">${g.colors}</td>
            <td style="padding:5px 8px;">${g.sizes}</td>
            <td style="padding:5px 8px;text-align:right;">${g.totalReq}</td>
            <td style="padding:5px 8px;text-align:right;">${g.totalIssued}</td>
          </tr>`
        }
        html += '</table>'
      }
      return html
    }

    const emailHtml = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:20px;">
      <div style="background:#1a1a2e;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;">ADEEM UNIFORM</h1>
        <p style="margin:5px 0 0;font-size:14px;opacity:0.9;">Monthly Summary Report — ${monthName} ${year}</p>
      </div>
      <div style="background:white;padding:20px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;">
        
        <h2 style="color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:8px;">Summary Overview</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
          <tr style="background:#f8f8f8;">
            <td style="padding:10px;font-weight:bold;">Total Orders</td>
            <td style="padding:10px;text-align:right;">${orders.length} (Qty: ${totalOrderQty})</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:bold;">Requirements (Trim Chart)</td>
            <td style="padding:10px;text-align:right;">${requirements.length} (Required: ${totalReqQty} | Received: ${totalReceivedQty})</td>
          </tr>
          <tr style="background:#f8f8f8;">
            <td style="padding:10px;font-weight:bold;">Raw Material Requests</td>
            <td style="padding:10px;text-align:right;">${rawMaterialRequests.length}</td>
          </tr>
          <tr>
            <td style="padding:10px;font-weight:bold;">General Supplies Requests</td>
            <td style="padding:10px;text-align:right;">${generalRequests.length}</td>
          </tr>
          <tr style="background:#f8f8f8;">
            <td style="padding:10px;font-weight:bold;">Material Return Requests</td>
            <td style="padding:10px;text-align:right;">${returnRequests.length}</td>
          </tr>
        </table>

        ${orders.length > 0 ? `
        <h3 style="color:#1a1a2e;margin:20px 0 10px;">Orders (${orders.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="background:#1a1a2e;color:white;">
            <th style="padding:8px;text-align:left;">Order No</th>
            <th style="padding:8px;text-align:left;">Customer</th>
            <th style="padding:8px;text-align:left;">Style</th>
            <th style="padding:8px;text-align:right;">Qty</th>
            <th style="padding:8px;text-align:left;">Status</th>
          </tr>
          ${orders.map(o => `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px 8px;">${o.order_no}</td>
            <td style="padding:6px 8px;">${o.customer}</td>
            <td style="padding:6px 8px;">${o.style_no}</td>
            <td style="padding:6px 8px;text-align:right;">${o.quantity}</td>
            <td style="padding:6px 8px;">${o.status}</td>
          </tr>`).join('')}
        </table>` : ''}

        ${buildItemTable('Raw Material Requests', rawMaterialRequests, rmGrouped)}
        ${buildItemTable('General Supplies Requests', generalRequests, gsGrouped)}
        ${buildItemTable('Material Return Requests', returnRequests, mrGrouped)}

        <div style="margin-top:30px;padding-top:15px;border-top:1px solid #e0e0e0;text-align:center;color:#999;font-size:12px;">
          <p>This report was auto-generated by GHOUSH Cutting ERP — Adeem Uniform Factory</p>
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
        subject: `Monthly Report — ${monthName} ${year} | Adeem Uniform`,
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
