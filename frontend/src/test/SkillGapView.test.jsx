import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SkillGapView from '../components/SkillGapView'

vi.mock('recharts', () => {
  const Stub = ({ children }) => <div data-testid="chart">{children}</div>
  const names = ['Bar', 'BarChart', 'CartesianGrid', 'Legend', 'PolarAngleAxis', 'PolarGrid', 'PolarRadiusAxis', 'Radar', 'RadarChart', 'ResponsiveContainer', 'Tooltip', 'XAxis', 'YAxis']
  return Object.fromEntries(names.map((n) => [n, Stub]))
})

const analysis = {
  id: 1, role_title: 'Data Analyst', weighted_score: 62.5, coverage_pct: 50, matched_count: 2, partial_count: 1, missing_count: 1, total_required: 4,
  formula: 'Weighted score = (…) not a hiring probability.',
  results: [
    { skill: 'SQL', status: 'matched', weight: 5, priority: 'critical', category: 'Programming Languages', note: 'Found in your skills.' },
    { skill: 'Excel', status: 'matched', weight: 4, priority: 'high', category: 'Data Analytics', note: '' },
    { skill: 'Tableau', status: 'partial', weight: 3, priority: 'medium', category: 'Data Analytics', note: 'Related: Power BI' },
    { skill: 'Statistics', status: 'missing', weight: 4, priority: 'high', category: 'Data Analytics', note: '' },
  ],
  strengths: [{ skill: 'SQL', weight: 5 }],
  priority_gaps: [{ skill: 'Statistics', priority: 'high', weight: 4, status: 'missing' }, { skill: 'Tableau', priority: 'medium', weight: 3, status: 'partial' }],
  by_category: [{ category: 'Data Analytics', matched: 1, total: 3, pct: 33 }, { category: 'Programming Languages', matched: 1, total: 1, pct: 100 }],
}

describe('SkillGapView', () => {
  it('renders score, summary cards, formula explanation and lists', () => {
    render(<SkillGapView analysis={analysis} />)
    expect(screen.getByRole('img', { name: /role match: 62.5 percent/i })).toBeInTheDocument()
    expect(screen.getByText('Matched skills', { selector: 'p' })).toBeInTheDocument()
    expect(screen.getByText(/how this is calculated/i)).toBeInTheDocument()
    expect(screen.getByText(/not a hiring probability/i)).toBeInTheDocument()
    const missing = screen.getByRole('region', { name: 'Missing skills' })
    expect(within(missing).getByText('Statistics')).toBeInTheDocument()
    expect(within(missing).getByText('high')).toBeInTheDocument()
    const matched = screen.getByRole('region', { name: 'Matched skills' })
    expect(within(matched).getByText('SQL')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Partially matched' })).getByText('Tableau')).toBeInTheDocument()
  })

  it('ranks priority gaps in order', () => {
    render(<SkillGapView analysis={analysis} />)
    const items = within(screen.getByRole('region', { name: 'Priority gaps' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Statistics')
    expect(items[1]).toHaveTextContent('Tableau')
  })

  it('shows friendly empty messages when nothing is missing', () => {
    const full = { ...analysis, missing_count: 0, partial_count: 0, results: analysis.results.filter((r) => r.status === 'matched'), priority_gaps: [], by_category: [] }
    render(<SkillGapView analysis={full} />)
    expect(screen.getByText(/no missing skills/i)).toBeInTheDocument()
    expect(screen.getByText(/no gaps to prioritise/i)).toBeInTheDocument()
  })
})
