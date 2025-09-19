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
  type?: 'parentSuggestions' | 'gameplayAnalysis' | 'progressSummary' | 'all'
  mode?: 'auto' | 'single'
  playerInfo: PlayerInfo
  customPrompt?: string
  skills: SkillRating[]
}

export async function POST(request: NextRequest) {
  try {
    const body: AssessmentRequest = await request.json()
    const type = (body.type || (body.mode === 'auto' ? 'all' : undefined)) as AssessmentRequest['type']
    const { playerInfo, customPrompt = '', skills } = body

    if (!playerInfo?.name || (!type && body.mode !== 'auto')) {
      return NextResponse.json(
        { error: 'Missing required fields: playerInfo.name and type/mode are required' },
        { status: 400 }
      )
    }

    const { name: playerName, age: playerAge, team: playerTeam } = playerInfo
    const prompt = customPrompt

    // Calculate skill statistics
    const ratedSkills = skills.filter(s => s.rating > 0)
    const averageRating = ratedSkills.length > 0
      ? ratedSkills.reduce((sum, s) => sum + s.rating, 0) / ratedSkills.length
      : 0
    const excellentSkills = skills.filter(s => s.rating === 5)
    const needsImprovementSkills = skills.filter(s => s.rating === 1 || s.rating === 2)

    const categoryForAverage = (avg: number) => {
      if (avg >= 4.5) return 'On track for advanced group'
      if (avg >= 3.8) return 'Strong fundamentals building toward consistency'
      if (avg >= 3.2) return 'Adequate time and practice showing improvement'
      if (avg >= 2.5) return 'Developing skills with encouraging progress'
      return 'Beginner showing early potential'
    }

    async function generate(type: 'parentSuggestions' | 'gameplayAnalysis' | 'progressSummary') {
      let systemPrompt = ''
      let userPrompt = ''

      if (type === 'parentSuggestions') {
        systemPrompt = `Write like a human coach emailing a parent. Friendly, direct, and practical. No AI disclaimers. Avoid templated phrasing.
Use three short steps labeled Step 1, Step 2, Step 3 (not bullets), 1–2 sentences each. Keep it to ~120 words total.
Focus on the lowest-rated skills with one at-home drill (15–20 minutes), one encouragement/mental cue, and one simple habit (rest, nutrition, or communication).`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}
Average: ${averageRating.toFixed(1)}/5 | Low skills: ${needsImprovementSkills.map(s => s.skillName).join(', ') || '—'} | High skills: ${excellentSkills.map(s => s.skillName).join(', ') || '—'}
Context: ${prompt || 'Generate natural guidance without sounding automated.'}
Task: Write three labeled steps (Step 1/2/3). Keep language warm, plain, and specific.`
      } else if (type === 'gameplayAnalysis') {
        systemPrompt = `Sound like a coach who watched the player this week. Use concrete in-game scenarios (e.g., fast breaks, closeouts, off-ball cuts). Explain any jargon in a short parent-friendly aside. Keep it ~120 words. No bullets.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}
Average: ${averageRating.toFixed(1)}/5 | Strengths: ${excellentSkills.map(s => s.skillName).join(', ') || '—'} | Growth areas: ${needsImprovementSkills.map(s => s.skillName).join(', ') || '—'}
Context: ${prompt || 'Use ratings to pick realistic scenarios.'}
Task: 2–3 short paragraphs with specific plays and what to look for next practice.`
      } else if (type === 'progressSummary') {
        const category = categoryForAverage(averageRating)
        systemPrompt = `Write a short, personal-sounding progress note and end with a one-line category label in parentheses: (${category}). Avoid generic template phrases. No bullets.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}
Average: ${averageRating.toFixed(1)}/5 | Skills rated: ${ratedSkills.length}/8
Strengths: ${excellentSkills.map(s => s.skillName).join(', ') || '—'} | Working on: ${needsImprovementSkills.map(s => s.skillName).join(', ') || '—'}
Task: 2 short paragraphs that feel coach-written. End with (${category}).`
      }

      const result = await generateCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: 320
      })

      if (!result.success) throw new Error(result.error || 'AI generation failed')

      return result.content
    }

    if (type === 'all') {
      const [parentSuggestions, gameplayAnalysis, progressSummary] = await Promise.all([
        generate('parentSuggestions'),
        generate('gameplayAnalysis'),
        generate('progressSummary'),
      ])
      return NextResponse.json({
        success: true,
        playerName,
        parentSuggestions,
        gameplayAnalysis,
        progressSummary,
        category: categoryForAverage(averageRating),
      })
    }

    const content = await generate(type!)
    return NextResponse.json({ success: true, content, type, playerName })

  } catch (error) {
    console.error('Basketball assessment API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
