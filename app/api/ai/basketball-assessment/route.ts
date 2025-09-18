import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '../../../lib/ai'

interface SkillRating {
  skillName: string
  rating: number
}

interface PlayerInfo {
  name: string
  age: string
  team: string
  assessmentDate: string
}

interface AssessmentRequest {
  type: 'parentSuggestions' | 'gameplayAnalysis' | 'progressSummary'
  playerInfo: PlayerInfo
  customPrompt: string
  skills: SkillRating[]
}

export async function POST(request: NextRequest) {
  try {
    const { type, playerInfo, customPrompt, skills }: AssessmentRequest = await request.json()

    if (!playerInfo?.name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: playerInfo.name and type are required' },
        { status: 400 }
      )
    }

    const { name: playerName, age: playerAge, team: playerTeam } = playerInfo
    const prompt = customPrompt || `Please provide ${type.replace(/([A-Z])/g, ' $1').toLowerCase()} for this player.`

    // Calculate skill statistics
    const ratedSkills = skills.filter(s => s.rating > 0)
    const averageRating = ratedSkills.length > 0 
      ? ratedSkills.reduce((sum, s) => sum + s.rating, 0) / ratedSkills.length 
      : 0
    const excellentSkills = skills.filter(s => s.rating === 5)
    const needsImprovementSkills = skills.filter(s => s.rating === 1 || s.rating === 2)

    let systemPrompt = ''
    let userPrompt = ''

    switch (type) {
      case 'parentSuggestions':
        systemPrompt = `You are an elite youth basketball trainer providing concise, actionable advice to parents. Your tone is professional yet warm, focusing on practical steps.

Generate concise parent suggestions (100-150 words) with exactly 3 bullet points:
• One specific home practice recommendation (15-20 minutes daily)
• One support strategy (mental/motivational approach)
• One development tip (nutrition, rest, or communication)

Keep each bullet point to 1-2 sentences. Be specific and actionable.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}

Assessment Input: "${prompt}"

Skills Assessment Summary:
- Average Rating: ${averageRating.toFixed(1)}/5.0
- Skills Rated: ${ratedSkills.length}/8
${excellentSkills.length > 0 ? `- Excellent Skills (5/5): ${excellentSkills.map(s => s.skillName).join(', ')}` : ''}
${needsImprovementSkills.length > 0 ? `- Areas for Development: ${needsImprovementSkills.map(s => s.skillName).join(', ')}` : ''}

Generate personalized parent suggestions that incorporate the assessment input naturally and provide specific, actionable guidance for supporting ${playerName}'s continued development.`
        break

      case 'gameplayAnalysis':
        systemPrompt = `You are a professional basketball analyst providing concise technical evaluation. Use appropriate basketball terminology for the player's level.

Generate concise gameplay analysis (100-150 words) with exactly 3 bullet points:
• One technical strength observation
• One tactical development area
• One specific improvement recommendation

Keep each bullet point to 1-2 sentences. Use professional basketball terminology appropriately.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}

Gameplay Observation: "${prompt}"

Skills Assessment Data:
- Overall Performance Level: ${averageRating.toFixed(1)}/5.0
- Assessed Skills: ${ratedSkills.length}/8 complete
${excellentSkills.length > 0 ? `- Elite-Level Skills: ${excellentSkills.map(s => s.skillName).join(', ')}` : ''}
${needsImprovementSkills.length > 0 ? `- Development Areas: ${needsImprovementSkills.map(s => s.skillName).join(', ')}` : ''}

Provide professional gameplay analysis that incorporates the observation naturally and delivers tactical insights appropriate for ${playerName}'s development level.`
        break

      case 'progressSummary':
        systemPrompt = `You are an elite basketball development specialist providing concise, inspiring assessment. Focus on strengths and realistic future potential.

Generate concise progress summary (100-150 words) with exactly 3 bullet points:
• One core strength/competency observed
• One character trait or work ethic highlight
• One realistic future potential statement

Keep each bullet point to 1-2 sentences. Be inspiring yet realistic.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}

Progress Observation: "${prompt}"

Current Assessment Profile:
- Skill Development Level: ${averageRating.toFixed(1)}/5.0
- Assessment Completion: ${ratedSkills.length}/8 skills evaluated
${excellentSkills.length > 0 ? `- Standout Abilities: ${excellentSkills.map(s => s.skillName).join(', ')}` : ''}
- Skills Showing Growth: ${skills.filter(s => s.rating >= 3).map(s => s.skillName).join(', ')}

Create an inspiring strengths summary that incorporates the progress observation and highlights ${playerName}'s unique basketball development trajectory and future potential.`
        break

      default:
        return NextResponse.json(
          { error: 'Invalid type. Must be parentSuggestions, gameplayAnalysis, or progressSummary' },
          { status: 400 }
        )
    }

    const result = await generateCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      maxTokens: 300
    })

    if (!result.success) {
      console.error('AI generation failed:', result.error)
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content,
      type,
      playerName
    })

  } catch (error) {
    console.error('Basketball assessment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
