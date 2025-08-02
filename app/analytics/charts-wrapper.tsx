'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  ComposedChart
} from 'recharts'

interface ChartWrapperProps {
  type: 'composed' | 'area' | 'bar' | 'pie'
  data: any[]
  height?: number
  config?: any
}

export default function ChartsWrapper({ type, data, height = 350, config }: ChartWrapperProps) {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}K`
  const formatValue = (value: any, name: string) => [
    name === 'amount' ? `$${value.toLocaleString()}` : value,
    name === 'amount' ? 'Revenue' : name === 'revenue' ? 'Actual Revenue' : name === 'target' ? 'Target' : name
  ]

  if (type === 'composed') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={formatValue} />
          <Legend />
          <Area
            type="monotone"
            dataKey="revenue"
            fill="#FF6B35"
            fillOpacity={0.3}
            stroke="#FF6B35"
            name="Actual Revenue"
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#10B981"
            strokeDasharray="5 5"
            name="Target"
          />
          <Bar dataKey="payments" fill="#4ECDC4" name="Payment Count" />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis yAxisId="left" tickFormatter={(value) => `$${value.toLocaleString()}`} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip formatter={formatValue} />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="amount"
            stroke="#FF6B35"
            fill="#FF6B35"
            fillOpacity={0.6}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="count"
            stroke="#4ECDC4"
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#FF6B35" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  if (type === 'pie') {
    const { showLabels = true, outerRadius = 80 } = config || {}
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={outerRadius}
            dataKey="value"
            label={showLabels ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%` : false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => [`${value}%`, 'Usage']} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  return null
} 