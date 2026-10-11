import type { Sample, CustomerOrder } from '@/hooks/useCustomerSamples';

export const SAMPLE_TYPES = [
  { value: 'fit_on', label: 'Fit-on' },
  { value: 'approval', label: 'Approval (Owner / Ministry)' },
  { value: 'customer_sales', label: 'Customer Sales' },
] as const;

export const SAMPLE_STATUSES = [
  { value: 'waiting_approval', label: 'Waiting Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'sent', label: 'Sent' },
  { value: 'returned', label: 'Returned' },
  { value: 'disposed', label: 'Disposed' },
] as const;

/** Statuses that mean the sample has left the room — only set through a gate pass. */
export const LEAVING_STATUSES = ['sent', 'returned', 'disposed'];

export const FINAL_ACTIONS = [
  { value: 'keep', label: 'Keep' },
  { value: 'send', label: 'Send' },
  { value: 'reuse', label: 'Reuse' },
  { value: 'dispose', label: 'Dispose' },
] as const;

export const typeLabel = (v?: string | null) => SAMPLE_TYPES.find(t => t.value === v)?.label ?? '-';
export const statusLabel = (v?: string | null) => SAMPLE_STATUSES.find(t => t.value === v)?.label ?? '-';
export const actionLabel = (v?: string | null) => FINAL_ACTIONS.find(t => t.value === v)?.label ?? '-';

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Default "keep until": Fit-on 14d, Rejected 30d, Approval = until linked order delivered, Customer Sales 90d. */
export function suggestKeepUntil(type: string, status: string, madeDate: string | null, order?: CustomerOrder | null): string {
  const base = madeDate || todayStr();
  if (status === 'rejected') return addDays(todayStr(), 30);
  if (type === 'fit_on') return addDays(base, 14);
  if (type === 'approval') return order?.delivery_date || order?.deadline || '';
  return addDays(base, 90);
}

export const isInRoom = (s: Sample) => !LEAVING_STATUSES.includes(s.status);
export const isExpired = (s: Sample) => !!s.keep_until && s.keep_until < todayStr() && s.status !== 'disposed';

const styleKey = (s: Sample) => s.style_name.trim().toLowerCase();
const sortKey = (s: Sample) => `${s.made_date ?? ''}|${s.created_at}`;

/** Reasons a sample should be reviewed; empty array = no review needed. */
export function reviewReasons(s: Sample, all: Sample[]): string[] {
  if (s.status === 'disposed') return [];
  const reasons: string[] = [];
  if (isExpired(s)) reasons.push('Keep-until date passed');
  if (s.status === 'rejected' && Date.now() - new Date(s.status_changed_at).getTime() > 30 * 86400000) reasons.push('Rejected over 30 days');
  if (s.sample_type === 'fit_on' && all.some(o => o.id !== s.id && styleKey(o) === styleKey(s) && sortKey(o) > sortKey(s))) {
    reasons.push('Newer sample of same style exists');
  }
  return reasons;
}
