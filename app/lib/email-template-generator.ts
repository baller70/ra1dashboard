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
  'Improving',
  'Good',
  'Excellent'
]

export const generateEmailTemplate = async (data: AssessmentData): Promise<string> => {
  const ratedSkills = data.skills.filter(s => s.rating > 0)
  const averageRating = ratedSkills.length > 0 
    ? ratedSkills.reduce((sum, s) => sum + s.rating, 0) / ratedSkills.length 
    : 0
  const excellentSkills = data.skills.filter(s => s.rating === 5)
  const goodSkills = data.skills.filter(s => s.rating === 4)

  // Get logo data URL if available
  let logoDataUrl = ''
  if (data.logoFile) {
    try {
      logoDataUrl = await fileToDataURL(data.logoFile)
    } catch (error) {
      console.warn('Could not process logo for email:', error)
    }
  }

  const emailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basketball Assessment Report - ${data.playerInfo.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            background: linear-gradient(135deg, #ea580c, #f97316);
            color: white;
            padding: 30px 20px;
            border-radius: 10px 10px 0 0;
            text-align: center;
            margin-bottom: 0;
        }
        .logo {
            max-width: 80px;
            max-height: 80px;
            margin-bottom: 15px;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.9;
            font-size: 16px;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .greeting {
            font-size: 16px;
            margin-bottom: 20px;
        }
        .player-info {
            background: #fff7ed;
            border-left: 4px solid #ea580c;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .player-info h3 {
            margin: 0 0 10px 0;
            color: #ea580c;
            font-size: 18px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
        }
        .info-item {
            font-size: 14px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
        }
        .skills-summary {
            background: #f0f9ff;
            border: 1px solid #e0f2fe;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .skills-summary h3 {
            margin: 0 0 15px 0;
            color: #0369a1;
            font-size: 18px;
        }
        .skill-highlights {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }
        .skill-category {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border-left: 3px solid #ea580c;
        }
        .skill-category h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #ea580c;
        }
        .skill-list {
            font-size: 13px;
            color: #666;
            margin: 0;
        }
        .content-section {
            margin: 25px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            border-left: 4px solid #ea580c;
        }
        .content-section h3 {
            margin: 0 0 12px 0;
            color: #ea580c;
            font-size: 16px;
        }
        .content-preview {
            font-size: 14px;
            line-height: 1.5;
            color: #555;
        }
        .cta-section {
            background: #ea580c;
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 25px 0;
        }
        .cta-section h3 {
            margin: 0 0 10px 0;
            font-size: 18px;
        }
        .cta-section p {
            margin: 0;
            opacity: 0.9;
        }
        .signature {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
        }
        .signature-info {
            background: #f9fafb;
            padding: 15px;
            border-radius: 6px;
            margin-top: 15px;
        }
        .signature-info p {
            margin: 5px 0;
            font-size: 14px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
        }
        @media (max-width: 600px) {
            .info-grid, .skill-highlights {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        ${logoDataUrl ? `<img src="${logoDataUrl}" alt="Program Logo" class="logo">` : ''}
        <h1>${data.programName}</h1>
        <p>Basketball Assessment Report</p>
    </div>
    
    <div class="content">
        <div class="greeting">
            <p>Dear Parent/Guardian,</p>
            <p>I hope this message finds you well. I'm pleased to share ${data.playerInfo.name}'s comprehensive basketball assessment report from our recent evaluation session.</p>
        </div>
        
        <div class="player-info">
            <h3>Assessment Overview</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Player:</span> ${data.playerInfo.name}
                </div>
                <div class="info-item">
                    <span class="info-label">Age:</span> ${data.playerInfo.age || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Team:</span> ${data.playerInfo.team || 'Not specified'}
                </div>
                <div class="info-item">
                    <span class="info-label">Assessment Date:</span> ${new Date(data.playerInfo.assessmentDate).toLocaleDateString()}
                </div>
            </div>
        </div>
        
        <div class="skills-summary">
            <h3>Skills Assessment Summary</h3>
            <p><strong>Overall Performance:</strong> ${averageRating.toFixed(1)}/5.0 average rating across ${ratedSkills.length} evaluated skills</p>
            
            <div class="skill-highlights">
                ${excellentSkills.length > 0 ? `
                <div class="skill-category">
                    <h4>⭐ Excellent Skills (5/5)</h4>
                    <p class="skill-list">${excellentSkills.map(s => s.skillName).join(', ')}</p>
                </div>
                ` : ''}
                
                ${goodSkills.length > 0 ? `
                <div class="skill-category">
                    <h4>✅ Strong Skills (4/5)</h4>
                    <p class="skill-list">${goodSkills.map(s => s.skillName).join(', ')}</p>
                </div>
                ` : ''}
            </div>
        </div>
        
        ${data.generatedContent.parentSuggestions ? `
        <div class="content-section">
            <h3>Key Recommendations for Home Practice</h3>
            <div class="content-preview">
                ${data.generatedContent.parentSuggestions.substring(0, 200)}...
                <br><br><em>Full details available in the attached comprehensive report.</em>
            </div>
        </div>
        ` : ''}
        
        ${data.generatedContent.gameplayAnalysis ? `
        <div class="content-section">
            <h3>Technical Performance Highlights</h3>
            <div class="content-preview">
                ${data.generatedContent.gameplayAnalysis.substring(0, 200)}...
                <br><br><em>Complete analysis included in the full assessment report.</em>
            </div>
        </div>
        ` : ''}
        
        ${data.generatedContent.progressSummary ? `
        <div class="content-section">
            <h3>Strengths & Development Areas</h3>
            <div class="content-preview">
                ${data.generatedContent.progressSummary.substring(0, 200)}...
                <br><br><em>Detailed strengths summary provided in the complete report.</em>
            </div>
        </div>
        ` : ''}
        
        <div class="cta-section">
            <h3>Next Steps</h3>
            <p>I'd love to discuss ${data.playerInfo.name}'s progress and development plan in more detail. Please feel free to reach out to schedule a follow-up conversation.</p>
        </div>
        
        <div class="signature">
            <p>Best regards,</p>
            <div class="signature-info">
                <p><strong>{{COACH_NAME}}</strong></p>
                <p>Basketball Development Coach</p>
                <p>${data.programName}</p>
                <p>Email: {{COACH_EMAIL}}</p>
                <p>Phone: {{COACH_PHONE}}</p>
                <p>Website: {{PROGRAM_WEBSITE}}</p>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Note:</strong> Please find the complete assessment report attached as a PDF document.</p>
            <p>This assessment was generated on ${new Date().toLocaleDateString()} using our professional evaluation system.</p>
        </div>
    </div>
</body>
</html>`

  return emailTemplate
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

export const downloadEmailTemplate = (htmlContent: string, playerName: string) => {
  const blob = new Blob([htmlContent], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${playerName.replace(/\s+/g, '_')}_Assessment_Email_Template.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const copyEmailToClipboard = async (htmlContent: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(htmlContent)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}
