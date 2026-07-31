import React from 'react'

export default function RequestDrawer({ open, onClose }) {
  if (!open) return null

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Request Leave</h3>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>From</label>
            <input type="date" style={{ display: 'block', width: '100%', padding: 8, marginTop: 6, borderRadius: 6, border: '1px solid var(--border)' }} />
          </div>
          <div style={{ width: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>0 days</div>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>To</label>
            <input type="date" style={{ display: 'block', width: '100%', padding: 8, marginTop: 6, borderRadius: 6, border: '1px solid var(--border)' }} />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Select type of leave you want to apply</label>
          <select style={{ display: 'block', width: '100%', padding: 10, marginTop: 6, borderRadius: 6, border: '1px solid var(--border)' }}>
            <option>Select</option>
            <option>Comp Offs - Not Available</option>
            <option>Earned Leave - 10.42 days available</option>
            <option>Floater Leave - Not Available</option>
            <option>Marriage Leave - 5 days available</option>
            <option>Paternity Leave - 5 days available</option>
            <option>Shared Leave - Not Available</option>
          </select>
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Note</label>
          <textarea placeholder="Type here" style={{ display: 'block', width: '100%', padding: 10, marginTop: 6, borderRadius: 6, border: '1px solid var(--border)', minHeight: 120 }} />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Notify</label>
          <input placeholder="Search employee" style={{ display: 'block', width: '100%', padding: 10, marginTop: 6, borderRadius: 6, border: '1px solid var(--border)' }} />
        </div>

        <div className="drawer-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Request</button>
        </div>
      </div>
    </div>
  }