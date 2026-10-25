import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createLeaveRequest, updateLeaveRequest, cancelLeave } from '../utils/api-auth'
import { useLeaves, upsertLeave, patchLeave } from '../utils/leavesStore'
import { useHolidays, holidaysBetween } from '../utils/holidays'
import { useFeedback } from '../components/ui/Feedback'
import { Dialog } from '../components/ui/Dialog'
import { Card, Icon, Notice, PageHeader, Skeleton, Spinner, StatusChip } from '../components/ui'
import useUnsavedWarning from '../utils/useUnsavedWarning'
import { WEEKDAYS, formatDate, formatRange, parseDay, todayISO } from '../utils/dates'
import { formatLeaveDays } from '../utils/leaveFormat'

const leaveTypeLabels = {
  CL: 'Casual Leave',
  EL: 'Earned Leave',
  OD: 'On Duty Leave',
  AL: 'Academic Leave',
}

const leaveTypeOptions = [
  { id: 'CL', name: 'Casual Leave', icon: 'sun', hint: 'Short personal absence' },
  { id: 'EL', name: 'Earned Leave', icon: 'calendar', hint: 'Planned, longer leave' },
  { id: 'OD', name: 'On Duty', icon: 'building', hint: 'Official college work' },
  { id: 'AL', name: 'Academic Leave', icon: 'cap', hint: 'FDPs, conferences, exams' },
]

const leaveTypeIdFor = (name) =>
  Object.keys(leaveTypeLabels).find((id) => id === name || leaveTypeLabels[id] === name) || ''

const SUBMIT_SUCCESS_MESSAGE = 'Your leave request has been submitted successfully.'
const UPDATE_SUCCESS_MESSAGE = 'Your leave request has been updated successfully.'
const MAX_REASON = 500
const MAX_FILE_BYTES = 10 * 1024 * 1024

const emptyForm = { leaveType: '', reason: '', startDate: '', endDate: '', halfDay: false, emergencyContact: '', attachments: null }

const formFromRequest = (request) => ({
  leaveType: leaveTypeIdFor(request.leaveType),
  reason: request.reason || '',
  startDate: (request.startDate || '').slice(0, 10),
  endDate: (request.endDate || request.startDate || '').slice(0, 10),
  halfDay: !!request.isHalfDay,
  emergencyContact: '',
  attachments: null,
})

const sameForm = (a, b) =>
  a.leaveType === b.leaveType && a.reason === b.reason && a.startDate === b.startDate &&
  a.endDate === b.endDate && a.halfDay === b.halfDay && a.emergencyContact === b.emergencyContact &&
  !a.attachments && !b.attachments

const weekdayOf = (iso) => {
  const d = parseDay(iso)
  return d ? WEEKDAYS[d.getDay()] : ''
}

