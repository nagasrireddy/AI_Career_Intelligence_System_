import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, Clock, ListTodo, TrendingUp } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { progressApi } from '../api/services'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import RoadmapItemCard from '../components/RoadmapItemCard'
import { EmptyState, ErrorState, PageHeader, Pagination, ProgressBar, Spinner, StatCard } from '../components/ui'
import { fmtDate, statusLabel } from '../utils/format'

export default function Progress() {
  const toast = useToast()
  const [view, setView] = useState('weekly')
  const [filter, setFilter] = useState('')
  const [hPage, setHPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const summary = useLoad(() => progressApi.summary(), [])
  const items = useLoad(() => progressApi.items({ status: filter || undefined, page_size: 50 }), [filter])
  const hist = useLoad(() => progressApi.history({ page: hPage, page_size: 8 }), [hPage])

  const update = async (id, patch) => {
    setBusy(true)
    try { await progressApi.updateItem(id, patch); await Promise.all([summary.reload(), items.reload(), hist.reload()]); if ('notes' in patch) toast.success('Notes saved.') } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }

  if (summary.loading && !summary.data) return <Spinner />
  if (summary.error) return <ErrorState message={summary.error} onRetry={summary.reload} />
  const s = summary.data
  if (!s.roadmap_id) return (<div><PageHeader title="Progress tracking" /><EmptyState icon={TrendingUp} title="No active roadmap to track" description="Generate a learning roadmap first, then track your progress here." action={<Link to="/app/roadmap" className="btn-primary">Create roadmap</Link>} /></div>)
  const series = view === 'weekly' ? s.weekly : s.monthly

  return (
    <div>
      <PageHeader title="Progress tracking" subtitle={s.roadmap_title} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp} label="Overall completion" value={`${s.completion_pct}%`} hint={`${s.hours_done}/${s.hours_total} estimated hours done`} />
        <StatCard icon={CheckCircle2} tone="green" label="Completed" value={s.completed} hint="skills finished" />
        <StatCard icon={Clock} tone="amber" label="In progress" value={s.in_progress} />
        <StatCard icon={ListTodo} tone="red" label="Not started" value={s.not_started} />
      </div>
      <div className="card mt-4 p-5"><ProgressBar value={s.completion_pct} label="Overall roadmap completion" /></div>

      <section className="card mt-6 p-5" aria-label="Progress over time">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Progress over time</h2>
          <div className="inline-flex rounded-xl bg-slate-100 p-1" role="group" aria-label="Chart range">{['weekly', 'monthly'].map((v) => <button key={v} className={`rounded-lg px-3 py-1 text-sm font-medium capitalize ${view === v ? 'bg-white shadow' : 'text-slate-500'}`} onClick={() => setView(v)} aria-pressed={view === v}>{v}</button>)}</div></div>
        <div className="mt-4 h-64"><ResponsiveContainer>{view === 'weekly' ? (
          <AreaChart data={series}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Area dataKey="updates" name="Updates" stroke="#818cf8" fill="#c7d2fe" /><Area dataKey="completed" name="Completed" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.5} /></AreaChart>
        ) : (
          <BarChart data={series}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="updates" name="Updates" fill="#c7d2fe" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Completed" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart>)}</ResponsiveContainer></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-label="Completed skills"><h2 className="font-semibold">Completed skills ({s.completed_skills.length})</h2>{s.completed_skills.length ? <ul className="mt-3 flex flex-wrap gap-2">{s.completed_skills.map((k) => <li key={k} className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm text-emerald-700">{k}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">None yet. Finish an item to see it here.</p>}</section>
        <section className="card p-5" aria-label="Remaining skills"><h2 className="font-semibold">Remaining skills ({s.remaining_skills.length})</h2>{s.remaining_skills.length ? <ul className="mt-3 flex flex-wrap gap-2">{s.remaining_skills.map((k) => <li key={k} className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm text-slate-700">{k}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">All done. 🎉</p>}</section>
      </div>

      <section className="mt-8" aria-label="Learning items">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Update your items</h2>
          <div><label htmlFor="status-filter" className="sr-only">Filter by status</label><select id="status-filter" className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option>{Object.entries(statusLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div></div>
        {items.loading && !items.data ? <Spinner /> : items.data?.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.data.items.map((i) => <RoadmapItemCard key={i.id} item={i} onUpdate={update} busy={busy} />)}</div> : <EmptyState title="No items match this filter" />}
      </section>

      <section className="mt-8" aria-label="Progress history">
        <h2 className="mb-3 text-lg font-semibold">History</h2>
        {hist.data?.items.length ? (<><div className="card divide-y divide-slate-100">{hist.data.items.map((h) => (<div key={h.id} className="flex flex-wrap items-center gap-2 p-3 text-sm"><span className="flex-1 font-medium">{h.skill}</span><span className="text-slate-500">{statusLabel[h.old_status]} ({h.old_pct}%) → <strong>{statusLabel[h.new_status]} ({h.new_pct}%)</strong></span><span className="w-28 text-right text-xs text-slate-400">{fmtDate(h.created_at)}</span></div>))}</div><Pagination page={hist.data.page} pageSize={hist.data.page_size} total={hist.data.total} onChange={setHPage} /></>) : <p className="text-sm text-slate-500">Your updates will be logged here.</p>}
      </section>
    </div>
  )
}
