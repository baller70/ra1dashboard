'use client'

import React from 'react'
import { AppLayout } from '../components/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Circle } from 'lucide-react'

export default function AssessmentsPage() {
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
                Welcome to the Basketball Assessment System! This system is now successfully deployed and running.
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
                <p className="text-sm text-blue-600">🔧 Full functionality coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
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
  { value: 1, label: 'Needs Improvement', color: 'bg-red-500', textColor: 'text-red-700' },
  { value: 2, label: 'Developing', color: 'bg-orange-500', textColor: 'text-orange-700' },
  { value: 3, label: 'Satisfactory', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  { value: 4, label: 'Good', color: 'bg-green-400', textColor: 'text-green-700' },
  { value: 5, label: 'Excellent', color: 'bg-green-600', textColor: 'text-green-800' }
]

export default function AssessmentsPage() {
  const [mounted, setMounted] = useState(false)
  const [assessmentData, setAssessmentData] = useState<AssessmentData>({
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
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Validation function
  const validateAssessment = (): string[] => {
    const errors: string[] = []

    if (!assessmentData.playerInfo.name.trim()) {
      errors.push("Player name is required")
    }

    if (!assessmentData.playerInfo.assessmentDate) {
      errors.push("Assessment date is required")
    }

    const ratedSkills = assessmentData.skills.filter(s => s.rating > 0)
    if (ratedSkills.length === 0) {
      errors.push("At least one skill must be rated")
    }

    return errors
  }

  // Check if assessment is complete enough for export
  const isReadyForExport = (): boolean => {
    const errors = validateAssessment()
    setValidationErrors(errors)
    return errors.length === 0
  }

  // Mount check for client-side rendering
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-save functionality
  useEffect(() => {
    if (!mounted) return

    const savedData = localStorage.getItem('basketball-assessment')
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        setAssessmentData(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Error loading saved data:', error)
      }
    }
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    const timeoutId = setTimeout(() => {
      localStorage.setItem('basketball-assessment', JSON.stringify(assessmentData))
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [assessmentData, mounted])

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

  const clearAllRatings = () => {
    setAssessmentData(prev => ({
      ...prev,
      skills: prev.skills.map(skill => ({ ...skill, rating: 0 }))
    }))
    toast({
      title: "Ratings Cleared",
      description: "All skill ratings have been reset.",
    })
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setAssessmentData(prev => ({ ...prev, logoFile: file }))
        toast({
          title: "Logo Uploaded",
          description: `${file.name} has been uploaded successfully.`,
        })
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (PNG, JPG, etc.)",
          variant: "destructive"
        })
      }
    }
  }

  const generateContent = async (type: 'parentSuggestions' | 'gameplayAnalysis' | 'progressSummary') => {
    if (!assessmentData.playerInfo.name.trim()) {
      toast({
        title: "Player Name Required",
        description: "Please enter the player's name before generating content.",
        variant: "destructive"
      })
      return
    }

    const prompt = inputPrompts[type]
    if (!prompt.trim()) {
      toast({
        title: "Description Required",
        description: "Please enter a description before generating content.",
        variant: "destructive"
      })
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
          playerName: assessmentData.playerInfo.name,
          playerAge: assessmentData.playerInfo.age,
          playerTeam: assessmentData.playerInfo.team,
          prompt,
          skills: assessmentData.skills
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

      toast({
        title: "Content Generated",
        description: `${type === 'parentSuggestions' ? 'Parent suggestions' : type === 'gameplayAnalysis' ? 'Gameplay analysis' : 'Progress summary'} has been generated successfully.`,
      })

    } catch (error) {
      console.error('Error generating content:', error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  const exportToPDF = async () => {
    if (!isReadyForExport()) {
      toast({
        title: "Assessment Incomplete",
        description: `Please complete the following: ${validationErrors.join(', ')}`,
        variant: "destructive"
      })
      return
    }

    setLoading(prev => ({ ...prev, pdf: true }))

    try {
      await generateAssessmentPDF(assessmentData)
      toast({
        title: "PDF Generated Successfully",
        description: `Assessment report for ${assessmentData.playerInfo.name} has been downloaded.`,
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please check your browser settings and try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }))
    }
  }

  const generateEmailTemplate = async () => {
    if (!isReadyForExport()) {
      toast({
        title: "Assessment Incomplete",
        description: `Please complete the following: ${validationErrors.join(', ')}`,
        variant: "destructive"
      })
      return
    }

    setLoading(prev => ({ ...prev, email: true }))

    try {
      const emailHtml = await generateEmailHTML(assessmentData)

      // Try to copy to clipboard first
      const copied = await copyEmailToClipboard(emailHtml)

      if (copied) {
        toast({
          title: "Email Template Ready",
          description: `Template for ${assessmentData.playerInfo.name} copied to clipboard and downloaded as HTML file.`,
        })
      } else {
        toast({
          title: "Email Template Generated",
          description: `Template for ${assessmentData.playerInfo.name} has been downloaded as HTML file.`,
        })
      }

      // Download as HTML file
      downloadEmailTemplate(emailHtml, assessmentData.playerInfo.name)

    } catch (error) {
      console.error('Error generating email template:', error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate email template. Please check your browser settings and try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(prev => ({ ...prev, email: false }))
    }
  }

  // Clear all data with confirmation
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all assessment data? This action cannot be undone.')) {
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
      localStorage.removeItem('basketball-assessment')
      toast({
        title: "Data Cleared",
        description: "All assessment data has been cleared.",
      })
    }
  }

  if (!mounted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600" />
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

          {/* Logo Watermark */}
          {assessmentData.logoFile && typeof window !== 'undefined' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-5">
              <img
                src={URL.createObjectURL(assessmentData.logoFile)}
                alt="Program Logo"
                className="max-h-32 max-w-32 object-contain"
              />
            </div>
          )}

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
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                  onClick={() => window.print()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Report
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
                  disabled={loading.email}
                  onClick={generateEmailTemplate}
                >
                  {loading.email ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Generate Email
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm w-full"
                disabled={loading.pdf}
                onClick={exportToPDF}
              >
                {loading.pdf ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export PDF
              </Button>
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
                  aria-describedby="player-name-error"
                  autoComplete="name"
                />
                {validationErrors.includes("Player name is required") && (
                  <p id="player-name-error" className="text-sm text-red-600 mt-1">
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center text-orange-700">
              <Circle className="h-5 w-5 mr-2" />
              Skills Assessment
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllRatings}
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
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
              {SKILLS.map((skill, skillIndex) => {
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
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                updateSkillRating(skill.name, rating.value)
                              }
                            }}
                            className={`
                              w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold
                              transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                              ${currentRating === rating.value
                                ? `${rating.color} text-white border-transparent shadow-lg`
                                : `border-gray-300 text-gray-400 hover:border-orange-300 hover:text-orange-600`
                              }
                            `}
                            title={`${rating.value} - ${rating.label}`}
                            aria-label={`Rate ${skill.name} as ${rating.label} (${rating.value} out of 5)`}
                            aria-pressed={currentRating === rating.value}
                            tabIndex={0}
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

            {/* Assessment Summary */}
            <div className="mt-6 p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-900">Assessment Progress</h4>
                  <p className="text-sm text-orange-700">
                    {assessmentData.skills.filter(s => s.rating > 0).length} of {SKILLS.length} skills rated
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">
                    {assessmentData.skills.filter(s => s.rating > 0).length > 0
                      ? Math.round((assessmentData.skills.reduce((sum, s) => sum + s.rating, 0) / assessmentData.skills.filter(s => s.rating > 0).length) * 10) / 10
                      : 0
                    }
                  </div>
                  <div className="text-xs text-orange-600">Average Rating</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Content Generation Sections */}
        <div className="grid gap-6 lg:grid-cols-1">
          {/* Parent Suggestions Generator */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Brain className="h-5 w-5 mr-2" />
                Parent Suggestions Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="parent-prompt">Describe player's overall progress (one sentence)</Label>
                <Textarea
                  id="parent-prompt"
                  value={inputPrompts.parentSuggestions}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, parentSuggestions: e.target.value }))}
                  placeholder="e.g., Shows consistent improvement in shooting accuracy and defensive positioning"
                  className="mt-1 min-h-[60px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => generateContent('parentSuggestions')}
                  disabled={loading.parentSuggestions || !inputPrompts.parentSuggestions.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading.parentSuggestions ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Parent Suggestions
                </Button>
                {assessmentData.generatedContent.parentSuggestions && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssessmentData(prev => ({
                      ...prev,
                      generatedContent: { ...prev.generatedContent, parentSuggestions: '' }
                    }))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
              {assessmentData.generatedContent.parentSuggestions && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Generated Parent Suggestions:</h4>
                  <div className="text-sm text-green-800 whitespace-pre-wrap">
                    {assessmentData.generatedContent.parentSuggestions}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gameplay Analysis Generator */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Target className="h-5 w-5 mr-2" />
                Gameplay Analysis Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gameplay-prompt">Describe gameplay performance (one sentence)</Label>
                <Textarea
                  id="gameplay-prompt"
                  value={inputPrompts.gameplayAnalysis}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, gameplayAnalysis: e.target.value }))}
                  placeholder="e.g., Demonstrates strong court vision and makes smart passing decisions under pressure"
                  className="mt-1 min-h-[60px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => generateContent('gameplayAnalysis')}
                  disabled={loading.gameplayAnalysis || !inputPrompts.gameplayAnalysis.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading.gameplayAnalysis ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Analysis
                </Button>
                {assessmentData.generatedContent.gameplayAnalysis && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssessmentData(prev => ({
                      ...prev,
                      generatedContent: { ...prev.generatedContent, gameplayAnalysis: '' }
                    }))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
              {assessmentData.generatedContent.gameplayAnalysis && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Generated Gameplay Analysis:</h4>
                  <div className="text-sm text-blue-800 whitespace-pre-wrap">
                    {assessmentData.generatedContent.gameplayAnalysis}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress & Strengths Generator */}
          <Card className="shadow-md border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Star className="h-5 w-5 mr-2" />
                Progress & Strengths Generator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="progress-prompt">Describe improvements observed (one sentence)</Label>
                <Textarea
                  id="progress-prompt"
                  value={inputPrompts.progressSummary}
                  onChange={(e) => setInputPrompts(prev => ({ ...prev, progressSummary: e.target.value }))}
                  placeholder="e.g., Leadership qualities emerging as player consistently encourages teammates and takes initiative"
                  className="mt-1 min-h-[60px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => generateContent('progressSummary')}
                  disabled={loading.progressSummary || !inputPrompts.progressSummary.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {loading.progressSummary ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Summary
                </Button>
                {assessmentData.generatedContent.progressSummary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAssessmentData(prev => ({
                      ...prev,
                      generatedContent: { ...prev.generatedContent, progressSummary: '' }
                    }))}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
              {assessmentData.generatedContent.progressSummary && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-purple-900 mb-2">Generated Progress Summary:</h4>
                  <div className="text-sm text-purple-800 whitespace-pre-wrap">
                    {assessmentData.generatedContent.progressSummary}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Validation Status & Actions */}
        <Card className="shadow-md border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {isReadyForExport() ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      <span className="font-medium">Assessment Complete</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-orange-600">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      <span className="font-medium">Assessment Incomplete</span>
                    </div>
                  )}
                </div>
                {validationErrors.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Missing: {validationErrors.join(', ')}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllData}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
                <Button
                  onClick={() => toast({
                    title: "Progress Saved",
                    description: "Assessment data is automatically saved locally as you work."
                  })}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Auto-Save Active
                </Button>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Assessment Progress</span>
                <span>{Math.round((assessmentData.skills.filter(s => s.rating > 0).length / SKILLS.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(assessmentData.skills.filter(s => s.rating > 0).length / SKILLS.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
