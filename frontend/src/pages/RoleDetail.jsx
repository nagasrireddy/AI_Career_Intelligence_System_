import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Info, Target } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { roleApi, userApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import { Badge, ErrorState, PageHeader, Spinner } from '../components/ui'

export default function RoleDetail() {
  const { id } = useParams()
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const { data: role, loading, error, reload } = useLoad(() => roleApi.get(id), [id])
  if (loading) return <Spinner />
  if (error) return <ErrorState message={error} onRetry={reload} />
  const isTarget = user.profile?.target_role_id === role.id
  const setTarget = async () => { try { await userApi.update({ target_role_id: role.id }); await refreshUser(); toast.success(`${role.title} is now your target role.`) } catch (e) { toast.error(getErrorMessage(e)) } }
  return (
    <div>
      <Link to="/app/roles" className="mb-3 inline-block text-sm text-brand-600 hover:underline">← All roles</Link>
      <PageHeader title={role.title} subtitle={role.description}
        actions={<>{isTarget ? <Badge className="bg-emerald-100 px-3 py-2 text-emerald-700">Your target role</Badge> : <button className="btn-primary" onClick={setTarget}><Target className="h-4 w-4" aria-hidden /> Set as target</button>}<Link className="btn-secondary" to="/app/skill-gap" state={{ roleId: role.id }}>Analyze my gap</Link></>} />
      <p className="mb-6 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {role.disclaimer}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-label="Required skills">
          <h2 className="font-semibold">Required skills ({role.skills.length})</h2>
          <table className="mt-3 w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500"><th className="py-2">Skill</th><th>Importance</th><th>Expected level</th></tr></thead>
            <tbody>{role.skills.map((s) => (<tr key={s.skill} className="border-b border-slate-100"><td className="py-2 font-medium">{s.skill}</td><td><span className="inline-flex gap-0.5" aria-label={`${s.weight} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <span key={n} className={`h-2 w-4 rounded-sm ${n <= s.weight ? 'bg-brand-600' : 'bg-slate-200'}`} />)}</span></td><td className="capitalize text-slate-600">{s.level}</td></tr>))}</tbody></table>
        </section>
        <section className="card p-5" aria-label="Suggested learning resources">
          <h2 className="font-semibold">Suggested learning resources</h2>
          <p className="mt-1 text-xs text-slate-500">From a curated catalogue of official docs and well-known free learning sites.</p>
          <ul className="mt-3 divide-y divide-slate-100">{role.resources.map((r) => (<li key={`${r.skill}-${r.url}`} className="flex items-start gap-3 py-2 text-sm"><Badge className="mt-0.5 w-28 shrink-0 justify-center bg-slate-100 text-slate-600">{r.skill}</Badge><a className="flex-1 text-brand-600 hover:underline" href={r.url} target="_blank" rel="noopener noreferrer">{r.title} <ExternalLink className="inline h-3 w-3" aria-hidden /></a><span className="text-xs text-slate-400">~{r.est_hours}h</span></li>))}</ul>
        </section>
      </div>
    </div>
  )
}
