import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, GitCompare, Search, Target } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { roleApi, userApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useLoad } from '../hooks/useLoad'
import { Badge, EmptyState, ErrorState, PageHeader, Pagination, ProgressBar, Spinner } from '../components/ui'
import { scoreColor } from '../utils/format'

function Compare({ ids, onClose }) {
  const { data, loading, error } = useLoad(() => roleApi.compare(ids), [ids.join(',')])
  if (loading) return <Spinner label="Comparing roles…" />
  if (error) return <ErrorState message={error} />
  const all = [...new Set(data.roles.flatMap((r) => r.skills.map((s) => s.skill)))].sort((a, b) => {
    const wa = Math.max(...data.roles.map((r) => r.skills.find((s) => s.skill === a)?.weight || 0))
    const wb = Math.max(...data.roles.map((r) => r.skills.find((s) => s.skill === b)?.weight || 0))
    return wb - wa || a.localeCompare(b)
  })
  return (
    <section className="card mb-6 p-5" aria-label="Role comparison">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Role comparison</h2><button className="btn-ghost" onClick={onClose}>Close</button></div>
      <p className="mt-1 text-xs text-slate-500">{data.shared_skills.length} skills shared by all selected roles. Weights are illustrative (1–5).</p>
      <div className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${data.roles.length}, minmax(0,1fr))` }}>
        {data.roles.map((r) => (
          <div key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm"><p className="font-semibold">{r.title}</p>
            {data.has_resume ? <><p className="mt-1 text-xs text-slate-500">Your match: {r.weighted_score}% ({r.matched_count}/{r.total_required} skills)</p><ProgressBar className="mt-1" value={r.weighted_score} color={scoreColor(r.weighted_score)} label={`${r.title} match`} /></> : <p className="mt-1 text-xs text-slate-400">Upload a resume to see your match.</p>}
          </div>))}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm"><caption className="sr-only">Skill weights by role</caption>
          <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500"><th className="py-2 pr-4">Skill</th>{data.roles.map((r) => <th key={r.id} className="py-2 pr-4">{r.title}</th>)}</tr></thead>
          <tbody>{all.map((s) => (<tr key={s} className="border-b border-slate-100"><td className="py-1.5 pr-4 font-medium">{s}{data.shared_skills.includes(s) && <Badge className="ml-2 bg-indigo-100 text-indigo-700">shared</Badge>}</td>
            {data.roles.map((r) => { const x = r.skills.find((k) => k.skill === s); return <td key={r.id} className="py-1.5 pr-4">{x ? <span>{x.weight} <span className="text-xs text-slate-400">· {x.level}</span></span> : <span className="text-slate-300">—</span>}</td> })}</tr>))}</tbody>
        </table>
      </div>
    </section>
  )
}

export default function Roles() {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('')
  const [skill, setSkill] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [showCompare, setShowCompare] = useState(false)
  useEffect(() => { const t = setTimeout(() => { setDebounced(q); setPage(1) }, 300); return () => clearTimeout(t) }, [q])
  const { data, loading, error, reload } = useLoad(() => roleApi.list({ q: debounced || undefined, category: category || undefined, skill: skill || undefined, page, page_size: 9 }), [debounced, category, skill, page])

  const setTarget = async (role) => {
    try { await userApi.update({ target_role_id: role.id }); await refreshUser(); toast.success(`${role.title} is now your target role.`) } catch (e) { toast.error(getErrorMessage(e)) }
  }
  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 4 ? (toast.error('You can compare up to 4 roles.'), s) : [...s, id]))
  const targetId = user.profile?.target_role_id

  return (
    <div>
      <PageHeader title="Job role directory" subtitle="Role requirements are illustrative and configurable, not universal hiring requirements. Real employers vary widely."
        actions={<button className="btn-primary" disabled={selected.length < 2} onClick={() => setShowCompare(true)}><GitCompare className="h-4 w-4" aria-hidden /> Compare ({selected.length})</button>} />
      {showCompare && selected.length >= 2 && <Compare ids={selected} onClose={() => setShowCompare(false)} />}

      <div className="card mb-6 grid gap-3 p-4 md:grid-cols-3">
        <div className="relative"><label htmlFor="role-search" className="sr-only">Search roles</label><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden /><input id="role-search" className="input !pl-9" placeholder="Search roles…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div><label htmlFor="role-cat" className="sr-only">Category</label><select id="role-cat" className="input" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1) }}><option value="">All categories</option>{data?.categories?.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div><label htmlFor="role-skill" className="sr-only">Filter by skill</label><input id="role-skill" className="input" placeholder="Filter by skill (e.g. Docker)" value={skill} onChange={(e) => { setSkill(e.target.value); setPage(1) }} /></div>
      </div>

      {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
        <EmptyState icon={Search} title="No roles match your filters" description="Try a different search term or clear the filters." action={<button className="btn-secondary" onClick={() => { setQ(''); setCategory(''); setSkill('') }}>Clear filters</button>} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((r) => (
              <article key={r.id} className={`card flex flex-col p-5 ${targetId === r.id ? 'ring-2 ring-brand-500' : ''}`}>
                <div className="flex items-start justify-between gap-2"><h2 className="font-semibold"><Link className="hover:text-brand-600" to={`/app/roles/${r.id}`}>{r.title}</Link></h2><Badge className="bg-slate-100 text-slate-600">{r.category}</Badge></div>
                <p className="mt-2 flex-1 text-sm text-slate-600">{r.description}</p>
                <p className="mt-3 text-xs text-slate-500">{r.skill_count} skills · top: {r.top_skills.slice(0, 3).join(', ')}</p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /> Compare</label>
                  <Link to={`/app/roles/${r.id}`} className="btn-ghost !px-3">Details</Link>
                  {targetId === r.id ? <span className="badge bg-emerald-100 text-emerald-700"><Check className="mr-1 h-3 w-3" aria-hidden /> Target</span> : <button className="btn-secondary !px-3" onClick={() => setTarget(r)}><Target className="h-4 w-4" aria-hidden /> Set target</button>}
                </div>
              </article>))}
          </div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onChange={setPage} />
        </>)}
    </div>
  )
}
