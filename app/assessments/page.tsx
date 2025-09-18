'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '../components/app-layout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import {
  FileText,
  Download,
  Mail,
  Upload,
  Calendar,
  User,
  Users,
  Star,
  Circle,
  Target,
  Eye,
  MessageSquare,
  TrendingUp,
  Shield,
  Footprints,
  Brain,
  Wand2,
  Printer,
  Save,
  RefreshCw,
  Trash2,
  Trophy,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

// Types for the assessment system
interface PlayerInfo {
  name: string
  age: string
  team: string
  assessmentDate: string
}

interface SkillRating {
  skillName: string
  rating: number
}

interface GeneratedContent {
  parentSuggestions: string
  gameplayAnalysis: string
  progressSummary: string
}

interface AssessmentData {
  playerInfo: PlayerInfo
  skills: SkillRating[]
  generatedContent: GeneratedContent
  logoFile: File | null
  programName: string
}

const SKILLS = [
  { name: 'Ball Handling', icon: Circle },
  { name: 'Shooting Form', icon: Target },
  { name: 'Defensive Stance', icon: Shield },
  { name: 'Court Awareness', icon: Eye },
  { name: 'Passing Accuracy', icon: MessageSquare },
  { name: 'Rebounding', icon: TrendingUp },
  { name: 'Footwork', icon: Footprints },
  { name: 'Team Communication', icon: Users }
]

const RATING_LABELS = [
  { value: 1, label: 'Needs Improvement', color: 'bg-red-500' },
  { value: 2, label: 'Developing', color: 'bg-orange-500' },
  { value: 3, label: 'Satisfactory', color: 'bg-yellow-500' },
  { value: 4, label: 'Good', color: 'bg-blue-500' },
  { value: 5, label: 'Excellent', color: 'bg-green-500' }
]

export default function AssessmentsPage() {
  const [mounted, setMounted] = useState(false)
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
    playerInfo: {
      name: '',
      age: '',
      team: '',
      assessmentDate: ''
    },
    skills: SKILLS.map(skill => ({ skillName: skill.name, rating: 0 })),
    generatedContent: {
      parentSuggestions: '',
      gameplayAnalysis: '',
      progressSummary: ''
    },
    logoFile: null,
    programName: 'Elite Youth Basketball Development Program'
  })

  const [loading, setLoading] = useState({
    parentSuggestions: false,
    gameplayAnalysis: false,
    progressSummary: false,
    pdf: false,
    email: false
  })

  const [inputPrompts, setInputPrompts] = useState({
    parentSuggestions: '',
    gameplayAnalysis: '',
    progressSummary: ''
  })

  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Validation function
  const isReadyForExport = () => {
    const errors: string[] = []
    
    if (!assessmentData.playerInfo.name.trim()) {
      errors.push('Player name is required')
    }
    
    const completedSkills = assessmentData.skills.filter(skill => skill.rating > 0)
    if (completedSkills.length === 0) {
      errors.push('At least one skill rating is required')
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }

  // Mount check for client-side rendering
  useEffect(() => {
    setMounted(true)
    // Set initial date only on client side
    setAssessmentData(prev => ({
      ...prev,
      playerInfo: {
        ...prev.playerInfo,
        assessmentDate: new Date().toISOString().split('T')[0]
      }
    }))
  }, [])

  // Update functions
  const updatePlayerInfo = (field: keyof PlayerInfo, value: string) => {
    setAssessmentData(prev => ({
      ...prev,
      playerInfo: { ...prev.playerInfo, [field]: value }
    }))
  }

  const updateSkillRating = (skillName: string, rating: number) => {
    setAssessmentData(prev => ({
      ...prev,
      skills: prev.skills.map(skill => 
        skill.skillName === skillName ? { ...skill, rating } : skill
      )
    }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setAssessmentData(prev => ({ ...prev, logoFile: file }))
    }
  }

  // AI Content Generation
  const generateAIContent = async (type: 'parentSuggestions' | 'gameplayAnalysis' | 'progressSummary') => {
    if (!assessmentData.playerInfo.name.trim()) {
      alert("Please enter the player's name before generating AI content.")
      return
    }

    const completedSkills = assessmentData.skills.filter(skill => skill.rating > 0)
    if (completedSkills.length === 0) {
      alert("Please rate at least one skill before generating AI content.")
      return
    }

    setLoading(prev => ({ ...prev, [type]: true }))

    try {
      const response = await fetch('/api/ai/basketball-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          playerInfo: assessmentData.playerInfo,
          skills: assessmentData.skills,
          customPrompt: inputPrompts[type] || ''
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate content')
      }

      const data = await response.json()
      
      setAssessmentData(prev => ({
        ...prev,
        generatedContent: {
          ...prev.generatedContent,
          [type]: data.content
        }
      }))

      alert(`${type.replace(/([A-Z])/g, ' $1').toLowerCase()} has been generated successfully.`)

    } catch (error) {
      console.error('Error generating AI content:', error)
      alert("Failed to generate AI content. Please try again.")
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  // Export functions
  const exportToPDF = async () => {
    if (!isReadyForExport()) {
      alert(`Please complete the following: ${validationErrors.join(', ')}`)
      return
    }

    setLoading(prev => ({ ...prev, pdf: true }))

    try {
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Helper function to truncate text
      const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength - 3) + '...'
      }

      // Color palette inspired by the professional resume
      const colors = {
        primary: [139, 69, 19],      // Brown/Bronze
        accent: [255, 140, 0],       // Orange
        lightGray: [248, 249, 250],  // Light background
        mediumGray: [128, 128, 128], // Medium gray
        darkGray: [64, 64, 64],      // Dark gray
        white: [255, 255, 255],      // White
        green: [46, 125, 50],        // Green for skills
        blue: [25, 118, 210]         // Blue for sections
      }

      // Left sidebar background (like the resume)
      pdf.setFillColor(...colors.lightGray)
      pdf.rect(0, 0, 60, pageHeight, 'F')

      // Main content area background
      pdf.setFillColor(...colors.white)
      pdf.rect(60, 0, pageWidth - 60, pageHeight, 'F')

      // Header section with player name (like resume header)
      pdf.setFillColor(...colors.primary)
      pdf.rect(60, 0, pageWidth - 60, 45, 'F')

      // Player name in header
      pdf.setTextColor(...colors.white)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text(assessmentData.playerInfo.name.toUpperCase(), 70, 25)

      // Subtitle
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Basketball Assessment Report', 70, 35)

      // Left Sidebar Content
      let sidebarY = 20

      // Profile section header
      pdf.setTextColor(...colors.primary)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('PROFILE', 10, sidebarY)
      sidebarY += 15

      // Player details in sidebar
      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')

      const profileText = `${assessmentData.playerInfo.age} years old athlete with strong basketball fundamentals. Currently playing for ${truncateText(assessmentData.playerInfo.team, 25)} in the ${truncateText(assessmentData.programName, 30)} program.`
      const profileLines = pdf.splitTextToSize(profileText, 45)
      profileLines.forEach((line: string, index: number) => {
        pdf.text(line, 10, sidebarY + (index * 4))
      })
      sidebarY += profileLines.length * 4 + 15

      // Contact/Info section
      pdf.setTextColor(...colors.primary)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('DETAILS', 10, sidebarY)
      sidebarY += 15

      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text('AGE', 10, sidebarY)
      pdf.text(assessmentData.playerInfo.age.toString(), 10, sidebarY + 5)
      sidebarY += 20

      pdf.text('TEAM', 10, sidebarY)
      const teamLines = pdf.splitTextToSize(assessmentData.playerInfo.team, 45)
      teamLines.forEach((line: string, index: number) => {
        pdf.text(line, 10, sidebarY + 5 + (index * 4))
      })
      sidebarY += teamLines.length * 4 + 15

      pdf.text('ASSESSMENT DATE', 10, sidebarY)
      pdf.text(assessmentData.playerInfo.assessmentDate, 10, sidebarY + 5)
      sidebarY += 20

      pdf.text('PROGRAM', 10, sidebarY)
      const programLines = pdf.splitTextToSize(assessmentData.programName, 45)
      programLines.forEach((line: string, index: number) => {
        pdf.text(line, 10, sidebarY + 5 + (index * 4))
      })
      sidebarY += programLines.length * 4 + 20

      // Skills visualization (like the circular progress bars in resume)
      const ratedSkills = assessmentData.skills.filter(skill => skill.rating > 0)
      const averageRating = ratedSkills.length > 0
        ? (ratedSkills.reduce((sum, skill) => sum + skill.rating, 0) / ratedSkills.length).toFixed(1)
        : '0.0'

      pdf.setTextColor(...colors.primary)
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('KEY SKILLS', 10, sidebarY)
      sidebarY += 15

      // Overall rating circle (like resume skill circles)
      const centerX = 30
      const centerY = sidebarY + 15
      const radius = 12

      // Background circle
      pdf.setDrawColor(...colors.mediumGray)
      pdf.setLineWidth(2)
      pdf.circle(centerX, centerY, radius, 'S')

      // Progress circle
      const percentage = (parseFloat(averageRating) / 5) * 100
      pdf.setDrawColor(...colors.green)
      pdf.setLineWidth(3)

      // Draw arc for progress (simplified as we can't draw perfect arcs in jsPDF)
      const steps = Math.floor((percentage / 100) * 20)
      for (let i = 0; i < steps; i++) {
        const angle = (i / 20) * 2 * Math.PI - Math.PI / 2
        const x1 = centerX + (radius - 1) * Math.cos(angle)
        const y1 = centerY + (radius - 1) * Math.sin(angle)
        const x2 = centerX + (radius + 1) * Math.cos(angle)
        const y2 = centerY + (radius + 1) * Math.sin(angle)
        pdf.line(x1, y1, x2, y2)
      }

      // Percentage text in center
      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text(`${Math.round(percentage)}%`, centerX, centerY + 2, { align: 'center' })

      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Overall', centerX, centerY + 8, { align: 'center' })

      sidebarY += 35

      // Individual skills as progress bars (like resume additional skills)
      pdf.setTextColor(...colors.primary)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SKILL BREAKDOWN', 10, sidebarY)
      sidebarY += 10

      ratedSkills.slice(0, 6).forEach((skill, index) => {
        const skillY = sidebarY + (index * 15)

        // Skill name
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')
        const skillName = truncateText(skill.skillName, 15)
        pdf.text(skillName, 10, skillY)

        // Progress bar background
        pdf.setFillColor(...colors.mediumGray)
        pdf.rect(10, skillY + 2, 35, 3, 'F')

        // Progress bar fill
        const skillPercentage = (skill.rating / 5) * 35
        pdf.setFillColor(...colors.green)
        pdf.rect(10, skillY + 2, skillPercentage, 3, 'F')

        // Percentage text
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(7)
        pdf.text(`${Math.round((skill.rating / 5) * 100)}%`, 47, skillY + 4)
      })

      // Main content area (right side)
      let mainY = 55

      // Professional Experience section (adapted for basketball assessment)
      pdf.setTextColor(...colors.primary)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('ASSESSMENT RESULTS', 70, mainY)
      mainY += 15

      // Overall performance summary
      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Overall Performance Rating', 70, mainY)
      mainY += 8

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`${assessmentData.programName}`, 70, mainY)
      pdf.text(`Assessment Date: ${assessmentData.playerInfo.assessmentDate}`, 70, mainY + 5)
      mainY += 15

      // Key achievements (bullet points like resume)
      const achievements = [
        `Achieved ${averageRating}/5.0 overall skill rating`,
        `Demonstrated ${ratedSkills.filter(s => s.rating >= 4).length} skills at advanced level`,
        `Shows strong foundation in ${ratedSkills.find(s => s.rating === Math.max(...ratedSkills.map(r => r.rating)))?.skillName || 'multiple areas'}`,
        `Ready for continued development in identified growth areas`
      ]

      achievements.forEach((achievement, index) => {
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(9)
        pdf.text('•', 70, mainY + (index * 6))
        pdf.text(achievement, 75, mainY + (index * 6))
      })
      mainY += achievements.length * 6 + 15

      // AI Insights section (like Education section in resume)
      if (assessmentData.generatedContent.parentSuggestions) {
        pdf.setTextColor(...colors.primary)
        pdf.setFontSize(14)
        pdf.setFont('helvetica', 'bold')
        pdf.text('DEVELOPMENT RECOMMENDATIONS', 70, mainY)
        mainY += 15

        // Parent Suggestions
        pdf.setTextColor(...colors.blue)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Parent Guidance', 70, mainY)
        mainY += 8

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')

        // Extract key points from AI suggestions
        const suggestions = assessmentData.generatedContent.parentSuggestions
        const keyPoints = suggestions.split('###').slice(1, 4).map(section => {
          const title = section.split('\n')[0].replace(/\*\*/g, '').trim()
          return title.substring(0, 60) + (title.length > 60 ? '...' : '')
        })

        keyPoints.forEach((point, index) => {
          pdf.text('•', 70, mainY + (index * 5))
          pdf.text(point, 75, mainY + (index * 5))
        })
        mainY += keyPoints.length * 5 + 10
      }

      // Gameplay Analysis section
      if (assessmentData.generatedContent.gameplayAnalysis) {
        pdf.setTextColor(...colors.blue)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Technical Analysis', 70, mainY)
        mainY += 8

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')

        const analysisLines = pdf.splitTextToSize(
          truncateText(assessmentData.generatedContent.gameplayAnalysis, 200),
          pageWidth - 80
        )
        analysisLines.slice(0, 3).forEach((line: string, index: number) => {
          pdf.text(line, 70, mainY + (index * 4))
        })
        mainY += 15
      }

      // Progress Summary section
      if (assessmentData.generatedContent.progressSummary) {
        pdf.setTextColor(...colors.blue)
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Next Steps', 70, mainY)
        mainY += 8

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8)
        pdf.setFont('helvetica', 'normal')

        const summaryLines = pdf.splitTextToSize(
          truncateText(assessmentData.generatedContent.progressSummary, 200),
          pageWidth - 80
        )
        summaryLines.slice(0, 3).forEach((line: string, index: number) => {
          pdf.text(line, 70, mainY + (index * 4))
        })
      }

      // Footer
      pdf.setTextColor(...colors.mediumGray)
      pdf.setFontSize(7)
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 70, pageHeight - 15)
      pdf.text('Professional Basketball Assessment System', 70, pageHeight - 10)

      // Save the PDF
      const fileName = `${assessmentData.playerInfo.name.replace(/\s+/g, '_')}_Assessment_Report.pdf`
      pdf.save(fileName)

      alert(`Professional assessment report for ${assessmentData.playerInfo.name} has been generated and downloaded successfully!`)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }))
    }
  }

  const generateEmailTemplate = async () => {
    if (!isReadyForExport()) {
      alert(`Please complete the following: ${validationErrors.join(', ')}`)
      return
    }

    setLoading(prev => ({ ...prev, email: true }))

    try {
      const ratedSkills = assessmentData.skills.filter(skill => skill.rating > 0)
      const averageRating = ratedSkills.length > 0
        ? (ratedSkills.reduce((sum, skill) => sum + skill.rating, 0) / ratedSkills.length).toFixed(1)
        : '0.0'

      const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basketball Assessment Report - ${assessmentData.playerInfo.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .header {
            background: linear-gradient(135deg, #ff8c00, #ff6b35);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h2 {
            color: #ff8c00;
            border-bottom: 2px solid #ff8c00;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .player-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .info-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .info-label {
            font-weight: bold;
            color: #495057;
        }
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .skill-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #ff8c00;
        }
        .skill-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .skill-rating {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stars {
            color: #ffc107;
        }
        .rating-text {
            font-size: 14px;
            color: #6c757d;
        }
        .average-rating {
            background: linear-gradient(135deg, #ff8c00, #ff6b35);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .average-rating h3 {
            margin: 0;
            font-size: 24px;
        }
        .generated-content {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #28a745;
            margin: 15px 0;
        }
        .footer {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 30px;
            padding: 20px;
            background: white;
            border-radius: 10px;
        }
        .basketball-emoji {
            font-size: 24px;
            margin: 0 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1><span class="basketball-emoji">🏀</span>Basketball Assessment Report<span class="basketball-emoji">🏀</span></h1>
        <p>Professional Player Evaluation & Development System</p>
    </div>

    <div class="content">
        <div class="section">
            <h2>Program Information</h2>
            <div class="player-info">
                <div class="info-item">
                    <span class="info-label">Program:</span>
                    <span>${assessmentData.programName}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Assessment Date:</span>
                    <span>${assessmentData.playerInfo.assessmentDate}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Player Information</h2>
            <div class="player-info">
                <div class="info-item">
                    <span class="info-label">Name:</span>
                    <span>${assessmentData.playerInfo.name}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span>
                    <span>${assessmentData.playerInfo.age}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Team:</span>
                    <span>${assessmentData.playerInfo.team}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Skills Assessment</h2>
            <div class="average-rating">
                <h3>Overall Average: ${averageRating}/5.0</h3>
                <p>Based on ${ratedSkills.length} assessed skills</p>
            </div>

            <div class="skills-grid">
                ${ratedSkills.map(skill => {
                  const ratingText = skill.rating === 5 ? 'Excellent' :
                                    skill.rating === 4 ? 'Good' :
                                    skill.rating === 3 ? 'Satisfactory' :
                                    skill.rating === 2 ? 'Developing' : 'Needs Improvement'
                  const stars = '★'.repeat(skill.rating) + '☆'.repeat(5 - skill.rating)
                  return `
                    <div class="skill-item">
                        <div class="skill-name">${skill.skillName}</div>
                        <div class="skill-rating">
                            <span class="stars">${stars}</span>
                            <span class="rating-text">${skill.rating}/5 - ${ratingText}</span>
                        </div>
                    </div>
                  `
                }).join('')}
            </div>
        </div>

        ${assessmentData.generatedContent.parentSuggestions ? `
        <div class="section">
            <h2>Parent Suggestions</h2>
            <div class="generated-content">
                ${assessmentData.generatedContent.parentSuggestions.replace(/\n/g, '<br>')}
            </div>
        </div>
        ` : ''}

        ${assessmentData.generatedContent.gameplayAnalysis ? `
        <div class="section">
            <h2>Gameplay Analysis</h2>
            <div class="generated-content">
                ${assessmentData.generatedContent.gameplayAnalysis.replace(/\n/g, '<br>')}
            </div>
        </div>
        ` : ''}

        ${assessmentData.generatedContent.progressSummary ? `
        <div class="section">
            <h2>Progress Summary</h2>
            <div class="generated-content">
                ${assessmentData.generatedContent.progressSummary.replace(/\n/g, '<br>')}
            </div>
        </div>
        ` : ''}
    </div>

    <div class="footer">
        <p>Generated on ${new Date().toLocaleDateString()} by ${assessmentData.programName}</p>
        <p>This assessment is designed to help track player development and provide actionable insights for improvement.</p>
    </div>
</body>
</html>`

      // Create a downloadable HTML file
      const blob = new Blob([emailTemplate], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${assessmentData.playerInfo.name.replace(/\s+/g, '_')}_Email_Template.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Also copy to clipboard for easy pasting
      try {
        await navigator.clipboard.writeText(emailTemplate)
        alert(`Email template for ${assessmentData.playerInfo.name} has been downloaded as HTML file and copied to clipboard!`)
      } catch (clipboardError) {
        alert(`Email template for ${assessmentData.playerInfo.name} has been downloaded as HTML file!`)
      }
    } catch (error) {
      console.error('Error generating email template:', error)
      alert("Failed to generate email template. Please try again.")
    } finally {
      setLoading(prev => ({ ...prev, email: false }))
    }
  }

  // Clear all data with confirmation
  const clearAllData = () => {
    if (confirm('Are you sure you want to clear all assessment data? This action cannot be undone.')) {
      setAssessmentData({
        playerInfo: {
          name: '',
          age: '',
          team: '',
          assessmentDate: new Date().toISOString().split('T')[0]
        },
        skills: SKILLS.map(skill => ({ skillName: skill.name, rating: 0 })),
        generatedContent: {
          parentSuggestions: '',
          gameplayAnalysis: '',
          progressSummary: ''
        },
        logoFile: null,
        programName: 'Elite Youth Basketball Development Program'
      })
      setInputPrompts({
        parentSuggestions: '',
        gameplayAnalysis: '',
        progressSummary: ''
      })
      alert("All assessment data has been cleared.")
    }
  }

  if (!mounted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Circle className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
            <p className="text-gray-600">Loading Assessment System...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Section with Background Watermark */}
        <div className="relative bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 text-white p-8 rounded-xl shadow-2xl overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4">
              <Circle className="h-16 w-16 rotate-12" />
            </div>
            <div className="absolute top-8 right-8">
              <Target className="h-12 w-12 -rotate-12" />
            </div>
            <div className="absolute bottom-4 left-1/3">
              <Star className="h-8 w-8 rotate-45" />
            </div>
            <div className="absolute bottom-8 right-1/4">
              <Trophy className="h-10 w-10 -rotate-12" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
                <FileText className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2 tracking-tight">Basketball Assessment Report</h1>
                <p className="text-orange-100 text-lg">Professional player evaluation & development system</p>
                <div className="flex items-center mt-2 space-x-4">
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Brain className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                    <Star className="h-3 w-3 mr-1" />
                    Professional Grade
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Logo and Program Name Section */}
        <Card className="shadow-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Upload className="h-5 w-5 mr-2" />
              Program Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="logo-upload">Program Logo</Label>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="mt-1"
                />
                {assessmentData.logoFile && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {assessmentData.logoFile.name} uploaded
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="program-name">Program Name</Label>
                <Input
                  id="program-name"
                  value={assessmentData.programName}
                  onChange={(e) => setAssessmentData(prev => ({ ...prev, programName: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Player Information Card */}
        <Card className="shadow-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <User className="h-5 w-5 mr-2" />
              Player Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="player-name">Player Name *</Label>
                <Input
                  id="player-name"
                  value={assessmentData.playerInfo.name}
                  onChange={(e) => updatePlayerInfo('name', e.target.value)}
                  placeholder="Enter player name"
                  className="mt-1"
                  required
                />
                {validationErrors.includes("Player name is required") && (
                  <p className="text-sm text-red-600 mt-1">
                    Player name is required
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="player-age">Age</Label>
                <Input
                  id="player-age"
                  value={assessmentData.playerInfo.age}
                  onChange={(e) => updatePlayerInfo('age', e.target.value)}
                  placeholder="Enter age"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="player-team">Team</Label>
                <Input
                  id="player-team"
                  value={assessmentData.playerInfo.team}
                  onChange={(e) => updatePlayerInfo('team', e.target.value)}
                  placeholder="Enter team name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="assessment-date">Assessment Date</Label>
                <Input
                  id="assessment-date"
                  type="date"
                  value={assessmentData.playerInfo.assessmentDate}
                  onChange={(e) => updatePlayerInfo('assessmentDate', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skills Assessment Section */}
        <Card className="shadow-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Circle className="h-5 w-5 mr-2" />
              Skills Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-6">
              Rate each skill on a scale from 1 (Needs Improvement) to 5 (Excellent). Click on the rating level for each skill.
            </p>

            {/* Rating Legend */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3">Rating Scale:</h4>
              <div className="flex flex-wrap gap-3">
                {RATING_LABELS.map((rating) => (
                  <div key={rating.value} className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${rating.color}`}></div>
                    <span className="text-sm font-medium">{rating.value}</span>
                    <span className="text-sm text-gray-600">{rating.label}</span>
                    {rating.value === 5 && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills Grid */}
            <div className="space-y-4">
              {SKILLS.map((skill) => {
                const Icon = skill.icon
                const currentRating = assessmentData.skills.find(s => s.skillName === skill.name)?.rating || 0

                return (
                  <div key={skill.name} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <Icon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900">{skill.name}</h4>
                          <div className="flex items-center mt-1">
                            {currentRating > 0 && (
                              <Badge
                                className={`${RATING_LABELS[currentRating - 1].color} text-white text-xs`}
                              >
                                {RATING_LABELS[currentRating - 1].label}
                                {currentRating === 5 && <Star className="h-3 w-3 ml-1 fill-current" />}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rating Buttons */}
                      <div className="flex items-center space-x-2 ml-4">
                        {RATING_LABELS.map((rating) => (
                          <button
                            key={rating.value}
                            onClick={() => updateSkillRating(skill.name, rating.value)}
                            className={`
                              w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                              transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                              ${currentRating === rating.value
                                ? `${rating.color} text-white border-transparent shadow-lg`
                                : `border-gray-300 text-gray-400 hover:border-orange-300 hover:text-orange-600`
                              }
                            `}
                            title={`${rating.value} - ${rating.label}`}
                          >
                            {rating.value}
                            {rating.value === 5 && currentRating === 5 && (
                              <Star className="h-3 w-3 ml-0.5 fill-current" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            currentRating > 0 ? RATING_LABELS[currentRating - 1].color : 'bg-gray-200'
                          }`}
                          style={{ width: `${(currentRating / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Content Generation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parent Suggestions */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <MessageSquare className="h-5 w-5 mr-2" />
                Parent Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="parent-prompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="parent-prompt"
                  value={inputPrompts.parentSuggestions}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, parentSuggestions: e.target.value }))}
                  placeholder="Add specific instructions for parent suggestions..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => generateAIContent('parentSuggestions')}
                disabled={loading.parentSuggestions}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading.parentSuggestions ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Suggestions
                  </>
                )}
              </Button>
              {assessmentData.generatedContent.parentSuggestions && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Generated Content:</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {assessmentData.generatedContent.parentSuggestions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gameplay Analysis */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Eye className="h-5 w-5 mr-2" />
                Gameplay Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gameplay-prompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="gameplay-prompt"
                  value={inputPrompts.gameplayAnalysis}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, gameplayAnalysis: e.target.value }))}
                  placeholder="Add specific instructions for gameplay analysis..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => generateAIContent('gameplayAnalysis')}
                disabled={loading.gameplayAnalysis}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading.gameplayAnalysis ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Analysis
                  </>
                )}
              </Button>
              {assessmentData.generatedContent.gameplayAnalysis && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Generated Content:</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {assessmentData.generatedContent.gameplayAnalysis}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Summary */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <TrendingUp className="h-5 w-5 mr-2" />
                Progress Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="progress-prompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="progress-prompt"
                  value={inputPrompts.progressSummary}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, progressSummary: e.target.value }))}
                  placeholder="Add specific instructions for progress summary..."
                  className="mt-1 min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => generateAIContent('progressSummary')}
                disabled={loading.progressSummary}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading.progressSummary ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Summary
                  </>
                )}
              </Button>
              {assessmentData.generatedContent.progressSummary && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Generated Content:</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {assessmentData.generatedContent.progressSummary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Export and Actions Section */}
        <Card className="shadow-md border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-700">
              <Download className="h-5 w-5 mr-2" />
              Export & Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={exportToPDF}
                disabled={loading.pdf}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading.pdf ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Export PDF
                  </>
                )}
              </Button>

              <Button
                onClick={generateEmailTemplate}
                disabled={loading.email}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading.email ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Email Template
                  </>
                )}
              </Button>

              <Button
                onClick={clearAllData}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </Button>

              <div className="flex items-center justify-center">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  System Ready
                </Badge>
              </div>
            </div>

            {/* Validation Status */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <h4 className="font-medium text-red-800">Complete Required Fields</h4>
                </div>
                <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
