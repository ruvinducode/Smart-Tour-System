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

const DashboardChart = ({ data, title, barKey, lineKey, barColor = '#f97316', lineColor = '#1a2e6f' }) => {
  return (
    <div className="chart-wrapper bg-white p-6 sm:p-7 rounded-3xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">Live data</span>
      </div>
      <div className="w-full">
        <ResponsiveContainer width="100%" height={300} minWidth={1}>
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
              barSize={36} 
              fill={barColor} 
              radius={[8, 8, 0, 0]} 
            />
            <Line 
              type="monotone" 
              dataKey={lineKey} 
              stroke={lineColor} 
              strokeWidth={3} 
              dot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: '#fff' }} 
              activeDot={{ r: 7, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardChart;
