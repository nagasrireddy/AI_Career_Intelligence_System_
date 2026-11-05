import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginForm, RegisterForm } from '../components/AuthForms'

const login = vi.fn()
const register = vi.fn()
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ login }) }))
vi.mock('../api/services', () => ({ authApi: { register: (...a) => register(...a) } }))

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('Login form', () => {
  beforeEach(() => { login.mockReset(); register.mockReset() })

  it('shows validation errors for empty and invalid input', async () => {
    wrap(<LoginForm />)
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Email'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(login).not.toHaveBeenCalled()
  })

  it('submits credentials and shows a server error on failure', async () => {
    login.mockRejectedValueOnce({ response: { status: 401, data: { detail: 'Invalid email or password.' } } })
    wrap(<LoginForm />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Password'), 'secret123')
    await userEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(login).toHaveBeenCalledWith('a@b.co', 'secret123')
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
  })
})

describe('Register form', () => {
  beforeEach(() => { login.mockReset(); register.mockReset() })

  it('validates password rules and confirmation', async () => {
    wrap(<RegisterForm />)
    await userEvent.type(screen.getByLabelText('Full name'), 'Jane')
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'different')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('requires a letter and a number', async () => {
    wrap(<RegisterForm />)
    await userEvent.type(screen.getByLabelText('Full name'), 'Jane')
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'onlyletters')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'onlyletters')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByText('Include at least one letter and one number.')).toBeInTheDocument()
  })

  it('registers then logs in on success, and shows duplicate-email errors', async () => {
    register.mockResolvedValueOnce({})
    login.mockResolvedValueOnce({})
    wrap(<RegisterForm />)
    const fill = async () => {
      await userEvent.clear(screen.getByLabelText('Full name'))
      await userEvent.type(screen.getByLabelText('Full name'), 'Jane')
      await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!x')
      await userEvent.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x')
    }
    await fill()
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    await waitFor(() => expect(login).toHaveBeenCalledWith('jane@example.com', 'Passw0rd!x'))
    expect(register).toHaveBeenCalledWith({ full_name: 'Jane', email: 'jane@example.com', password: 'Passw0rd!x' })
  })

  it('shows the server error when the email already exists', async () => {
    register.mockRejectedValueOnce({ response: { status: 409, data: { detail: 'An account with this email already exists.' } } })
    wrap(<RegisterForm />)
    await userEvent.type(screen.getByLabelText('Full name'), 'Jane')
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd!x')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists')
  })
})
