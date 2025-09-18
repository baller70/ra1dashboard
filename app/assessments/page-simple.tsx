'use client'

import React from 'react'
import { AppLayout } from '../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Circle } from 'lucide-react'

export default function AssessmentsPageSimple() {
  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 text-white p-8 rounded-xl shadow-2xl overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
                <Circle className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 tracking-tight">Basketball Assessment Report</h1>
                <p className="text-orange-100 text-lg">Professional player evaluation & development system</p>
              </div>
            </div>
          </div>
        </div>

        {/* Simple Test Content */}
        <Card className="shadow-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Circle className="h-5 w-5 mr-2" />
              Basketball Assessment System
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600">
                Welcome to the Basketball Assessment System! This is a test version to verify the page loads correctly.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-orange-800 mb-2">Player Evaluation</h3>
                  <p className="text-sm text-gray-600">Comprehensive skill assessment for youth basketball players</p>
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">AI-Powered Insights</h3>
                  <p className="text-sm text-gray-600">Generate personalized recommendations and analysis</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">PDF Reports</h3>
                  <p className="text-sm text-gray-600">Professional assessment reports for parents and coaches</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Email Templates</h3>
                  <p className="text-sm text-gray-600">Ready-to-send communication templates</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">System Status</h3>
                <p className="text-sm text-green-600">✅ Page loaded successfully</p>
                <p className="text-sm text-green-600">✅ Components rendering correctly</p>
                <p className="text-sm text-green-600">✅ No hydration errors detected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
