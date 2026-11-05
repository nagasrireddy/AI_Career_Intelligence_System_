import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, FileText, RefreshCw, Trash2 } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { resumeApi } from '../api/services'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../components/ui'
import { fmtDate, fmtSize } from '../utils/format'

export default function ResumeHistory() {
  const [page, setPage] = useState(1)
  const toast = useToast()
  const { data, loading, error, reload } = useLoad(() => resumeApi.list({ page, page_size: 8 }), [page])
  const [target, setTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const remove = async () => {
    setBusy(true)
    try { await resumeApi.remove(target.id); toast.success('Resume deleted.'); setTarget(null); if (data.items.length === 1 && page > 1) setPage(page - 1); else reload() } catch (e) { toast.error(getErrorMessage(e)) } finally { setBusy(false) }
  }
  const reanalyze = async (r) => {
    try { await resumeApi.analyze(r.id); toast.success('Re-analysis complete.'); reload() } catch (e) { toast.error(getErrorMessage(e)) }
  }

  return (
    <div>
      <PageHeader title="Resume history" subtitle="Every resume you uploaded and its analysis. Delete any you no longer want stored." actions={<Link to="/app/resume" className="btn-primary">Upload new resume</Link>} />
      {loading ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <EmptyState icon={FileText} title="No resumes yet" description="Your uploaded resumes will be listed here." action={<Link to="/app/resume" className="btn-primary">Upload resume</Link>} />
      ) : (
        <>
          <div className="card divide-y divide-slate-100">
            {data.items.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <FileText className="h-5 w-5 text-brand-600" aria-hidden />
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{r.original_filename}</p><p className="text-xs text-slate-500">{r.file_type.toUpperCase()} · {fmtSize(r.size_bytes)} · {fmtDate(r.created_at)} · {r.skill_count} skills · analysis v{r.analysis_version}</p></div>
                <Link to={`/app/resume/${r.id}`} className="btn-secondary"><Eye className="h-4 w-4" aria-hidden /> View</Link>
                <button className="btn-secondary" onClick={() => reanalyze(r)}><RefreshCw className="h-4 w-4" aria-hidden /> Re-analyze</button>
                <button className="btn-ghost text-red-600" onClick={() => setTarget(r)} aria-label={`Delete ${r.original_filename}`}><Trash2 className="h-4 w-4" /></button>
              </div>))}
          </div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        </>)}
      <ConfirmDialog open={!!target} title="Delete this resume?" message={`“${target?.original_filename}” and its extracted data will be permanently deleted.`} onConfirm={remove} onCancel={() => setTarget(null)} busy={busy} />
    </div>
  )
}
