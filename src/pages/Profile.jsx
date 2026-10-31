import React, { useState, useRef, useEffect } from 'react'
import { updateUserProfile } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'
import { Icon, Spinner } from '../components/ui'
import { useFeedback } from '../components/ui/Feedback'
import DepartmentPicker from '../components/DepartmentPicker'
import { DEPARTMENT_ROLES, DEPARTMENTS, TEACHER_ROLES, departmentLabelFor, joinDepartments, splitDepartments } from '../utils/departments'

// Shared design tokens from styles.css
const C = {
  navy950: 'var(--navy-950)',
  navy900: 'var(--navy-900)',
  navy800: 'var(--navy-800)',
  gold600: 'var(--gold-700)',
  gold500: 'var(--gold-500)',
  gold100: 'var(--gold-100)',
  paper:   'var(--paper)',
  card:    'var(--surface)',
  line:    'var(--line)',
  ink900:  'var(--ink-900)',
  ink600:  'var(--ink-600)',
  ink400:  'var(--ink-400)',
  green700:'var(--success)',
  green100:'var(--success-bg)',
  red700:  'var(--danger)',
  red100:  'var(--danger-bg)'
}
const serif = { fontFamily: 'var(--font-serif)' }
const shadowSoft = 'var(--shadow)'

const toProfileState = (source) => ({
  name: source?.name || '',
  email: source?.email || '',
  role: source?.role || '',
  department: source?.department || '',
  phone: source?.phoneNumber || source?.phone || '',
  employeeId: source?.employeeId || '',
  gender: source?.gender || '',
  qualification: source?.qualification || '',
  specialization: source?.specialization || '',
  joiningDate: source?.joiningDate || ''
})

const fieldLabelStyle = {
  color: C.gold600,
  fontSize: '12.5px',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom: '4px'
}

