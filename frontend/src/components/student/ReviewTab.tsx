import { renderCheckpointIcon, checkpointTone } from './checkpoint-helpers'
import type { LearningCheckpoint } from '../../types/video.types'

interface ReviewTabProps {
    dismissedCheckpoints: Set<string>
    completedCheckpoints: Set<string>
    allCheckpoints: LearningCheckpoint[]
    onSeekToCheckpoint: (checkpoint: LearningCheckpoint) => void
}

const parseSeconds = (timestamp: string | number): number => {
    if (typeof timestamp === 'number') return timestamp
    const parts = String(timestamp).split(':').map(Number)
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
}

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ReviewTab({ dismissedCheckpoints, completedCheckpoints, allCheckpoints, onSeekToCheckpoint }: ReviewTabProps) {
    // Combine dismissed and completed checkpoints, removing duplicates
    const allInteractedKeys = new Set([...Array.from(dismissedCheckpoints), ...Array.from(completedCheckpoints)])
    const allInteractedArray = Array.from(allInteractedKeys)

    // Match checkpoints - try both with and without index suffix
    const reviewCheckpoints = allInteractedArray
        .map(key => {
            // Try exact match first
            let checkpoint = allCheckpoints.find(cp =>
                `${cp.timestamp}-${cp.type}-${cp.prompt}` === key
            )

            // If no match, try removing the trailing index (e.g., "-0", "-7")
            if (!checkpoint) {
                const keyWithoutIndex = key.replace(/-\d+$/, '')
                checkpoint = allCheckpoints.find(cp =>
                    `${cp.timestamp}-${cp.type}-${cp.prompt}` === keyWithoutIndex
                )
            }

            return checkpoint
        })
        .filter((cp): cp is LearningCheckpoint => cp !== undefined)
        // Remove duplicates by timestamp-type-prompt
        .filter((checkpoint, index, self) =>
            index === self.findIndex(c =>
                c.timestamp === checkpoint.timestamp &&
                c.type === checkpoint.type &&
                c.prompt === checkpoint.prompt
            )
        )
        .sort((a, b) => parseSeconds(a.timestamp) - parseSeconds(b.timestamp))

    return (
        <div className="space-y-3">
            {reviewCheckpoints.length === 0 ? (
                <div className="text-center py-12 text-base-content/50">
                    <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <p className="font-semibold">No checkpoints yet</p>
                    <p className="text-sm mt-1">Checkpoints you answer or skip will appear here</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reviewCheckpoints.map((checkpoint) => {
                        const tone = checkpointTone(checkpoint.type)
                        const timeStr = formatTime(parseSeconds(checkpoint.timestamp))
                        const checkpointKey = `${checkpoint.timestamp}-${checkpoint.type}-${checkpoint.prompt}`

                        // Check if completed - try multiple key matching strategies
                        const isCompleted = completedCheckpoints.has(checkpointKey) ||
                            Array.from(completedCheckpoints).some(key => {
                                const baseKey = key.replace(/-\d+$/, '')
                                const baseCheckpointKey = checkpointKey.replace(/-\d+$/, '')
                                return baseKey === baseCheckpointKey
                            })

                        return (
                            <div
                                key={checkpointKey}
                                className={`rounded-lg p-4 transition-colors cursor-pointer group relative ${isCompleted
                                        ? 'bg-success/10 border-2 border-success/30 hover:bg-success/20'
                                        : 'bg-base-200 hover:bg-base-300'
                                    }`}
                                onClick={() => onSeekToCheckpoint(checkpoint)}
                            >
                                {isCompleted && (
                                    <div className="absolute top-2 right-2">
                                        <div className="badge badge-success badge-sm gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Completed
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-start gap-3">
                                    <div className={`w-10 h-10 rounded-full ${tone.bg} flex items-center justify-center text-white flex-shrink-0 ${isCompleted ? 'opacity-60' : ''
                                        }`}>
                                        {renderCheckpointIcon(checkpoint.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold uppercase tracking-wide ${tone.text} ${isCompleted ? 'opacity-60' : ''
                                                }`}>
                                                {checkpoint.type}
                                            </span>
                                            <span className="text-xs text-base-content/50">• {timeStr}</span>
                                        </div>
                                        <p className={`text-sm text-base-content/80 line-clamp-2 mb-2 ${isCompleted ? 'opacity-60' : ''
                                            }`}>
                                            {checkpoint.prompt}
                                        </p>
                                        <button className={`btn btn-xs gap-1 ${isCompleted
                                                ? 'btn-ghost opacity-60'
                                                : 'btn-ghost group-hover:btn-primary'
                                            }`}>
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {isCompleted ? 'Review again' : 'Jump to checkpoint'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
