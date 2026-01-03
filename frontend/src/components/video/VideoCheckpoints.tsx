/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import QuizIcon from '@mui/icons-material/Quiz'
import PsychologyIcon from '@mui/icons-material/Psychology'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import FlagIcon from '@mui/icons-material/Flag'
import type { Video } from '../../types/video.types'

// Parse checkpoint timestamp to seconds
const parseCheckpointTime = (timestamp: unknown): number => {
    if (typeof timestamp === 'number') return timestamp
    if (typeof timestamp === 'string') {
        const parts = timestamp.split(':').map(p => Number.parseInt(p, 10))
        if (parts.length === 2 && parts.every(p => Number.isFinite(p))) {
            return parts[0] * 60 + parts[1] // MM:SS
        }
        if (parts.length === 3 && parts.every(p => Number.isFinite(p))) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2] // HH:MM:SS
        }
        const numeric = Number.parseFloat(timestamp)
        if (Number.isFinite(numeric)) return numeric
    }
    return 0
}

interface VideoCheckpointsProps {
    readonly video: Video
    readonly formatTime: (seconds: number) => string
    readonly onSeekTo: (timestamp: number) => void
    readonly carousel?: boolean // Enable carousel mode
}

export default function VideoCheckpoints({ video, formatTime, onSeekTo, carousel = false }: VideoCheckpointsProps) {
    const [checkpointIndex, setCheckpointIndex] = useState(0)

    // Sort checkpoints by timestamp
    const checkpoints = [...(video.checkpoints || [])].sort((a, b) => {
        const aTime = parseCheckpointTime(a.timestamp)
        const bTime = parseCheckpointTime(b.timestamp)
        return aTime - bTime
    })

    const isCorrectOption = (checkpoint: (typeof checkpoints)[number], optionIndex: number): boolean => {
        if (checkpoint.correctAnswer === undefined) return false
        const numeric = Number.parseInt(checkpoint.correctAnswer, 10)
        if (!Number.isNaN(numeric)) return numeric === optionIndex
        return checkpoint.options?.[optionIndex] === checkpoint.correctAnswer
    }

    if (checkpoints.length === 0) {
        return null
    }

    const getCheckpointIcon = (type: string) => {
        switch (type) {
            case 'quickQuiz': return <QuizIcon />
            case 'reflection': return <PsychologyIcon />
            case 'prediction': return <LightbulbIcon />
            case 'application': return <FlashOnIcon />
            default: return <FlagIcon />
        }
    }

    const getCheckpointColor = (type: string) => {
        switch (type) {
            case 'quickQuiz': return 'badge-info'
            case 'reflection': return 'badge-secondary'
            case 'prediction': return 'badge-accent'
            case 'application': return 'badge-success'
            default: return 'badge-neutral'
        }
    }

    // Render carousel version
    if (carousel) {
        return (
            <>
                <div className="carousel w-full">
                    {checkpoints.map((checkpoint, index) => (
                        <div
                            key={index}
                            id={`checkpoint-${index}`}
                            className="carousel-item w-full"
                        >
                            <div className="w-full space-y-4">
                                <div className="flex items-start gap-4">
                                    {/* Circle icon matching timeline */}
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${checkpoint.type === 'quickQuiz' ? 'bg-info' :
                                        checkpoint.type === 'reflection' ? 'bg-secondary' :
                                            checkpoint.type === 'prediction' ? 'bg-accent' :
                                                checkpoint.type === 'application' ? 'bg-success' :
                                                    'bg-neutral'
                                        } text-white`}>
                                        {getCheckpointIcon(checkpoint.type)}
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`badge ${getCheckpointColor(checkpoint.type)}`}>
                                                {checkpoint.type}
                                            </span>
                                            <button
                                                className="text-sm text-info hover:underline"
                                                onClick={() => onSeekTo(checkpoint.timestamp)}
                                            >
                                                {formatTime(checkpoint.timestamp)}
                                            </button>
                                        </div>
                                        <p className="text-lg font-medium mb-3">{checkpoint.prompt}</p>
                                        {checkpoint.options && checkpoint.options.length > 0 && (
                                            <div className="space-y-2">
                                                {checkpoint.options.map((option, i) => (
                                                    <div
                                                        key={i}
                                                        className={`p-3 rounded-lg ${isCorrectOption(checkpoint, i)
                                                            ? 'bg-success/20 border-2 border-success'
                                                            : 'bg-base-300'
                                                            }`}
                                                    >
                                                        {option}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {checkpoint.hint && (
                                            <div className="alert alert-info mt-3">
                                                <LightbulbIcon fontSize="small" />
                                                <span className="text-sm">{checkpoint.hint}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Carousel Navigation */}
                <div className="flex w-full justify-center items-center gap-2 py-4">
                    {/* Previous Button */}
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            const newIndex = Math.max(0, checkpointIndex - 1);
                            setCheckpointIndex(newIndex);
                            document.getElementById(`checkpoint-${newIndex}`)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        disabled={checkpointIndex === 0}
                    >
                        ‹
                    </button>

                    {/* Show only 5 indicators, centered on current */}
                    {checkpoints.length <= 5 ? (
                        // Show all if 5 or fewer
                        checkpoints.map((_, index) => (
                            <a
                                key={index}
                                href={`#checkpoint-${index}`}
                                className={`btn btn-sm ${index === checkpointIndex ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setCheckpointIndex(index)}
                            >
                                {index + 1}
                            </a>
                        ))
                    ) : (
                        // Show 5 indicators centered on current
                        (() => {
                            const total = checkpoints.length;
                            const maxVisible = 5;
                            let start = Math.max(0, checkpointIndex - Math.floor(maxVisible / 2));
                            let end = Math.min(total, start + maxVisible);

                            // Adjust if we're near the end
                            if (end - start < maxVisible) {
                                start = Math.max(0, end - maxVisible);
                            }

                            return Array.from({ length: end - start }, (_, i) => start + i).map((index) => (
                                <a
                                    key={index}
                                    href={`#checkpoint-${index}`}
                                    className={`btn btn-sm ${index === checkpointIndex ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => setCheckpointIndex(index)}
                                >
                                    {index + 1}
                                </a>
                            ));
                        })()
                    )}

                    {/* Next Button */}
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            const newIndex = Math.min(checkpoints.length - 1, checkpointIndex + 1);
                            setCheckpointIndex(newIndex);
                            document.getElementById(`checkpoint-${newIndex}`)?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        disabled={checkpointIndex === checkpoints.length - 1}
                    >
                        ›
                    </button>
                </div>
            </>
        )
    }

    // Render list version (default)
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FlagIcon className="text-primary" />
                    <h2 className="text-2xl font-bold">Learning Checkpoints</h2>
                </div>
                <span className="text-sm text-base-content/60">{checkpoints.length} interactive moments</span>
            </div>

            <div className="grid gap-3">
                {checkpoints.map((checkpoint, index) => (
                    <div
                        key={index}
                        className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-all"
                        onClick={() => onSeekTo(checkpoint.timestamp)}
                    >
                        <div className="card-body p-4">
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${checkpoint.type === 'quickQuiz' ? 'bg-info' :
                                    checkpoint.type === 'reflection' ? 'bg-secondary' :
                                        checkpoint.type === 'prediction' ? 'bg-accent' :
                                            checkpoint.type === 'application' ? 'bg-success' :
                                                'bg-neutral'
                                    } text-white`}>
                                    {getCheckpointIcon(checkpoint.type)}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`badge ${getCheckpointColor(checkpoint.type)} badge-sm`}>
                                            {checkpoint.type}
                                        </span>
                                        <span className="text-sm text-base-content/60">
                                            {formatTime(checkpoint.timestamp)}
                                        </span>
                                        {checkpoint.relatedConcept && (
                                            <span className="text-xs text-base-content/50">
                                                → {checkpoint.relatedConcept}
                                            </span>
                                        )}
                                    </div>
                                    <p className="font-medium mb-2">{checkpoint.prompt}</p>
                                    {checkpoint.options && checkpoint.options.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {checkpoint.options.map((option, i) => (
                                                <span
                                                    key={i}
                                                    className={`badge badge-sm ${isCorrectOption(checkpoint, i)
                                                        ? 'badge-success'
                                                        : 'badge-outline'
                                                        }`}
                                                >
                                                    {option}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {checkpoint.hint && (
                                        <p className="text-xs text-base-content/60 mt-2">💡 {checkpoint.hint}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
