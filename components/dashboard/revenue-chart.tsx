
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { PaymentTrend } from '../../lib/types'

interface RevenueChartProps {
  data: PaymentTrend[]
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Revenue Trends
          <span className="text-sm font-normal text-muted-foreground">
            Monthly revenue over time
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis 
              dataKey="month" 
              tickLine={false}
              tick={{ fontSize: 10 }}
              axisLine={false}
            />
            <YAxis 
              tickLine={false}
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip 
              formatter={(value: any) => [`$${value.toLocaleString()}`, 'Revenue']}
              labelFormatter={(label) => `Month: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#FF6B35" 
              strokeWidth={3}
              dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
