// import React from 'react';
// import CircleProgress from '../components/CircleProgress';
// import '../styles.css';

// const leaveData = [
//   { type: 'Earned Leave', available: 10.42, consumed: 10, total: 12.5, color: '#0ea5e9' },
//   { type: 'Marriage Leave', available: 5, consumed: 0, total: 5, color: '#10b981' },
//   { type: 'Sick Leave', available: 3, consumed: 3, total: 6, color: '#8b5cf6' }
// ];

// const leaveHistory = [
//   {
//     dates: '23 Oct - 24 Oct 2025',
//     days: 2,
//     type: 'Earned Leave',
//     requestedOn: '29 Sep 2025',
//     status: 'Approved',
//     approver: 'Amit Bora',
//     requestedBy: 'Kritika Yadav',
//     actionOn: '06 Oct 2025',
//     note: 'Taking leave for family commitment.'
//   },
//   {
//     dates: '01 Oct 2025',
//     days: 1,
//     type: 'Floater Leave',
//     requestedOn: '24 Sep 2025',
//     status: 'Approved',
//     approver: 'Amit Bora',
//     requestedBy: 'Kritika Yadav',
//     actionOn: '25 Sep 2025',
//     note: 'Festival'
//   }
// ];

// export default function Dashboard() {
//   const [profile] = React.useState({
//     name: 'Kritika Yadav',
//     role: 'Assistant Professor',
//     department: 'Computer Applications',
//     email: 'kritika.yadav@jims.edu',
//     avatar: 'https://i.pravatar.cc/150?img=12'
//   });

//   return (
//     <div className="dashboard-container">
//       {/* Top Row */}
//       <div className="dashboard-row">
//         {/* Profile Card */}
//         <div className="dashboard-card">
//           <div className="profile-card">
//             <img src={profile.avatar} alt={profile.name} />
//             <div className="profile-info">
//               <h3>{profile.name}</h3>
//               <p>{profile.role}</p>
//               <p>{profile.department}</p>
//             </div>
//           </div>
//         </div>

//         {/* Leave Summary Card */}
//         <div className="dashboard-card">
//           <h3>Leave Summary</h3>
//           <div className="leave-summary">
//             {leaveTypes.map(type => (
//               <div key={type.name} className="leave-type">
//                 <h4>{type.name}</h4>
//                 <div className="leave-count">{type.available}</div>
//                 <div>Available</div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Middle Row */}
//       <div className="dashboard-row">
//         {/* Leave Balance Card */}
//         <div className="dashboard-card">
//           <h3>Leave Balance</h3>
//           <div className="leave-balance">
//             {leaveTypes.map(type => (
//               <CircleProgress
//                 key={type.name}
//                 value={type.consumed}
//                 max={type.quota}
//                 label={type.name}
//                 color={type.color}
//               />
//             ))}
//           </div>
//         </div>

//             {/* Upcoming Leaves Card */}
//         <div className="dashboard-card">
//           <h3>Upcoming Leaves</h3>
//           <div style={{ marginTop: '16px' }}>
//             <div style={{ padding: '12px', background: 'var(--surface)', borderRadius: '8px', marginBottom: '8px' }}>
//               <div style={{ fontWeight: 'bold' }}>Nov 05 - Nov 06, 2025</div>
//               <div style={{ color: 'var(--muted)' }}>Floater Leave - Festival</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Bottom Row - Leave History */}
//       <div className="dashboard-card dashboard-full">
//         <div className="table-header">
//           <h3>Leave History</h3>
//           <div className="table-filters">
//             <select className="filter-select">
//               <option>All Types</option>
//               <option>Earned Leave</option>
//               <option>Marriage Leave</option>
//               <option>Sick Leave</option>
//             </select>
//             <select className="filter-select">
//               <option>All Status</option>
//               <option>Approved</option>
//               <option>Pending</option>
//               <option>Rejected</option>
//             </select>
//             <input type="search" placeholder="Search..." className="filter-search" />
//           </div>
//         </div>

//         <div style={{ overflowX: 'auto' }}>
//           <table className="history-table">
//             <thead>
//               <tr>
//                 <th>Leave Dates</th>
//                 <th>Leave Type</th>
//                 <th>Status</th>
//                 <th>Requested By</th>
//                 <th>Action Taken On</th>
//                 <th>Leave Note</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {[
//                 {
//                   dates: '23 Oct - 24 Oct 2025\n2 Days',
//                   type: 'Earned Leave',
//                   requestedOn: '29 Sep 2025',
//                   status: 'Approved',
//                   approver: 'Amit Bora',
//                   requestedBy: 'Kritika Yadav',
//                   actionOn: '06 Oct 2025',
//                   note: 'Taking leave for family commitment.'
//                 },
//                 // Add more entries as needed
//               ].map((leave, idx) => (
//                 <tr key={idx}>
//                   <td style={{ whiteSpace: 'pre-line' }}>{leave.dates}</td>
//                   <td>
//                     {leave.type}
//                     <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
//                       Requested on {leave.requestedOn}
//                     </div>
//                   </td>
//                   <td>
//                     <span className="status-approved">{leave.status}</span>
//                     <div style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
//                       by {leave.approver}
//                     </div>
//                   </td>
//                   <td>{leave.requestedBy}</td>
//                   <td>{leave.actionOn}</td>
//                   <td>{leave.note}</td>
//                   <td>
//                     <button className="btn btn-ghost">View</button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
//   )
// }