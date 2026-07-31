import React, { useState, useRef, useEffect } from 'react'
import { updateUserProfile, fetchCurrentUser } from '../utils/api-auth'
import { useAuth } from '../contexts/AuthContext'

// ===== Corporate Theme Tokens =====
const C = {
  navy950: '#0B1D30',
  navy900: '#122B45',
  navy800: '#1B3A5C',
  gold600: '#B08A2E',
  gold500: '#C9A227',
  gold100: '#FDF8EC',
  paper:   '#F4F6F9',
  card:    '#FFFFFF',
  line:    '#EAEFF5',
  ink900:  '#182230',
  ink600:  '#4B5768',
  ink400:  '#94A3B8',
  green700:'#256B4C',
  green100:'#E4F2EA',
  red700:  '#A73A3A',
  red100:  '#F7E7E6'
}
const serif = { fontFamily: "'Source Serif 4', Georgia, serif" }
const shadowSoft = '0 2px 10px rgba(15, 29, 48, 0.04), 0 1px 3px rgba(15, 29, 48, 0.02)'

export default function Profile() {
  const fileInputRef = useRef(null)
  const { user: authUser, refreshUser } = useAuth()
  const [profileImage, setProfileImage] = useState(authUser?.profileImage || null)
  const [editMode, setEditMode] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [user, setUser] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    joiningDate: '',
    qualification: '',
    specialization: '',
    phone: '',
    gender: 'Male',
    employeeId: ''
  })

  useEffect(() => {
    loadUserData()
  }, [authUser])

  const loadUserData = async () => {
    try {
      setLoading(true)
      if (authUser) {
        const userData = await fetchCurrentUser()
        const target = userData || authUser
        if (target) {
          setUser({
            name: target.name || 'Harsimar Singh',
            email: target.email || 'simar87@gmail.com',
            role: target.role || 'Faculty',
            department: target.department || 'MCA',
            phone: target.phoneNumber || target.phone || '',
            employeeId: target.employeeId || '',
            gender: target.gender || 'Male',
            qualification: target.qualification || '',
            specialization: target.specialization || '',
            joiningDate: target.joiningDate || '2026-07-27'
          })
          if (target.profileImage) {
            setProfileImage(target.profileImage)
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const saveField = async (field, value) => {
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
      showMessage('error', `Failed to update ${field}`)
    } finally {
      setSaving(false)
    }
  }

  const EditableField = ({ label, value, field, type = 'text', placeholder = 'Not added' }) => {
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
            fontSize: '11px',
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
        <button
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
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
          }}
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
      </div>
    )
  }

  return (
    <div className="profile-page" style={{
      width: '100%',
      minHeight: '100vh',
      background: C.paper,
      padding: '28px 40px 60px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
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
                fontSize: '9.5px',
                fontWeight: 800,
                padding: '2.5px 6px',
                borderRadius: '4px',
                letterSpacing: '0.06em'
              }}>
                JIMS
              </span>
              <span style={{
                fontSize: '11px',
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
          <div style={{ color: C.navy950, fontSize: 12.5, fontWeight: 500 }}>
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
            fontSize: 12.5,
            fontWeight: 600,
            marginBottom: 16
          }}>
            <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
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
            fontWeight: 600
          }}>
            {message.type === 'success' ? '✓ ' : '⚠️ '}
            {message.text}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '72px 20px',
            background: C.card,
            border: `1px solid ${C.line}`,
            boxShadow: shadowSoft,
            borderRadius: '16px'
          }}>
            <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'spin 1.5s linear infinite' }}>⏳</div>
            <div style={{ color: C.navy800, fontSize: '15px', fontWeight: 600 }}>Loading profile details...</div>
          </div>
        ) : (
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
                      fontSize: '12px',
                      color: C.navy950,
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ✏️
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
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: '8px'
                    }}>
                      Gender
                    </div>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: C.ink900, fontWeight: 500 }}>
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          checked={user.gender === 'Male'}
                          onChange={(e) => saveField('gender', e.target.value)}
                          style={{ accentColor: C.gold600 }}
                        />
                        Male
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: C.ink900, fontWeight: 500 }}>
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          checked={user.gender === 'Female'}
                          onChange={(e) => saveField('gender', e.target.value)}
                          style={{ accentColor: C.gold600 }}
                        />
                        Female
                      </label>
                    </div>
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
                  <EditableField label="Department" value={user.department} field="department" placeholder="Not added" />
                  <EditableField label="Qualification" value={user.qualification} field="qualification" placeholder="Not added" />
                  <EditableField label="Joining Date" value={user.joiningDate} field="joiningDate" type="date" placeholder="Not added" />
                </div>

                {/* Right Column */}
                <div>
                  <EditableField label="Role" value={formatRole(user.role)} field="role" placeholder="Not added" />
                  <EditableField label="Specialization" value={user.specialization} field="specialization" placeholder="Not added" />
                  <EditableField label="Experience" value={calculateExperience(user.joiningDate)} field="joiningDate" type="date" placeholder="Not added" />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}