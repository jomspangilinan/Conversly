/* eslint-disable @typescript-eslint/no-explicit-any */
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import InfoIcon from '@mui/icons-material/Info'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

interface ConceptsTabProps {
    suggestions: any
    onAccept: (suggestion: any, type: string) => void
}

export default function ConceptsTab({ suggestions, onAccept }: ConceptsTabProps) {
    const hasAnySuggestions = (suggestions.conceptsToAdd?.length || 0) +
        (suggestions.conceptsToImprove?.length || 0) +
        (suggestions.timelineGaps?.length || 0) > 0

    if (!hasAnySuggestions) {
        return (
            <div className="alert alert-success">
                <CheckCircleIcon />
                <div>
                    <div className="font-semibold">Great work!</div>
                    <div className="text-sm">Your concepts look excellent. No improvements needed.</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Concepts to Add */}
            {suggestions.conceptsToAdd && suggestions.conceptsToAdd.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <AddIcon className="text-success" />
                        Add New Concepts ({suggestions.conceptsToAdd.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.conceptsToAdd.map((item: any, idx: number) => (
                            <div key={idx} className="card bg-base-200 shadow">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="badge badge-success badge-sm mb-2">
                                                {Math.floor(item.concept.timestamp / 60)}:{String(Math.floor(item.concept.timestamp % 60)).padStart(2, '0')}
                                            </div>
                                            <h5 className="font-semibold text-base">{item.concept.concept}</h5>
                                            <p className="text-sm text-base-content/70 mt-1">{item.concept.description}</p>
                                            <p className="text-xs text-info mt-2 flex items-center gap-1">
                                                <AutoFixHighIcon fontSize="small" />
                                                {item.reason}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-success btn-sm gap-1"
                                            onClick={() => onAccept(item, 'conceptAdd')}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Concepts to Improve */}
            {suggestions.conceptsToImprove && suggestions.conceptsToImprove.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <EditIcon className="text-warning" />
                        Improve Existing Concepts ({suggestions.conceptsToImprove.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.conceptsToImprove.map((item: any, idx: number) => (
                            <div key={idx} className="card bg-base-200 shadow">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="badge badge-ghost badge-sm mb-1">Before</div>
                                                <h5 className="font-semibold text-sm text-base-content/60 line-through">{item.original.concept}</h5>
                                                <p className="text-xs text-base-content/50">{item.original.description}</p>
                                            </div>
                                            <div>
                                                <div className="badge badge-warning badge-sm mb-1">After</div>
                                                <h5 className="font-semibold text-base">{item.improved.concept}</h5>
                                                <p className="text-sm text-base-content/70">{item.improved.description}</p>
                                            </div>
                                            <p className="text-xs text-info flex items-center gap-1">
                                                <AutoFixHighIcon fontSize="small" />
                                                {item.reason}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-warning btn-sm gap-1"
                                            onClick={() => onAccept(item, 'conceptImprove')}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline Gaps */}
            {suggestions.timelineGaps && suggestions.timelineGaps.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <InfoIcon className="text-error" />
                        Timeline Gaps ({suggestions.timelineGaps.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.timelineGaps.map((gap: any, idx: number) => (
                            <div key={idx} className="alert alert-error">
                                <InfoIcon />
                                <div>
                                    <div className="font-semibold">
                                        {Math.floor(gap.startTime / 60)}:{String(Math.floor(gap.startTime % 60)).padStart(2, '0')} - {Math.floor(gap.endTime / 60)}:{String(Math.floor(gap.endTime % 60)).padStart(2, '0')}
                                    </div>
                                    <div className="text-sm">{gap.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
