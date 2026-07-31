import React, { useState } from 'react'

const leaveTypes = [
  { id: 'comp', name: 'Comp Offs', available: 0, consumed: 0, quota: 0, color: '#F87171' },
  { id: 'earned', name: 'Earned Leave', available: 10.42, consumed: 10, quota: 15, color: '#F59E0B', carryOver: 7.92, accruedSoFar: 12.5 },
  { id: 'marriage', name: 'Marriage Leave', available: 5, consumed: 0, quota: 5, color: '#10B981' },
  { id: 'shared', name: 'Shared Leave', available: 0, consumed: 0, quota: 0, color: '#6366F1' },
  { id: 'sick', name: 'Sick Leave', available: 3, consumed: 3, quota: 6, color: '#8B5CF6' },
  { id: 'unpaid', name: 'Unpaid Leave', available: 0, consumed: 0, color: '#EC4899' }
]

function CircleGraph({ available, consumed, quota, color }) {
  const radius = 50
  const strokeWidth = 8
  const normalizedRadius = radius - strokeWidth * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const total = quota || (available + consumed) || 1
  const availableOffset = circumference - (available / total) * circumference

  return (
    <svg height={radius * 2} width={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
      {/* Background circle */}
      <circle
        stroke="#f0f0f0"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      {/* Progress circle */}
      <circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference + ' ' + circumference}
        strokeLinecap="round"
        style={{ strokeDashoffset: availableOffset, transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 0.5s ease' }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        style={{fill: '#333', fontSize: '16px', fontWeight: '600'}}
      >
        {available}d
      </text>
    </svg>
  )
}

function LeaveDetailsModal({ leave, onClose }) {
  if (!leave) return null
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20,
      animation: 'fadeIn 0.3s ease-out'
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff',  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderRadius: 24,
        padding: 40,
        maxWidth: 500,
        width: '100%',
        animation: 'modalSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        border: `3px solid ${leave.color}`
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 28}}>
          <h3 style={{margin: 0, fontSize: 28, color: '#1a1a1a', fontWeight: 800}}>
            {leave.name}
          </h3>
          <button onClick={onClose} style={{
            background: `${leave.color}15`,
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: leave.color,
            padding: 0,
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            transition: 'all 0.3s ease',
            fontWeight: 'bold'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = leave.color
            e.currentTarget.style.color = 'white'
            e.currentTarget.style.transform = 'rotate(90deg)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${leave.color}15`
            e.currentTarget.style.color = leave.color
            e.currentTarget.style.transform = 'rotate(0deg)'
          }}>×</button>
        </div>
        
        <div style={{marginBottom: 24}}>
          <div style={{display: 'flex', justifyContent: 'center', marginBottom: 32}}>
            <div style={{
              position: 'relative',
              animation: 'scaleIn 0.5s ease-out 0.2s backwards'
            }}>
              <CircleGraph
                available={leave.available}
                consumed={leave.consumed}
                quota={leave.quota}
                color={leave.color}
              />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle, ${leave.color}20 0%, transparent 70%)`,
                borderRadius: '50%',
                zIndex: -1,
                animation: 'pulse 2s ease-in-out infinite'
              }}></div>
            </div>
          </div>
          
          <div style={{
            background: `linear-gradient(135deg, ${leave.color}08 0%, ${leave.color}03 100%)`,
            borderRadius: 16,
            padding: 24,
            border: `2px solid ${leave.color}30`
          }}>
            <div style={{display: 'grid', gap: 18}}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: `2px solid ${'#f0f0f0'}`,
                animation: 'slideRight 0.5s ease-out 0.3s backwards'
              }}>
                <span style={{color: '#666', fontSize: 15, fontWeight: 600}}>Available</span>
                <span style={{fontWeight: 700, fontSize: 20, color: leave.color}}>{leave.available} days</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: `2px solid ${'#f0f0f0'}`,
                animation: 'slideRight 0.5s ease-out 0.4s backwards'
              }}>
                <span style={{color: '#666', fontSize: 15, fontWeight: 600}}>Consumed</span>
                <span style={{fontWeight: 700, fontSize: 20, color: '#495057'}}>{leave.consumed} days</span>
              </div>
              {leave.quota && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: 14,
                  borderBottom: `2px solid ${'#f0f0f0'}`,
                  animation: 'slideRight 0.5s ease-out 0.5s backwards'
                }}>
                  <span style={{color: '#666', fontSize: 15, fontWeight: 600}}>Annual Quota</span>
                  <span style={{fontWeight: 700, fontSize: 20, color: '#dc3545'}}>{leave.quota} days</span>
                </div>
              )}
              {leave.accruedSoFar && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingBottom: 14,
                  borderBottom: `2px solid ${'#f0f0f0'}`,
                  animation: 'slideRight 0.5s ease-out 0.6s backwards'
                }}>
                  <span style={{color: '#666', fontSize: 15, fontWeight: 600}}>Accrued so far</span>
                  <span style={{fontWeight: 700, fontSize: 20, color: '#0284c7'}}>{leave.accruedSoFar} days</span>
                </div>
              )}
              {leave.carryOver && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  animation: 'slideRight 0.5s ease-out 0.7s backwards'
                }}>
                  <span style={{color: '#666', fontSize: 15, fontWeight: 600}}>Carry Over</span>
                  <span style={{fontWeight: 700, fontSize: 20, color: '#16a34a'}}>{leave.carryOver} days</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalSlideUp {
            from {
              opacity: 0;
              transform: translateY(50px) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes scaleIn {
            from {
              opacity: 0;
              transform: scale(0.5);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes slideRight {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
          }
        `}</style>
      </div>
    </div>
  )
}

