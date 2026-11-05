import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, RefreshCw, Trash2, X, Undo2, Target } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { resumeApi } from '../api/services'
import { useToast } from '../context/ToastContext'
import ResumeUploader from '../components/ResumeUploader'
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui'
import { fmtDate, fmtSize } from '../utils/format'

export default function ResumePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [resume, setResume] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newSkill, setNewSkill] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [replacing, setReplacing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      if (id) setResume(await resumeApi.get(id))
      else {
        const list = await resumeApi.list({ page: 1, page_size: 1 })
        setResume(list.items[0] ? await resumeApi.get(list.items[0].id) : null)
      }
    } catch (e) { setError(getErrorMessage(e)) } finally { setLoading(false) }
  }, [id])
  useEffect(() => { load() }, [load])

  const edit = async (body, msg) => {
    setBusy(true)
    try { setResume(await resumeApi.editSkills(resume.id, body)); if (msg) toast.success(msg) } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }
  const reanalyze = async () => {
    setBusy(true)
    try { setResume(await resumeApi.analyze(resume.id)); toast.success('Resume re-analyzed. Your manual corrections were kept.') } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await resumeApi.remove(resume.id); toast.success('Resume deleted.'); setConfirmDelete(false); navigate('/app/resume'); setResume(null); load() } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }
  const onUploaded = (r) => { setResume(r); setReplacing(false); toast.success(`Analysis complete: ${r.skill_count} skills detected.`); if (id) navigate('/app/resume') }

  if (loading) return <Spinner label="Loading resume…" />
  if (error) return <ErrorState message={error} onRetry={load} />

  const active = resume?.skills.filter((s) => !s.removed) || []
  const removed = resume?.skills.filter((s) => s.removed) || []
  const groups = active.reduce((acc, s) => { (acc[s.category] ||= []).push(s); return acc }, {})

  return (
    <div>
      <PageHeader title="Resume upload & analysis" subtitle="We extract text and detect skills with a configurable dictionary and text patterns. Review the results and correct anything that’s wrong."
        actions={resume && <Link to="/app/resume-history" className="btn-secondary">History</Link>} />

      {(!resume || replacing) && (
        <div className="mb-6">
          {!resume && <div className="mb-4"><EmptyState title="No resume yet" description="Upload a text-based PDF or DOCX to detect your skills." /></div>}
          <ResumeUploader onUploaded={onUploaded} replaceId={replacing ? resume?.id : null} />
          {replacing && <button className="btn-ghost mt-2" onClick={() => setReplacing(false)}>Cancel replacement</button>}
        </div>
      )}

      {resume && !replacing && (
        <div className="space-y-6">
          <div className="card flex flex-wrap items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{resume.original_filename}</p>
              <p className="text-xs text-slate-500">{resume.file_type.toUpperCase()} · {fmtSize(resume.size_bytes)} · uploaded {fmtDate(resume.created_at)} · analysis v{resume.analysis_version}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setReplacing(true)}>Replace file</button>
              <button className="btn-secondary" onClick={reanalyze} disabled={busy}><RefreshCw className="h-4 w-4" aria-hidden /> Re-analyze</button>
              <Link className="btn-primary" to="/app/skill-gap"><Target className="h-4 w-4" aria-hidden /> Analyze gaps</Link>
              <button className="btn-ghost text-red-600" onClick={() => setConfirmDelete(true)} aria-label="Delete resume"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>

          <section className="card p-5" aria-label="Detected skills">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Detected skills <span className="text-slate-400">({active.length})</span></h2>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newSkill.trim()) { edit({ add: [newSkill.trim()] }, `Added “${newSkill.trim()}”.`); setNewSkill('') } }}>
                <label htmlFor="add-skill" className="sr-only">Add a skill manually</label>
                <input id="add-skill" className="input !w-52" placeholder="Add a missing skill…" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} maxLength={100} />
                <button className="btn-secondary" disabled={busy || !newSkill.trim()}><Plus className="h-4 w-4" aria-hidden /> Add</button>
              </form>
            </div>
            {active.length === 0 ? <p className="mt-4 text-sm text-slate-500">No skills detected. Add skills manually above.</p> : (
              <div className="mt-4 space-y-5">
                {Object.entries(groups).map(([cat, list]) => (
                  <div key={cat}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</h3>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((s) => (
                        <li key={s.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-sm" title={s.evidence || ''}>
                          <span className="font-medium">{s.skill}</span>
                          <Badge className={s.source === 'manual' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'}>{s.source === 'manual' ? 'manual' : `${Math.round(s.confidence * 100)}%`}</Badge>
                          <button className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600" aria-label={`Remove ${s.skill}`} onClick={() => edit({ remove: [s.skill] })} disabled={busy}><X className="h-3.5 w-3.5" /></button>
                        </li>))}
                    </ul>
                  </div>))}
                <p className="text-xs text-slate-500">Percentages are a documented heuristic (match count and whether the skill is in a “Skills” section), not a statistical probability. Hover a skill to see the matching text.</p>
              </div>)}
            {removed.length > 0 && (
              <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Removed by you</h3>
                <ul className="mt-2 flex flex-wrap gap-2">{removed.map((s) => (<li key={s.id}><button className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50" onClick={() => edit({ restore: [s.skill] })} aria-label={`Restore ${s.skill}`}><Undo2 className="h-3.5 w-3.5" aria-hidden /> {s.skill}</button></li>))}</ul></div>)}
          </section>

          {resume.sections && Object.keys(resume.sections).some((k) => !k.startsWith('_') && resume.sections[k]?.length) && (
            <section className="card p-5" aria-label="Resume sections">
              <h2 className="font-semibold">Sections found in your resume</h2>
              <p className="mb-3 text-xs text-slate-500">Shown only when a clearly labelled section exists. Nothing is inferred or invented.</p>
              <div className="grid gap-4 md:grid-cols-2">
                {['education', 'experience', 'projects', 'certifications'].filter((k) => resume.sections[k]?.length).map((k) => (
                  <div key={k}><h3 className="text-sm font-semibold capitalize">{k}</h3><ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-600">{resume.sections[k].slice(0, 6).map((l, i) => <li key={i}>{l}</li>)}</ul></div>))}
              </div>
            </section>)}

          <section className="card p-5" aria-label="Extracted text preview">
            <h2 className="font-semibold">Extracted text preview</h2>
            <p className="mb-2 text-xs text-slate-500">{resume.text_length.toLocaleString()} characters extracted{resume.text_length > resume.text_preview.length ? ' (preview truncated)' : ''}.</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">{resume.text_preview}</pre>
          </section>
        </div>
      )}
      <ConfirmDialog open={confirmDelete} title="Delete this resume?" message="The file, extracted text and detected skills will be permanently deleted. Past skill-gap analyses keep their own skill snapshot." onConfirm={remove} onCancel={() => setConfirmDelete(false)} busy={busy} />
    </div>
  )
}
