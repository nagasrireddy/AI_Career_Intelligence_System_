import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Archive, Map, RefreshCw, Trash2 } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { roadmapApi, roleApi, progressApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import RoadmapItemCard from '../components/RoadmapItemCard'
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, ProgressBar, Spinner } from '../components/ui'
import { fmtDate } from '../utils/format'

export default function Roadmap() {
  const { user } = useAuth()
  const toast = useToast()
  const loc = useLocation()
  const [roadmap, setRoadmap] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [roleId, setRoleId] = useState(loc.state?.roleId || user.profile?.target_role_id || '')
  const [days, setDays] = useState(60)
  const [generating, setGenerating] = useState(false)
  const [busyItem, setBusyItem] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const roles = useLoad(() => roleApi.list({ page_size: 50 }), [])
  const list = useLoad(() => roadmapApi.list({ page_size: 20 }), [])

  const loadActive = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const act = await roadmapApi.list({ status: 'active', page_size: 1 })
      setRoadmap(act.items[0] ? await roadmapApi.get(act.items[0].id) : null)
    } catch (e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }, [])
  useEffect(() => { loadActive() }, [loadActive])
  useEffect(() => { if (roadmap) { setRoleId((r) => r || roadmap.role_id); setDays(roadmap.duration_days) } }, [roadmap?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async () => {
    setGenerating(true)
    try {
      const body = { role_id: Number(roleId), duration_days: Number(days) }
      if (roadmap && roadmap.role_id === Number(roleId)) body.replace_roadmap_id = roadmap.id
      if (loc.state?.analysisId && !roadmap) body.analysis_id = loc.state.analysisId
      const r = await roadmapApi.generate(body)
      setRoadmap(r); list.reload()
      toast.success(roadmap ? 'Roadmap regenerated. Completed items were preserved.' : 'Roadmap created.')
    } catch (e) { toast.error(getErrorMessage(e)) } finally { setGenerating(false) }
  }

  const updateItem = async (itemId, patch) => {
    setBusyItem(true)
    try {
      const updated = await progressApi.updateItem(itemId, patch)
      setRoadmap((r) => {
        const items = r.items.map((i) => (i.id === itemId ? updated : i))
        const done = items.filter((i) => i.status === 'completed').length
        return { ...r, items, completed_count: done, completion_pct: Math.round((items.reduce((s, i) => s + i.progress_pct, 0) / items.length) * 10) / 10 }
      })
      if ('notes' in patch) toast.success('Notes saved.')
      else if (patch.status === 'completed' || patch.progress_pct === 100) toast.success('Nice! Item completed.')
    } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusyItem(false) }
  }

  const archive = async (r) => { try { await roadmapApi.patch(r.id, { status: r.status === 'active' ? 'archived' : 'active' }); toast.success(r.status === 'active' ? 'Roadmap archived.' : 'Roadmap restored as active.'); loadActive(); list.reload() } catch (e) { toast.error(getErrorMessage(e)) } }
  const remove = async () => { try { await roadmapApi.remove(delTarget.id); toast.success('Roadmap deleted.'); setDelTarget(null); loadActive(); list.reload() } catch (e) { toast.error(getErrorMessage(e)) } }

  if (loading || roles.loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={loadActive} />
  const milestones = roadmap ? [...new Set(roadmap.items.map((i) => i.milestone))].sort((a, b) => a - b) : []

  return (
    <div>
      <PageHeader title="Learning roadmap" subtitle="Foundations come before the skills that depend on them. Resources are curated official docs and well-known free sites." />
      <section className="card mb-6 grid gap-4 p-5 md:grid-cols-4" aria-label="Generate roadmap">
        <div className="md:col-span-2"><label className="label" htmlFor="rm-role">Target role</label><select id="rm-role" className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">Select a role…</option>{roles.data?.items.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
        <div><label className="label" htmlFor="rm-days">Plan length</label><select id="rm-days" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></div>
        <div className="flex items-end"><button className="btn-primary w-full" onClick={generate} disabled={!roleId || generating}><RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} aria-hidden /> {generating ? 'Generating…' : roadmap && roadmap.role_id === Number(roleId) ? 'Regenerate' : 'Generate roadmap'}</button></div>
        <p className="text-xs text-slate-500 md:col-span-4">Uses your latest resume’s skills. Regenerating keeps completed items and your in-progress notes. <Link to="/app/resume" className="text-brand-600 underline">Update your skills</Link> first for better results.</p>
      </section>

      {!roadmap ? <EmptyState icon={Map} title="No active roadmap" description="Choose a target role and plan length above to generate your personalised plan." /> : (
        <>
          <div className="card mb-6 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{roadmap.title}</h2><span className="text-sm text-slate-500">Started {fmtDate(roadmap.start_date)} · {roadmap.completed_count}/{roadmap.item_count} complete</span></div>
            <ProgressBar className="mt-3" value={roadmap.completion_pct} label="Roadmap completion" /><p className="mt-1 text-right text-xs text-slate-500">{roadmap.completion_pct}% overall</p>
          </div>
          {roadmap.items.length === 0 ? <EmptyState title="Nothing to learn" description="Your skills already cover every requirement for this role profile. Great job!" /> : (
            <div className="space-y-8">
              {milestones.map((m) => {
                const its = roadmap.items.filter((i) => i.milestone === m)
                const done = its.filter((i) => i.status === 'completed').length
                return (
                  <section key={m} aria-label={`Milestone ${m}`}>
                    <div className="mb-3 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{m}</span><h3 className="font-semibold">Milestone {m}</h3><Badge className="bg-slate-100 text-slate-600">{done}/{its.length} done</Badge><div className="h-px flex-1 bg-slate-200" /></div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{its.map((i) => <RoadmapItemCard key={i.id} item={i} onUpdate={updateItem} busy={busyItem} />)}</div>
                  </section>)
              })}
            </div>)}
        </>)}

      <section className="mt-10" aria-label="Roadmap history">
        <h2 className="mb-3 text-lg font-semibold">Roadmap history</h2>
        {list.data?.items.length ? (
          <div className="card divide-y divide-slate-100">{list.data.items.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1"><p className="font-medium">{r.title}</p><p className="text-xs text-slate-500">{fmtDate(r.created_at)} · {r.completed_count}/{r.item_count} complete ({r.completion_pct}%)</p></div>
              <Badge className={r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>{r.status}</Badge>
              <button className="btn-secondary !px-3" onClick={() => archive(r)}><Archive className="h-4 w-4" aria-hidden /> {r.status === 'active' ? 'Archive' : 'Make active'}</button>
              <button className="btn-ghost text-red-600" onClick={() => setDelTarget(r)} aria-label={`Delete ${r.title}`}><Trash2 className="h-4 w-4" /></button>
            </div>))}</div>
        ) : <p className="text-sm text-slate-500">Generated roadmaps will be listed here.</p>}
      </section>
      <ConfirmDialog open={!!delTarget} title="Delete this roadmap?" message="All of its learning items and progress history will be permanently deleted." onConfirm={remove} onCancel={() => setDelTarget(null)} />
    </div>
  )
}