export default function LeaveRequest() {
  const { user } = useAuth()
  const { confirm, toast } = useFeedback()
  const { leaves, loading: loadingRequests } = useLeaves()
  const { holidays } = useHolidays()
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [editingRequest, setEditingRequest] = useState(null)
  // null | 'confirm' | 'success'
  const [dialog, setDialog] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const recentRequests = useMemo(() => (
    leaves
      .filter((leave) => (leave.user?.id === user?.id || leave.userId === user?.id) && leave.status !== 'Cancelled')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  ), [leaves, user?.id])

  const calculatedDays = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return 0
    if (formData.halfDay) return 0.5
    const diff = Math.round((parseDay(formData.endDate) - parseDay(formData.startDate)) / 86400000)
    return Math.abs(diff) + 1
  }, [formData.startDate, formData.endDate, formData.halfDay])

  const durationLabel = formData.halfDay ? '0.5 day (Half day)' : `${calculatedDays} ${calculatedDays === 1 ? 'day' : 'days'}`
  const baseline = editingRequest ? formFromRequest(editingRequest) : emptyForm
  const dirty = !sameForm(formData, baseline)
  const datesValid = formData.startDate && formData.endDate && formData.endDate >= formData.startDate
  const holidaysInRange = datesValid ? holidaysBetween(holidays, formData.startDate, formData.endDate) : []
  const approverLabel = user?.role === 'principal' ? 'Management' : 'the Principal'

  useUnsavedWarning(dirty && !submitting && !dialog, {
    title: editingRequest ? 'Discard your changes?' : 'Leave without submitting?',
    message: editingRequest
      ? 'Your changes to this leave request have not been saved.'
      : 'Your leave application has not been submitted. If you leave now, what you entered will be lost.',
  })

  useEffect(() => {
    if (!successMessage || dialog === 'success') return undefined
    const timer = setTimeout(() => setSuccessMessage(''), 6000)
    return () => clearTimeout(timer)
  }, [successMessage, dialog])

  const update = (name, value) => {
    setFormData((prev) => {
      const next = { ...prev, [name]: value }
      if (next.halfDay && (name === 'halfDay' || name === 'startDate')) next.endDate = next.startDate
      return next
    })
    setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    update(name, type === 'checkbox' ? checked : value)
  }

  const pickFile = (file) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setErrors((prev) => ({ ...prev, attachments: 'This file is larger than 10 MB. Please choose a smaller file.' }))
      return
    }
    update('attachments', file)
  }

  const clearFile = () => {
    update('attachments', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type'
    if (!formData.reason.trim()) newErrors.reason = 'Please provide a reason'
    if (!formData.startDate) newErrors.startDate = 'Please select start date'
    if (!formData.endDate) newErrors.endDate = 'Please select end date'
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      newErrors.endDate = 'End date must be after start date'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const resetForm = () => {
    setFormData(emptyForm)
    setEditingRequest(null)
    setErrors({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) setDialog('confirm')
    else document.querySelector('.leave-form [aria-invalid="true"], .leave-form .ui-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const startEditing = async (request) => {
    if (dirty && editingRequest?.id !== request.id) {
      const ok = await confirm({
        title: 'Discard what you have entered?',
        message: 'Editing another request will replace the details currently in the form.',
        confirmLabel: 'Discard and edit',
        tone: 'danger',
      })
      if (!ok) return
    }
    setEditingRequest(request)
    setSuccessMessage('')
    setErrors({})
    setFormData(formFromRequest(request))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (request) => {
    const id = request._id || request.id
    const ok = await confirm({
      title: 'Delete this leave request?',
      message: `${request.leaveType} · ${formatRange(request.startDate, request.endDate)}. This cannot be undone.`,
      confirmLabel: 'Delete request',
      tone: 'danger',
      icon: 'trash',
    })
    if (!ok) return
    try {
      setDeletingId(id)
      await cancelLeave(id)
      patchLeave(id, { status: 'Cancelled', updatedAt: new Date().toISOString() })
      if (editingRequest && (editingRequest._id || editingRequest.id) === id) resetForm()
      toast('Leave request deleted.', 'success')
    } catch (error) {
      toast(`Couldn't delete the request: ${error.message || 'please try again.'}`, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const confirmSubmit = async () => {
    if (!validateForm()) return
    try {
      setSubmitting(true)
      setErrors({})
      const leaveTypeName = leaveTypeLabels[formData.leaveType] || formData.leaveType
      const endDate = formData.halfDay ? formData.startDate : formData.endDate
      let leaveRequestData
      if (formData.attachments) {
        const form = new FormData()
        form.append('leaveType', leaveTypeName)
        form.append('reason', formData.reason)
        form.append('startDate', formData.startDate)
        form.append('endDate', endDate)
        form.append('numberOfDays', calculatedDays)
        form.append('halfDay', formData.halfDay ? 'true' : 'false')
        form.append('attachment', formData.attachments)
        leaveRequestData = form
      } else {
        leaveRequestData = {
          leaveType: leaveTypeName,
          reason: formData.reason,
          startDate: formData.startDate,
          endDate,
          numberOfDays: calculatedDays,
          halfDay: formData.halfDay,
          attachment: null,
        }
      }

      let saved
      if (editingRequest) {
        if (!formData.attachments) delete leaveRequestData.attachment
        saved = await updateLeaveRequest(editingRequest._id || editingRequest.id, leaveRequestData)
      } else {
        saved = await createLeaveRequest(leaveRequestData)
      }
      if (saved) upsertLeave(saved)

      setSuccessMessage(editingRequest ? UPDATE_SUCCESS_MESSAGE : SUBMIT_SUCCESS_MESSAGE)
      setDialog('success')
      resetForm()
    } catch (error) {
      setDialog(null)
      setErrors({ submit: error.message || 'Failed to submit leave request. Please try again.' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  const minDate = editingRequest ? undefined : todayISO()

  return (
    <div className="ui-page leave-apply">
      <PageHeader
        eyebrow="My leave"
        title={editingRequest ? 'Edit Leave Request' : 'New Leave Request'}
        subtitle={editingRequest
          ? 'Update your pending leave request below, then submit the changes.'
          : `Fill in the details below. ${approverLabel === 'Management' ? 'Management' : 'The Principal'} is notified by email as soon as you submit.`}
        actions={<Link to="/leave-history" className="ui-btn ui-btn--secondary"><Icon name="history" size={17} />My leaves</Link>}
      />

      {successMessage && dialog !== 'success' && (
        <Notice tone="success" style={{ marginBottom: 20 }}><strong>{successMessage}</strong></Notice>
      )}
      {errors.submit && <Notice tone="danger" style={{ marginBottom: 20 }}><strong>{errors.submit}</strong></Notice>}

      <div className="ui-grid ui-grid--main">
        <form id="leave-form" className="leave-form ui-stack" onSubmit={handleSubmit} noValidate>
          {editingRequest && (
            <Notice tone="warning" icon="edit">
              <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span>You are editing your {editingRequest.leaveType} request for {formatRange(editingRequest.startDate, editingRequest.endDate)}.</span>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={resetForm}>Cancel editing</button>
              </span>
            </Notice>
          )}

          <Card title="Type of leave" icon="apply">
            <div className="leave-types" role="group" aria-label="Type of leave">
              {leaveTypeOptions.map((opt) => {
                const active = formData.leaveType === opt.id
                return (
                  <button key={opt.id} type="button" className="leave-type" aria-pressed={active} onClick={() => update('leaveType', opt.id)}>
                    <span className="leave-type__icon"><Icon name={opt.icon} size={18} /></span>
                    <span style={{ minWidth: 0 }}>
                      <span className="leave-type__name">{opt.id} — {opt.name}</span>
                      <span className="leave-type__hint">{opt.hint}</span>
                    </span>
                    {active && <Icon name="checkCircle" size={18} className="leave-type__check" />}
                  </button>
                )
              })}
            </div>
            {errors.leaveType && <div className="ui-error" role="alert">{errors.leaveType}</div>}
          </Card>

          <Card title="Dates" icon="calendar">
            <div className="ui-grid ui-grid--2" style={{ gap: 16 }}>
              <div className="ui-field">
                <label className="ui-label" htmlFor="leave-start">From</label>
                <input id="leave-start" type="date" name="startDate" value={formData.startDate} onChange={handleChange} min={minDate} aria-invalid={errors.startDate ? 'true' : undefined} />
                {errors.startDate ? <div className="ui-error">{errors.startDate}</div> : <div className="ui-hint">{weekdayOf(formData.startDate) || 'First day of leave'}</div>}
              </div>
              <div className="ui-field">
                <label className="ui-label" htmlFor="leave-end">To</label>
                <input id="leave-end" type="date" name="endDate" value={formData.endDate} onChange={handleChange} disabled={formData.halfDay} min={formData.startDate || minDate} aria-invalid={errors.endDate ? 'true' : undefined} />
                {errors.endDate ? <div className="ui-error">{errors.endDate}</div> : <div className="ui-hint">{formData.halfDay ? 'Same day for a half-day leave' : weekdayOf(formData.endDate) || 'Last day of leave'}</div>}
              </div>
            </div>
            <label className="switch-row">
              <input type="checkbox" className="switch" name="halfDay" checked={formData.halfDay} onChange={handleChange} />
              <span>
                <span style={{ display: 'block', fontWeight: 600, color: 'var(--ink-900)' }}>This is a half-day leave request</span>
                <span className="ui-hint" style={{ marginTop: 2, display: 'block' }}>Counts as 0.5 day. The end date is set to the start date.</span>
              </span>
            </label>
          </Card>

          <Card title="Reason and document" icon="file">
            <div className="ui-field">
              <label className="ui-label" htmlFor="leave-reason">Reason for leave</label>
              <textarea id="leave-reason" name="reason" rows={4} value={formData.reason} onChange={handleChange} maxLength={MAX_REASON}
                placeholder="Provide a brief, clear reason for your leave request" aria-invalid={errors.reason ? 'true' : undefined} />
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                {errors.reason ? <div className="ui-error">{errors.reason}</div> : <div className="ui-hint">Visible to {approverLabel}</div>}
                <div className="ui-hint num">{formData.reason.length} / {MAX_REASON}</div>
              </div>
            </div>

            <div className="ui-field" style={{ marginTop: 18 }}>
              <label className="ui-label" htmlFor="leave-emergency">Emergency Contact (Optional)</label>
              <input id="leave-emergency" type="tel" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} placeholder="+1 (555) 123-4567" />
            </div>

            <div className="ui-field" style={{ marginTop: 18 }}>
              <span className="ui-label">Supporting document (optional)</span>
              {formData.attachments ? (
                <div className="file-chip">
                  <Icon name="paperclip" size={17} />
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="ui-cell-main" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.attachments.name}</span>
                    <span className="ui-cell-sub">{(formData.attachments.size / 1024 / 1024).toFixed(2)} MB</span>
                  </span>
                  <button type="button" className="ui-btn ui-btn--ghost ui-btn--sm ui-btn--icon" onClick={clearFile} aria-label="Remove document"><Icon name="x" size={16} /></button>
                </div>
              ) : (
                <div
                  className={`dropzone${dragging ? ' is-dragging' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]) }}
                >
                  <Icon name="upload" size={22} />
                  <div style={{ fontWeight: 600, color: 'var(--ink-900)' }}>Drop a file here or <span className="ui-link">browse</span></div>
                  <div className="ui-hint" style={{ marginTop: 0 }}>PDF, DOC or JPG, up to 10 MB</div>
                  {editingRequest?.attachment && <div className="ui-hint">The current document is kept unless you choose a new one.</div>}
                </div>
              )}
              <input ref={fileInputRef} id="fileInput" type="file" name="attachments" hidden accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => pickFile(e.target.files?.[0])} />
              {errors.attachments && <div className="ui-error">{errors.attachments}</div>}
            </div>
          </Card>
        </form>

        <aside className="ui-stack leave-aside">
          <Card title="Summary" icon="list">
            <dl className="summary-list">
              <div><dt>Leave</dt><dd>{leaveTypeLabels[formData.leaveType] || <span className="muted">Not chosen</span>}</dd></div>
              <div><dt>Dates</dt><dd>{formData.startDate ? formatRange(formData.startDate, formData.halfDay ? formData.startDate : formData.endDate || formData.startDate) : <span className="muted">Not chosen</span>}</dd></div>
              <div className="summary-list__total"><dt>Duration requested</dt><dd>{calculatedDays > 0 ? durationLabel : '–'}</dd></div>
            </dl>
            <div className="summary-route">
              <Icon name="mail" size={16} />
              <span>Goes to <strong>{approverLabel === 'Management' ? 'Management' : 'the Principal'}</strong> for approval</span>
            </div>
            {datesValid && (holidaysInRange.length ? (
              <Notice tone="warning" icon="sun" style={{ marginTop: 12 }}>
                {holidaysInRange.map((h) => `${h.name} (${formatDate(h.date, { year: false })})`).join(', ')} {holidaysInRange.length === 1 ? 'is a holiday' : 'are holidays'} within these dates.
              </Notice>
            ) : (
              <Notice tone="success" icon="checkCircle" style={{ marginTop: 12 }}>No holidays fall in these dates.</Notice>
            ))}
            <button type="submit" form="leave-form" className="ui-btn ui-btn--primary ui-btn--lg ui-btn--block" disabled={submitting} style={{ marginTop: 16 }}>
              {submitting ? <><Spinner /> Submitting...</> : editingRequest ? 'Update Leave Request' : 'Submit Leave Request'}
            </button>
            {editingRequest && (
              <button type="button" className="ui-btn ui-btn--ghost ui-btn--block" onClick={resetForm} style={{ marginTop: 8 }}>Discard changes</button>
            )}
          </Card>

          <Card title="Recent Leave Requests" icon="history" actions={<Link to="/leave-history" className="ui-link" style={{ fontSize: 13.5 }}>View all</Link>} bodyStyle={{ padding: '6px 20px 12px' }}>
            {loadingRequests ? (
              <div style={{ padding: '10px 0' }} aria-busy="true">
                <span className="sr-only">Loading requests...</span>
                <Skeleton height={52} radius={8} style={{ marginBottom: 8 }} />
                <Skeleton height={52} radius={8} />
              </div>
            ) : recentRequests.length === 0 ? (
              <p style={{ margin: '12px 0', color: 'var(--ink-500)', fontSize: 14 }}>No leave requests yet. Your requests will be listed here after you submit.</p>
            ) : (
              <ul className="recent-list">
                {recentRequests.map((request) => {
                  const requestId = request._id || request.id
                  const isPending = request.status === 'Pending'
                  const isEditing = editingRequest && (editingRequest._id || editingRequest.id) === requestId
                  const lockedTitle = isPending ? undefined : `${request.status} requests can no longer be changed`
                  return (
                    <li key={requestId} className={`tto-row${isEditing ? ' is-editing' : ''}`}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="ui-cell-main">{request.leaveType}</div>
                        <div className="ui-cell-sub">{formatRange(request.startDate, request.endDate)} · {formatLeaveDays(request)}</div>
                      </div>
                      <StatusChip status={request.status} />
                      <div className="recent-list__actions">
                        <button type="button" className="ui-btn ui-btn--secondary ui-btn--sm" onClick={() => startEditing(request)} disabled={!isPending || deletingId === requestId} title={lockedTitle}>
                          Edit
                        </button>
                        <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" onClick={() => handleDelete(request)} disabled={!isPending || deletingId === requestId} title={lockedTitle}>
                          {deletingId === requestId ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      {dialog === 'confirm' && (
        <Dialog
          title={editingRequest ? 'Submit changes to this leave request?' : 'Submit this leave request?'}
          description="Please check the details before submitting."
          icon="apply"
          tone="gold"
          onClose={submitting ? undefined : () => setDialog(null)}
          footer={(
            <>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setDialog(null)} disabled={submitting}>Cancel</button>
              <button type="button" className="ui-btn ui-btn--primary" onClick={confirmSubmit} disabled={submitting} data-autofocus>
                {submitting ? <><Spinner /> Submitting...</> : 'Submit'}
              </button>
            </>
          )}
        >
          <dl className="ui-dl confirm-summary">
            <dt>Leave type</dt><dd>{leaveTypeLabels[formData.leaveType] || formData.leaveType}</dd>
            <dt>From</dt><dd>{formatDate(formData.startDate, { weekday: true })}</dd>
            <dt>To</dt><dd>{formatDate(formData.halfDay ? formData.startDate : formData.endDate, { weekday: true })}</dd>
            <dt>Duration</dt><dd>{durationLabel}</dd>
            <dt>Reason</dt><dd style={{ whiteSpace: 'pre-line' }}>{formData.reason}</dd>
            {formData.attachments && <><dt>Document</dt><dd>{formData.attachments.name}</dd></>}
          </dl>
        </Dialog>
      )}

      {dialog === 'success' && (
        <Dialog
          title={successMessage === UPDATE_SUCCESS_MESSAGE ? 'Request updated' : 'Request submitted'}
          description={successMessage}
          icon="checkCircle"
          tone="success"
          onClose={() => setDialog(null)}
          footer={(
            <>
              <Link to="/leave-history" className="ui-btn ui-btn--secondary">View my leaves</Link>
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => setDialog(null)} data-autofocus>OK</button>
            </>
          )}
        />
      )}
    </div>
  )
}
