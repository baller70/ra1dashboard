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
        // Get detailed skill breakdown for personalization
        const strongSkills = skills.filter(s => s.rating >= 4).map(s => ({ name: s.skillName, rating: s.rating }))
        const weakSkills = skills.filter(s => s.rating > 0 && s.rating <= 2).map(s => ({ name: s.skillName, rating: s.rating }))
        const midSkills = skills.filter(s => s.rating === 3).map(s => ({ name: s.skillName, rating: s.rating }))
        
        systemPrompt = `You are Coach Kevin writing a winter development evaluation email to a parent you know well. Write in first person as the coach. You have an existing relationship with this family—keep it professional but personal.

CRITICAL RULES:
- NO greetings like "Hi," "Hello," or "Dear"
- NO phrases like "I hope you're doing well" or "Hope all is well"  
- NO generic AI phrases—each email must feel unique and personal
- Start directly with the message content
- Write like you're talking to someone you know
- VARY your word choices, sentence structures, and transitions for each email
- Base EVERYTHING on the specific skill ratings provided

THE 8 SKILLS BEING EVALUATED:
1. Ball Handling
2. Shooting Form
3. Defensive Stance
4. Court Awareness
5. Passing Accuracy
6. Rebounding
7. Footwork
8. Team Communication

STRUCTURE (follow this order):
1. INTRO (2-3 sentences): Share that you're updating them on ${playerName}'s development from summer/fall. You want everyone on the same page—what you discuss with the kids doesn't always reach parents, so this bridges that gap. VARY how you phrase this each time.

2. STRENGTHS (1 paragraph): Focus on their highest-rated skills (4-5). Be specific about what they do well. Use the actual skill names.

3. AREAS TO IMPROVE (1 paragraph): Focus on their lowest-rated skills (1-2) and mid-rated skills (3). Be honest but constructive. Explain WHY these matter for their development.

4. HOW TO GET THERE (1 paragraph): Give specific, practical steps or drills targeting their weak areas. Make it actionable for the parent and player.

5. CLOSING (2-3 sentences): End positive—we have the whole winter to work on this. You'll keep pushing and communicating. VARY your closing language.

IMPORTANT: This is 1 of ~50 evaluations. Each must feel unique. Mix up:
- How you open the intro
- Transition phrases between sections
- How you describe skills (don't always say "fantastic" or "impressive")
- Drill recommendations based on their specific weaknesses
- Closing phrasing

Keep it around 200-280 words. Sound like YOU wrote it, not a template.`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}${playerTeam ? `, Team: ${playerTeam}` : ''}

SKILL RATINGS (base the entire email on these):
${ratedSkills.map(s => `- ${s.skillName}: ${s.rating}/5${s.rating >= 4 ? ' ⭐ STRENGTH' : s.rating <= 2 ? ' ⚠️ NEEDS WORK' : ' → DEVELOPING'}`).join('\n') || 'No skills rated yet'}

SUMMARY:
- Strong areas (4-5): ${strongSkills.map(s => s.name).join(', ') || 'None rated high yet'}
- Needs work (1-2): ${weakSkills.map(s => s.name).join(', ') || 'None rated low'}
- Developing (3): ${midSkills.map(s => s.name).join(', ') || 'None at mid-level'}

${prompt ? `COACH'S ADDITIONAL NOTES: ${prompt}` : ''}

Write a unique evaluation email for ${playerName}. Remember:
- No greeting, no "hope you're well"
- Base everything on THEIR specific skill ratings above
- Make it feel personal to THIS player
- Vary your language from other evaluations`
      } else if (type === 'gameplayAnalysis') {
        // Get skill breakdown for gameplay context
        const strongSkills = skills.filter(s => s.rating >= 4).map(s => s.skillName)
        const weakSkills = skills.filter(s => s.rating > 0 && s.rating <= 2).map(s => s.skillName)
        
        systemPrompt = `You are Coach Kevin writing a brief gameplay observation for a parent. Write ONE paragraph (4-6 sentences) describing how the player's skills show up in actual game situations.

RULES:
- NO greetings or "hope you're well"
- Base observations on the skill ratings provided
- Use real game scenarios (fast breaks, defense, passing lanes, rebounds, etc.)
- Keep it simple—parents should understand without basketball jargon
- Sound like a coach who actually watched the games
- Keep it to ONE paragraph, around 60-100 words

${prompt ? 'If custom instructions are provided, focus on what the coach specifically wants to address.' : 'Focus on how their strengths shine and where their weaknesses show up in games.'}`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}

SKILL RATINGS:
${ratedSkills.map(s => `- ${s.skillName}: ${s.rating}/5`).join('\n') || 'No skills rated'}

Strengths (4-5): ${strongSkills.join(', ') || 'None yet'}
Needs work (1-2): ${weakSkills.join(', ') || 'None'}

${prompt ? `COACH WANTS TO SPECIFICALLY ADDRESS: ${prompt}` : ''}

Write ONE paragraph about how ${playerName}'s skills show up during games. Be specific but brief.`

      } else if (type === 'progressSummary') {
        const category = categoryForAverage(averageRating)
        const strongSkills = skills.filter(s => s.rating >= 4).map(s => s.skillName)
        const weakSkills = skills.filter(s => s.rating > 0 && s.rating <= 2).map(s => s.skillName)
        
        systemPrompt = `You are Coach Kevin writing a brief progress summary for a parent. Write ONE paragraph (4-6 sentences) summarizing where the player is in their development.

RULES:
- NO greetings or "hope you're well"
- Base everything on the skill ratings provided
- Mention their overall progress category at the end
- Be encouraging but honest
- Keep it to ONE paragraph, around 60-100 words
- Sound like a real coach, not a template

${prompt ? 'If custom instructions are provided, incorporate that context into the summary.' : ''}`

        userPrompt = `Player: ${playerName}${playerAge ? `, Age: ${playerAge}` : ''}

SKILL RATINGS:
${ratedSkills.map(s => `- ${s.skillName}: ${s.rating}/5`).join('\n') || 'No skills rated'}

Overall Average: ${averageRating.toFixed(1)}/5
Category: ${category}
Strengths: ${strongSkills.join(', ') || 'Still developing'}
Working on: ${weakSkills.join(', ') || 'Maintaining current skills'}

${prompt ? `COACH'S NOTES: ${prompt}` : ''}

Write ONE paragraph summarizing ${playerName}'s overall progress. End with their category: (${category})`
      }

      const result = await generateCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        maxTokens: type === 'parentSuggestions' ? 600 : 320
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
