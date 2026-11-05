import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute, { PublicOnlyRoute } from './routes/ProtectedRoute'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import NotFound from './pages/NotFound'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ResumePage = lazy(() => import('./pages/ResumePage'))
const ResumeHistory = lazy(() => import('./pages/ResumeHistory'))
const Roles = lazy(() => import('./pages/Roles'))
const RoleDetail = lazy(() => import('./pages/RoleDetail'))
const SkillGap = lazy(() => import('./pages/SkillGap'))
const Roadmap = lazy(() => import('./pages/Roadmap'))
const Progress = lazy(() => import('./pages/Progress'))
const Profile = lazy(() => import('./pages/Profile'))

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="resume" element={<ResumePage />} />
            <Route path="resume/:id" element={<ResumePage />} />
            <Route path="resume-history" element={<ResumeHistory />} />
            <Route path="roles" element={<Roles />} />
            <Route path="roles/:id" element={<RoleDetail />} />
            <Route path="skill-gap" element={<SkillGap />} />
            <Route path="roadmap" element={<Roadmap />} />
            <Route path="progress" element={<Progress />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
