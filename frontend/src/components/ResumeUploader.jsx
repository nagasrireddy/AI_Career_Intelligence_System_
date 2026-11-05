import { useRef, useState } from 'react'
import { FileUp, Loader2, FileText, X } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { resumeApi } from '../api/services'
import { ACCEPTED_EXT, MAX_UPLOAD_MB, fmtSize } from '../utils/format'

/** Client-side pre-validation mirrors the server rules (the server is still the authority). */
export function validateFile(file) {
  if (!file) return 'Please choose a file.'
  const ext = file.name.split('.').pop().toLowerCase()
  if (!ACCEPTED_EXT.includes(ext)) return 'Unsupported file type. Please upload a PDF or DOCX resume.'
  if (file.size === 0) return 'The selected file is empty.'
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`
  return null
}

export default function ResumeUploader({ onUploaded, replaceId = null }) {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [drag, setDrag] = useState(false)
  const input = useRef(null)

  const choose = (f) => { setFile(f); setError(f ? validateFile(f) : null) }

  const submit = async () => {
    const err = validateFile(file)
    if (err) return setError(err)
    setBusy(true); setError(null); setProgress(0)
    try {
      const resume = await resumeApi.upload(file, replaceId, setProgress)
      setFile(null)
      if (input.current) input.current.value = ''
      onUploaded?.(resume)
    } catch (e) {
      setError(getErrorMessage(e, 'Upload failed. Please try again.'))
    } finally { setBusy(false) }
  }

  return (
    <div className="card p-5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0] || null) }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300'}`}>
        <FileUp className="h-8 w-8 text-brand-600" aria-hidden />
        <p className="text-sm text-slate-600">Drag & drop your resume here, or</p>
        <label htmlFor="resume-file" className="btn-secondary cursor-pointer">Choose file</label>
        <input id="resume-file" ref={input} type="file" className="sr-only" accept=".pdf,.docx" onChange={(e) => choose(e.target.files?.[0] || null)} />
        <p className="text-xs text-slate-500">PDF or DOCX · up to {MAX_UPLOAD_MB} MB · text-based files only</p>
      </div>
      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <FileText className="h-5 w-5 text-slate-500" aria-hidden />
          <span className="flex-1 truncate">{file.name} <span className="text-slate-400">({fmtSize(file.size)})</span></span>
          <button className="text-slate-400 hover:text-slate-600" aria-label="Remove selected file" onClick={() => choose(null)} disabled={busy}><X className="h-4 w-4" /></button>
        </div>
      )}
      {busy && (
        <div className="mt-3" role="status">
          <div className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> {progress < 100 ? `Uploading… ${progress}%` : 'Analyzing resume…'}</div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={submit} disabled={!file || busy || Boolean(error)}>{replaceId ? 'Replace & re-analyze' : 'Upload & analyze'}</button>
      </div>
    </div>
  )
}
