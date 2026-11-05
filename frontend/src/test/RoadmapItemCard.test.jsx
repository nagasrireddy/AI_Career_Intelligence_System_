import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RoadmapItemCard from '../components/RoadmapItemCard'

const item = { id: 7, skill: 'Docker', category: 'DevOps', objective: 'Build working proficiency in Docker.', priority: 'high', prerequisites: ['Linux'], est_hours: 8,
  resource_title: 'Docker Get Started', resource_url: 'https://docs.docker.com/get-started/', status: 'not_started', progress_pct: 0, notes: null, target_date: '2030-01-01', completed_at: null }

describe('RoadmapItemCard', () => {
  it('renders item details and a safe external link', () => {
    render(<RoadmapItemCard item={item} onUpdate={() => {}} />)
    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.getByText(/Prerequisites: Linux/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /docker get started/i })
    expect(link).toHaveAttribute('href', 'https://docs.docker.com/get-started/')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(screen.getByRole('progressbar', { name: /docker progress/i })).toHaveAttribute('aria-valuenow', '0')
  })

  it('calls onUpdate when the status changes', async () => {
    const onUpdate = vi.fn()
    render(<RoadmapItemCard item={item} onUpdate={onUpdate} />)
    await userEvent.selectOptions(screen.getByLabelText(/status for docker/i), 'completed')
    expect(onUpdate).toHaveBeenCalledWith(7, { status: 'completed' })
  })

  it('calls onUpdate when progress changes and when notes are saved', async () => {
    const onUpdate = vi.fn()
    render(<RoadmapItemCard item={item} onUpdate={onUpdate} />)
    fireEvent.change(screen.getByLabelText(/progress percentage for docker/i), { target: { value: '45' } })
    expect(onUpdate).toHaveBeenCalledWith(7, { progress_pct: 45 })
    await userEvent.click(screen.getByRole('button', { name: /notes & date/i }))
    await userEvent.type(screen.getByLabelText('Notes'), 'chapter 1 done')
    await userEvent.click(screen.getByRole('button', { name: /save notes/i }))
    expect(onUpdate).toHaveBeenLastCalledWith(7, { notes: 'chapter 1 done' })
  })

  it('shows a completed state, hides the slider, and disables controls while busy', () => {
    const { rerender } = render(<RoadmapItemCard item={{ ...item, status: 'completed', progress_pct: 100, completed_at: '2030-01-02' }} onUpdate={() => {}} />)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0)
    expect(screen.queryByLabelText(/progress percentage/i)).not.toBeInTheDocument()
    rerender(<RoadmapItemCard item={item} onUpdate={() => {}} busy />)
    expect(screen.getByLabelText(/status for docker/i)).toBeDisabled()
  })

  it('shows a helpful fallback when no resource is available', () => {
    render(<RoadmapItemCard item={{ ...item, resource_url: null, resource_title: null }} onUpdate={() => {}} />)
    expect(screen.getByText(/no curated resource yet/i)).toBeInTheDocument()
  })
})
