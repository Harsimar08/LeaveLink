import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createLeaveRequest, getLeaveRequests } from '../utils/api-auth';

const leaveTypeLabels = {
  CL: 'Casual Leave',
  EL: 'Earned Leave',
  OD: 'On Duty Leave',
  AL: 'Academic Leave'
};

const COLORS = {
  navy950: '#0a1220',
  navy900: '#0e1a2e',
  navy800: '#152742',
  navy700: '#1c3357',
  gold500: '#c79a3a',
  gold300: '#e8c877',
  goldTint: '#f7ecd0',
  paper: '#f6f7f9',
  white: '#ffffff',
  ink900: '#101826',
  ink600: '#5b6779',
  ink400: '#94a0b3',
  line: '#e6e9ef',
  success: '#1f8a5f',
  successTint: '#e7f5ee',
  danger: '#c0553c',
  dangerTint: '#fbeee9',
  pending: '#b8862f',
  pendingTint: '#faf1de',
};

// ---- Icons (inline SVG, no emoji) ----
const IconLeaf = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M4 20c8 1 15-5 16-16C11 3 5 10 4 20Z" /><path d="M5 19c3-4 6-7 11-11" /></svg>
)
const IconBriefcase = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
)
const IconClipboard = (p) => (
  <svg viewBox="0 0 24 24" {...p}><rect x="4" y="4" width="16" height="17" rx="2" /><path d="M9 3h6v3H9z" /><path d="M9 11h6M9 15h4" /></svg>
)
const IconCap = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3Z" /><path d="M5 10.5V16c0 2 3 3.5 7 3.5s7-1.5 7-3.5v-5.5" /></svg>
)
const IconUpload = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
)
const IconCheck = (p) => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>
)
const IconAlert = (p) => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></svg>
)
const IconSpinner = (p) => (
  <svg viewBox="0 0 24 24" className="tto-spin" {...p}><path d="M12 3a9 9 0 1 0 9 9" /></svg>
)
const IconFile = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M6 2h9l5 5v15H6Z" /><path d="M15 2v5h5" /></svg>
)
const IconList = (p) => (
  <svg viewBox="0 0 24 24" {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></svg>
)

const leaveTypeOptions = [
  { id: 'CL', name: 'Casual Leave', Icon: IconLeaf },
  { id: 'EL', name: 'Earned Leave', Icon: IconBriefcase },
  { id: 'OD', name: 'On Duty', Icon: IconClipboard },
  { id: 'AL', name: 'Academic Leave', Icon: IconCap },
];

export default function LeaveRequest() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    leaveType: '',
    reason: '',
    startDate: '',
    endDate: '',
    halfDay: false,
    emergencyContact: '',
    attachments: null
  });

  const [calculatedDays, setCalculatedDays] = useState(0);
  const [errors, setErrors] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dropHover, setDropHover] = useState(false);

  // Load recent leave requests from database
  useEffect(() => {
    if (!user) return
    loadRecentRequests();
  }, [user]);

  const loadRecentRequests = async () => {
    try {
      setLoadingRequests(true);
      const leaves = await getLeaveRequests();
      const filtered = leaves.filter((leave) => leave.user?.id === user?.id || leave.userId === user?.id)
      const sorted = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setLeaveRequests(sorted)
      setRecentRequests(sorted.slice(0, 5))
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Calculate days when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(formData.halfDay ? 0.5 : diffDays);
    } else {
      setCalculatedDays(0);
    }
  }, [formData.startDate, formData.endDate, formData.halfDay]);

  // Update selected leave info
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
    }));
    // Clear error for this field
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.leaveType) newErrors.leaveType = 'Please select a leave type';
    if (!formData.reason.trim()) newErrors.reason = 'Please provide a reason';
    if (!formData.startDate) newErrors.startDate = 'Please select start date';
    if (!formData.endDate) newErrors.endDate = 'Please select end date';
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      try {
        setSubmitting(true);
        setErrors({});

        // Prepare leave request data for API
        // Backend expects: leaveType, startDate, endDate, numberOfDays, reason, attachment (optional)
        const leaveTypeName = leaveTypeLabels[formData.leaveType] || formData.leaveType
        let leaveRequestData
        if (formData.attachments) {
          const form = new FormData()
          form.append('leaveType', leaveTypeName)
          form.append('reason', formData.reason)
          form.append('startDate', formData.startDate)
          form.append('endDate', formData.endDate)
          form.append('numberOfDays', calculatedDays)
          form.append('attachment', formData.attachments)
          leaveRequestData = form
        } else {
          leaveRequestData = {
            leaveType: leaveTypeName,
            reason: formData.reason,
            startDate: formData.startDate,
            endDate: formData.endDate,
            numberOfDays: calculatedDays,
            attachment: null
          }
        }

        // Submit to database
        await createLeaveRequest(leaveRequestData);

        // Show success message
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);

        // Reset form
        setFormData({
          leaveType: '',
          reason: '',
          startDate: '',
          endDate: '',
          halfDay: false,
          emergencyContact: '',
          attachments: null
        });

        // Reload recent requests
        await loadRecentRequests();

      } catch (error) {
        console.error('Error submitting leave request:', error);
        setErrors({ submit: error.message || 'Failed to submit leave request. Please try again.' });
      } finally {
        setSubmitting(false);
      }
    }
  };

  const cardStyle = {
    background: COLORS.white,
    borderRadius: 16,
    border: `1px solid ${COLORS.line}`,
    boxShadow: '0 1px 3px rgba(16,24,38,0.05)',
    padding: 32,
    marginBottom: 24,
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1.5px solid ${COLORS.line}`,
    fontSize: 14,
    background: COLORS.white,
    color: COLORS.ink900,
    fontFamily: "'Inter', sans-serif",
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color .15s ease, box-shadow .15s ease',
  };

  const labelStyle = {
    display: 'block',
    fontWeight: 600,
    marginBottom: 8,
    color: COLORS.ink600,
    fontSize: 12,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  };

  const statusStyles = {
    approved: { color: COLORS.success, bg: COLORS.successTint },
    rejected: { color: COLORS.danger, bg: COLORS.dangerTint },
    pending: { color: COLORS.pending, bg: COLORS.pendingTint },
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: COLORS.paper, padding: '40px 24px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tto-spin-kf { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .tto-spin { animation: tto-spin-kf 0.9s linear infinite; }
        .tto-field:focus { border-color: ${COLORS.navy700} !important; box-shadow: 0 0 0 3px rgba(21,39,66,0.10); }
        .tto-row:hover { transform: translateX(3px); }
      `}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: COLORS.gold500, marginBottom: 10, fontWeight: 500 }}>
            Leave Management
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 32, color: COLORS.ink900, margin: 0 }}>
            New Leave Request
          </h1>
          <p style={{ marginTop: 8, fontSize: 14.5, color: COLORS.ink600 }}>
            Submit your leave application — your reporting authority will be notified for approval.
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: COLORS.successTint,
            border: `1px solid ${COLORS.success}33`,
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 24,
            animation: 'fadeIn 0.25s ease-out',
          }}>
            <IconCheck style={{ width: 22, height: 22, stroke: COLORS.success, fill: 'none', strokeWidth: 1.8, flexShrink: 0 }} />
            <strong style={{ color: COLORS.success, fontSize: 14, fontWeight: 600 }}>
              Leave request submitted successfully. Your request is pending approval.
            </strong>
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: COLORS.dangerTint,
            border: `1px solid ${COLORS.danger}33`,
            borderRadius: 14,
            padding: '16px 20px',
            marginBottom: 24,
            animation: 'fadeIn 0.25s ease-out',
          }}>
            <IconAlert style={{ width: 22, height: 22, stroke: COLORS.danger, fill: 'none', strokeWidth: 1.8, flexShrink: 0 }} />
            <strong style={{ color: COLORS.danger, fontSize: 14, fontWeight: 600 }}>{errors.submit}</strong>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: COLORS.ink900, letterSpacing: '0.01em' }}>
              Leave Details
            </h3>

            {/* Type of Leave - selectable cards */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Type of Leave *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 4 }}>
                {leaveTypeOptions.map((opt) => {
                  const isActive = formData.leaveType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, leaveType: opt.id }))}
                      aria-pressed={isActive}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '13px 14px',
                        borderRadius: 12,
                        border: `1.5px solid ${isActive ? COLORS.navy800 : COLORS.line}`,
                        background: isActive ? COLORS.navy900 : COLORS.white,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color .15s ease, background .15s ease, transform .1s ease',
                      }}
                    >
                      <span style={{
                        width: 34, height: 34, borderRadius: 9,
                        background: isActive ? COLORS.gold500 : COLORS.paper,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <opt.Icon style={{ width: 17, height: 17, stroke: isActive ? COLORS.navy950 : COLORS.navy800, fill: 'none', strokeWidth: 1.8 }} />
                      </span>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: isActive ? COLORS.white : COLORS.ink900 }}>
                        {opt.id} — {opt.name}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.leaveType && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 8 }}>{errors.leaveType}</div>}
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Reason for Leave *</label>
              <textarea
                className="tto-field"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="Provide a brief, clear reason for your leave request..."
                rows="4"
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              {errors.reason && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 8 }}>{errors.reason}</div>}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={labelStyle}>Start Date *</label>
                <input
                  className="tto-field"
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  style={inputStyle}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.startDate && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 8 }}>{errors.startDate}</div>}
              </div>
              <div>
                <label style={labelStyle}>End Date *</label>
                <input
                  className="tto-field"
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  style={inputStyle}
                  min={formData.startDate || new Date().toISOString().split('T')[0]}
                />
                {errors.endDate && <div style={{ color: COLORS.danger, fontSize: 12.5, marginTop: 8 }}>{errors.endDate}</div>}
              </div>
            </div>

            {calculatedDays > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: COLORS.goldTint, border: `1px solid ${COLORS.gold500}40`,
                borderRadius: 12, padding: '12px 16px', marginBottom: 24,
              }}>
                <span style={{ fontSize: 13, color: COLORS.ink600, fontWeight: 600 }}>Duration requested</span>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: COLORS.navy900 }}>
                  {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}

            {/* Half Day Toggle */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                padding: '15px 16px',
                background: formData.halfDay ? COLORS.goldTint : COLORS.paper,
                borderRadius: 12,
                border: `1.5px solid ${formData.halfDay ? COLORS.gold500 : COLORS.line}`,
                transition: 'all 0.2s ease',
              }}>
                <input
                  type="checkbox"
                  name="halfDay"
                  checked={formData.halfDay}
                  onChange={handleChange}
                  style={{ marginRight: 12, width: 16, height: 16, cursor: 'pointer', accentColor: COLORS.navy800 }}
                />
                <span style={{ fontWeight: 600, color: COLORS.ink900, fontSize: 13.5 }}>
                  This is a half-day leave request
                </span>
              </label>
            </div>

            {/* Emergency Contact */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Emergency Contact (Optional)</label>
              <input
                className="tto-field"
                type="tel"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
                style={inputStyle}
              />
            </div>

            {/* Attachments */}
            <div style={{ marginBottom: 32 }}>
              <label style={labelStyle}>Supporting Documents (Optional)</label>
              <div
                style={{
                  border: `1.5px dashed ${dropHover ? COLORS.navy700 : COLORS.line}`,
                  borderRadius: 12,
                  padding: '28px',
                  textAlign: 'center',
                  background: dropHover ? COLORS.paper : COLORS.white,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={() => setDropHover(true)}
                onMouseLeave={() => setDropHover(false)}
                onClick={() => document.getElementById('fileInput').click()}
              >
                <IconUpload style={{ width: 26, height: 26, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.6, margin: '0 auto 10px' }} />
                <div style={{ color: COLORS.ink900, fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>
                  {formData.attachments ? formData.attachments.name : 'Click to upload or drag and drop'}
                </div>
                <div style={{ color: COLORS.ink400, fontSize: 12 }}>
                  PDF, DOC, JPG up to 10MB
                </div>
                <input
                  id="fileInput"
                  type="file"
                  name="attachments"
                  onChange={handleChange}
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: 15,
                borderRadius: 11,
                background: submitting ? COLORS.ink400 : COLORS.navy900,
                color: COLORS.white,
                border: 'none',
                fontSize: 14.5,
                fontWeight: 700,
                letterSpacing: '0.01em',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background .15s ease, transform .1s ease',
              }}
              onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.background = COLORS.navy800; }}
              onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.background = COLORS.navy900; }}
            >
              {submitting ? (
                <>
                  <IconSpinner style={{ width: 16, height: 16, stroke: COLORS.gold300, fill: 'none', strokeWidth: 2 }} />
                  Submitting...
                </>
              ) : (
                'Submit Leave Request'
              )}
            </button>
          </div>
        </form>

        {/* Recent Requests */}
        <div style={cardStyle}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 700, marginBottom: 20, color: COLORS.ink900 }}>
            <IconList style={{ width: 17, height: 17, stroke: COLORS.navy800, fill: 'none', strokeWidth: 1.8 }} />
            Recent Leave Requests
          </h3>
          {loadingRequests ? (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.ink600 }}>
              <IconSpinner style={{ width: 26, height: 26, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.8, marginBottom: 12 }} />
              <div style={{ fontSize: 13.5 }}>Loading requests...</div>
            </div>
          ) : recentRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: COLORS.ink600 }}>
              <IconFile style={{ width: 32, height: 32, stroke: COLORS.ink400, fill: 'none', strokeWidth: 1.4, marginBottom: 12 }} />
              <div style={{ fontSize: 13.5 }}>No leave requests yet. Submit your first request above.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentRequests.map((request) => {
                const status = statusStyles[request.status] || statusStyles.pending;
                const days = request.numberOfDays ?? request.days ?? 0;
                return (
                  <div
                    key={request._id || request.id}
                    className="tto-row"
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: COLORS.paper,
                      border: `1px solid ${COLORS.line}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: COLORS.ink900, marginBottom: 4, fontSize: 13.5 }}>
                        {request.leaveType}
                      </div>
                      <div style={{ fontSize: 12.5, color: COLORS.ink600 }}>
                        {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()} ({days} {days === 1 ? 'day' : 'days'})
                      </div>
                    </div>
                    <div style={{
                      padding: '5px 13px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      background: status.bg,
                      color: status.color,
                      textTransform: 'capitalize',
                    }}>
                      {request.status}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}