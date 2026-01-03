/* eslint-disable @typescript-eslint/no-explicit-any */
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

interface CheckpointsTabProps {
    suggestions: any
    onAccept: (suggestion: any, type: string) => void
}

export default function CheckpointsTab({ suggestions, onAccept }: CheckpointsTabProps) {
    const hasAnySuggestions = (suggestions.checkpointsToAdd?.length || 0) +
        (suggestions.checkpointsToImprove?.length || 0) > 0

    if (!hasAnySuggestions) {
        return (
            <div className="alert alert-success">
                <CheckCircleIcon />
                <div>
                    <div className="font-semibold">Great work!</div>
                    <div className="text-sm">Your checkpoints are well-placed. No improvements needed.</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Checkpoints to Add */}
            {suggestions.checkpointsToAdd && suggestions.checkpointsToAdd.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <AddIcon className="text-success" />
                        Add New Checkpoints ({suggestions.checkpointsToAdd.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.checkpointsToAdd.map((item: any, idx: number) => (
                            <div key={idx} className="card bg-base-200 shadow">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="badge badge-success badge-sm mb-2">
                                                {Math.floor(item.checkpoint.timestamp / 60)}:{String(Math.floor(item.checkpoint.timestamp % 60)).padStart(2, '0')} - {item.checkpoint.type}
                                            </div>
                                            <p className="text-sm font-medium">{item.checkpoint.prompt}</p>
                                            {item.checkpoint.options && (
                                                <div className="text-xs text-base-content/60 mt-2">
                                                    Options: {item.checkpoint.options.join(', ')}
                                                </div>
                                            )}
                                            <p className="text-xs text-info mt-2 flex items-center gap-1">
                                                <AutoFixHighIcon fontSize="small" />
                                                {item.reason}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-success btn-sm gap-1"
                                            onClick={() => onAccept(item, 'checkpointAdd')}
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

            {/* Checkpoints to Improve */}
            {suggestions.checkpointsToImprove && suggestions.checkpointsToImprove.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <EditIcon className="text-warning" />
                        Improve Existing Checkpoints ({suggestions.checkpointsToImprove.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.checkpointsToImprove.map((item: any, idx: number) => {
                            const timestampChanged = item.original.timestamp !== item.improved.timestamp
                            const promptChanged = item.original.prompt !== item.improved.prompt

                            return (
                                <div key={idx} className="card bg-base-200 shadow">
                                    <div className="card-body p-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 space-y-3">
                                                {/* Timestamp Change */}
                                                {timestampChanged && (
                                                    <div className="bg-warning/10 p-2 rounded">
                                                        <div className="text-xs font-semibold mb-1">Timing Adjustment</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="badge badge-ghost badge-sm line-through">
                                                                {Math.floor(item.original.timestamp / 60)}:{String(Math.floor(item.original.timestamp % 60)).padStart(2, '0')}
                                                            </span>
                                                            <span className="text-xs">→</span>
                                                            <span className="badge badge-warning badge-sm">
                                                                {Math.floor(item.improved.timestamp / 60)}:{String(Math.floor(item.improved.timestamp % 60)).padStart(2, '0')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Prompt Change (only if actually changed) */}
                                                {promptChanged ? (
                                                    <>
                                                        <div>
                                                            <div className="badge badge-ghost badge-sm mb-1">Before</div>
                                                            <p className="text-sm text-base-content/60 line-through">{item.original.prompt}</p>
                                                        </div>
                                                        <div>
                                                            <div className="badge badge-warning badge-sm mb-1">After</div>
                                                            <p className="text-sm font-medium">{item.improved.prompt}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div>
                                                        <p className="text-sm font-medium">{item.improved.prompt}</p>
                                                    </div>
                                                )}

                                                <p className="text-xs text-info flex items-center gap-1">
                                                    <AutoFixHighIcon fontSize="small" />
                                                    {item.reason}
                                                </p>
                                            </div>
                                            <button
                                                className="btn btn-warning btn-sm gap-1"
                                                onClick={() => onAccept(item, 'checkpointImprove')}
                                            >
                                                <CheckCircleIcon fontSize="small" />
                                                Accept
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
