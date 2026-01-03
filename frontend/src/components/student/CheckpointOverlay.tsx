import { useMemo, useRef, useState, useEffect } from 'react'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ReplayIcon from '@mui/icons-material/Replay'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { renderCheckpointIcon, checkpointTone } from './checkpoint-helpers'
import type { LearningCheckpoint } from '../../types/video.types'

interface CheckpointOverlayProps {
    checkpoint: LearningCheckpoint
    onComplete: () => void
    onSkip: (checkpoint: LearningCheckpoint) => void
    onAnswer?: (payload: { selectedIndex?: number; isCorrect?: boolean; answerText?: string }) => void
    studentName?: string
    initialResponse?: { selectedIndex?: number; isCorrect?: boolean; answerText?: string; feedback?: string } | null
    onRewatch?: (targetTime: number) => void
    checkpointTimestamp?: number
    rewatchTime?: number
    formatTime?: (seconds: number) => string
}

export function CheckpointOverlay({ checkpoint, onComplete, onSkip: _onSkip, onAnswer, studentName, initialResponse, onRewatch, checkpointTimestamp, rewatchTime, formatTime }: CheckpointOverlayProps) {
    const tone = checkpointTone(checkpoint.type)
    const [selectedIndex, setSelectedIndex] = useState<number | null>(initialResponse?.selectedIndex ?? null)
    const [isCorrect, setIsCorrect] = useState<boolean | null>(initialResponse?.isCorrect ?? null)
    const [locked, setLocked] = useState(Boolean(initialResponse))
    const [textAnswer, setTextAnswer] = useState<string>(initialResponse?.answerText ?? '')
    const correctAudioRef = useRef<HTMLAudioElement | null>(null)

    const correctIndex = useMemo(() => {
        if (!checkpoint.options || checkpoint.options.length === 0 || checkpoint.correctAnswer === undefined) return -1
        const answer = checkpoint.correctAnswer
        if (typeof answer === 'number') return answer
        const numeric = Number.parseInt(answer, 10)
        if (!Number.isNaN(numeric)) return numeric
        return checkpoint.options.findIndex((opt) => opt === answer)
    }, [checkpoint])

    useEffect(() => {
        if (initialResponse) {
            setSelectedIndex(initialResponse.selectedIndex ?? null)
            setIsCorrect(initialResponse.isCorrect ?? null)
            setLocked(true)
            setTextAnswer(initialResponse.answerText ?? '')
        } else {
            setSelectedIndex(null)
            setIsCorrect(null)
            setLocked(false)
            setTextAnswer('')
        }
    }, [checkpoint, initialResponse])

    useEffect(() => {
        return () => {
            if (correctAudioRef.current) {
                correctAudioRef.current.pause()
                correctAudioRef.current = null
            }
        }
    }, [])

    const playCorrectSound = () => {
        try {
            if (!correctAudioRef.current) {
                const audio = new Audio('/correct.mp3')
                audio.preload = 'auto'
                audio.volume = 0.5
                correctAudioRef.current = audio
            }
            const audio = correctAudioRef.current
            audio.currentTime = 0
            void audio.play().catch(() => { })
        } catch {
            // ignore audio errors
        }
    }

    const handleAnswer = (index: number) => {
        if (locked) return
        setSelectedIndex(index)
        const isRight = index === correctIndex
        setIsCorrect(isRight)
        setLocked(true)
        if (isRight) {
            playCorrectSound()
        }

        // Emit answer event for interaction logging
        window.dispatchEvent(new CustomEvent('checkpointAnswered', {
            detail: {
                checkpoint: checkpoint.prompt,
                type: checkpoint.type,
                selectedAnswer: checkpoint.options?.[index],
                correctAnswer: checkpoint.options?.[correctIndex],
                isCorrect: isRight
            }
        }))

        if (onAnswer) {
            onAnswer({ selectedIndex: index, isCorrect: isRight })
        }
    }

    const handleTextSubmit = () => {
        if (locked) return
        const trimmed = textAnswer.trim()
        if (!trimmed) return
        setLocked(true)
        if (onAnswer) {
            onAnswer({ answerText: trimmed })
        }
    }

    const correctAnswerLabel = checkpoint.options && correctIndex >= 0 ? checkpoint.options[correctIndex] : 'Review the content'

    const handleRewatch = () => {
        if (onRewatch) {
            onRewatch(checkpoint.timestamp)
        }
    }

    return (
        <div className="absolute inset-0 z-40 flex items-end justify-end p-4 pointer-events-none">
            <div className="bg-base-100/95 text-base-content rounded-2xl shadow-2xl w-full max-w-xl p-5 space-y-4 border border-base-200 pointer-events-auto max-h-[80vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${tone.bg}`}>
                            {renderCheckpointIcon(checkpoint.type)}
                        </div>
                        <div>
                            <div className={`badge badge-lg uppercase ${tone.bg.replace('bg-', 'badge-')}`}>{checkpoint.type}</div>
                            <div className="text-xs text-base-content/60">Checkpoint</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {onRewatch && (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={handleRewatch} aria-label="Rewatch">
                                <ReplayIcon fontSize="small" />
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={onComplete}
                            disabled={checkpoint.type === 'quickQuiz' && !locked}
                            aria-label="Continue"
                        >
                            <PlayArrowIcon fontSize="small" />
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="text-sm text-base-content/70">{studentName ? `Hi ${studentName}, ` : ''}Take a quick beat, then continue.</div>
                    <h3 className="font-bold text-2xl">{checkpoint.prompt}</h3>
                    <div className="text-xs text-base-content/60 flex items-center gap-2">
                        {checkpointTimestamp !== undefined && (
                            <span>Checkpoint at {formatTime ? formatTime(checkpointTimestamp) : checkpointTimestamp.toFixed(1)}s</span>
                        )}
                        {rewatchTime !== undefined && (
                            <span className="opacity-70">Review from {formatTime ? formatTime(rewatchTime) : rewatchTime.toFixed(1)}s</span>
                        )}
                    </div>
                </div>

                {checkpoint.type === 'quickQuiz' && checkpoint.options && (
                    <div className="space-y-2">
                        {checkpoint.options.map((option, idx) => {
                            const isSelected = selectedIndex === idx
                            const isRight = idx === correctIndex
                            const showWrong = isSelected && isCorrect === false
                            const showCorrectOutline = locked && isRight
                            const baseClasses = 'btn w-full justify-between'
                            const outlineSelectedCorrect = 'btn-outline border-2 border-success text-success'
                            const outlineSelectedWrong = 'btn-outline border-2 border-error text-error'
                            const outlineIdleCorrect = 'btn-outline border-2 border-success text-success'
                            const outlineIdle = 'btn-outline'
                            return (
                                <button
                                    type="button"
                                    key={`${checkpoint.prompt}-${option}`}
                                    className={`${baseClasses} ${isSelected
                                        ? (isCorrect ? outlineSelectedCorrect : outlineSelectedWrong)
                                        : showCorrectOutline
                                            ? outlineIdleCorrect
                                            : outlineIdle
                                        }`}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={locked}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="font-bold">{idx + 1}.</span>
                                        <span className="text-left">{option}</span>
                                    </span>
                                    {isRight && isCorrect && (
                                        <CheckCircleIcon className="text-success" fontSize="small" />
                                    )}
                                    {showWrong && <CancelIcon className="text-error" fontSize="small" />}
                                </button>
                            )
                        })}

                        {isCorrect === true && (
                            <div className="flex items-center gap-2 text-success font-semibold transition-transform" aria-live="polite">
                                <CheckCircleIcon fontSize="small" />
                                Nice! That's correct.
                            </div>
                        )}

                        {isCorrect === false && (
                            <div className="space-y-1 text-sm" aria-live="polite">
                                <div className="text-error font-semibold flex items-center gap-2">
                                    <CancelIcon fontSize="small" />
                                    Not quite. Review this moment.
                                </div>
                                <div className="text-base-content/80">Correct answer: <span className="font-semibold">{correctAnswerLabel}</span></div>
                                <div className="text-base-content/70">Check the explainer and try again.</div>
                            </div>
                        )}

                        {locked && (
                            <button type="button" className="btn btn-primary w-full" onClick={onComplete}>
                                Continue
                            </button>
                        )}

                    </div>
                )}

                {checkpoint.type === 'reflection' && (
                    <div className="space-y-3">
                        <textarea
                            className="textarea textarea-bordered w-full h-28"
                            placeholder="Type your thoughts here..."
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.currentTarget.value)}
                            disabled={locked}
                        />
                        {initialResponse?.feedback && (
                            <div className="text-sm text-base-content/70" aria-live="polite">{initialResponse.feedback}</div>
                        )}
                        <button type="button" className="btn btn-primary w-full" onClick={locked ? onComplete : handleTextSubmit} disabled={!locked && textAnswer.trim().length === 0}>
                            {locked ? 'Continue' : 'Submit'}
                        </button>
                    </div>
                )}

                {checkpoint.type === 'prediction' && (
                    <div className="space-y-3">
                        <textarea
                            className="textarea textarea-bordered w-full h-28"
                            placeholder="What do you think will happen next?"
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.currentTarget.value)}
                            disabled={locked}
                        />
                        {initialResponse?.feedback && (
                            <div className="text-sm text-base-content/70" aria-live="polite">{initialResponse.feedback}</div>
                        )}
                        <button type="button" className="btn btn-primary w-full" onClick={locked ? onComplete : handleTextSubmit} disabled={!locked && textAnswer.trim().length === 0}>
                            {locked ? 'Continue' : 'Submit'}
                        </button>
                    </div>
                )}

                {checkpoint.type === 'application' && (
                    <div className="space-y-3">
                        <textarea
                            className="textarea textarea-bordered w-full h-28"
                            placeholder="How would you apply this concept?"
                            value={textAnswer}
                            onChange={(e) => setTextAnswer(e.currentTarget.value)}
                            disabled={locked}
                        />
                        {initialResponse?.feedback && (
                            <div className="text-sm text-base-content/70" aria-live="polite">{initialResponse.feedback}</div>
                        )}
                        <button type="button" className="btn btn-primary w-full" onClick={locked ? onComplete : handleTextSubmit} disabled={!locked && textAnswer.trim().length === 0}>
                            {locked ? 'Continue' : 'Submit'}
                        </button>
                    </div>
                )}

                {!['quickQuiz', 'reflection', 'prediction', 'application'].includes(checkpoint.type) && (
                    <button type="button" className="btn btn-primary w-full" onClick={() => onComplete()}>
                        Continue
                    </button>
                )}
            </div>
        </div>
    )
}
