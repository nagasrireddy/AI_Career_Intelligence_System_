import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'

export default function NotFound({ inApp = false }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 text-center ${inApp ? 'py-24' : 'min-h-screen p-6'}`}>
      <span className="rounded-2xl bg-brand-50 p-4 text-brand-600"><Compass className="h-10 w-10" aria-hidden /></span>
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-slate-500">We couldn’t find the page you’re looking for.</p>
      <Link className="btn-primary" to={inApp ? '/app' : '/'}>{inApp ? 'Back to dashboard' : 'Back to home'}</Link>
    </div>
  )
}
