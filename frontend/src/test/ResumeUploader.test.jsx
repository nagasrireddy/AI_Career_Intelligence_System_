import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ResumeUploader, { validateFile } from '../components/ResumeUploader'

const upload = vi.fn()
vi.mock('../api/services', () => ({ resumeApi: { upload: (...a) => upload(...a) } }))

const file = (name, size = 1000, type = 'application/pdf') => new File([new Uint8Array(size)], name, { type })

describe('validateFile', () => {
  it('accepts pdf/docx and rejects bad files', () => {
    expect(validateFile(file('cv.pdf'))).toBeNull()
    expect(validateFile(file('cv.DOCX'))).toBeNull()
    expect(validateFile(file('cv.txt'))).toMatch(/Unsupported/)
    expect(validateFile(file('cv.pdf', 0))).toMatch(/empty/)
    expect(validateFile(file('cv.pdf', 6 * 1024 * 1024))).toMatch(/too large/)
  })
})

describe('ResumeUploader states', () => {
  beforeEach(() => { upload.mockClear() })

  it('starts with the submit button disabled (idle state)', () => {
    render(<ResumeUploader />)
    expect(screen.getByRole('button', { name: /upload & analyze/i })).toBeDisabled()
  })

  it('shows an error for an unsupported file and keeps submit disabled', async () => {
    render(<ResumeUploader />)
    fireEvent.change(document.getElementById('resume-file'), { target: { files: [file('notes.txt', 100, 'text/plain')] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('Unsupported file type')
    expect(screen.getByRole('button', { name: /upload & analyze/i })).toBeDisabled()
  })

  it('shows loading while uploading, then calls onUploaded', async () => {
    upload.mockImplementation(() => new Promise((r) => setTimeout(() => r({ id: 1, skill_count: 5 }), 80)))
    const onUploaded = vi.fn()
    render(<ResumeUploader onUploaded={onUploaded} />)
    fireEvent.change(document.getElementById('resume-file'), { target: { files: [file('cv.pdf')] } })
    fireEvent.click(screen.getByRole('button', { name: /upload & analyze/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/uploading|analyzing/i)
    expect(screen.getByRole('button', { name: /upload & analyze/i })).toBeDisabled()
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith({ id: 1, skill_count: 5 }))
  })

  it('shows the server error message when the upload fails', async () => {
    upload.mockImplementation(async () => { throw Object.assign(new Error('Request failed'), { response: { status: 422, data: { detail: 'This PDF is password-protected/encrypted. Please upload an unprotected copy.' } } }) })
    render(<ResumeUploader />)
    fireEvent.change(document.getElementById('resume-file'), { target: { files: [file('cv.pdf')] } })
    fireEvent.click(screen.getByRole('button', { name: /upload & analyze/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('password-protected')
  })
})
