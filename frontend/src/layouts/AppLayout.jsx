import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Briefcase, FileText, History, LayoutDashboard, LogOut, Map, Menu, Target, TrendingUp, User, X, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/resume', label: 'Resume Analysis', icon: FileText },
  { to: '/app/resume-history', label: 'Resume History', icon: History },
  { to: '/app/roles', label: 'Job Roles', icon: Briefcase },
  { to: '/app/skill-gap', label: 'Skill-Gap Analysis', icon: Target },
  { to: '/app/roadmap', label: 'Learning Roadmap', icon: Map },
  { to: '/app/progress', label: 'Progress', icon: TrendingUp },
  { to: '/app/profile', label: 'Profile & Settings', icon: User },
]

function Nav({ onNavigate }) {
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/15 text-white' : 'text-indigo-100/80 hover:bg-white/10 hover:text-white'}`}>
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Brand({ dark = true }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500"><BarChart3 className="h-4 w-4 text-white" aria-hidden /></span>
      <span className={`text-sm font-bold leading-tight ${dark ? 'text-white' : 'text-navy-900'}`}>AI Career<br />Intelligence</span>
    </div>
  )
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const doLogout = () => { logout(); navigate('/login') }
  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 p-4 lg:flex">
        <div className="px-2 py-3"><Brand /></div>
        <div className="mt-6 flex-1"><Nav /></div>
        <div className="mt-4 rounded-xl bg-white/10 p-3 text-xs text-indigo-100">
          <p className="flex items-center gap-1 font-semibold text-white"><Sparkles className="h-3.5 w-3.5" aria-hidden /> Offline analysis</p>
          <p className="mt-1">Skill detection runs on your server with a configurable dictionary. No data leaves it.</p>
        </div>
        <button onClick={doLogout} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-100/80 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" aria-hidden /> Log out</button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden text-sm text-slate-500 lg:block">Signed in as <span className="font-semibold text-navy-900">{user?.full_name}</span></div>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700" aria-hidden>{user?.full_name?.[0]?.toUpperCase()}</span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-8"><Outlet /></main>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-900 p-4">
            <div className="flex items-center justify-between px-2 py-3"><Brand /><button onClick={() => setOpen(false)} aria-label="Close navigation menu" className="text-white"><X className="h-5 w-5" /></button></div>
            <div className="mt-4 flex-1"><Nav onNavigate={() => setOpen(false)} /></div>
            <button onClick={doLogout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-indigo-100/80 hover:bg-white/10"><LogOut className="h-4 w-4" /> Log out</button>
          </aside>
        </div>
      )}
    </div>
  )
}
