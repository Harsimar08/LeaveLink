import React, { useState } from 'react'
import { useLeaves } from '../utils/leavesStore'
import useLeaveDecision from '../utils/useLeaveDecision'
import { formatLeaveDays } from '../utils/leaveFormat'
import { formatDate, formatRange } from '../utils/dates'
import { Avatar, Card, EmptyState, Icon, Kpi, PageHeader, SkeletonRows, StatusChip } from '../components/ui'

const Person = ({ leave }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <Avatar name={leave.user?.name || 'Principal'} size={34} />
    <div style={{ minWidth: 0 }}>
      <div className="ui-cell-main">{leave.user?.name || 'Principal'}</div>
      <div className="ui-cell-sub">{leave.user?.email}</div>
    </div>
  </div>
)

export default function ManagementDashboard() {
  const { leaves: allLeaves, loading } = useLeaves()
  const { approve, reject, busyId } = useLeaveDecision()
  const [selectedTab, setSelectedTab] = useState('pending')

  const principalLeaves = allLeaves
    .filter((l) => l.user?.role === 'principal')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  const leaves = principalLeaves.filter((l) => l.status === 'Pending')

  const stats = [
    { label: 'Total Principal Leaves', value: principalLeaves.length, icon: 'file' },
    { label: 'Pending Approvals', value: leaves.length, icon: 'clock', tone: 'warning', color: 'var(--gold-700)' },
    { label: 'Approved', value: principalLeaves.filter((l) => l.status === 'Approved').length, icon: 'checkCircle', tone: 'success', color: 'var(--success)' },
    { label: 'Rejected', value: principalLeaves.filter((l) => l.status === 'Rejected').length, icon: 'xCircle', tone: 'danger', color: 'var(--danger)' },
  ]

  return (
    <div className="ui-page">
      <PageHeader
        eyebrow="Jagan Institute of Management Studies"
        title="Management Dashboard"
        subtitle="You approve leave for the Principal. All other staff leave is handled by the Principal."
      />

      <div className="ui-grid ui-grid--kpi" style={{ marginBottom: 20 }}>
        {stats.map((stat) => (
          <Kpi key={stat.label} label={stat.label} icon={stat.icon} tone={stat.tone}
            value={loading ? '–' : <span style={{ color: stat.color }}>{stat.value}</span>} />
        ))}
      </div>

      <Card noBody>
        <div className="table-toolbar" style={{ paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <div className="ui-segmented" role="tablist" aria-label="Principal leave requests">
            <button type="button" role="tab" aria-selected={selectedTab === 'pending'} onClick={() => setSelectedTab('pending')}>
              Pending ({leaves.length})
            </button>
            <button type="button" role="tab" aria-selected={selectedTab === 'all'} onClick={() => setSelectedTab('all')}>
              All Principal Leaves ({principalLeaves.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><SkeletonRows rows={3} height={56} /></div>
        ) : selectedTab === 'pending' ? (
          leaves.length === 0 ? (
            <EmptyState icon="checkCircle" title="No pending approvals">When the Principal applies for leave, the request will appear here.</EmptyState>
          ) : (
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>Principal</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th style={{ textAlign: 'center' }}>Days</th>
                    <th>Reason</th>
                    <th>Document</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l) => (
                    <tr key={l._id || l.id}>
                      <td><Person leave={l} /></td>
                      <td>{l.leaveType}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatRange(l.startDate, l.endDate)}</td>
                      <td style={{ textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatLeaveDays(l)}</td>
                      <td style={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{l.reason}</td>
                      <td>
                        {l.attachment
                          ? <a className="ui-link" href={l.attachment} target="_blank" rel="noreferrer"><Icon name="paperclip" size={14} />View</a>
                          : <span className="muted">None</span>}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="ui-btn ui-btn--success ui-btn--sm" disabled={busyId === l.id} onClick={() => approve(l)}><Icon name="check" size={15} />Approve</button>
                          <button type="button" className="ui-btn ui-btn--danger ui-btn--sm" disabled={busyId === l.id} onClick={() => reject(l)}><Icon name="x" size={15} />Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : principalLeaves.length === 0 ? (
          <EmptyState icon="file" title="No Principal leave requests">The Principal hasn't applied for any leave yet.</EmptyState>
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Principal</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th style={{ textAlign: 'center' }}>Days</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Approver</th>
                </tr>
              </thead>
              <tbody>
                {principalLeaves.map((l) => (
                  <tr key={l._id || l.id}>
                    <td><Person leave={l} /></td>
                    <td>{l.leaveType}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatRange(l.startDate, l.endDate)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 500, whiteSpace: 'nowrap' }}>{formatLeaveDays(l)}</td>
                    <td style={{ textAlign: 'center' }}><StatusChip status={l.status} /></td>
                    <td>
                      {l.approverName ? (
                        <div>
                          <div className="ui-cell-main">{l.approverName}</div>
                          <div className="ui-cell-sub">{l.actionDate ? formatDate(l.actionDate) : ''}</div>
                        </div>
                      ) : <span className="muted">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
