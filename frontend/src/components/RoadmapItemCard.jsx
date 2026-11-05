import { useState } from 'react'
import { ExternalLink, Clock, CalendarDays } from 'lucide-react'
import { Badge, ProgressBar } from './ui'
import { fmtDate, priorityStyle, statusLabel, statusStyle } from '../utils/format'

export default function RoadmapItemCard({ item, onUpdate, busy = false }) {
  const [notes, setNotes] = useState(item.notes || '')
  const [open, setOpen] = useState(false)
  const done = item.status === 'completed'
  return (
    <article className={`card p-4 ${done ? 'border-emerald-200 bg-emerald-50/30' : ''}`} aria-label={`Learning item ${item.skill}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-navy-900">{item.skill}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{item.category}</p>
        </div>
        <Badge className={priorityStyle[item.priority]}>{item.priority}</Badge>
      </div>
      <p className="mt-2 text-sm text-slate-600">{item.objective}</p>
      {item.prerequisites?.length > 0 && <p className="mt-2 text-xs text-slate-500">Prerequisites: {item.prerequisites.join(', ')}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden /> ~{item.est_hours} h</span>
        {item.target_date && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden /> by {fmtDate(item.target_date)}</span>}
      </div>
      {item.resource_url ? (
        <a href={item.resource_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          {item.resource_title} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      ) : <p className="mt-2 text-xs italic text-slate-400">No curated resource yet. Search official documentation for {item.skill}.</p>}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs"><Badge className={statusStyle[item.status]}>{statusLabel[item.status]}</Badge><span>{item.progress_pct}%</span></div>
        <ProgressBar value={item.progress_pct} label={`${item.skill} progress`} color={done ? '#059669' : undefined} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`status-${item.id}`}>Status for {item.skill}</label>
        <select id={`status-${item.id}`} className="input !w-auto !py-1.5" value={item.status} disabled={busy}
          onChange={(e) => onUpdate(item.id, { status: e.target.value })}>
          {Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {!done && (
          <>
            <label className="sr-only" htmlFor={`pct-${item.id}`}>Progress percentage for {item.skill}</label>
            <input id={`pct-${item.id}`} type="range" min="0" max="100" step="5" className="w-28 accent-indigo-600" value={item.progress_pct} disabled={busy}
              onChange={(e) => onUpdate(item.id, { progress_pct: Number(e.target.value) })} />
          </>
        )}
        <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setOpen((o) => !o)} aria-expanded={open}>{open ? 'Hide notes' : 'Notes & date'}</button>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
          <label className="label" htmlFor={`notes-${item.id}`}>Notes</label>
          <textarea id={`notes-${item.id}`} className="input" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <label className="label" htmlFor={`date-${item.id}`}>Target completion date</label>
          <input id={`date-${item.id}`} type="date" className="input" defaultValue={item.target_date || ''} onChange={(e) => onUpdate(item.id, e.target.value ? { target_date: e.target.value } : { clear_target_date: true })} />
          <button className="btn-primary !py-1.5" disabled={busy} onClick={() => onUpdate(item.id, { notes })}>Save notes</button>
        </div>
      )}
      {done && item.completed_at && <p className="mt-2 text-xs text-emerald-700">Completed {fmtDate(item.completed_at)}</p>}
    </article>
  )
}
