import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/client'
import { authApi } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { Field } from './ui'
import { Brand } from '../layouts/AppLayout'

function Shell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-br from-navy-950 via-navy-900 to-brand-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/"><Brand /></Link>
        <div>
          <h2 className="!text-white text-3xl font-bold leading-tight">Know your skill gaps.<br />Close them with a plan.</h2>
          <p className="mt-4 max-w-md text-indigo-100">Upload a resume, compare it with a target role, and follow a prerequisite-aware learning roadmap, entirely on your own server.</p>
        </div>
        <p className="text-xs text-indigo-200">Role profiles are illustrative. Scores are not hiring predictions.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Link to="/"><Brand dark={false} /></Link></div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        </div>
      </div>
    </div>
  )
}

export function LoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const loc = useLocation()
  const [serverError, setServerError] = useState(null)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } })
  const onSubmit = async ({ email, password }) => {
    setServerError(null)
    try { await login(email, password); navigate(loc.state?.from?.startsWith('/app') ? loc.state.from : '/app', { replace: true }) }
    catch (e) { setServerError(getErrorMessage(e)) }
  }
  return (
    <Shell title="Welcome back" subtitle="Log in to continue your career plan." footer={<>New here? <Link className="font-semibold text-brand-600 hover:underline" to="/register">Create an account</Link></>}>
      {loc.state?.expired && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your session expired. Please log in again.</p>}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email}
            {...register('email', { required: 'Email is required.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" autoComplete="current-password" className="input" aria-invalid={!!errors.password}
            {...register('password', { required: 'Password is required.' })} />
        </Field>
        {serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Logging in…' : 'Log in'}</button>
      </form>
    </Shell>
  )
}

export function RegisterForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { full_name: '', email: '', password: '', confirm: '' } })
  const onSubmit = async ({ full_name, email, password }) => {
    setServerError(null)
    try { await authApi.register({ full_name, email, password }); await login(email, password); navigate('/app', { replace: true }) }
    catch (e) { setServerError(getErrorMessage(e)) }
  }
  return (
    <Shell title="Create your account" subtitle="Free and private. No credit card, no paid AI service." footer={<>Already registered? <Link className="font-semibold text-brand-600 hover:underline" to="/login">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
          <input id="full_name" autoComplete="name" className="input" aria-invalid={!!errors.full_name} {...register('full_name', { required: 'Name is required.', maxLength: { value: 120, message: 'Name is too long.' } })} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className="input" aria-invalid={!!errors.email}
            {...register('email', { required: 'Email is required.', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address.' } })} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <input id="password" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.password}
            {...register('password', { required: 'Password is required.', minLength: { value: 8, message: 'Use at least 8 characters.' },
              validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include at least one letter and one number.' })} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}>
          <input id="confirm" type="password" autoComplete="new-password" className="input" aria-invalid={!!errors.confirm}
            {...register('confirm', { required: 'Please confirm your password.', validate: (v) => v === watch('password') || 'Passwords do not match.' })} />
        </Field>
        {serverError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'}</button>
      </form>
    </Shell>
  )
}
