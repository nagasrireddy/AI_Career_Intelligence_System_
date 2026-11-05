export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
export const statusLabel = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' }
export const priorityStyle = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-slate-100 text-slate-600',
}
export const statusStyle = {
  matched: 'bg-emerald-100 text-emerald-700', partial: 'bg-amber-100 text-amber-700', missing: 'bg-red-100 text-red-700',
  not_started: 'bg-slate-100 text-slate-600', in_progress: 'bg-indigo-100 text-indigo-700', completed: 'bg-emerald-100 text-emerald-700',
}
export const scoreColor = (s) => (s >= 70 ? '#059669' : s >= 40 ? '#d97706' : '#dc2626')
export const MAX_UPLOAD_MB = 5
export const ACCEPTED_EXT = ['pdf', 'docx']
