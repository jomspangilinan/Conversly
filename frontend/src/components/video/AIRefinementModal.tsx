/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CloseIcon from '@mui/icons-material/Close'
import InfoIcon from '@mui/icons-material/Info'
import ConceptsTab from './refinement/ConceptsTab'
import CheckpointsTab from './refinement/CheckpointsTab'
import QuizTab from './refinement/QuizTab'

interface AIRefinementModalProps {
    isOpen: boolean
    loading: boolean
    suggestions: any
    hasExistingResults: boolean
    engagementAnalysis?: any
    onClose: () => void
    onAcceptSuggestion: (suggestion: any, type: string) => void
    onStartAnalysis: (focusArea?: string) => void
}

export default function AIRefinementModal({
    isOpen,
    loading,
    suggestions,
    hasExistingResults,
    engagementAnalysis,
    onClose,
    onAcceptSuggestion,
    onStartAnalysis,
}: AIRefinementModalProps) {
    const [activeTab, setActiveTab] = useState<'concepts' | 'checkpoints' | 'quiz'>('concepts')
    // Show focus selection by default if engagement analysis exists and no suggestions yet
    const [showFocusSelection, setShowFocusSelection] = useState(!!engagementAnalysis && !suggestions && !hasExistingResults)
    const [selectedFocus, setSelectedFocus] = useState<string>('everything') // Pre-select "Analyze Everything"

    // When modal opens with engagement analysis but no suggestions, show focus selection
    // BUT: Don't show if there are existing cached results (they're still loading)
    useEffect(() => {
        if (isOpen && engagementAnalysis && !suggestions && !loading && !hasExistingResults) {
            console.log('🎯 Auto-showing focus selection (no cached results)')
            setShowFocusSelection(true)
            setSelectedFocus('everything') // Pre-select "Analyze Everything"
        } else if (isOpen && suggestions) {
            console.log('✅ Modal opened with cached suggestions - hiding focus selection')
            setShowFocusSelection(false)
        } else if (isOpen) {
            console.log('🤖 Modal opened:', {
                hasEngagement: !!engagementAnalysis,
                hasSuggestions: !!suggestions,
                hasExistingResults,
                loading,
                showFocusSelection
            })
        }
    }, [isOpen, engagementAnalysis, suggestions, loading, hasExistingResults])

    console.log('🤖 AIRefinementModal render:', { isOpen, loading, hasSuggestions: !!suggestions, hasExistingResults })

    if (!isOpen) return null

    const conceptsCount = (suggestions?.conceptsToAdd?.length || 0) +
        (suggestions?.conceptsToImprove?.length || 0) +
        (suggestions?.timelineGaps?.length || 0)

    const checkpointsCount = (suggestions?.checkpointsToAdd?.length || 0) +
        (suggestions?.checkpointsToImprove?.length || 0)

    const quizCount = (suggestions?.quizQuestionsToAdd?.length || 0) +
        (suggestions?.quizQuestionsToImprove?.length || 0)

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-bold text-2xl flex items-center gap-2">
                            <SmartToyIcon className="text-info" />
                            AI Refinement Suggestions
                        </h3>
                        <p className="text-sm text-base-content/60 mt-1">
                            AI analyzed your content and found areas for improvement
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div role="tablist" className="tabs tabs-bordered mb-4">
                    <button
                        role="tab"
                        className={`tab ${activeTab === 'concepts' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('concepts')}
                    >
                        <span className="flex items-center gap-2">
                            Step 1: Concepts
                            {!loading && suggestions && <span className="badge badge-sm">{conceptsCount}</span>}
                        </span>
                    </button>
                    <button
                        role="tab"
                        className={`tab ${activeTab === 'checkpoints' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('checkpoints')}
                    >
                        <span className="flex items-center gap-2">
                            Step 2: Checkpoints
                            {!loading && suggestions && <span className="badge badge-sm">{checkpointsCount}</span>}
                        </span>
                    </button>
                    <button
                        role="tab"
                        className={`tab ${activeTab === 'quiz' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('quiz')}
                    >
                        <span className="flex items-center gap-2">
                            Step 3: Quiz
                            {!loading && suggestions && <span className="badge badge-sm">{quizCount}</span>}
                        </span>
                    </button>
                </div>

                {/* Tab Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="space-y-4">
                            {/* Skeleton Loading */}
                            <div className="skeleton h-32 w-full"></div>
                            <div className="skeleton h-32 w-full"></div>
                            <div className="skeleton h-32 w-full"></div>
                            <div className="text-center py-4">
                                <span className="loading loading-spinner loading-lg text-info mb-2"></span>
                                <p className="text-sm text-base-content/60">AI is analyzing your content...</p>
                                <p className="text-xs text-base-content/40">This may take 30-60 seconds</p>
                            </div>
                        </div>
                    ) : showFocusSelection ? (
                        <div className="flex flex-col items-center justify-center py-12 px-6">
                            <SmartToyIcon className="text-info" style={{ fontSize: 64 }} />
                            <h4 className="text-xl font-semibold mt-4 mb-2">
                                What would you like to improve?
                            </h4>
                            <p className="text-sm text-base-content/60 mb-6 text-center max-w-md">
                                {engagementAnalysis
                                    ? 'Based on your engagement analysis, select a focus area or let AI analyze everything'
                                    : 'Choose a specific area to focus on, or analyze everything'
                                }
                            </p>

                            {/* Focus Area Options */}
                            <div className="w-full max-w-md space-y-3 mb-6">
                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'active-learning' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('active-learning')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Active vs Passive Learning</div>
                                        {engagementAnalysis?.activePassiveBalance && (
                                            <div className="text-xs opacity-70">
                                                Current: {engagementAnalysis.activePassiveBalance.activePercentage}% active
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'engagement' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('engagement')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Engagement Rate</div>
                                        {engagementAnalysis?.engagementRate && (
                                            <div className="text-xs opacity-70">
                                                Current score: {engagementAnalysis.engagementRate.score}/100
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'accessibility' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('accessibility')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Accessibility & Prerequisites</div>
                                        {engagementAnalysis?.accessibilityScore && (
                                            <div className="text-xs opacity-70">
                                                Current score: {engagementAnalysis.accessibilityScore.score}/100
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'attention-retention' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('attention-retention')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Attention Retention</div>
                                        {engagementAnalysis?.learningRateGraph && (
                                            <div className="text-xs opacity-70">
                                                Critical drops: {engagementAnalysis.learningRateGraph.criticalDrops?.length || 0}
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'teaching-quality' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('teaching-quality')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Teaching Quality</div>
                                        {engagementAnalysis?.pedagogicalScore && (
                                            <div className="text-xs opacity-70">
                                                Current score: {engagementAnalysis.pedagogicalScore.score}/100
                                            </div>
                                        )}
                                    </div>
                                </button>

                                <button
                                    className={`btn btn-block justify-start ${selectedFocus === 'everything' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setSelectedFocus('everything')}
                                >
                                    <div className="text-left">
                                        <div className="font-semibold">Analyze Everything</div>
                                        <div className="text-xs opacity-70">
                                            Get comprehensive suggestions across all areas
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => setShowFocusSelection(false)}
                                >
                                    Back
                                </button>
                                <button
                                    className="btn btn-info gap-2"
                                    onClick={() => {
                                        const focusAreaText = selectedFocus === 'active-learning'
                                            ? 'active vs passive learning balance'
                                            : selectedFocus === 'engagement'
                                                ? 'engagement rate and student attention'
                                                : selectedFocus === 'accessibility'
                                                    ? 'accessibility and learning prerequisites'
                                                    : selectedFocus === 'attention-retention'
                                                        ? 'attention retention and learning rate across video segments'
                                                        : selectedFocus === 'teaching-quality'
                                                            ? 'teaching quality and pedagogical approach'
                                                            : undefined;
                                        onStartAnalysis(focusAreaText);
                                        setShowFocusSelection(false);
                                    }}
                                    disabled={!selectedFocus}
                                >
                                    <SmartToyIcon />
                                    Start AI Analysis
                                </button>
                            </div>
                        </div>
                    ) : !suggestions ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <SmartToyIcon className="text-info" style={{ fontSize: 64 }} />
                            <h4 className="text-xl font-semibold mt-4 mb-2">
                                {hasExistingResults ? 'Refresh AI Analysis' : 'Start AI Refinement'}
                            </h4>
                            <p className="text-sm text-base-content/60 mb-6 text-center max-w-md">
                                {engagementAnalysis
                                    ? 'Based on your engagement analysis, AI can suggest targeted improvements to your video content'
                                    : hasExistingResults
                                        ? 'Run a fresh analysis to get updated suggestions based on your current content'
                                        : 'Let AI analyze your video content and suggest improvements for concepts, checkpoints, and quiz questions'
                                }
                            </p>
                            {engagementAnalysis && (
                                <div className="alert alert-info mb-6 max-w-md">
                                    <SmartToyIcon />
                                    <div className="text-sm">
                                        <div className="font-semibold">Engagement Report Available</div>
                                        <div className="text-xs">AI can use your engagement analysis to provide targeted suggestions</div>
                                    </div>
                                </div>
                            )}
                            <button
                                className="btn btn-info btn-lg gap-2"
                                onClick={() => setShowFocusSelection(true)}
                            >
                                <SmartToyIcon />
                                {hasExistingResults ? 'Refresh Analysis' : 'Start Analysis'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'concepts' && (
                                <>
                                    {engagementAnalysis && (
                                        <div className="alert alert-info mb-4">
                                            <InfoIcon />
                                            <div className="text-sm">
                                                <div className="font-semibold">Improvement Loop Active</div>
                                                <div className="text-xs">
                                                    Accept suggestions → Run Engagement Analysis again → Repeat until scores improve
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <ConceptsTab suggestions={suggestions} onAccept={onAcceptSuggestion} />
                                </>
                            )}
                            {activeTab === 'checkpoints' && (
                                <CheckpointsTab suggestions={suggestions} onAccept={onAcceptSuggestion} />
                            )}
                            {activeTab === 'quiz' && (
                                <QuizTab suggestions={suggestions} onAccept={onAcceptSuggestion} />
                            )}
                        </>
                    )}
                </div>

                <div className="modal-action">
                    {suggestions && !loading && !showFocusSelection && (
                        <button
                            className="btn btn-info gap-2"
                            onClick={() => {
                                console.log('🆕 Run New Analysis clicked - showing focus selection')
                                setShowFocusSelection(true)
                                setSelectedFocus('everything')
                            }}
                        >
                            <SmartToyIcon fontSize="small" />
                            Run New Analysis
                        </button>
                    )}
                    <button className="btn btn-ghost gap-2" onClick={onClose}>
                        <CloseIcon fontSize="small" />
                        Close
                    </button>
                </div>
            </div>
            <button
                type="button"
                className="modal-backdrop"
                onClick={onClose}
                aria-label="Close modal"
            />
        </div>
    )
}
