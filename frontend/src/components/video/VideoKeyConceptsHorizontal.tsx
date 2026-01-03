import { useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VisibilityIcon from '@mui/icons-material/Visibility'
import QuizIcon from '@mui/icons-material/Quiz'
import PsychologyIcon from '@mui/icons-material/Psychology'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import TimelineIcon from '@mui/icons-material/Timeline'
import TocIcon from '@mui/icons-material/Toc'
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight'
import FlagIcon from '@mui/icons-material/Flag'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import InsightsIcon from '@mui/icons-material/Insights'
import type { Video, Concept } from '../../types/video.types'

// Parse checkpoint timestamp to seconds
const parseCheckpointTime = (timestamp: unknown): number => {
    if (typeof timestamp === 'number') {
        //console.log(`Checkpoint timestamp is already number: ${timestamp}`)
        return timestamp
    }
    if (typeof timestamp === 'string') {
        const parts = timestamp.split(':').map(p => Number.parseInt(p, 10))
        if (parts.length === 2 && parts.every(p => Number.isFinite(p))) {
            const result = parts[0] * 60 + parts[1] // MM:SS
            //console.log(`Parsed checkpoint timestamp "${timestamp}" -> ${result}s`)
            return result
        }
        if (parts.length === 3 && parts.every(p => Number.isFinite(p))) {
            const result = parts[0] * 3600 + parts[1] * 60 + parts[2] // HH:MM:SS
            //console.log(`Parsed checkpoint timestamp "${timestamp}" -> ${result}s`)
            return result
        }
        const numeric = Number.parseFloat(timestamp)
        if (Number.isFinite(numeric)) {
            //console.log(`Parsed checkpoint timestamp "${timestamp}" -> ${numeric}s`)
            return numeric
        }
    }
    //  console.warn(`Could not parse checkpoint timestamp:`, timestamp)
    return 0
}

interface VideoKeyConceptsProps {
    readonly video: Video
    readonly onAddConcept: (type?: 'main' | 'sub') => void
    readonly onEditConcept: (concept: Concept, index: number, e: React.MouseEvent) => void
    readonly onDeleteConcept: (index: number, e: React.MouseEvent) => void
    readonly onSeekTo: (timestamp: number) => void
    readonly formatTime: (seconds: number) => string
    readonly thumbnails: Record<number, string>
    readonly currentTime?: number
    readonly onAddCheckpoint?: () => void
    readonly onAIRefinement?: () => void
    readonly onAnalyzeEngagement?: () => void
}

// Prepare concepts for timeline display with hierarchy info
function prepareConceptsForTimeline(concepts: Concept[]) {
    return concepts.map((concept, index) => ({
        ...concept,
        index,
        isMainConcept: concept.conceptType === 'main' || !concept.parentId,
        parentTimestamp: concept.parentId ? Number.parseInt(concept.parentId.split('-')[0]) : null
    }))
}

export default function VideoKeyConcepts({
    video,
    onAddConcept,
    onEditConcept,
    onDeleteConcept,
    onSeekTo,
    formatTime,
    thumbnails,
    currentTime,
    onAddCheckpoint,
    onAIRefinement,
    onAnalyzeEngagement,
}: VideoKeyConceptsProps) {
    const concepts = video.concepts || []
    const checkpoints = video.checkpoints || []

    // Debug checkpoint data
    console.log('📊 VideoKeyConcepts received checkpoints:', checkpoints.map(cp => ({
        timestamp: cp.timestamp,
        type: typeof cp.timestamp,
        prompt: cp.prompt?.substring(0, 50)
    })))

    const preparedConcepts = prepareConceptsForTimeline(concepts)
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
    const [expandedItem, setExpandedItem] = useState<{ type: 'concept' | 'checkpoint', id: string | number } | null>(null)
    const [lineHoverX, setLineHoverX] = useState<number | null>(null)

    if (concepts.length === 0) {
        return (
            <div className="card bg-base-200 mb-8">
                <div className="card-body text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <TimelineIcon fontSize="large" className="text-base-content/40" />
                        <p className="text-base-content/60">No concepts yet</p>
                        <div className="flex gap-2">
                            <button className="btn btn-primary btn-sm gap-2" onClick={() => onAddConcept('main')}>
                                <TocIcon fontSize="small" />
                                Add Main Concept
                            </button>
                            <button className="btn btn-outline btn-sm gap-2">
                                <SmartToyIcon fontSize="small" />
                                Generate with AI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    const getColor = (importance: string) => {
        switch (importance) {
            case 'core': return 'bg-error'
            case 'supporting': return 'bg-warning'
            default: return 'bg-info'
        }
    }

    const getImportanceIcon = (importance: string) => {
        switch (importance) {
            case 'core':
                return <FlashOnIcon fontSize="small" className="text-error" />
            case 'supporting':
                return <LightbulbIcon fontSize="small" className="text-warning" />
            default:
                return <PsychologyIcon fontSize="small" className="text-info" />
        }
    }

    // Find which concept the current time falls into (ALL concepts, not just main)
    const getCurrentConceptIndex = () => {
        // Sort all concepts by timestamp
        const sortedConcepts = [...preparedConcepts].sort((a, b) => a.timestamp - b.timestamp)

        // Find which concept range we're currently in
        for (let i = 0; i < sortedConcepts.length; i++) {
            const current = sortedConcepts[i]
            const next = sortedConcepts[i + 1]
            if (currentTime !== undefined && currentTime >= current.timestamp && (!next || currentTime < next.timestamp)) {
                return current.index
            }
        }
        return null
    }

    // Calculate progress percentage for a concept's time range
    const getConceptProgress = (conceptIndex: number) => {
        // Find the concept and the next concept (regardless of type)
        const currentConcept = preparedConcepts.find(c => c.index === conceptIndex)
        if (!currentConcept) return 0

        // Find next concept by timestamp (could be main or sub)
        const sortedConcepts = [...preparedConcepts].sort((a, b) => a.timestamp - b.timestamp)
        const currentIndex = sortedConcepts.findIndex(c => c.index === conceptIndex)
        const nextConcept = sortedConcepts[currentIndex + 1]

        if (!nextConcept) {
            // Last concept - calculate based on video duration
            const duration = video.duration || currentTime || 0
            if (currentTime === undefined || currentTime < currentConcept.timestamp) return 0
            return Math.min(((currentTime - currentConcept.timestamp) / (duration - currentConcept.timestamp)) * 100, 100)
        }

        // Calculate progress to next concept
        const conceptDuration = nextConcept.timestamp - currentConcept.timestamp
        const elapsed = currentTime !== undefined ? currentTime - currentConcept.timestamp : 0
        if (elapsed < 0) return 0
        return Math.min((elapsed / conceptDuration) * 100, 100)
    }

    const currentConceptIndex = getCurrentConceptIndex()

    return (
        <div className="mb-8">
            {/* Header with Add Menu */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <TimelineIcon className="text-primary" fontSize="large" />
                    <h2 className="text-xl font-bold">Learning Timeline</h2>
                </div>

                {/* Modular Add Menu */}
                <div className="flex gap-2">
                    <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-primary btn-sm gap-2">
                            <AddIcon fontSize="small" />
                            Add Content
                            <ExpandMoreIcon fontSize="small" />
                        </label>
                        <ul
                            tabIndex={0}
                            className="dropdown-content menu p-2 shadow-lg bg-base-100 rounded-box w-64 mt-2 border border-base-300 z-50"
                        >
                            <li className="menu-title">
                                <span>Concepts</span>
                            </li>
                            <li>
                                <button onClick={() => onAddConcept('main')} className="gap-3">
                                    <TocIcon fontSize="small" className="text-primary" />
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold">Main Concept</div>
                                        <div className="text-xs text-base-content/60">Major topic boundary</div>
                                    </div>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => onAddConcept('sub')} className="gap-3">
                                    <SubdirectoryArrowRightIcon fontSize="small" className="text-accent" />
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold">Sub-Concept</div>
                                        <div className="text-xs text-base-content/60">Detail or example</div>
                                    </div>
                                </button>
                            </li>

                            <div className="divider my-1"></div>

                            <li className="menu-title">
                                <span>Interactive Elements</span>
                            </li>
                            <li>
                                <button onClick={onAddCheckpoint} className="gap-3">
                                    <FlagIcon fontSize="small" className="text-warning" />
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold">Checkpoint</div>
                                        <div className="text-xs text-base-content/60">Pause for reflection</div>
                                    </div>
                                </button>
                            </li>

                            <div className="divider my-1"></div>

                            <li className="menu-title">
                                <span>AI Assistance</span>
                            </li>
                            <li>
                                <button onClick={onAIRefinement} className="gap-3">
                                    <SmartToyIcon fontSize="small" className="text-info" />
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold">AI Refinement</div>
                                        <div className="text-xs text-base-content/60">Improve with AI</div>
                                    </div>
                                </button>
                            </li>
                            <li>
                                <button onClick={onAnalyzeEngagement} className="gap-3">
                                    <InsightsIcon fontSize="small" className="text-secondary" />
                                    <div className="flex-1 text-left">
                                        <div className="font-semibold">Analyze Engagement</div>
                                        <div className="text-xs text-base-content/60">Learning effectiveness</div>
                                    </div>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Horizontal Timeline - like project milestones */}
            <div className="relative">
                {/* Horizontal Line with hover add button */}
                <div
                    className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-30 group/line cursor-pointer hover:h-2 hover:opacity-50 transition-all"
                    onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setLineHoverX(e.clientX - rect.left)
                    }}
                    onMouseLeave={() => setLineHoverX(null)}
                    onClick={() => onAddConcept('main')}
                >
                    {lineHoverX !== null && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-75"
                            style={{ left: `${lineHoverX}px` }}
                        >
                            <button
                                className="btn btn-circle btn-sm btn-primary shadow-lg hover:scale-110 transition-transform"
                                onClick={() => onAddConcept('main')}
                            >
                                <AddIcon fontSize="small" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Scrollable horizontal container */}
                <div className="overflow-x-auto pb-32">
                    <div className="flex gap-8 min-w-max px-4 items-start">
                        {/* Render all items (ALL concepts + checkpoints) sorted by timestamp */}
                        {(() => {
                            const merged = [...preparedConcepts.map(c => ({ ...c, itemType: 'concept' as const })), ...checkpoints.map(cp => ({ ...cp, itemType: 'checkpoint' as const }))]
                            const sorted = merged.sort((a, b) => {
                                const aTime = a.itemType === 'checkpoint' ? parseCheckpointTime(a.timestamp) : a.timestamp
                                const bTime = b.itemType === 'checkpoint' ? parseCheckpointTime(b.timestamp) : b.timestamp
                                return aTime - bTime
                            })
                            console.log('🔢 Sorted timeline items:', sorted.map(item => ({
                                type: item.itemType,
                                timestamp: item.timestamp,
                                parsed: item.itemType === 'checkpoint' ? parseCheckpointTime(item.timestamp) : item.timestamp
                            })))
                            return sorted
                        })().map((item, idx) => {
                            if (item.itemType === 'checkpoint') {
                                const cp = item
                                const cpTimeSeconds = parseCheckpointTime(cp.timestamp)
                                const checkpointId = `checkpoint-${cpTimeSeconds}`
                                const isCheckpointExpanded = expandedItem?.type === 'checkpoint' && expandedItem.id === checkpointId
                                // Check if current time is at this checkpoint (within 2 seconds)
                                const isCheckpointActive = currentTime !== undefined && currentTime >= cpTimeSeconds && currentTime < cpTimeSeconds + 2

                                return (
                                    <div key={`checkpoint-${idx}`} className="relative flex flex-col items-center" style={{ width: '80px', marginTop: '96px' }}>
                                        {/* Vertical line hanging DOWN from horizontal timeline */}
                                        <div className={`w-0.5 h-8 bg-gradient-to-b mb-1 transition-all ${isCheckpointActive ? 'from-accent to-accent/60 w-1' : 'from-info/60 to-info/30'
                                            }`}></div>

                                        {/* Timestamp at the end of the line, above circle */}
                                        <button
                                            className={`text-xs font-mono hover:underline mb-3 px-2 py-1 rounded transition-all ${isCheckpointActive ? 'text-accent font-bold scale-110 bg-accent/10' : 'text-info'
                                                }`}
                                            onClick={() => onSeekTo(cpTimeSeconds)}
                                        >
                                            {formatTime(cpTimeSeconds)}
                                        </button>

                                        {/* Checkpoint circle at bottom of line */}
                                        <button
                                            className={`w-12 h-12 rounded-full ${cp.type === 'quickQuiz' ? 'bg-info' :
                                                cp.type === 'reflection' ? 'bg-secondary' :
                                                    cp.type === 'prediction' ? 'bg-accent' :
                                                        cp.type === 'application' ? 'bg-success' :
                                                            'bg-neutral'
                                                } text-white font-bold flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer ${isCheckpointActive ? 'ring-8 ring-accent scale-125 animate-pulse' :
                                                    isCheckpointExpanded ? 'ring-4 ring-primary scale-110' : ''
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setExpandedItem(isCheckpointExpanded ? null : { type: 'checkpoint', id: checkpointId })
                                            }}
                                        >
                                            {cp.type === 'quickQuiz' ? <QuizIcon fontSize="small" /> :
                                                cp.type === 'reflection' ? <PsychologyIcon fontSize="small" /> :
                                                    cp.type === 'prediction' ? <LightbulbIcon fontSize="small" /> :
                                                        cp.type === 'application' ? <FlashOnIcon fontSize="small" /> : <QuizIcon fontSize="small" />}
                                        </button>

                                        {/* Expandable checkpoint detail card BELOW circle - extended way down */}
                                        {isCheckpointExpanded && (
                                            <>
                                                {/* Connecting line to clear the concept cards */}
                                                <div className="w-0.5 h-36 bg-info/30"></div>

                                                {/* Popup card far below */}
                                                <div className="w-56 bg-base-100 shadow-2xl border-2 border-primary rounded-lg p-3 z-50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`badge ${cp.type === 'quickQuiz' ? 'badge-info' :
                                                            cp.type === 'reflection' ? 'badge-secondary' :
                                                                cp.type === 'prediction' ? 'badge-accent' :
                                                                    cp.type === 'application' ? 'badge-success' :
                                                                        'badge-neutral'
                                                            } badge-sm`}>
                                                            {cp.type}
                                                        </span>
                                                        <button
                                                            className="btn btn-ghost btn-xs btn-circle"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setExpandedItem(null)
                                                            }}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <p className="text-xs mb-2 font-semibold">{cp.prompt}</p>

                                                    {/* Show checkpoint details */}
                                                    <div className="text-xs space-y-1 mb-3 opacity-70">
                                                        {cp.contextStartTimestamp !== undefined && (
                                                            <div>Context starts: {cp.contextStartTimestamp}s</div>
                                                        )}
                                                        {cp.pauseDelaySeconds !== undefined && (
                                                            <div>Pause delay: {cp.pauseDelaySeconds}s</div>
                                                        )}
                                                        {cp.options && cp.options.length > 0 && (
                                                            <div className="mt-2">
                                                                <div className="font-semibold mb-1">Options:</div>
                                                                {cp.options.map((opt, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`pl-2 ${Number.parseInt(cp.correctAnswer ?? '', 10) === i ? 'text-success font-semibold' : ''}`}
                                                                    >
                                                                        {i + 1}. {opt} {Number.parseInt(cp.correctAnswer ?? '', 10) === i ? '✓' : ''}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <button
                                                        className="btn btn-xs btn-primary w-full"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onSeekTo(cpTimeSeconds)
                                                            setExpandedItem(null)
                                                        }}
                                                    >
                                                        Go to {formatTime(cpTimeSeconds)}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )
                            } else {
                                // Concept rendering (both main and sub)
                                const concept = item
                                const isExpanded = expandedItem?.type === 'concept' && expandedItem.id === concept.index
                                const colors = getColor(concept.importance)
                                const isActive = currentConceptIndex === concept.index
                                const isMainConcept = concept.isMainConcept
                                const isSub = !isMainConcept

                                return (
                                    <div key={concept.index} className={`relative flex flex-col items-center ${isMainConcept ? 'w-48' : 'w-40'}`}>
                                        {/* Timestamp at top */}
                                        <button
                                            className={`text-xs font-mono hover:underline mb-4 ${isActive ? 'text-accent font-bold' : isMainConcept ? 'text-primary' : 'text-accent/70'}`}
                                            onClick={() => onSeekTo(concept.timestamp)}
                                        >
                                            {formatTime(concept.timestamp)}
                                        </button>

                                        {/* Marker on the horizontal timeline - positioned at line level */}
                                        <div className="absolute" style={{ top: '96px', left: '50%', transform: 'translateX(-50%)' }}>
                                            <div className={`${isMainConcept ? 'w-4 h-4' : 'w-3 h-3'} rounded-full transition-all ${isActive && isMainConcept ? 'bg-accent ring-4 ring-accent/30 scale-125' :
                                                isExpanded ? 'bg-primary ring-2 ring-primary/30' :
                                                    isMainConcept ? 'bg-primary' :
                                                        'bg-accent/60'
                                                }`}></div>
                                        </div>

                                        {/* Circle node with thumbnail - LARGER for main concepts, smaller for sub - Aligned to horizontal line */}
                                        <div className={`relative ${isMainConcept ? 'w-32 h-32' : 'w-24 h-24 mt-4'} hover:scale-110 transition-all`}>
                                            {/* Circular progress indicator - for ALL concepts (matches ring-8 size) */}
                                            {isActive && (
                                                <svg
                                                    className={`absolute -inset-2 pointer-events-none z-30 ${isMainConcept ? 'w-36 h-36' : 'w-28 h-28'}`}
                                                    style={{ transform: 'rotate(-90deg)' }}
                                                    viewBox={isMainConcept ? "0 0 144 144" : "0 0 112 112"}
                                                >
                                                    <circle
                                                        cx={isMainConcept ? 72 : 56}
                                                        cy={isMainConcept ? 72 : 56}
                                                        r={isMainConcept ? 68 : 52}
                                                        stroke="#FFA724"
                                                        strokeWidth="8"
                                                        fill="none"
                                                        strokeDasharray={`${2 * Math.PI * (isMainConcept ? 68 : 52)}`}
                                                        strokeDashoffset={`${2 * Math.PI * (isMainConcept ? 68 : 52) * (1 - getConceptProgress(concept.index) / 100)}`}
                                                        className="transition-all duration-300"
                                                        strokeLinecap="round"
                                                    />
                                                </svg>
                                            )}

                                            <div
                                                className={`relative w-full h-full rounded-full ${colors} ${isMainConcept ? 'ring-4' : 'ring-2'} overflow-hidden cursor-pointer transition-all ${isActive ? 'ring-8 ring-accent' :
                                                    isExpanded ? 'ring-primary ring-8' :
                                                        isSub ? 'ring-accent/40' :
                                                            'ring-base-100'
                                                    }`}
                                                onMouseEnter={() => setHoveredIndex(concept.index)}
                                                onMouseLeave={() => setHoveredIndex(null)}
                                                onClick={() => setExpandedItem(isExpanded ? null : { type: 'concept', id: concept.index })}
                                            >
                                                {/* Neutral background to prevent color showing through */}
                                                <div className="absolute inset-0 bg-base-100"></div>

                                                {thumbnails[concept.timestamp] ? (
                                                    <img
                                                        src={thumbnails[concept.timestamp]}
                                                        alt={concept.concept}
                                                        className="w-full h-full object-cover relative z-10"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-base-300 relative z-10">
                                                        <VisibilityIcon fontSize={isMainConcept ? "large" : "medium"} className="text-base-content/30" />
                                                    </div>
                                                )}

                                                {/* Visual emphasis indicator */}
                                                {concept.visualEmphasis && (
                                                    <div className="absolute inset-0 ring-4 ring-accent animate-pulse"></div>
                                                )}

                                                {/* Edit/Delete on hover */}
                                                {hoveredIndex === concept.index && (
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 z-40">
                                                        <button
                                                            className="btn btn-ghost btn-sm btn-circle bg-base-100/80"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onEditConcept(concept, concept.index, e)
                                                            }}>
                                                            <EditIcon fontSize="small" />
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost btn-sm btn-circle bg-base-100/80 text-error"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                onDeleteConcept(concept.index, e)
                                                            }}>
                                                            <DeleteIcon fontSize="small" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Connecting line to description */}
                                        <div className="w-px h-12 bg-base-content/20 transition-opacity duration-300"></div>

                                        {/* Milestone card below */}
                                        <div
                                            className={`card bg-base-100 hover:bg-base-200 w-full cursor-pointer transition-all ${isMainConcept ? 'shadow-lg border-l-4 border-primary' : 'shadow border-l-4 border-accent/40'} ${isExpanded ? 'ring-2 ring-primary' : ''}`}
                                            onClick={() => setExpandedItem(isExpanded ? null : { type: 'concept', id: concept.index })}
                                        >
                                            <div className="card-body p-3">
                                                <div className="flex items-start gap-2 justify-between">
                                                    <h3 className={`${isMainConcept ? 'font-semibold text-primary' : 'font-medium text-accent/80'} text-sm flex-1`}>
                                                        {isSub && '↳ '}{concept.concept}
                                                    </h3>
                                                    {isExpanded ? (
                                                        <ExpandMoreIcon fontSize="small" className="text-base-content/60 flex-shrink-0" />
                                                    ) : (
                                                        <ChevronRightIcon fontSize="small" className="text-base-content/60 flex-shrink-0" />
                                                    )}
                                                </div>

                                                {!isExpanded && (
                                                    <p className="text-xs text-base-content/60 line-clamp-2">{concept.description}</p>
                                                )}

                                                {/* Expanded Details */}
                                                {isExpanded && (
                                                    <div className="mt-2 pt-2 border-t border-base-300 space-y-2">
                                                        {/* Importance Badge */}
                                                        <div className="flex items-center gap-2">
                                                            {getImportanceIcon(concept.importance)}
                                                            <span className={`text-xs font-semibold uppercase ${concept.importance === 'core' ? 'text-error' :
                                                                concept.importance === 'supporting' ? 'text-warning' :
                                                                    'text-info'
                                                                }`}>
                                                                {concept.importance}
                                                            </span>
                                                        </div>

                                                        <p className="text-xs text-base-content/80">{concept.description}</p>

                                                        {concept.visualElements && (
                                                            <div className={`p-2 rounded text-xs ${concept.visualEmphasis ? 'bg-accent/10 border border-accent/20' : 'bg-base-100'}`}>
                                                                <div className="flex items-center gap-1 font-semibold mb-1">
                                                                    <VisibilityIcon fontSize="small" />
                                                                    <span>Visual Content:</span>
                                                                </div>
                                                                <p>{concept.visualElements}</p>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2 text-xs flex-wrap">
                                                            <span className="badge badge-outline badge-sm">
                                                                {isMainConcept ? 'Main Concept' : 'Sub-Concept'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