function DepartmentField({ label, value, saving, onSave }) {
  const [editing, setEditing] = useState(false)
  const [picked, setPicked] = useState([])
  const known = splitDepartments(value).filter((d) => DEPARTMENTS.includes(d))
  const hasValue = !!(value && String(value).trim())

  const start = () => { setPicked(known); setEditing(true) }
  const save = () => {
    if (!picked.length) return
    onSave(picked)
    setEditing(false)
  }

  return (
    <div style={{ padding: '14px 0', borderBottom: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '62px', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, marginRight: '16px', minWidth: 0 }}>
        <div id="profile-department-label" style={fieldLabelStyle}>{label}</div>
        {editing ? (
          <div style={{ maxWidth: 280 }}>
            <DepartmentPicker id="profile-department" value={picked} onChange={setPicked} invalid={!picked.length} describedBy="profile-department-label" />
            {!picked.length && <div className="ui-error">Select at least one department.</div>}
          </div>
        ) : (
          <div style={{ color: hasValue ? C.ink900 : C.ink400, fontSize: '14.5px', fontWeight: hasValue ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hasValue ? value : 'Not added'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {editing && (
          <button type="button" onClick={() => setEditing(false)} style={{ padding: '5px 12px', border: '1px solid #E2E8F0', borderRadius: '6px', background: '#FFFFFF', color: C.navy950, cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={editing ? save : start}
          disabled={saving || (editing && !picked.length)}
          style={{
            padding: '5px 16px',
            border: `1px solid ${editing ? C.gold500 : '#E2E8F0'}`,
            borderRadius: '6px',
            background: editing ? C.gold500 : '#FFFFFF',
            color: editing ? '#FFFFFF' : C.navy950,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>
    </div>
  )
}

export default function Profile() {
  const fileInputRef = useRef(null)
  const { user: authUser, refreshUser } = useAuth()
  const { confirm } = useFeedback()
  const genderLocked = !!(authUser?.gender && String(authUser.gender).trim())
  const [profileImage, setProfileImage] = useState(authUser?.profileImage || null)
  const [editMode, setEditMode] = useState({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [user, setUser] = useState(() => toProfileState(authUser))

  useEffect(() => {
    if (!authUser) return
    setUser(toProfileState(authUser))
    if (authUser.profileImage) {
      setProfileImage(authUser.profileImage)
    }
  }, [authUser])

  const showMessage = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3000)
  }

  const formatRole = (role) => {
    if (!role) return 'Faculty'
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }

  const calculateExperience = (joiningDate) => {
    try {
      if (!joiningDate) return '0 years 0 months'
      const join = new Date(joiningDate)
      const today = new Date()
      let years = today.getFullYear() - join.getFullYear()
      let months = today.getMonth() - join.getMonth()
      if (months < 0) {
        years -= 1
        months += 12
      }
      if (isNaN(years) || years < 0) return '0 years 0 months'
      return `${years} years ${months} months`
    } catch (err) {
      return '0 years 0 months'
    }
  }

  const getInitials = (name) => {
    if (!name) return 'HS'
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0] ? parts[0].slice(0, 2).toUpperCase() : 'HS'
  }

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return

    setSaving(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 400
          if (width > height && width > maxDim) {
            height = (height * maxDim) / width
            width = maxDim
          } else if (height > maxDim) {
            width = (width * maxDim) / height
            height = maxDim
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.8)

          setProfileImage(compressed)
          if (authUser && authUser.id) {
            try {
              await updateUserProfile(authUser.id, { profileImage: compressed })
              await refreshUser()
              showMessage('success', 'Profile image updated successfully!')
            } catch (err) {
              console.error('Failed to save profile image:', err)
              showMessage('error', 'Failed to save profile image')
            }
          }
          setSaving(false)
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error processing image:', err)
      showMessage('error', 'Failed to process image')
      setSaving(false)
    }
  }

  const startEdit = (field) => setEditMode({ [field]: true })

  const chooseGender = async (value) => {
    if (genderLocked || saving) return
    const ok = await confirm({
      title: `Set gender to ${value}?`,
      message: 'Once saved, gender cannot be changed.',
      confirmLabel: 'Save gender',
      icon: 'lock',
    })
    if (ok) saveField('gender', value)
  }

  const saveField = async (field, value) => {
    const previous = user[field]
    try {
      setSaving(true)
      setUser(prev => ({ ...prev, [field]: value }))

      if (authUser && authUser.id) {
        const apiFieldMap = {
          name: 'name',
          phone: 'phoneNumber',
          department: 'department',
          qualification: 'qualification',
          specialization: 'specialization',
          gender: 'gender',
          joiningDate: 'joiningDate',
          role: 'role'
        }
        const apiField = apiFieldMap[field] || field
        await updateUserProfile(authUser.id, { [apiField]: value })
        await refreshUser()
        showMessage('success', `${field.charAt(0).toUpperCase() + field.slice(1)} updated!`)
      }
      setEditMode({})
    } catch (error) {
      console.error('Error saving field:', error)
      setUser(prev => ({ ...prev, [field]: previous }))
      showMessage('error', error?.message || `Failed to update ${field}`)
    } finally {
      setSaving(false)
    }
  }

  const EditableField = ({ label, value, field, type = 'text', placeholder = 'Not added', readOnly = false }) => {
    const inputRef = useRef(null)
    const [inputValue, setInputValue] = useState(value ?? '')

    useEffect(() => {
      if (editMode[field]) setInputValue(value ?? '')
    }, [editMode[field], value])

    useEffect(() => {
      if (editMode[field] && inputRef.current) {
        inputRef.current.focus()
      }
    }, [editMode[field]])

    const isEditing = !!editMode[field]
    const hasValue = value && String(value).trim() !== ''

    return (
      <div style={{
        padding: '14px 0',
        borderBottom: `1px solid ${C.line}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '62px',
        boxSizing: 'border-box'
      }}>
        <div style={{ flex: 1, marginRight: '16px', minWidth: 0 }}>
          <div style={{
            color: C.gold600,
            fontSize: '12.5px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            {label}
          </div>
          {isEditing ? (
            <input
              ref={inputRef}
              type={type}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveField(field, inputValue)
                if (e.key === 'Escape') setEditMode({})
              }}
              style={{
                padding: '6px 10px',
                border: `1.5px solid ${C.gold500}`,
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%',
                maxWidth: '280px',
                background: 'white',
                color: C.ink900,
                outline: 'none',
                boxShadow: '0 0 0 3px rgba(201, 162, 39, 0.15)'
              }}
            />
          ) : (
            <div style={{
              color: hasValue ? C.ink900 : C.ink400,
              fontSize: '14.5px',
              fontWeight: hasValue ? 600 : 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {hasValue ? value : placeholder}
            </div>
          )}
        </div>
        {!readOnly && <button
          type="button"
          onClick={() => {
            if (isEditing) saveField(field, inputValue)
            else startEdit(field)
          }}
          style={{
            padding: '5px 16px',
            border: `1px solid ${isEditing ? C.gold500 : '#E2E8F0'}`,
            borderRadius: '6px',
            background: isEditing ? C.gold500 : '#FFFFFF',
            color: isEditing ? '#FFFFFF' : C.navy950,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>}
      </div>
    )
  }

  return (
    <div className="profile-page ui-page" style={{
      width: '100%',
      color: C.ink900,
      boxSizing: 'border-box'
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Page Header & Breadcrumb */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                background: C.navy950,
                color: 'white',
                fontSize: '12px',
                fontWeight: 800,
                padding: '2.5px 6px',
                borderRadius: '4px',
                letterSpacing: '0.06em'
              }}>
                JIMS
              </span>
              <span style={{
                fontSize: '12.5px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.ink400
              }}>
                Jagan Institute of Management Studies
              </span>
            </div>
            <h2 style={{
              ...serif,
              margin: 0,
              fontSize: 32,
              fontWeight: 700,
              color: C.navy950,
              letterSpacing: '-0.01em'
            }}>
              My Profile
            </h2>
          </div>
          <div style={{ color: C.navy950, fontSize: 13.5, fontWeight: 500 }}>
            Dashboard <span style={{ color: C.gold500, fontWeight: 700, margin: '0 2px' }}>/</span> <span style={{ color: C.gold500, fontWeight: 600 }}>Profile</span>
          </div>
        </div>

        {saving && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: C.gold100,
            color: C.gold600,
            padding: '6px 14px',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 600,
            marginBottom: 16
          }}>
            <Spinner size={14} />
            Saving profile changes...
          </div>
        )}

        {message.text && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '16px',
            borderRadius: '8px',
            background: message.type === 'success' ? C.green100 : C.red100,
            color: message.type === 'success' ? C.green700 : C.red700,
            border: `1px solid ${message.type === 'success' ? '#CFE7DA' : '#EFD4D2'}`,
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }} role={message.type === 'success' ? 'status' : 'alert'}>
            <Icon name={message.type === 'success' ? 'checkCircle' : 'alert'} size={17} />
            {message.text}
          </div>
        )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* CARD 1: Personal Information */}
            <div className="card-box" style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              boxShadow: shadowSoft,
              borderRadius: '16px',
              padding: '24px 28px 28px'
            }}>
              <h3 style={{
                ...serif,
                margin: 0,
                fontSize: '19px',
                fontWeight: 700,
                color: C.navy950,
                paddingBottom: '14px',
                borderBottom: `1px solid ${C.line}`
              }}>
                Personal Information
              </h3>

              <div style={{
                display: 'flex',
                gap: '32px',
                alignItems: 'flex-start',
                marginTop: '20px',
                flexWrap: 'wrap'
              }}>
                {/* Avatar Box */}
                <div style={{ position: 'relative', flexShrink: 0, marginTop: '4px' }}>
                  <div style={{
                    width: '110px',
                    height: '110px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: C.navy950,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(11,29,48,0.18)'
                  }}>
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{
                        ...serif,
                        color: C.gold500,
                        fontSize: '34px',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}>
                        {getInitials(user.name)}
                      </span>
                    )}
                  </div>
                  {/* Pencil Edit Icon at Bottom Left */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Change profile picture"
                    aria-label="Change profile picture"
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '-6px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '13px',
                      color: C.navy950,
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Personal Details Fields */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <EditableField label="Full Name" value={user.name} field="name" placeholder="Not added" />
                  <EditableField label="Email Address" value={user.email} field="email" placeholder="Not added" />
                  <EditableField label="Mobile Number" value={user.phone} field="phone" placeholder="Not added" />
                  
                  {/* Gender Selector */}
                  <div style={{ padding: '14px 0', minHeight: '62px', boxSizing: 'border-box' }}>
                    <div style={{
                      color: C.gold600,
                      fontSize: '12.5px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Gender
                    </div>
                    {genderLocked ? (
                      <div>
                        <div style={{ color: C.ink900, fontSize: '14.5px', fontWeight: 600 }}>{authUser.gender}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, color: C.ink600, fontSize: '12.5px' }}>
                          <Icon name="lock" size={13} /> Gender cannot be changed once set.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          {['Male', 'Female'].map((option) => (
                            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: C.ink900, fontWeight: 500 }}>
                              <input
                                type="radio"
                                name="gender"
                                value={option}
                                checked={user.gender === option}
                                disabled={saving}
                                onChange={(e) => chooseGender(e.target.value)}
                                style={{ accentColor: C.gold600 }}
                              />
                              {option}
                            </label>
                          ))}
                        </div>
                        <div style={{ marginTop: 6, color: C.ink600, fontSize: '12.5px' }}>
                          Not set yet. You can set this once; it cannot be changed later.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: Professional Information */}
            <div className="card-box" style={{
              background: C.card,
              border: `1px solid ${C.line}`,
              boxShadow: shadowSoft,
              borderRadius: '16px',
              padding: '24px 28px 28px'
            }}>
              <h3 style={{
                ...serif,
                margin: 0,
                fontSize: '19px',
                fontWeight: 700,
                color: C.navy950,
                paddingBottom: '14px',
                borderBottom: `1px solid ${C.line}`
              }}>
                Professional Information
              </h3>

              <div className="prof-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                columnGap: '40px',
                rowGap: '0px',
                marginTop: '8px'
              }}>
                {/* Left Column */}
                <div>
                  {DEPARTMENT_ROLES.includes(authUser?.role) ? (
                    <DepartmentField
                      label={departmentLabelFor(authUser.role)}
                      value={user.department}
                      saving={saving}
                      onSave={(list) => saveField('department', joinDepartments(list))}
                    />
                  ) : (
                    <EditableField label="Department" value={user.department} field="department" placeholder="Not added" />
                  )}
                  {TEACHER_ROLES.includes(authUser?.role) && (
                    <EditableField
                      label={(authUser.coordinators || []).length > 1 ? 'Coordinators' : 'Coordinator'}
                      value={(authUser.coordinators || []).map((c) => `${c.department}: ${c.names.length ? c.names.join(', ') : 'Not assigned yet'}`).join(' · ')}
                      field="coordinator"
                      placeholder="Select a department first"
                      readOnly
                    />
                  )}
                  <EditableField label="Qualification" value={user.qualification} field="qualification" placeholder="Not added" />
                  <EditableField label="Joining Date" value={user.joiningDate} field="joiningDate" type="date" placeholder="Not added" />
                </div>

                {/* Right Column */}
                <div>
                  <EditableField label="Role" value={formatRole(user.role)} field="role" placeholder="Not added" />
                  <EditableField label="Specialization" value={user.specialization} field="specialization" placeholder="Not added" />
                  <EditableField label="Experience" value={user.joiningDate ? calculateExperience(user.joiningDate) : ''} field="experience" placeholder="Not added" readOnly />
                </div>
              </div>
            </div>

          </div>
      </div>

      <style>{`
        @media (max-width: 600px) {
          .profile-page .card-box { padding: 20px 16px !important; }
          .profile-page .prof-grid { grid-template-columns: minmax(0, 1fr) !important; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}