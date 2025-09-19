'use client'
// Preview build trigger: no functional change


import React, { useState, useEffect } from 'react'
import { AppLayout } from '../components/app-layout'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { Textarea } from '../components/ui/textarea'
import { Label } from '../components/ui/label'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select'

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
  { value: 2, label: 'Developing', color: 'bg-red-400' },
  { value: 3, label: 'Satisfactory', color: 'bg-gray-500' },
  { value: 4, label: 'Good', color: 'bg-gray-700' },
  { value: 5, label: 'Excellent', color: 'bg-red-600' }
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
    auto: false,
    pdf: false,
    email: false,
    sendEmail: false,
  })

  const [parentEmail, setParentEmail] = useState<string>('')
  const [lastPdfBase64, setLastPdfBase64] = useState<string | null>(null)

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
        assessmentDate: new Date().toISOString().split('T')[0],
      },
    }))
  }, [])

  type PlayerOption = { _id: string; name: string; parentId: any; parentEmail?: string; team?: string; age?: string }
  const [players, setPlayers] = useState<PlayerOption[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [selectedParentId, setSelectedParentId] = useState<string>('')

  useEffect(() => {
    // Fetch players for dropdown
    ;(async () => {
      try {
        const res = await fetch('/api/players')
        const data = await res.json()
        if (data?.players) setPlayers(data.players)
      } catch (e) {
        console.warn('Failed to load players', e)
      }
    })()
  }, [])

  const onSelectPlayer = (id: string) => {
    setSelectedPlayerId(id)
    const p = players.find(pl => String(pl._id) === String(id))
    if (p) {
      setSelectedParentId(String(p.parentId))
      updatePlayerInfo('name', p.name || '')
      if (p.team) updatePlayerInfo('team', p.team)
      if (p.age) updatePlayerInfo('age', p.age)
      if (p.parentEmail) setParentEmail(p.parentEmail)
    }
  }

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
  const generateAllSections = async () => {
    if (!assessmentData.playerInfo.name) {
      alert('Please select a player first.')
      return
    }
    setLoading(prev => ({ ...prev, auto: true }))
    try {
      const res = await fetch('/api/ai/basketball-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auto',
          playerInfo: assessmentData.playerInfo,
          skills: assessmentData.skills,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to generate')
      setAssessmentData(prev => ({
        ...prev,
        generatedContent: {
          ...prev.generatedContent,
          parentSuggestions: data.parentSuggestions || prev.generatedContent.parentSuggestions,
          gameplayAnalysis: data.gameplayAnalysis || prev.generatedContent.gameplayAnalysis,
          progressSummary: data.progressSummary || prev.generatedContent.progressSummary,
        },
      }))
    } catch (e: any) {
      console.error('AI auto generation failed:', e)
      alert(e?.message || 'Failed to generate all sections')
    } finally {
      setLoading(prev => ({ ...prev, auto: false }))
    }
  }


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
  const generateAllSections = async () => {
    if (!assessmentData.playerInfo.name) {
      alert('Please select a player first.')
      return
    }
    setLoading(prev => ({ ...prev, auto: true }))
    try {
      const res = await fetch('/api/ai/basketball-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'auto',
          playerInfo: assessmentData.playerInfo,
          skills: assessmentData.skills,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to generate')
      setAssessmentData(prev => ({
        ...prev,
        generatedContent: {
          ...prev.generatedContent,
          parentSuggestions: data.parentSuggestions || prev.generatedContent.parentSuggestions,
          gameplayAnalysis: data.gameplayAnalysis || prev.generatedContent.gameplayAnalysis,
          progressSummary: data.progressSummary || prev.generatedContent.progressSummary,
        },
      }))
    } catch (e: any) {
      console.error('AI auto generation failed:', e)
      alert(e?.message || 'Failed to generate all sections')
    } finally {
      setLoading(prev => ({ ...prev, auto: false }))
    }
  }

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

      // Optimized margins for maximum space utilization
      const leftMargin = 3   // Reduced margins
      const topMargin = 3    // Reduced margins
      const rightMargin = 3  // Reduced margins
      const bottomMargin = 3 // Reduced margins

      // Helper function to truncate text
      const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text
        return text.substring(0, maxLength - 3) + '...'
      }

      // Color palette - Red, Black, Grey, White theme
      const colors = {
        primary: [220, 20, 60],      // Crimson Red
        accent: [255, 0, 0],         // Bright Red
        black: [0, 0, 0],            // Black
        lightGray: [248, 249, 250],  // Light background
        mediumGray: [128, 128, 128], // Medium gray
        darkGray: [64, 64, 64],      // Dark gray
        white: [255, 255, 255],      // White
        skillRed: [220, 20, 60],     // Red for skills
        sectionRed: [139, 0, 0]      // Dark red for sections
      }

      // Helpers for images and fonts
      const pxToMm = (px: number) => px * 0.264583

      const loadImageDims = (dataUrl: string) =>
        new Promise<{ width: number; height: number }>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
          img.onerror = reject
          img.src = dataUrl
        })

      const ensurePngDataUrl = async (dataUrl: string) => {
        if (!dataUrl) return dataUrl
        if (dataUrl.startsWith('data:image/png') || dataUrl.startsWith('data:image/jpeg')) return dataUrl

        // Convert SVG or other formats to PNG for jsPDF compatibility
        if (dataUrl.startsWith('data:image/svg')) {
          try {
            const { width, height } = await loadImageDims(dataUrl)
            const canvas = document.createElement('canvas')
            canvas.width = Math.max(1, width)
            canvas.height = Math.max(1, height)
            const ctx = canvas.getContext('2d')!
            const img = new Image()
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve()
              img.onerror = reject
              img.src = dataUrl
            })
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            return canvas.toDataURL('image/png')
          } catch (e) {
            console.log('Failed to convert SVG logo to PNG, proceeding without logo conversion')
          }
        }
        return dataUrl
      }

      // Attempt to load custom fonts (Audiowide for headers, Saira for body)
      let headerFontFamily = 'helvetica'
      let bodyFontFamily = 'helvetica'
      const tryLoadFonts = async () => {
        // Prefer local fonts in public/fonts, fall back to same-origin proxy
        const fetchAsBase64 = async (url: string) => {

          const res = await fetch(url)
          if (!res.ok) throw new Error(`Font fetch failed: ${url} (HTTP ${res.status})`)
          const buf = await res.arrayBuffer()
          const u8 = new Uint8Array(buf)

          const CHUNK = 0x8000
          let binary = ''
          for (let i = 0; i < u8.length; i += CHUNK) {
            binary += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK) as any)
          }
          const b64 = btoa(binary)

          return b64
        }
        const loadFontWithFallback = async (localPath: string, remoteUrl: string) => {
          try {
            return await fetchAsBase64(localPath)
          } catch {
            return await fetchAsBase64(remoteUrl)
          }
        }

        let loadedHeader = false
        let loadedBody = false

        // Audiowide Regular (Headings)
        try {
          const aw = await loadFontWithFallback(
            '/fonts/Audiowide-Regular.ttf',
            '/api/font/audiowide-regular'
          )
          pdf.addFileToVFS('Audiowide-Regular.ttf', aw)
          pdf.addFont('Audiowide-Regular.ttf', 'Audiowide', 'normal')
          headerFontFamily = 'Audiowide'
          loadedHeader = true
        } catch (e) {
          console.warn('Audiowide font unavailable; headings will use Helvetica')
        }

        // Saira Regular (Body)
        try {
          let sr
          try {
            sr = await fetchAsBase64('/fonts/converted/SairaCondensed-Regular.ttf')
          } catch {
            try {
              sr = await fetchAsBase64('/fonts/SairaCondensed-Regular.ttf')
            } catch {
              sr = await fetchAsBase64('/api/font/saira-regular')
            }
          }

          pdf.addFileToVFS('SairaCondensed-Regular.ttf', sr)

          pdf.addFont('SairaCondensed-Regular.ttf', 'SairaCondensed', 'normal')

          bodyFontFamily = 'SairaCondensed'
          loadedBody = true
        } catch (e) {
          console.warn('Saira Regular unavailable; body will use Helvetica', e)
        }

        // Saira Bold (optional)
        try {
          let sb
          try {
            sb = await fetchAsBase64('/fonts/converted/SairaCondensed-Bold.ttf')
          } catch {
            try {
              sb = await fetchAsBase64('/fonts/SairaCondensed-Bold.ttf')
            } catch {
              sb = await fetchAsBase64('/api/font/saira-bold')
            }
          }

          pdf.addFileToVFS('SairaCondensed-Bold.ttf', sb)

          pdf.addFont('SairaCondensed-Bold.ttf', 'SairaCondensed', 'bold')

        } catch (e) {
          console.warn('Saira Bold unavailable; bold text will simulate weight', e)
        }

        if (!loadedHeader && !loadedBody) {

        }
      }

      await tryLoadFonts()




      // Convert logo file to data URL if available
      let logoDataUrl: string | null = null
      if (assessmentData.logoFile) {
        try {
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsDataURL(assessmentData.logoFile!)
          })
        } catch (error) {
          console.log('Could not convert logo to data URL:', error)

        }
      }


      const logoPng = logoDataUrl ? await ensurePngDataUrl(logoDataUrl) : null

      // Defer drawing the background watermark until after backgrounds/header are painted
      // (we want it visible behind main content only). We'll add it later.

      // Helper: standardized heading (Audiowide) for H1–H4
      const pdfHeading = (
        level: 1 | 2 | 3 | 4,
        text: string,
        x: number,
        y: number,
        color?: [number, number, number]
      ) => {
        if (color) pdf.setTextColor(...color)
        const size = level === 1 ? 28 : level === 2 ? 18 : level === 3 ? 12 : 12
        pdf.setFont(headerFontFamily, 'normal')
        pdf.setFontSize(size)
        pdf.text(text, x, y)
      }



      // Left sidebar background (like the resume) - with reduced margins
      pdf.setFillColor(...colors.lightGray)
      pdf.rect(leftMargin, topMargin, 55, pageHeight - topMargin - bottomMargin, 'F')

      // Main content area background - with reduced margins
      pdf.setFillColor(...colors.white)
      pdf.rect(55 + leftMargin, topMargin, pageWidth - 55 - leftMargin - rightMargin, pageHeight - topMargin - bottomMargin, 'F')

      // Add top-left logo sized to fill the left header area (full-size like screenshot)
      let logoBottom: number | null = null
      if (logoPng) {

        try {
          const dims = await loadImageDims(logoPng)
          const natWmm = pxToMm(dims.width)
          const natHmm = pxToMm(dims.height)
          const sidebarWidth = 55
          const headerH = 40
          const padding = 3
          const boxW = sidebarWidth - padding * 2
          const boxH = headerH - padding * 2
          const scale = Math.min(boxW / Math.max(1, natWmm), boxH / Math.max(1, natHmm))
          const drawW = natWmm * scale
          const drawH = natHmm * scale
          const drawX = leftMargin + padding + (boxW - drawW) / 2
          const drawY = topMargin + padding + (boxH - drawH) / 2
          pdf.addImage(logoPng, 'PNG', drawX, drawY, drawW, drawH)
          logoBottom = drawY + drawH
        } catch (error) {
          console.log('Top left logo could not be added:', error)
        }
      }

      // Header section with player name (like resume header) - optimized positioning
      const headerHeight = 40 // Reduced header height for more content space
      pdf.setFillColor(...colors.black)
      pdf.rect(55 + leftMargin, topMargin, pageWidth - 55 - leftMargin - rightMargin, headerHeight, 'F')

      // Player name in header - Audiowide-style bold font
      pdf.setTextColor(...colors.white)
      pdf.setFontSize(28) // Larger for Audiowide effect
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text(assessmentData.playerInfo.name.toUpperCase(), 60 + leftMargin, topMargin + 20)

      // Subtitle - Audiowide-style bold font
      pdf.setFontSize(16) // Larger for Audiowide effect
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text('BASKETBALL ASSESSMENT REPORT', 60 + leftMargin, topMargin + 32)

      // Left Sidebar Content - optimized positioning
      let sidebarY = (logoBottom ?? (topMargin + 12)) + 6 // start just below the rendered logo

      // Draw a large faded background logo inside the main content area (based on uploaded logo)
      if (logoPng) {
        try {
          const sidebarWidth = 55
          const headerH = 40
          const contentX =  leftMargin + sidebarWidth
          const contentY =  topMargin + headerH
          const contentW =  pageWidth - sidebarWidth - leftMargin - rightMargin
          const contentH =  pageHeight - headerH - topMargin - bottomMargin
          const size = Math.min(contentW, contentH) * 0.95
          const drawX = contentX + (contentW - size) / 2
          const drawY = contentY + (contentH - size) / 2
          pdf.setGState(pdf.GState({ opacity: 0.10 })) // ~10% opacity
          pdf.addImage(logoPng, 'PNG', drawX, drawY, size, size)
          pdf.setGState(pdf.GState({ opacity: 1.0 }))
        } catch (error) {
          console.log('Watermark logo (main area) could not be added:', error)
        }
      }

      // Removed PROFILE and DETAILS sections per request. Start skills immediately to use vertical space.

      // Skills visualization (like the circular progress bars in resume)
      const ratedSkills = assessmentData.skills.filter(skill => skill.rating > 0)
      const averageRating = ratedSkills.length > 0
        ? (ratedSkills.reduce((sum, skill) => sum + skill.rating, 0) / ratedSkills.length).toFixed(1)
        : '0.0'

      pdf.setTextColor(...colors.black)
      pdf.setFontSize(12)
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text('KEY SKILLS', leftMargin + 5, sidebarY)
      sidebarY += 8 // Reduced spacing for full page utilization

      // Overall rating circle (like resume skill circles) - Compact version
      // Enhanced overall performance donut
      const centerX = leftMargin + 27
      const centerY = sidebarY + 22
      const radius = 18

      // Base ring
      pdf.setDrawColor(...colors.mediumGray)
      pdf.setLineWidth(3.2)
      if ((pdf as any).setLineCap) { (pdf as any).setLineCap('round') }
      pdf.circle(centerX, centerY, radius, 'S')

      // Progress arc (smooth, rounded)
      const computedPercentage = (parseFloat(averageRating) / 5) * 100
      const percentage = computedPercentage
      pdf.setDrawColor(...colors.primary)
      pdf.setLineWidth(3.2)
      const totalSteps = 120
      const usedSteps = Math.max(1, Math.floor((percentage / 100) * totalSteps))
      for (let i = 0; i < usedSteps; i++) {
        const angle1 = -Math.PI / 2 + (i / totalSteps) * 2 * Math.PI
        const angle2 = angle1 + (2 * Math.PI) / totalSteps * 0.9
        const x1 = centerX + radius * Math.cos(angle1)
        const y1 = centerY + radius * Math.sin(angle1)
        const x2 = centerX + radius * Math.cos(angle2)
        const y2 = centerY + radius * Math.sin(angle2)
        pdf.line(x1, y1, x2, y2)
      }

      // Center percentage with dynamic sizing (target ~50pt) and vertical centering
      pdf.setTextColor(...colors.darkGray)
      pdf.setFont(bodyFontFamily, 'bold')
      let targetSize = 50
      const percentText = `${Math.round(percentage)}%`
      const maxInnerWidth = (radius * 2) - 4
      let useSize = targetSize
      if ((pdf as any).getTextWidth) {
        pdf.setFontSize(useSize)
        const width = (pdf as any).getTextWidth(percentText)
        if (width > maxInnerWidth) {
          useSize = Math.max(12, Math.floor(targetSize * (maxInnerWidth / width)))
        }
      }
      pdf.setFontSize(useSize)
      // Try true vertical centering if supported; fallback to tuned offset
      const textOpts: any = { align: 'center', baseline: 'middle' }
      try { pdf.text(percentText, centerX, centerY, textOpts) }
      catch { pdf.text(percentText, centerX, centerY + useSize * 0.35, { align: 'center' } as any) }
      // Bigger "Overall" label below the number, kept INSIDE the donut
      const labelSize = 12
      pdf.setFontSize(labelSize)
      pdf.setFont(bodyFontFamily, 'normal')
      const maxLabelY = centerY + (radius - 5) // keep inside inner circle
      const preferredLabelY = centerY + useSize * 0.38
      const labelY = Math.min(maxLabelY, preferredLabelY)
      pdf.text('Overall', centerX, labelY, { align: 'center' })

      // Advance sidebar Y to just below the donut
      sidebarY = centerY + radius + 16

      sidebarY += 0 // Spacing already handled by donut block above

      // DETAILS (restored minimal subset)
      pdf.setTextColor(...colors.black)
      pdf.setFontSize(12)
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text('DETAILS', leftMargin + 5, sidebarY)
      sidebarY += 8

      pdf.setTextColor(...colors.darkGray)
      pdf.setFontSize(8)
      pdf.setFont(bodyFontFamily, 'normal')
      pdf.text('Age: 7', leftMargin + 5, sidebarY)
      sidebarY += 5
      pdf.text('Team: RA1', leftMargin + 5, sidebarY)
      sidebarY += 5
      pdf.text('Assessment Date: 2025-09-19', leftMargin + 5, sidebarY)
      sidebarY += 5
      const programDetailLines = pdf.splitTextToSize('Program: Elite Youth Basketball Development', 45)
      programDetailLines.forEach((line: string, index: number) => {
        pdf.text(line, leftMargin + 5, sidebarY + (index * 3))
      })
      sidebarY += (programDetailLines.length * 3) + 12

      // Individual skills as progress bars - Compact version for all 8 skills
      pdf.setTextColor(...colors.black)
      pdf.setFontSize(9)
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text('SKILL BREAKDOWN', leftMargin + 5, sidebarY)
      sidebarY += 10 // Clear separation before skills list

      // Show requested skills (display label vs lookup key) and evenly distribute
      const skillsList = [
        { display: 'FOOTWORK', key: 'Footwork' },
        { display: 'FINISHING', key: 'Finishing' },
        { display: 'BALL HANDLING', key: 'Ball Handling' },
        { display: 'SHOOTING FORM', key: 'Shooting Form' },
        { display: 'COURT AWARNESS', key: 'Court Awareness' },
        { display: 'COMMUNICATION', key: 'Team Communication' },
        { display: 'DEFENSE', key: 'Defensive Stance' },
        { display: 'PASSING', key: 'Passing Accuracy' },
      ]

      // Evenly distribute all 8 skills to fill the available vertical space
      const NAME_TO_BAR = 4
      const BAR_HEIGHT = 1.8
      const BAR_TO_LABEL = 4.5
      const availableHeight = (pageHeight - bottomMargin) - sidebarY - 8
      const rowH = availableHeight / skillsList.length

      skillsList.forEach(({ display, key }, index) => {
        const rowTop = sidebarY + (index * rowH)
        const skill = assessmentData.skills.find(s => s.skillName === key)
        const rating = skill ? skill.rating : 0

        // Skill name (uppercased, larger, bold) with percentage appended
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(10)
        pdf.setFont(bodyFontFamily, 'bold')
        const percent = Math.round((rating / 5) * 100)
        const title = `${display} - ${percent}%`
        const nameLines = (pdf as any).splitTextToSize ? (pdf as any).splitTextToSize(title, 45) : [title]
        pdf.text(nameLines as any, leftMargin + 5, rowTop)

        // Progress bar below title
        const lineCount = Array.isArray(nameLines) ? nameLines.length : 1
        const barY = rowTop + NAME_TO_BAR + (lineCount - 1) * 3
        pdf.setFillColor(...colors.mediumGray)
        pdf.rect(leftMargin + 5, barY, 28, BAR_HEIGHT, 'F')

        // Progress fill
        const skillPercentage = (rating / 5) * 28
        pdf.setFillColor(...colors.primary)
        pdf.rect(leftMargin + 5, barY, skillPercentage, BAR_HEIGHT, 'F')

        // Left-aligned rating label under the bar (balanced spacing)
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(7)
        const ratingLabel = rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Satisfactory' : rating === 2 ? 'Developing' : rating === 1 ? 'Needs Improvement' : 'Not Rated'
        const labelY = barY + BAR_TO_LABEL
        pdf.text(ratingLabel, leftMargin + 5, labelY)
      })

      // Main content area (right side) - optimized positioning
      let mainY = topMargin + headerHeight + 8 // Start after header with minimal spacing

      // Professional Experience section (adapted for basketball assessment) - Audiowide-style header
      pdf.setTextColor(...colors.black)
      pdf.setFontSize(18) // Larger for Audiowide effect and full page utilization
      pdf.setFont(headerFontFamily, 'normal')
      pdf.text('ASSESSMENT RESULTS', 60 + leftMargin, mainY)
      mainY += 15 // Optimized spacing for full page utilization

      // Overall performance summary - use Audiowide heading (H3)
      pdfHeading(3, 'OVERALL PERFORMANCE RATING', 60 + leftMargin, mainY, colors.darkGray)
      mainY += 6 // Reduced spacing

      pdf.setFontSize(8) // Smaller for space optimization
      pdf.setFont(bodyFontFamily, 'normal') // Saira-style body text
      pdf.text(`${assessmentData.programName}`, 60 + leftMargin, mainY)
      pdf.text(`Assessment Date: ${assessmentData.playerInfo.assessmentDate}`, 60 + leftMargin, mainY + 4)
      mainY += 10 // Reduced spacing to save room for AI content

      // Key achievements (bullet points like resume) - optimized spacing
      const achievements = [
        `Achieved ${averageRating}/5.0 overall skill rating`,
        `Demonstrated ${ratedSkills.filter(s => s.rating >= 4).length} skills at advanced level`,
        `Shows strong foundation in ${ratedSkills.find(s => s.rating === Math.max(...ratedSkills.map(r => r.rating)))?.skillName || 'multiple areas'}`,
        `Ready for continued development in identified growth areas`
      ]

      achievements.forEach((achievement, index) => {
        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8) // Smaller for space optimization
        pdf.text('•', 60 + leftMargin, mainY + (index * 4)) // Reduced spacing
        pdf.text(achievement, 65 + leftMargin, mainY + (index * 4))
      })
      mainY += achievements.length * 4 + 10 // Reduced spacing

      // AI Insights section (like Education section in resume) - Expanded for better content display
      if (assessmentData.generatedContent.parentSuggestions) {
        pdf.setTextColor(...colors.black)
        pdf.setFontSize(18) // Larger Audiowide-style header for full page utilization
        pdf.setFont(headerFontFamily, 'normal')
        pdf.text('DEVELOPMENT RECOMMENDATIONS', 60 + leftMargin, mainY)
        mainY += 15 // Optimized spacing for full page utilization

        // Parent Suggestions - Expanded section
        pdf.setTextColor(...colors.primary)
        pdf.setFontSize(12) // Larger section header
        pdf.setFont(headerFontFamily, 'normal')
        pdf.text('PARENT GUIDANCE', 60 + leftMargin, mainY)
        mainY += 10 // Optimized spacing

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8) // Saira-style body text optimized for space
        pdf.setFont(bodyFontFamily, 'normal')

        // Display full optimized AI suggestions - Expanded format with full page utilization
        const suggestionLines = pdf.splitTextToSize(
          assessmentData.generatedContent.parentSuggestions, // Use full optimized content
          pageWidth - 65 - leftMargin - rightMargin // Utilize full available width
        )
        suggestionLines.slice(0, 10).forEach((line: string, index: number) => { // More lines for full utilization
          pdf.text(line, 60 + leftMargin, mainY + (index * 4)) // Optimized line spacing
        })
        mainY += suggestionLines.slice(0, 10).length * 4 + 10 // Dynamic spacing optimized for space
      }

      // Gameplay Analysis section - Expanded with full page utilization
      if (assessmentData.generatedContent.gameplayAnalysis) {
        pdf.setTextColor(...colors.primary)
        pdf.setFontSize(12) // Larger section header
        pdf.setFont(headerFontFamily, 'normal')
        pdf.text('TECHNICAL ANALYSIS', 60 + leftMargin, mainY)
        mainY += 10 // Optimized spacing

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8) // Saira-style body text optimized for space
        pdf.setFont(bodyFontFamily, 'normal')

        const analysisLines = pdf.splitTextToSize(
          assessmentData.generatedContent.gameplayAnalysis, // Use full optimized content
          pageWidth - 65 - leftMargin - rightMargin // Utilize full available width
        )
        analysisLines.slice(0, 8).forEach((line: string, index: number) => { // More lines for full utilization
          pdf.text(line, 60 + leftMargin, mainY + (index * 4)) // Optimized line spacing
        })
        mainY += analysisLines.slice(0, 8).length * 4 + 10 // Dynamic spacing optimized for space
      }

      // Progress Summary section - Expanded with full page utilization
      if (assessmentData.generatedContent.progressSummary) {
        pdf.setTextColor(...colors.primary)
        pdf.setFontSize(12) // Larger section header
        pdf.setFont(headerFontFamily, 'normal')
        pdf.text('NEXT STEP', 60 + leftMargin, mainY)
        mainY += 10 // Optimized spacing

        pdf.setTextColor(...colors.darkGray)
        pdf.setFontSize(8) // Saira-style body text optimized for space
        pdf.setFont(bodyFontFamily, 'normal')

        const summaryLines = pdf.splitTextToSize(
          assessmentData.generatedContent.progressSummary, // Use full optimized content
          pageWidth - 65 - leftMargin - rightMargin // Utilize full available width
        )
        summaryLines.slice(0, 8).forEach((line: string, index: number) => { // More lines for full utilization
          pdf.text(line, 60 + leftMargin, mainY + (index * 4)) // Optimized line spacing
        })
        mainY += summaryLines.slice(0, 8).length * 4 + 8 // Dynamic spacing optimized for space
      }

      // Footer - optimized positioning for full page utilization
      pdf.setTextColor(...colors.mediumGray)
      pdf.setFontSize(6) // Smaller font for space optimization
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 60 + leftMargin, pageHeight - bottomMargin - 3)
      pdf.text('Professional Basketball Assessment System', 70, pageHeight - 10)

      // Save the PDF and keep a copy in memory for emailing
      const fileName = `${assessmentData.playerInfo.name.replace(/\s+/g, '_')}_Assessment_Report.pdf`
      try {
        const dataUri = (pdf as any).output('datauristring') as string
        const base64 = dataUri.split(',')[1]
        setLastPdfBase64(base64)
      } catch (_) {}

      // Open the PDF in a new browser tab (so the user can view and download from the viewer)
      try {
        const blobUrl = (pdf as any).output('bloburl') as string
        const win = window.open(blobUrl, '_blank')
        if (!win) {
          // Popup blocked fallback
          ;(pdf as any).output('dataurlnewwindow')
        }
      } catch (e1) {
        try {
          ;(pdf as any).output('dataurlnewwindow')
        } catch (e2) {
          // Final fallback: direct download
          pdf.save(fileName)
        }
      }

      alert(`Professional assessment report for ${assessmentData.playerInfo.name} has been generated and opened in a new tab. You can download it from the viewer toolbar.`)
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
            <Circle className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
            <p className="text-gray-600">Loading Assessment System...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Send to Parents via Resend API (server-side route)
  const sendToParents = async () => {
    if (!isReadyForExport()) {
      alert(`Please complete the following: ${validationErrors.join(', ')}`)
      return
    }
    if (!parentEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail)) {
      alert('Please enter a valid parent email address.')
      return
    }

    if (!lastPdfBase64) {
      alert('Please click "Export PDF" first, then Send to Parents. This ensures the attachment matches the latest edits.')
      return
    }

    try {
      setLoading(prev => ({ ...prev, sendEmail: true }))
      const assessmentUrl = `${window.location.origin}/assessments`
      const res = await fetch('/api/send-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: parentEmail,
          playerName: assessmentData.playerInfo.name,
          parentName: '',
          assessmentUrl,
          pdfBase64: lastPdfBase64,
          programName: assessmentData.programName,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Send email error:', data)
        alert(`Failed to send email: ${data?.error || 'Unknown error'}`)
        return
      }

      // Save assessment record
      try {
        if (selectedParentId && selectedPlayerId) {
          const avg = (() => {
            const rated = assessmentData.skills.filter(s => s.rating > 0)
            if (!rated.length) return 0
            return rated.reduce((sum, s) => sum + s.rating, 0) / rated.length
          })()
          const category = (avg >= 4.5)
            ? 'On track for advanced group'
            : (avg >= 3.8)
              ? 'Strong fundamentals building toward consistency'
              : (avg >= 3.2)
                ? 'Adequate time and practice showing improvement'
                : (avg >= 2.5)
                  ? 'Developing skills with encouraging progress'
                  : 'Beginner showing early potential'

          await fetch('/api/assessments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parentId: selectedParentId,
              playerId: selectedPlayerId,
              programName: assessmentData.programName,
              skills: assessmentData.skills,
              aiParentSuggestions: assessmentData.generatedContent.parentSuggestions,
              aiGameplayAnalysis: assessmentData.generatedContent.gameplayAnalysis,
              aiProgressSummary: assessmentData.generatedContent.progressSummary,
              category,
              pdfUrl: data?.pdfUrl || undefined,
            }),
          })
        }
      } catch (e) {
        console.warn('Failed to save assessment record', e)
      }

      alert('Assessment emailed to parent successfully.')
    } catch (err) {
      console.error('Send email error:', err)
      alert('Failed to send email. Please try again.')
    } finally {
      setLoading(prev => ({ ...prev, sendEmail: false }))
    }
  }


  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Section with Background Watermark */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-red-400 text-white p-8 rounded-xl shadow-2xl overflow-hidden">
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
                <p className="text-red-100 text-lg">Professional player evaluation & development system</p>
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
        <Card className="shadow-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
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
        <Card className="shadow-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <User className="h-5 w-5 mr-2" />
              Player Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="player-select">Player *</Label>
                <Select value={selectedPlayerId} onValueChange={(v) => onSelectPlayer(v)}>
                  <SelectTrigger id="player-select" className="mt-1">
                    <SelectValue placeholder="Select a player" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={String(p._id)} value={String(p._id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.includes("Player name is required") && (
                  <p className="text-sm text-red-600 mt-1">
                    Player selection is required
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
        <Card className="shadow-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
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
                  <div key={skill.name} className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="bg-red-100 p-2 rounded-full">
                          <Icon className="h-5 w-5 text-red-600" />
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

                      {/* Rating Buttons (textual labels instead of numbers) */}
                      <div className="flex flex-wrap items-center gap-2 ml-4">
                        {RATING_LABELS.map((rating) => (
                          <button
                            key={rating.value}
                            onClick={() => updateSkillRating(skill.name, rating.value)}
                            className={`
                              px-3 py-1 rounded-full border text-xs font-medium whitespace-nowrap
                              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
                              ${currentRating === rating.value
                                ? `${rating.color} text-white border-transparent shadow`
                                : `border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-700`
                              }
                            `}
                            title={`${rating.value} - ${rating.label}`}
                          >
                            <span className="opacity-70 mr-1">{rating.value}</span>
                            {rating.label}
                            {rating.value === 5 && currentRating === 5 && (
                              <Star className="h-3 w-3 ml-1 fill-current inline" />
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

        <div className="flex items-center justify-end mb-3">
          <Button onClick={generateAllSections} disabled={loading.auto} className="bg-red-600 hover:bg-red-700">
            <Wand2 className="h-4 w-4 mr-2" />
            {loading.auto ? 'Generating...' : 'AI Auto (All Sections)'}
          </Button>
        </div>

        {/* AI Content Generation Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Parent Suggestions */}
          <Card className="shadow-md border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
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
                className="w-full bg-red-600 hover:bg-red-700"
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
          <Card className="shadow-md border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
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
                className="w-full bg-red-600 hover:bg-red-700"
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
          <Card className="shadow-md border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-700">
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
                className="w-full bg-red-600 hover:bg-red-700"
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
        <Card className="shadow-md border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
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

              <div>
                <Label htmlFor="parent-email">Parent Email</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="parent-email"
                    type="email"
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    placeholder="parent@example.com"
                    className="flex-1"
                  />
                  <Button
                    onClick={sendToParents}
                    disabled={loading.sendEmail}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {loading.sendEmail ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send to Parents
                      </>
                    )}
                  </Button>
                </div>
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
