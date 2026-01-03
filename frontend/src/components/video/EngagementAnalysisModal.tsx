/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react'
import InsightsIcon from '@mui/icons-material/Insights'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'
import BalanceIcon from '@mui/icons-material/Balance'
import SchoolIcon from '@mui/icons-material/School'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import CloseIcon from '@mui/icons-material/Close'

interface EngagementAnalysisModalProps {
    isOpen: boolean
    loading: boolean
    analysis: any
    hasExistingResults: boolean
    onClose: () => void
    onStartAnalysis: () => void
    onOpenRefinement?: () => void
}

export default function EngagementAnalysisModal({
    isOpen,
    loading,
    analysis,
    hasExistingResults,
    onClose,
    onStartAnalysis,
    onOpenRefinement
}: EngagementAnalysisModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const getTierBadgeClass = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'excellent': return 'badge-success'
            case 'good': return 'badge-info'
            case 'needs improvement': return 'badge-warning'
            case 'poor': return 'badge-error'
            default: return 'badge-ghost'
        }
    }

    return (
        <div className="modal modal-open">
            <div className="modal-box max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="font-bold text-2xl flex items-center gap-2">
                            <InsightsIcon className="text-secondary" />
                            Engagement Analysis
                        </h3>
                        <p className="text-sm text-base-content/60 mt-1">
                            AI-powered analysis of your video's learning effectiveness
                        </p>
                    </div>
                    {analysis && !loading && (
                        <div className="flex gap-2">
                            {onOpenRefinement && (
                                <button
                                    className="btn btn-sm btn-primary gap-2"
                                    onClick={onOpenRefinement}
                                >
                                    <InsightsIcon fontSize="small" />
                                    Improve with AI
                                </button>
                            )}
                            <button
                                className="btn btn-sm btn-outline btn-secondary gap-2"
                                onClick={onStartAnalysis}
                            >
                                <InsightsIcon fontSize="small" />
                                Refresh
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden">
                    {loading ? (
                        <div className="space-y-4">
                            {/* Skeleton Loading */}
                            <div className="skeleton h-40 w-full"></div>
                            <div className="skeleton h-40 w-full"></div>
                            <div className="skeleton h-40 w-full"></div>
                            <div className="text-center py-4">
                                <span className="loading loading-spinner loading-lg text-secondary mb-2"></span>
                                <p className="text-sm text-base-content/60">AI is analyzing engagement...</p>
                                <p className="text-xs text-base-content/40">This may take 30-60 seconds</p>
                            </div>
                        </div>
                    ) : !analysis ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <InsightsIcon className="text-secondary" style={{ fontSize: 64 }} />
                            <h4 className="text-xl font-semibold mt-4 mb-2">
                                {hasExistingResults ? 'Refresh Engagement Analysis' : 'Analyze Engagement'}
                            </h4>
                            <p className="text-sm text-base-content/60 mb-6 text-center max-w-md">
                                {hasExistingResults
                                    ? 'Run a fresh analysis to get updated engagement metrics and learning effectiveness scores'
                                    : 'Let AI evaluate your video\'s learning effectiveness, engagement rate, accessibility, and pedagogical quality'
                                }
                            </p>
                            <button
                                className="btn btn-secondary btn-lg gap-2"
                                onClick={onStartAnalysis}
                            >
                                <InsightsIcon />
                                {hasExistingResults ? 'Refresh Analysis' : 'Start Analysis'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Engagement Rate */}
                            {analysis.engagementRate && (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                <TrendingUpIcon className="text-primary" />
                                                Engagement Rate
                                            </h4>
                                            <div className={`badge badge-lg px-4 py-3 ${analysis.engagementRate.score >= 70 ? 'badge-success' :
                                                analysis.engagementRate.score >= 50 ? 'badge-info' :
                                                    'badge-warning'
                                                }`}>
                                                <span className="text-xl font-bold">{analysis.engagementRate.score}</span>
                                                <span className="text-xs opacity-70">/100</span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3">
                                            {/* Strengths */}
                                            {analysis.engagementRate.strengths && analysis.engagementRate.strengths.length > 0 && (
                                                <div className="bg-success/5 border-l-4 border-success p-3 rounded">
                                                    <p className="text-xs font-bold text-success mb-2">STRENGTHS</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.engagementRate.strengths.map((strength: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-success mt-0.5">•</span>
                                                                <span className="leading-snug">{strength}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Weaknesses */}
                                            {analysis.engagementRate.weaknesses && analysis.engagementRate.weaknesses.length > 0 && (
                                                <div className="bg-error/5 border-l-4 border-error p-3 rounded">
                                                    <p className="text-xs font-bold text-error mb-2">AREAS TO IMPROVE</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.engagementRate.weaknesses.map((weakness: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-error mt-0.5">•</span>
                                                                <span className="leading-snug">{weakness}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        {/* Recommendations */}
                                        {analysis.engagementRate.recommendations && analysis.engagementRate.recommendations.length > 0 && (
                                            <div className="mt-3 bg-primary/5 border-l-4 border-primary p-3 rounded">
                                                <p className="text-xs font-bold text-primary mb-2">ACTION ITEMS</p>
                                                <ul className="space-y-2 text-sm">
                                                    {analysis.engagementRate.recommendations.map((recommendation: string, idx: number) => (
                                                        <li key={idx} className="flex gap-2">
                                                            <span className="text-primary mt-0.5">→</span>
                                                            <span className="leading-snug">{recommendation}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Accessibility Score */}
                            {analysis.accessibilityScore && (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                <AccessibilityNewIcon className="text-info" />
                                                Accessibility Score
                                            </h4>
                                            <div className={`badge badge-lg px-4 py-3 ${analysis.accessibilityScore.score >= 70 ? 'badge-success' :
                                                analysis.accessibilityScore.score >= 50 ? 'badge-info' :
                                                    'badge-warning'
                                                }`}>
                                                <span className="text-xl font-bold">{analysis.accessibilityScore.score}</span>
                                                <span className="text-xs opacity-70">/100</span>
                                            </div>
                                        </div>

                                        <div className="grid gap-3">
                                            {/* Prerequisites */}
                                            {analysis.accessibilityScore.prerequisites && analysis.accessibilityScore.prerequisites.length > 0 && (
                                                <div className="bg-base-300/50 border-l-4 border-info p-3 rounded">
                                                    <p className="text-xs font-bold text-info mb-2">REQUIRED KNOWLEDGE</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {analysis.accessibilityScore.prerequisites.map((prereq: string, idx: number) => (
                                                            <span key={idx} className="badge badge-info badge-sm">{prereq}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Barriers */}
                                            {analysis.accessibilityScore.barriers && analysis.accessibilityScore.barriers.length > 0 && (
                                                <div className="bg-warning/5 border-l-4 border-warning p-3 rounded">
                                                    <p className="text-xs font-bold text-warning mb-2">BARRIERS</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.accessibilityScore.barriers.map((barrier: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-warning mt-0.5">•</span>
                                                                <span className="leading-snug">{barrier}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Improvements */}
                                            {analysis.accessibilityScore.improvements && analysis.accessibilityScore.improvements.length > 0 && (
                                                <div className="bg-success/5 border-l-4 border-success p-3 rounded">
                                                    <p className="text-xs font-bold text-success mb-2">HOW TO IMPROVE</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.accessibilityScore.improvements.map((improvement: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-success mt-0.5">→</span>
                                                                <span className="leading-snug">{improvement}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Active/Passive Balance */}
                            {analysis.activePassiveBalance && (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                <BalanceIcon className="text-warning" />
                                                Active vs Passive Learning
                                            </h4>
                                            <div className={`badge badge-lg px-4 py-3 ${analysis.activePassiveBalance.score >= 60 ? 'badge-success' :
                                                analysis.activePassiveBalance.score >= 40 ? 'badge-info' :
                                                    'badge-warning'
                                                }`}>
                                                <span className="text-xl font-bold">{analysis.activePassiveBalance.score}</span>
                                                <span className="text-xs opacity-70">/100</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="text-center p-4 bg-success/5 rounded-lg border border-success/20">
                                                <div className="text-4xl font-bold text-success mb-1">
                                                    {analysis.activePassiveBalance.activePercentage}%
                                                </div>
                                                <p className="text-xs font-semibold text-success">ACTIVE</p>
                                            </div>
                                            <div className="text-center p-4 bg-base-300/50 rounded-lg">
                                                <div className="text-4xl font-bold text-base-content/60 mb-1">
                                                    {analysis.activePassiveBalance.passivePercentage}%
                                                </div>
                                                <p className="text-xs font-semibold text-base-content/60">PASSIVE</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-1 w-full h-6 rounded-full overflow-hidden mb-4">
                                            <div className="bg-success" style={{ width: `${analysis.activePassiveBalance.activePercentage}%` }}></div>
                                            <div className="bg-base-content/20" style={{ width: `${analysis.activePassiveBalance.passivePercentage}%` }}></div>
                                        </div>

                                        {analysis.activePassiveBalance.analysis && (
                                            <p className="text-sm text-base-content/70 mb-3 p-3 bg-base-300/30 rounded border-l-4 border-base-content/20">
                                                {analysis.activePassiveBalance.analysis}
                                            </p>
                                        )}

                                        {analysis.activePassiveBalance.recommendations && analysis.activePassiveBalance.recommendations.length > 0 && (
                                            <div className="bg-info/5 border-l-4 border-info p-3 rounded">
                                                <p className="text-xs font-bold text-info mb-2">RECOMMENDATIONS</p>
                                                <ul className="space-y-2 text-sm">
                                                    {analysis.activePassiveBalance.recommendations.map((recommendation: string, idx: number) => (
                                                        <li key={idx} className="flex gap-2">
                                                            <span className="text-info mt-0.5">→</span>
                                                            <span className="leading-snug">{recommendation}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Learning Rate Graph */}
                            {analysis.learningRateGraph && analysis.learningRateGraph.segments && analysis.learningRateGraph.segments.length > 0 ? (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <TrendingUpIcon className="text-secondary" />
                                            Learning Rate Over Time
                                        </h4>
                                        <div className="flex items-end gap-2 h-40 mb-2 relative overflow-visible">
                                            {analysis.learningRateGraph.segments.map((segment: any, idx: number) => (
                                                <div
                                                    key={idx}
                                                    className="flex-1 flex flex-col items-center gap-1 relative overflow-visible group hover:z-[1000]"
                                                >
                                                    <div className="relative w-full bg-base-300 rounded-t-lg overflow-visible" style={{ height: '160px' }}>
                                                        <div
                                                            className={`absolute bottom-0 w-full rounded-t-lg transition-all cursor-help ${segment.score >= 70
                                                                ? 'bg-success hover:brightness-110'
                                                                : segment.score >= 40
                                                                    ? 'bg-warning hover:brightness-110'
                                                                    : 'bg-error hover:brightness-110'
                                                                }`}
                                                            style={{ height: `${segment.score}%` }}
                                                        >
                                                            <span className="text-[10px] font-bold text-white absolute top-1 left-0 right-0 text-center">
                                                                {segment.score}
                                                            </span>
                                                            {/* Tooltip positioned at top of bar */}
                                                            <div className="absolute -top-24 left-1/2 -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 pointer-events-none" style={{ zIndex: 10000 }}>
                                                                <div className="bg-base-300 border border-base-content/20 rounded-lg shadow-2xl p-3 text-xs whitespace-normal w-48">
                                                                    <div className="font-bold mb-1 text-primary">{segment.timeRange}</div>
                                                                    <div className="font-semibold mb-1">Score: {segment.score}/100</div>
                                                                    <div className="text-base-content/80 leading-tight text-[11px]">{segment.reason}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] text-base-content/60 text-center">{segment.timeRange}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {analysis.learningRateGraph.criticalDropPoints && analysis.learningRateGraph.criticalDropPoints.length > 0 && (
                                            <div className="mt-3 bg-warning/5 border-l-4 border-warning p-3 rounded">
                                                <p className="text-xs font-bold text-warning mb-2">ATTENTION NEEDED</p>
                                                <ul className="space-y-2 text-sm">
                                                    {analysis.learningRateGraph.criticalDropPoints.map((point: any, idx: number) => (
                                                        <li key={idx} className="flex gap-2">
                                                            <span className="text-warning mt-0.5">•</span>
                                                            <span className="leading-snug">
                                                                <span className="font-mono text-xs">{Math.floor(point.timestamp / 60)}:{String(point.timestamp % 60).padStart(2, '0')}</span>
                                                                {' '}- {point.reason}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <TrendingUpIcon className="text-secondary" />
                                            Learning Rate Over Time
                                        </h4>
                                        <div className="alert alert-warning">
                                            <TrendingUpIcon />
                                            <div>
                                                <div className="font-semibold">No Learning Rate Data</div>
                                                <div className="text-sm">
                                                    AI didn't generate learning rate segments. This might happen with very short videos.
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pedagogical Score */}
                            {analysis.pedagogicalScore && (
                                <div className="card bg-base-200 shadow">
                                    <div className="card-body">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-lg flex items-center gap-2">
                                                <SchoolIcon className="text-accent" />
                                                Teaching Quality
                                            </h4>
                                            <div className={`badge badge-lg px-4 py-3 ${analysis.pedagogicalScore.score >= 70 ? 'badge-success' :
                                                analysis.pedagogicalScore.score >= 50 ? 'badge-info' :
                                                    'badge-warning'
                                                }`}>
                                                <span className="text-xl font-bold">{analysis.pedagogicalScore.score}</span>
                                                <span className="text-xs opacity-70">/100</span>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3">
                                            {analysis.pedagogicalScore.strengths && analysis.pedagogicalScore.strengths.length > 0 && (
                                                <div className="bg-success/5 border-l-4 border-success p-3 rounded">
                                                    <p className="text-xs font-bold text-success mb-2">WHAT WORKS</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.pedagogicalScore.strengths.map((strength: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-success mt-0.5">•</span>
                                                                <span className="leading-snug">{strength}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {analysis.pedagogicalScore.gaps && analysis.pedagogicalScore.gaps.length > 0 && (
                                                <div className="bg-warning/5 border-l-4 border-warning p-3 rounded">
                                                    <p className="text-xs font-bold text-warning mb-2">TO IMPROVE</p>
                                                    <ul className="space-y-2 text-sm">
                                                        {analysis.pedagogicalScore.gaps.map((gap: string, idx: number) => (
                                                            <li key={idx} className="flex gap-2">
                                                                <span className="text-warning mt-0.5">•</span>
                                                                <span className="leading-snug">{gap}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Overall Analysis */}
                            {analysis.overallAnalysis && (
                                <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-lg border-2 border-primary/20">
                                    <div className="card-body">
                                        <h4 className="font-semibold text-xl mb-3 flex items-center gap-2">
                                            <EmojiEventsIcon className="text-primary" />
                                            Summary
                                        </h4>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="text-4xl font-bold text-primary">
                                                {analysis.overallAnalysis.totalScore}/100
                                            </div>
                                            <div className={`badge badge-lg ${getTierBadgeClass(analysis.overallAnalysis.tier)}`}>
                                                {analysis.overallAnalysis.tier}
                                            </div>
                                        </div>
                                        <p className="text-base text-base-content mb-4">
                                            {analysis.overallAnalysis.summary}
                                        </p>
                                        {analysis.overallAnalysis.topPriorities && analysis.overallAnalysis.topPriorities.length > 0 && (
                                            <div className="bg-primary/5 border-l-4 border-primary p-3 rounded">
                                                <p className="text-xs font-bold text-primary mb-2">NEXT STEPS</p>
                                                <ol className="space-y-2 text-sm">
                                                    {analysis.overallAnalysis.topPriorities.map((priority: string, idx: number) => (
                                                        <li key={idx} className="font-medium">{priority}</li>
                                                    ))}
                                                </ol>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* No Analysis */}
                            {!analysis.engagementRate && !analysis.accessibilityScore && !analysis.activePassiveBalance &&
                                !analysis.learningRateGraph && !analysis.pedagogicalScore && !analysis.overallAnalysis && (
                                    <div className="alert alert-info">
                                        <InsightsIcon />
                                        <div>
                                            <div className="font-semibold">Analysis Complete</div>
                                            <div className="text-sm">No engagement data available yet.</div>
                                        </div>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost gap-2"
                        onClick={onClose}
                    >
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
