import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from '../components/ui'

export default function ProtectedRoute() {
  const { user, loading, expired } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner label="Checking your session…" className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname, expired }} />
  return <Outlet />
}

export function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner className="min-h-screen" />
  return user ? <Navigate to="/app" replace /> : children
}
