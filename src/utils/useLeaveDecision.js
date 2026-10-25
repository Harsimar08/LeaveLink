import { useState } from 'react'
import { approveLeave, rejectLeave } from './api-auth'
import { upsertLeave, refreshLeaves } from './leavesStore'
import { useFeedback } from '../components/ui/Feedback'
import { formatRange } from './dates'
import { formatLeaveDays } from './leaveFormat'

const summaryOf = (leave) => `${leave.leaveType} · ${formatRange(leave.startDate, leave.endDate)} · ${formatLeaveDays(leave)}`

export default function useLeaveDecision() {
  const { confirm, toast } = useFeedback()
  const [busyId, setBusyId] = useState(null)

  const run = async (leave, action, successMessage, verb) => {
    setBusyId(leave.id)
    try {
      const updated = await action()
      if (updated) upsertLeave(updated)
      refreshLeaves().catch(() => {})
      toast(successMessage, 'success')
      return updated || true
    } catch (err) {
      toast(`Couldn't ${verb} the request: ${err.message || 'please try again.'}`, 'error')
      return null
    } finally {
      setBusyId(null)
    }
  }

  const approve = async (leave) => {
    const name = leave.user?.name || 'this staff member'
    const ok = await confirm({
      title: `Approve leave for ${name}?`,
      message: `${summaryOf(leave)}. ${name.split(' ')[0]} will be notified by email.`,
      confirmLabel: 'Approve',
      tone: 'success',
      icon: 'checkCircle',
    })
    if (!ok) return null
    return run(leave, () => approveLeave(leave.id), `Leave approved for ${name}.`, 'approve')
  }

  const reject = async (leave) => {
    const name = leave.user?.name || 'this staff member'
    const result = await confirm({
      title: `Reject leave for ${name}?`,
      message: summaryOf(leave),
      confirmLabel: 'Reject request',
      tone: 'danger',
      icon: 'xCircle',
      reason: {
        label: 'Reason for rejection',
        placeholder: 'e.g. Mid-semester examinations are scheduled that week',
        required: true,
        requiredMessage: 'Please give a reason so the staff member knows why.',
        hint: 'The reason is included in the email sent to the staff member.',
      },
    })
    if (!result) return null
    return run(leave, () => rejectLeave(leave.id, result.reason || ''), `Leave rejected for ${name}.`, 'reject')
  }

  return { approve, reject, busyId }
}
