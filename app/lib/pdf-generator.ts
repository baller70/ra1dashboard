import jsPDF from 'jspdf'

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

const RATING_LABELS = [
  'Needs Improvement',
  'Developing', 
  'Satisfactory',
  'Good',
  'Excellent'
]

export const generateAssessmentPDF = async (data: AssessmentData): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  let yPosition = margin

  // Helper function to add new page if needed
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage()
      yPosition = margin
      return true
    }
    return false
  }

  // Helper function to wrap text
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10) => {
    pdf.setFontSize(fontSize)
    const lines = pdf.splitTextToSize(text, maxWidth)
    pdf.text(lines, x, y)
    return lines.length * (fontSize * 0.35) // Approximate line height
  }

  // Header with logo and program name
  pdf.setFillColor(234, 88, 12) // Orange gradient start
  pdf.rect(0, 0, pageWidth, 40, 'F')
  
  // Add logo if available
  if (data.logoFile) {
    try {
      const logoDataUrl = await fileToDataURL(data.logoFile)
      pdf.addImage(logoDataUrl, 'PNG', margin, 8, 24, 24)
    } catch (error) {
      console.warn('Could not add logo to PDF:', error)
    }
  }

  // Program name and title
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text(data.programName, data.logoFile ? margin + 30 : margin, 20)
  
  pdf.setFontSize(16)
  pdf.text('Basketball Assessment Report', data.logoFile ? margin + 30 : margin, 30)

  yPosition = 50

  // Player Information Section
  pdf.setTextColor(0, 0, 0)
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Player Information', margin, yPosition)
  yPosition += 10

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  
  const playerInfo = [
    `Name: ${data.playerInfo.name}`,
    `Age: ${data.playerInfo.age || 'Not specified'}`,
    `Team: ${data.playerInfo.team || 'Not specified'}`,
    `Assessment Date: ${new Date(data.playerInfo.assessmentDate).toLocaleDateString()}`
  ]

  playerInfo.forEach((info, index) => {
    pdf.text(info, margin, yPosition + (index * 6))
  })
  yPosition += 30

  // Skills Assessment Section
  checkPageBreak(60)
  
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Skills Assessment', margin, yPosition)
  yPosition += 15

  // Skills table header
  pdf.setFillColor(249, 115, 22) // Orange
  pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Skill', margin + 2, yPosition)
  pdf.text('Rating', margin + contentWidth - 30, yPosition)
  pdf.text('Level', margin + contentWidth - 60, yPosition)
  yPosition += 10

  // Skills data
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'normal')
  
  data.skills.forEach((skill, index) => {
    if (index % 2 === 0) {
      pdf.setFillColor(248, 248, 248)
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F')
    }
    
    pdf.text(skill.skillName, margin + 2, yPosition)
    pdf.text(skill.rating > 0 ? `${skill.rating}/5` : 'Not Rated', margin + contentWidth - 30, yPosition)
    pdf.text(skill.rating > 0 ? RATING_LABELS[skill.rating - 1] : '-', margin + contentWidth - 60, yPosition)
    yPosition += 8
  })

  yPosition += 10

  // Assessment Summary
  const ratedSkills = data.skills.filter(s => s.rating > 0)
  const averageRating = ratedSkills.length > 0 
    ? ratedSkills.reduce((sum, s) => sum + s.rating, 0) / ratedSkills.length 
    : 0

  pdf.setFillColor(254, 215, 170) // Light orange
  pdf.rect(margin, yPosition - 5, contentWidth, 15, 'F')
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Assessment Summary', margin + 2, yPosition + 2)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Skills Rated: ${ratedSkills.length}/8`, margin + 2, yPosition + 8)
  pdf.text(`Average Rating: ${averageRating.toFixed(1)}/5.0`, margin + 80, yPosition + 8)
  yPosition += 20

  // Generated Content Sections
  const contentSections = [
    { title: 'Parent Suggestions', content: data.generatedContent.parentSuggestions },
    { title: 'Gameplay Analysis', content: data.generatedContent.gameplayAnalysis },
    { title: 'Progress & Strengths Summary', content: data.generatedContent.progressSummary }
  ]

  contentSections.forEach((section) => {
    if (section.content) {
      checkPageBreak(30)
      
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(section.title, margin, yPosition)
      yPosition += 10
      
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      const textHeight = addWrappedText(section.content, margin, yPosition, contentWidth, 10)
      yPosition += textHeight + 15
    }
  })

  // Footer
  const totalPages = pdf.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(8)
    pdf.setTextColor(128, 128, 128)
    pdf.text(
      `Basketball Assessment Report - ${data.playerInfo.name} - Page ${i} of ${totalPages}`,
      margin,
      pageHeight - 10
    )
    pdf.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      pageWidth - margin - 40,
      pageHeight - 10
    )
  }

  // Save the PDF
  const fileName = `${data.playerInfo.name.replace(/\s+/g, '_')}_Basketball_Assessment_${new Date().toISOString().split('T')[0]}.pdf`
  pdf.save(fileName)
}

// Helper function to convert File to data URL
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
