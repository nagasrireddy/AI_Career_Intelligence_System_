import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Map, Play, Target } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { gapApi, resumeApi, roleApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import SkillGapView from '../components/SkillGapView'
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../components/ui'
import { fmtDate, scoreColor } from '../utils/format'

export default function SkillGap() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const loc = useLocation()
  const [roleId, setRoleId] = useState(loc.state?.roleId || user.profile?.target_role_id || '')
  const [resumeId, setResumeId] = useState('')
  const [extra, setExtra] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [hPage, setHPage] = useState(1)
  const [opening, setOpening] = useState(false)

  const roles = useLoad(() => roleApi.list({ page_size: 50 }), [])
  const resumes = useLoad(() => resumeApi.list({ page_size: 50 }), [])
  const hist = useLoad(() => gapApi.history({ page: hPage, page_size: 6 }), [hPage])

  useEffect(() => { if (!result && hist.data?.items[0] && hPage === 1 && !opening) { gapApi.get(hist.data.items[0].id).then(setResult).catch(() => {}) } }, [hist.data]) // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setRunning(true)
    try {
      const body = { role_id: Number(roleId), extra_skills: extra.split(',').map((s) => s.trim()).filter(Boolean) }
      if (resumeId) body.resume_id = Number(resumeId)
      const r = await gapApi.analyze(body)
      setResult(r); toast.success('Skill-gap analysis saved.'); setHPage(1); hist.reload()
    } catch (e) { toast.error(getErrorMessage(e)) } finally { setRunning(false) }
  }
  const open = async (id) => { setOpening(true); try { setResult(await gapApi.get(id)); window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) { toast.error(getErrorMessage(e)) } }

  if (roles.loading || resumes.loading) return <Spinner />
  if (roles.error) return <ErrorState message={roles.error} onRetry={roles.reload} />
  const noResume = resumes.data?.total === 0

  return (
    <div>
      <PageHeader title="Skill-gap analysis" subtitle="Compare your skills with an illustrative role profile. The score is a learning aid, not a hiring probability."
        actions={result && <button className="btn-primary" onClick={() => navigate('/app/roadmap', { state: { roleId: result.role_id, analysisId: result.id } })}><Map className="h-4 w-4" aria-hidden /> Build roadmap from this</button>} />

      <section className="card mb-6 grid gap-4 p-5 md:grid-cols-4" aria-label="Run analysis">
        <div><label className="label" htmlFor="gap-role">Target role</label><select id="gap-role" className="input" value={roleId} onChange={(e) => setRoleId(e.target.value)}><option value="">Select a role…</option>{roles.data.items.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></div>
        <div><label className="label" htmlFor="gap-resume">Resume</label><select id="gap-resume" className="input" value={resumeId} onChange={(e) => setResumeId(e.target.value)} disabled={noResume}><option value="">Latest resume</option>{resumes.data.items.map((r) => <option key={r.id} value={r.id}>{r.original_filename}</option>)}</select></div>
        <div><label className="label" htmlFor="gap-extra">Extra skills (optional)</label><input id="gap-extra" className="input" placeholder="e.g. Docker, Tableau" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
        <div className="flex items-end"><button className="btn-primary w-full" onClick={run} disabled={!roleId || running || (noResume && !extra.trim())}><Play className="h-4 w-4" aria-hidden /> {running ? 'Analyzing…' : 'Run analysis'}</button></div>
        {noResume && <p className="text-sm text-amber-700 md:col-span-4">You haven’t uploaded a resume yet. <Link to="/app/resume" className="font-semibold underline">Upload one</Link> or type skills above.</p>}
      </section>

      {result ? (
        <div className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Target className="h-5 w-5 text-brand-600" aria-hidden /> {result.role_title} <span className="text-sm font-normal text-slate-400">· {fmtDate(result.created_at)}</span></h2>
          <SkillGapView analysis={result} />
        </div>
      ) : <div className="mb-8"><EmptyState icon={Target} title="No analysis yet" description="Choose a role and run your first analysis to see matched and missing skills." /></div>}

      <section aria-label="Analysis history">
        <h2 className="mb-3 text-lg font-semibold">Analysis history</h2>
        {hist.data?.items.length ? (
          <>
            <div className="card divide-y divide-slate-100">{hist.data.items.map((h) => (
              <button key={h.id} onClick={() => open(h.id)} className={`flex w-full items-center gap-3 p-4 text-left text-sm hover:bg-slate-50 ${result?.id === h.id ? 'bg-brand-50' : ''}`}>
                <span className="flex-1 font-medium">{h.role_title}</span><span className="text-xs text-slate-500">{fmtDate(h.created_at)}</span>
                <span className="w-16 text-right font-semibold" style={{ color: scoreColor(h.weighted_score) }}>{h.weighted_score}%</span></button>))}</div>
            <Pagination page={hist.data.page} pageSize={hist.data.page_size} total={hist.data.total} onChange={setHPage} />
          </>) : <p className="text-sm text-slate-500">Your saved analyses will appear here.</p>}
      </section>
    </div>
  )
}
