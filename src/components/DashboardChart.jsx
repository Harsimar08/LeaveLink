import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const data = [
  {name: 'Jan', requests: 12},
  {name: 'Feb', requests: 18},
  {name: 'Mar', requests: 10},
  {name: 'Apr', requests: 24},
  {name: 'May', requests: 20},
  {name: 'Jun', requests: 30},
]

export default function DashboardChart(){
  return (
    <div className="card chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{top:10,right:20,left:0,bottom:0}}>
          <defs>
            <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6ee7b7" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6ee7b7" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="name" stroke="#8fa3b2"/>
          <YAxis stroke="#8fa3b2" />
          <CartesianGrid strokeDasharray="3 3" opacity={0.04} />
          <Tooltip />
          <Area type="monotone" dataKey="requests" stroke="#34d399" fillOpacity={1} fill="url(#colorReq)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
