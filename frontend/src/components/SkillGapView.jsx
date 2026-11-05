import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CheckCircle2, CircleDashed, XCircle, Info } from 'lucide-react'
import { Badge, ProgressBar, ScoreRing, StatCard } from './ui'
import { priorityStyle, scoreColor } from '../utils/format'

function SkillList({ title, icon: Icon, tone, items, empty, showPriority }) {
  return (
    <section className="card p-5" aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold"><Icon className={`h-4 w-4 ${tone}`} aria-hidden /> {title} <span className="text-slate-400">({items.length})</span></h3>
      {items.length === 0 ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((r) => (
            <li key={r.skill} title={r.note || ''} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm">
              {r.skill}
              {showPriority && <Badge className={priorityStyle[r.priority]}>{r.priority}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function SkillGapView({ analysis }) {
  const a = analysis
  const matched = a.results.filter((r) => r.status === 'matched')
  const partial = a.results.filter((r) => r.status === 'partial')
  const missing = a.results.filter((r) => r.status === 'missing')
  const radar = a.by_category.map((c) => ({ category: c.category, pct: c.pct }))
  const bars = [...a.results].sort((x, y) => y.weight - x.weight).slice(0, 10).map((r) => ({
    skill: r.skill, weight: r.weight, have: r.status === 'matched' ? r.weight : r.status === 'partial' ? r.weight / 2 : 0,
  }))
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card flex items-center justify-center p-4 md:row-span-1"><ScoreRing value={a.weighted_score} /></div>
        <StatCard icon={CheckCircle2} tone="green" label="Matched skills" value={a.matched_count} hint={`of ${a.total_required} required`} />
        <StatCard icon={CircleDashed} tone="amber" label="Partially matched" value={a.partial_count} hint="related skills found" />
        <StatCard icon={XCircle} tone="red" label="Missing skills" value={a.missing_count} hint="to learn" />
      </div>

      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Skill coverage (unweighted)</span><span className="font-semibold">{a.coverage_pct}%</span>
        </div>
        <ProgressBar value={a.coverage_pct} color={scoreColor(a.coverage_pct)} label="Skill coverage" />
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          <p><strong>How this is calculated.</strong> {a.formula}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">Coverage by category</h3>
          {radar.length >= 3 ? (
            <div className="h-64"><ResponsiveContainer><RadarChart data={radar}><PolarGrid /><PolarAngleAxis dataKey="category" tick={{ fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} tick={false} /><Radar dataKey="pct" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.35} /><Tooltip formatter={(v) => `${v}%`} /></RadarChart></ResponsiveContainer></div>
          ) : (
            <ul className="space-y-3">{a.by_category.map((c) => (<li key={c.category}><div className="mb-1 flex justify-between text-sm"><span>{c.category}</span><span>{c.matched}/{c.total}</span></div><ProgressBar value={c.pct} label={c.category} /></li>))}</ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-semibold">Top required skills: importance vs. your coverage</h3>
          <div className="h-64"><ResponsiveContainer><BarChart data={bars} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="skill" width={90} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="weight" name="Importance (1-5)" fill="#c7d2fe" /><Bar dataKey="have" name="You have" fill="#4f46e5" /></BarChart></ResponsiveContainer></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkillList title="Matched skills" icon={CheckCircle2} tone="text-emerald-600" items={matched} empty="No required skills matched yet." />
        <SkillList title="Partially matched" icon={CircleDashed} tone="text-amber-600" items={partial} empty="No partial matches." showPriority />
        <SkillList title="Missing skills" icon={XCircle} tone="text-red-600" items={missing} empty="No missing skills. Nice work!" showPriority />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5" aria-label="Strengths">
          <h3 className="text-sm font-semibold">Strengths</h3>
          {a.strengths.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{a.strengths.map((s) => <li key={s.skill}>{s.skill} <span className="text-slate-400">(importance {s.weight})</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No strengths detected yet for this role.</p>}
        </section>
        <section className="card p-5" aria-label="Priority gaps">
          <h3 className="text-sm font-semibold">Priority-ranked gaps</h3>
          {a.priority_gaps.length ? (
            <ol className="mt-2 space-y-1.5 text-sm">{a.priority_gaps.slice(0, 8).map((g, i) => (
              <li key={g.skill} className="flex items-center gap-2"><span className="w-5 text-slate-400">{i + 1}.</span><span className="flex-1">{g.skill}</span><Badge className={priorityStyle[g.priority]}>{g.priority}</Badge></li>))}</ol>
          ) : <p className="mt-2 text-sm text-slate-500">No gaps to prioritise.</p>}
        </section>
      </div>
    </div>
  )
}