export default function LeaveBalance() {
  const [selectedLeave, setSelectedLeave] = useState(null)
  
  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background shapes */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        right: '-100px',
        width: '400px',
        height: '400px',
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 6s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-150px',
        left: '-150px',
        width: '500px',
        height: '500px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '50%',
        filter: 'blur(80px)',
        animation: 'float 8s ease-in-out infinite reverse'
      }}></div>
      
      <div style={{position: 'relative', zIndex: 1}}>
        <div className="page-title" style={{marginBottom: 32}}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 36,
              fontWeight: 800,
              color: 'white',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              marginBottom: 8,
              animation: 'slideDown 0.6s ease-out'
            }}>
              📊 Leave Balances
            </h2>
            <div style={{
              color: 'rgba(255,255,255,0.95)',
              fontSize: 16,
              fontWeight: 500,
              animation: 'slideDown 0.6s ease-out 0.1s backwards'
            }}>
              Overview of your leave quotas and usage
            </div>
          </div>
        </div>

        <div className="grid" style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 24,
          animation: 'fadeInUp 0.8s ease-out 0.2s backwards'
        }}>
          {leaveTypes.map((type, index) => (
            <div key={type.id} className="balance-card" style={{
              background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: 24,
              borderRadius: 20,
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              cursor: 'pointer',
              animation: `fadeInUp 0.6s ease-out ${0.1 * index}s backwards`,
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.25)'
              e.currentTarget.style.transform = 'translateY(-12px) scale(1.02)'
              e.currentTarget.style.borderColor = type.color
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)'
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
            }}>
              {/* Decorative gradient overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '150px',
                height: '150px',
                background: `radial-gradient(circle, ${type.color}20 0%, transparent 70%)`,
                pointerEvents: 'none'
              }}></div>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative'}}>
                <div>
                  <div style={{fontSize: 20, fontWeight: 700, marginBottom: 4, color: '#1a1a1a'}}>{type.name}</div>
                  {type.available === 0 && type.consumed === 0 && (
                    <div style={{fontSize: 13, color: '#999', fontStyle: 'italic'}}>No data to display</div>
                  )}
                </div>
                <button 
                  className="btn btn-ghost" 
                  style={{
                    fontSize: 13, 
                    color: 'white',
                    background: `linear-gradient(135deg, ${type.color} 0%, ${type.color}dd 100%)`,
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    boxShadow: `0 4px 12px ${type.color}40`,
                    transition: 'all 0.3s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedLeave(type)
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = `0 6px 20px ${type.color}60`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = `0 4px 12px ${type.color}40`
                  }}
                >
                  View details
                </button>
              </div>

              {(type.available > 0 || type.consumed > 0) && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '24px 0',
                    position: 'relative'
                  }}>
                    <CircleGraph
                      available={type.available}
                      consumed={type.consumed}
                      quota={type.quota}
                      color={type.color}
                    />
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 13}}>
                    <div style={{
                      background: `linear-gradient(135deg, ${type.color}15 0%, ${type.color}05 100%)`,
                      padding: 14,
                      borderRadius: 12,
                      borderLeft: `4px solid ${type.color}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${type.color}25 0%, ${type.color}10 100%)`
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${type.color}15 0%, ${type.color}05 100%)`
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}>
                      <div style={{color: '#666', marginBottom: 6, fontSize: 12, fontWeight: 600}}>Available</div>
                      <div style={{fontWeight: 700, fontSize: 20, color: type.color}}>{type.available} days</div>
                    </div>
                    <div style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      padding: 14,
                      borderRadius: 12,
                      borderLeft: `4px solid ${'#dee2e6'}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%)'
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}>
                      <div style={{color: '#666', marginBottom: 6, fontSize: 12, fontWeight: 600}}>Consumed</div>
                      <div style={{fontWeight: 700, fontSize: 20, color: '#495057'}}>{type.consumed} days</div>
                    </div>
                    {type.quota && (
                      <div style={{
                        background: 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)',
                        padding: 14,
                        borderRadius: 12,
                        borderLeft: '4px solid #ffc9c9',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #ffe5e5 0%, #ffd5d5 100%)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}>
                        <div style={{color: '#666', marginBottom: 6, fontSize: 12, fontWeight: 600}}>Annual Quota</div>
                        <div style={{fontWeight: 700, fontSize: 18, color: '#dc3545'}}>{type.quota} days</div>
                      </div>
                    )}
                    {type.accruedSoFar && (
                      <div style={{
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        padding: 14,
                        borderRadius: 12,
                        borderLeft: '4px solid #bae6fd',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}>
                        <div style={{color: '#666', marginBottom: 6, fontSize: 12, fontWeight: 600}}>Accrued so far</div>
                        <div style={{fontWeight: 700, fontSize: 18, color: '#0284c7'}}>{type.accruedSoFar} days</div>
                      </div>
                    )}
                    {type.carryOver && (
                      <div style={{
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                        padding: 14,
                        borderRadius: 12,
                        borderLeft: '4px solid #86efac',
                        gridColumn: type.accruedSoFar ? 'auto' : 'span 2',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)'
                        e.currentTarget.style.transform = 'translateX(4px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}>
                        <div style={{color: '#666', marginBottom: 6, fontSize: 12, fontWeight: 600}}>Carry Over</div>
                        <div style={{fontWeight: 700, fontSize: 18, color: '#16a34a'}}>{type.carryOver} days</div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {selectedLeave && (
          <LeaveDetailsModal 
            leave={selectedLeave} 
            onClose={() => setSelectedLeave(null)} 
          />
        )}
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}