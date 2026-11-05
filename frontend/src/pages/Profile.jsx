import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { roleApi, userApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import { ConfirmDialog, Field, PageHeader, Spinner } from '../components/ui'

export default function Profile() {
  const { user, refreshUser, logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const roles = useLoad(() => roleApi.list({ page_size: 50 }), [])
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const p = user.profile || {}
  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm({
    defaultValues: { full_name: user.full_name, headline: p.headline || '', education_level: p.education_level || '', university: p.university || '', weekly_hours: p.weekly_hours || 8, target_role_id: p.target_role_id || '' },
  })
  const onSubmit = async (v) => {
    try {
      const body = { full_name: v.full_name, headline: v.headline, education_level: v.education_level, university: v.university, weekly_hours: Number(v.weekly_hours) }
      if (v.target_role_id) body.target_role_id = Number(v.target_role_id); else body.clear_target_role = true
      await userApi.update(body); const me = await refreshUser(); reset({ ...v, full_name: me.full_name }); toast.success('Profile updated.')
    } catch (e) { toast.error(getErrorMessage(e)) }
  }
  const del = async () => { setBusy(true); try { await userApi.remove(); logout(); toast.success('Your account and data were deleted.'); navigate('/') } catch (e) { toast.error(getErrorMessage(e)); setBusy(false) } }

  if (roles.loading) return <Spinner />
  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile & settings" subtitle={user.email} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-4 p-6">
        <Field label="Full name" htmlFor="pf-name" error={errors.full_name?.message}><input id="pf-name" className="input" {...register('full_name', { required: 'Name is required.', maxLength: { value: 120, message: 'Name is too long.' } })} /></Field>
        <Field label="Headline" htmlFor="pf-head" error={errors.headline?.message}><input id="pf-head" className="input" placeholder="e.g. Final-year CS student" {...register('headline', { maxLength: { value: 200, message: 'Max 200 characters.' } })} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Education level" htmlFor="pf-edu"><input id="pf-edu" className="input" {...register('education_level', { maxLength: 120 })} /></Field>
          <Field label="University / institution" htmlFor="pf-uni"><input id="pf-uni" className="input" {...register('university', { maxLength: 160 })} /></Field>
          <Field label="Target role" htmlFor="pf-role"><select id="pf-role" className="input" {...register('target_role_id')}><option value="">None selected</option>{roles.data?.items.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}</select></Field>
          <Field label="Study hours per week" htmlFor="pf-hours" error={errors.weekly_hours?.message}><input id="pf-hours" type="number" className="input" {...register('weekly_hours', { required: 'Required.', min: { value: 1, message: 'Minimum 1 hour.' }, max: { value: 80, message: 'Maximum 80 hours.' } })} /></Field>
        </div>
        <div className="flex justify-end"><button className="btn-primary" disabled={isSubmitting || !isDirty}>{isSubmitting ? 'Saving…' : 'Save changes'}</button></div>
      </form>
      <section className="card mt-6 border-red-200 p-6" aria-label="Danger zone">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-slate-600">Permanently delete your account together with every resume, analysis, roadmap and progress record. This cannot be undone.</p>
        <button className="btn-danger mt-4" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4" aria-hidden /> Delete my account</button>
      </section>
      <ConfirmDialog open={confirm} title="Delete your account?" message="Everything you stored here, including uploaded resumes, will be erased permanently." confirmLabel="Delete everything" onConfirm={del} onCancel={() => setConfirm(false)} busy={busy} />
    </div>
  )
}
