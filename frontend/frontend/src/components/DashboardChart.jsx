import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const DashboardChart = ({ data, title, barKey, lineKey }) => {
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-6">
      <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">{title}</h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, bottom: 0, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                padding: '12px'
              }} 
            />
            <Legend verticalAlign="top" align="right" iconType="circle" height={36} />
            <Bar 
              dataKey={barKey} 
              barSize={40} 
              fill="#3b82f6" 
              radius={[8, 8, 0, 0]} 
            />
            <Line 
              type="monotone" 
              dataKey={lineKey} 
              stroke="#f59e0b" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#f59e0b', strokeWidth: 3, stroke: '#fff' }} 
              activeDot={{ r: 8, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;
