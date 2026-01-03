import { useState, useEffect } from 'react'
import { renderCheckpointIcon, checkpointTone } from './checkpoint-helpers'
import type { LearningCheckpoint } from '../../types/video.types'

interface CheckpointNudgeProps {
    checkpoint: LearningCheckpoint
    onEngage: () => void
    onDismiss: () => void
}

export function CheckpointNudge({ checkpoint, onEngage, onDismiss }: CheckpointNudgeProps) {
    const tone = checkpointTone(checkpoint.type)
    const [timeLeft, setTimeLeft] = useState(8)
    const [smoothProgress, setSmoothProgress] = useState(100)

    useEffect(() => {
        // Smooth continuous countdown
        const startTime = Date.now()
        const duration = 8000 // 8 seconds in ms

        const animate = () => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, duration - elapsed)
            const percent = (remaining / duration) * 100

            setSmoothProgress(percent)
            setTimeLeft(Math.ceil(remaining / 1000))

            if (remaining > 0) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }, [])

    const progressPercent = smoothProgress

    return (
        <div className="absolute top-4 left-4 z-30 pointer-events-auto">
            <div className="bg-base-100/95 backdrop-blur-sm shadow-xl rounded-2xl p-4 max-w-md border border-base-300/50 animate-gentle-pulse">
                <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full ${tone.bg}/10 border-2 ${tone.bg.replace('bg-', 'border-')} flex items-center justify-center flex-shrink-0 relative animate-pulse-slow`}>
                        <div className={`${tone.text}`}>
                            {renderCheckpointIcon(checkpoint.type)}
                        </div>
                        {/* Timer ring */}
                        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                            <circle
                                cx="24"
                                cy="24"
                                r="21"
                                fill="none"
                                stroke="currentColor"
                                className={tone.text.replace('text-', 'text-') + '/20'}
                                strokeWidth="2"
                            />
                            <circle
                                cx="24"
                                cy="24"
                                r="21"
                                fill="none"
                                stroke="currentColor"
                                className={tone.text}
                                strokeWidth="2"
                                strokeDasharray={131.95}
                                strokeDashoffset={131.95 * (1 - progressPercent / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase tracking-wide ${tone.text}`}>
                                {checkpoint.type}
                            </span>
                            <span className="text-xs text-base-content/60">
                                • Auto-dismiss in {timeLeft}s
                            </span>
                        </div>
                        <p className="text-sm text-base-content/80 font-medium mb-3">
                            Quick check?
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={onEngage}
                                className={`btn btn-sm ${tone.bg} hover:opacity-90 text-white border-none flex-1 shadow-sm`}
                            >
                                Pause & Answer
                            </button>
                            <button
                                onClick={onDismiss}
                                className="btn btn-sm btn-ghost border border-base-300/50 hover:bg-base-200/50"
                            >
                                Skip
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
