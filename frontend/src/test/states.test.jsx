import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { Compass } from 'lucide-react'
import { ConfirmDialog, EmptyState, ErrorState, Pagination, ProgressBar } from '../components/ui'
import { getErrorMessage } from '../api/client'
import NotFound from '../pages/NotFound'

describe('shared states', () => {
  it('EmptyState renders title, description and action', () => {
    render(<EmptyState icon={Compass} title="No roadmap" description="Create one" action={<button>Create</button>} />)
    expect(screen.getByText('No roadmap')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('ErrorState is announced and retry works', async () => {
    const retry = vi.fn()
    render(<ErrorState message="Cannot reach the server." onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot reach the server.')
    await userEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(retry).toHaveBeenCalled()
  })

  it('ConfirmDialog confirms, cancels, and closes on Escape', async () => {
    const onConfirm = vi.fn(); const onCancel = vi.fn()
    const { rerender } = render(<ConfirmDialog open={false} title="Delete?" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    rerender(<ConfirmDialog open title="Delete?" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(onCancel).toHaveBeenCalled()
  })

  it('ProgressBar clamps values', () => {
    render(<ProgressBar value={150} label="x" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('Pagination hides for one page and moves between pages', async () => {
    const onChange = vi.fn()
    const { rerender, container } = render(<Pagination page={1} pageSize={10} total={5} onChange={onChange} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<Pagination page={1} pageSize={10} total={25} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /next page/i }))
    expect(onChange).toHaveBeenCalledWith(2)
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled()
  })

  it('NotFound page links home', () => {
    render(<MemoryRouter><NotFound /></MemoryRouter>)
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  it('getErrorMessage maps API errors to friendly text', () => {
    expect(getErrorMessage({ response: { data: { detail: 'Nope' } } })).toBe('Nope')
    expect(getErrorMessage({ response: { data: { detail: [{ msg: 'Value error, Password too weak.' }] } } })).toBe('Password too weak.')
    expect(getErrorMessage({})).toMatch(/Cannot reach the server/)
    expect(getErrorMessage({ code: 'ECONNABORTED' })).toMatch(/timed out/)
  })
})
