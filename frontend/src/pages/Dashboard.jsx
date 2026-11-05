import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Briefcase, CheckCircle2, FileText, Map, Sparkles, Target, XCircle, Brain, CalendarClock, Trophy } from 'lucide-react'
import { dashboardApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { Badge, EmptyState, ErrorState, PageHeader, ProgressBar, ScoreRing, Spinner, StatCard } from '../components/ui'
import { fmtDate, priorityStyle } from '../utils/format'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: d, loading, error, reload } = useLoad(() => dashboardApi.summary(), [])
  if (loading) return <Spinner label="Loading your dashboard…" />
  if (error) return <ErrorState message={error} onRetry={reload} />

  const isNew = !d.latest_resume && !d.target_role
  const weekly = d.series.weekly
  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.full_name.split(' ')[0]}`}
        subtitle={d.target_role ? `Target role: ${d.target_role.title}` : 'Start by uploading a resume and choosing a target role.'}
        actions={<>
          <Link to="/app/resume" className="btn-primary"><FileText className="h-4 w-4" aria-hidden /> Upload resume</Link>
          <Link to="/app/roles" className="btn-secondary"><Briefcase className="h-4 w-4" aria-hidden /> Select role</Link>
          <Link to="/app/skill-gap" className="btn-secondary"><Target className="h-4 w-4" aria-hidden /> Analyze gaps</Link>
          <Link to="/app/roadmap" className="btn-secondary"><Map className="h-4 w-4" aria-hidden /> Open roadmap</Link>
        </>}
      />

      {isNew && (
        <div className="mb-6"><EmptyState icon={Sparkles} title="Let’s get you started"
          description="Upload your resume to detect your skills, then pick a target role to see your skill gaps and get a personalised learning roadmap."
          action={<div className="flex gap-2"><Link to="/app/resume" className="btn-primary">Upload resume</Link><Link to="/app/roles" className="btn-secondary">Browse roles</Link></div>} /></div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Brain} label="Detected skills" value={d.skills_total} hint={d.latest_resume ? d.latest_resume.filename : 'No resume uploaded'} />
        <StatCard icon={CheckCircle2} tone="green" label="Matched skills" value={d.analysis ? d.analysis.matched : '—'} hint={d.analysis ? `for ${d.analysis.role_title}` : 'Run a skill-gap analysis'} />
        <StatCard icon={XCircle} tone="red" label="Missing skills" value={d.analysis ? d.analysis.missing : '—'} hint={d.analysis ? `${d.analysis.partial} partially matched` : undefined} />
        <StatCard icon={Trophy} tone="amber" label="Roadmap completion" value={d.roadmap ? `${d.roadmap.completion_pct}%` : '—'} hint={d.roadmap ? `${d.roadmap.completed}/${d.roadmap.total} items done` : 'No active roadmap'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5" aria-label="Role match">
          <h2 className="text-sm font-semibold">Latest role match</h2>
          {d.analysis ? (
            <div className="mt-4 flex flex-col items-center gap-3">
              <ScoreRing value={d.analysis.weighted_score} />
              <p className="text-center text-sm text-slate-600">{d.analysis.role_title}<br /><span className="text-xs text-slate-400">Analyzed {fmtDate(d.analysis.created_at)} · illustrative profile</span></p>
              <Link to="/app/skill-gap" className="btn-secondary">View details</Link>
            </div>
          ) : <p className="mt-4 text-sm text-slate-500">No analysis yet. Upload a resume and compare it with a role to see your score.</p>}
        </section>

        <section className="card p-5 lg:col-span-2" aria-label="Weekly progress">
          <h2 className="text-sm font-semibold">Weekly learning activity</h2>
          <div className="mt-3 h-56"><ResponsiveContainer><BarChart data={weekly}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="updates" name="Progress updates" fill="#c7d2fe" radius={[4, 4, 0, 0]} /><Bar dataKey="completed" name="Items completed" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2" aria-label="Upcoming milestones">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarClock className="h-4 w-4 text-brand-600" aria-hidden /> Upcoming learning milestones</h2>{d.roadmap && <span className="text-xs text-slate-500">{d.roadmap.title}</span>}</div>
          {d.roadmap && <ProgressBar className="mt-3" value={d.roadmap.completion_pct} label="Roadmap completion" />}
          {d.upcoming.length ? (
            <ul className="mt-4 divide-y divide-slate-100">{d.upcoming.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="flex-1 font-medium">{i.skill}</span><Badge className={priorityStyle[i.priority]}>{i.priority}</Badge><span className="w-28 text-right text-xs text-slate-500">{i.target_date ? `by ${fmtDate(i.target_date)}` : 'no date'}</span><span className="w-10 text-right text-xs">{i.progress_pct}%</span></li>))}</ul>
          ) : <p className="mt-4 text-sm text-slate-500">{d.roadmap ? 'Everything in your roadmap is complete. 🎉' : 'Generate a roadmap to see upcoming milestones here.'}</p>}
          {!d.roadmap && <Link to="/app/roadmap" className="btn-primary mt-4">Create a roadmap</Link>}
        </section>

        <section className="card p-5" aria-label="Recently completed">
          <h2 className="text-sm font-semibold">Recently completed</h2>
          {d.recently_completed.length ? (
            <ul className="mt-3 space-y-2">{d.recently_completed.map((i) => (<li key={i.id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /><span className="flex-1">{i.skill}</span><span className="text-xs text-slate-400">{fmtDate(i.completed_at)}</span></li>))}</ul>
          ) : <p className="mt-3 text-sm text-slate-500">Nothing completed yet. Your finished items will appear here.</p>}
        </section>
      </div>

      {d.skills_by_category.length > 0 && (
        <section className="card mt-6 p-5" aria-label="Skills by category">
          <h2 className="text-sm font-semibold">Your skills by category</h2>
          <div className="mt-3 h-56"><ResponsiveContainer><BarChart data={d.skills_by_category}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" name="Skills" fill="#4f46e5" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </section>
      )}
    </div>
  )
}
