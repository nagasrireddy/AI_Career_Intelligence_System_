import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, Briefcase, FileSearch, GraduationCap, Map, ShieldCheck, Target, TrendingUp, Upload } from 'lucide-react'
import { Brand } from '../layouts/AppLayout'

const steps = [
  { icon: Upload, title: '1. Upload', text: 'Add a PDF or DOCX resume. We extract the text and detect skills against an editable taxonomy.' },
  { icon: Briefcase, title: '2. Choose a role', text: 'Pick from 12 illustrative role profiles, or compare several side by side.' },
  { icon: Target, title: '3. See your gaps', text: 'A transparent weighted formula shows matched, partial and missing skills, ranked by priority.' },
  { icon: Map, title: '4. Follow a plan', text: 'Get a 30, 60 or 90-day roadmap that teaches prerequisites first, with curated official resources.' },
  { icon: TrendingUp, title: '5. Track progress', text: 'Update status, notes and dates. Your dashboard reflects every change.' },
]
const features = [
  { icon: FileSearch, title: 'Resume skill extraction', text: 'Dictionary + pattern matching with aliases, categories, and an explanation for every detected skill. You can correct mistakes.' },
  { icon: BarChart3, title: 'Transparent scoring', text: 'Weighted skill coverage with the formula shown on screen. It is a learning aid, not a hiring probability.' },
  { icon: GraduationCap, title: 'Prerequisite-aware roadmaps', text: 'Foundational skills come before dependent ones, and finished work is preserved when you regenerate.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Runs offline with no paid AI API. Resumes stay on your server and you can delete them any time.' },
]

export default function Landing() {
  return (
    <div className="bg-white">
      <header className="bg-navy-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Brand />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Link to="/login" className="btn-ghost !text-indigo-100 hover:!bg-white/10">Log in</Link>
            <Link to="/register" className="btn bg-white text-navy-900 hover:bg-indigo-50">Get started</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 md:pt-20">
          <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-indigo-200">Capstone project · AI Career Intelligence System</p>
          <h1 className="max-w-3xl !text-white text-4xl font-bold leading-tight md:text-5xl">From resume to roadmap: find the skills between you and your target role.</h1>
          <p className="mt-5 max-w-2xl text-lg text-indigo-100">Students and job seekers often don’t know which skills they lack or what to learn first. This system analyzes your resume, scores it against role profiles, and builds a personalised plan you can track.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary !px-6 !py-3">Create free account <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            <Link to="/login" className="btn border border-white/30 !px-6 !py-3 text-white hover:bg-white/10">I already have an account</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="problem">
          <div className="grid gap-8 md:grid-cols-2">
            <div><h2 id="problem" className="text-2xl font-bold">The problem</h2><p className="mt-3 text-slate-600">Career advice is generic. Job descriptions are long, inconsistent, and rarely tell you what to study first. Learners end up guessing, jumping between tutorials without a path.</p></div>
            <div><h2 className="text-2xl font-bold">The solution</h2><p className="mt-3 text-slate-600">Turn your own resume into data, compare it with a clear role profile, and receive an ordered learning plan whose progress is tracked in one place.</p></div>
          </div>
        </section>

        <section className="bg-slate-50 py-16" aria-labelledby="how">
          <div className="mx-auto max-w-6xl px-4">
            <h2 id="how" className="text-2xl font-bold">How it works</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-5">
              {steps.map(({ icon: Icon, title, text }) => (
                <li key={title} className="card p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden /></span><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16" aria-labelledby="features">
          <h2 id="features" className="text-2xl font-bold">Key features & benefits</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {features.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card flex gap-4 p-6"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-white"><Icon className="h-5 w-5" aria-hidden /></span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-600">{text}</p></div></div>
            ))}
          </div>
          <p className="mt-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Honest scope:</strong> skill detection uses a configurable dictionary and text patterns, not a trained deep-learning model. Role requirements are illustrative and configurable; scores do not predict real hiring outcomes.</p>
        </section>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">AI Career Intelligence System · academic capstone project</footer>
    </div>
  )
}
