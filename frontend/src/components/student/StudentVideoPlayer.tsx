import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { CheckpointOverlay } from './CheckpointOverlay'
import { CheckpointNudge } from './CheckpointNudge'
import progressAPI from '../../api/progress.api'
import videosAPI from '../../api/videos.api'
import type { LearningCheckpoint, Concept } from '../../types/video.types'

const REWATCH_LEAD_FALLBACK_SECONDS = 8
const PAUSE_DELAY_FALLBACK_SECONDS = 0.35
const VOICE_CHECKPOINT_CLOSE_DELAY_MS = 1200

const parseSeconds = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
        const trimmed = value.trim()
        const parts = trimmed.split(':').map(p => Number.parseInt(p, 10))
        if (parts.every(p => Number.isFinite(p))) {
            if (parts.length === 3) {
                const [h, m, s] = parts
                return h * 3600 + m * 60 + s
            }
            if (parts.length === 2) {
                const [m, s] = parts
                return m * 60 + s
            }
        }
        const numeric = Number.parseFloat(trimmed.replace(/[^0-9.]/g, ''))
        if (Number.isFinite(numeric)) return numeric
    }
    return null
}

interface StudentVideoPlayerProps {
    videoUrl: string
    checkpoints: LearningCheckpoint[]
    concepts?: Concept[]
    onCheckpointReached?: (checkpoint: LearningCheckpoint) => void
    onTimeUpdate?: (time: number) => void
    onPlayingStateChange?: (isPlaying: boolean) => void
    initialTime?: number
    videoId?: string
    studentId?: string
    studentName?: string
}

export default function StudentVideoPlayer({
    videoUrl,
    checkpoints,
    concepts = [],
    onCheckpointReached,
    onTimeUpdate,
    onPlayingStateChange,
    initialTime = 0,
    videoId = 'video-unknown',
    studentId = 'student-guest',
    studentName = 'Student'
}: Readonly<StudentVideoPlayerProps>) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [videoDuration, setVideoDuration] = useState(0)
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const completedCheckpointsRef = useRef<Set<string>>(new Set()) // Use ref to avoid re-renders
    const [activeCheckpoint, setActiveCheckpoint] = useState<LearningCheckpoint | null>(null)
    const pendingCheckpointKeyRef = useRef<string | null>(null) // Use ref to avoid re-renders
    const announcedCheckpointsRef = useRef<Set<string>>(new Set()) // Use ref to avoid re-renders
    const [upcomingCheckpointKey, setUpcomingCheckpointKey] = useState<string | null>(null)
    const [upcomingConceptIndex, setUpcomingConceptIndex] = useState<number | null>(null)
    const [readAlongMode, setReadAlongMode] = useState(false)
    const [checkpointResponses, setCheckpointResponses] = useState<Record<string, {
        selectedIndex?: number
        isCorrect?: boolean
        answeredAt: number
        videoTime?: number
        answerText?: string
        feedback?: string
    }>>({})
    const [nudgeCheckpoint, setNudgeCheckpoint] = useState<LearningCheckpoint | null>(null)
    const dismissedCheckpointsRef = useRef<Set<string>>(new Set())
    const nudgeTimeoutRef = useRef<number | null>(null)
    const chimeAudioRef = useRef<HTMLAudioElement | null>(null)
    const pauseTimerRef = useRef<number | null>(null)
    const voiceCloseTimeoutRef = useRef<number | null>(null)
    const didHydrateResponsesRef = useRef(false)

    // Sort concepts once to match timeline display order
    const sortedConcepts = useMemo(() =>
        [...concepts].sort((a, b) => {
            const timeA = parseSeconds(a.timestamp) ?? 0
            const timeB = parseSeconds(b.timestamp) ?? 0
            return timeA - timeB
        }), [concepts]
    )

    const resolvePauseDelaySeconds = useCallback((checkpoint?: LearningCheckpoint | null) => {
        if (!checkpoint) return PAUSE_DELAY_FALLBACK_SECONDS
        const delay = parseSeconds(checkpoint.pauseDelaySeconds)
        if (delay !== null && delay >= 0) return delay
        return PAUSE_DELAY_FALLBACK_SECONDS
    }, [])

    const getCheckpointTime = useCallback((checkpoint?: LearningCheckpoint | null): number | null => {
        if (!checkpoint) return null
        const parsed = parseSeconds(checkpoint.timestamp)
        return parsed ?? null
    }, [])

    // Get rewatch start timestamp - use contextStartTimestamp if available, otherwise fallback to checkpoint timestamp
    const getContextStartTime = useCallback((checkpoint?: LearningCheckpoint | null): number | null => {

        // Hydrate previously-saved checkpoint responses (FireStore) so Review + overlay reflect past answers.
        useEffect(() => {
            if (didHydrateResponsesRef.current) return
            if (!studentId || !videoId) return

            didHydrateResponsesRef.current = true
                ; (async () => {
                    try {
                        const result = await progressAPI.getCheckpointResponsesForVideo(studentId, videoId)
                        const responses = Array.isArray(result?.responses) ? result.responses : []
                        if (responses.length === 0) return

                        setCheckpointResponses(prev => {
                            const next = { ...prev }
                            for (const r of responses) {
                                if (!r?.checkpointKey) continue
                                next[r.checkpointKey] = {
                                    selectedIndex: typeof r.selectedIndex === 'number' ? r.selectedIndex : undefined,
                                    isCorrect: typeof r.isCorrect === 'boolean' ? r.isCorrect : undefined,
                                    answeredAt: r.answeredAt ? Date.parse(r.answeredAt) : Date.now(),
                                    videoTime: typeof r.videoTime === 'number' ? r.videoTime : undefined,
                                    answerText: typeof r.answerText === 'string' ? r.answerText : undefined,
                                }
                            }
                            return next
                        })

                        for (const r of responses) {
                            if (!r?.checkpointKey) continue
                            completedCheckpointsRef.current.add(r.checkpointKey)
                            window.dispatchEvent(new CustomEvent('checkpointCompleted', { detail: { key: r.checkpointKey } }))
                        }
                    } catch (err) {
                        console.error('Failed to hydrate checkpoint responses', err)
                        didHydrateResponsesRef.current = false
                    }
                })()
        }, [studentId, videoId])
        if (!checkpoint) return null
        const checkpointTime = getCheckpointTime(checkpoint)
        if (checkpointTime === null) return null

        // Use contextStartTimestamp if available
        const contextStart = parseSeconds(checkpoint.contextStartTimestamp)
        if (contextStart !== null && contextStart >= 0) return contextStart

        // Fallback: start a few seconds before checkpoint
        return Math.max(0, checkpointTime - REWATCH_LEAD_FALLBACK_SECONDS)
    }, [getCheckpointTime])

    const getCheckpointKey = (checkpoint: LearningCheckpoint & { __key?: string }) =>
        checkpoint.__key || `${checkpoint.timestamp}-${checkpoint.type}-${checkpoint.prompt}`

    // Find the concept closest to checkpoint timestamp
    const getCheckpointConcept = (checkpoint: LearningCheckpoint): string | undefined => {
        if (!concepts || concepts.length === 0) return undefined
        const checkpointTime = typeof checkpoint.timestamp === 'number'
            ? checkpoint.timestamp
            : parseSeconds(checkpoint.timestamp) || 0

        // Find the most recent concept before or at the checkpoint
        let closestConcept: Concept | undefined
        let minDistance = Infinity

        for (const concept of concepts) {
            const conceptTime = typeof concept.timestamp === 'number'
                ? concept.timestamp
                : parseSeconds(concept.timestamp) || 0

            if (conceptTime <= checkpointTime) {
                const distance = checkpointTime - conceptTime
                if (distance < minDistance) {
                    minDistance = distance
                    closestConcept = concept
                }
            }
        }

        return closestConcept?.concept
    }

    const handleCheckpointComplete = () => {
        console.log('✅ Checkpoint completed - resuming video')

        // Emit event for Review tab to track completion
        if (activeCheckpoint) {
            const key = getCheckpointKey(activeCheckpoint)
            // Prevent immediate re-trigger after closing.
            completedCheckpointsRef.current.add(key)
            dismissedCheckpointsRef.current.delete(key)
            announcedCheckpointsRef.current.add(key)
            setUpcomingCheckpointKey(null)
            pendingCheckpointKeyRef.current = null

            const event = new CustomEvent('checkpointCompleted', {
                detail: { key }
            })
            window.dispatchEvent(event)
        }

        setActiveCheckpoint(null)
        resumeVideo()
    }

    const handleSkipCheckpoint = (checkpoint: LearningCheckpoint) => {
        console.log('⏭️ Checkpoint skipped:', checkpoint.prompt)
        const key = getCheckpointKey(checkpoint)
        completedCheckpointsRef.current.add(key)
        dismissedCheckpointsRef.current.add(key)
        announcedCheckpointsRef.current.add(key)
        setUpcomingCheckpointKey(null)
        pendingCheckpointKeyRef.current = null
        setActiveCheckpoint(null)
        resumeVideo()
    }

    const handleSeekTo = useCallback((seconds: number) => {
        const video = videoRef.current
        if (!video) return
        const oldTime = video.currentTime
        if (pauseTimerRef.current) {
            window.clearTimeout(pauseTimerRef.current)
            pauseTimerRef.current = null
            pendingCheckpointKeyRef.current = null
        }
        const clamped = Math.max(0, Math.min(seconds, videoDuration || seconds))
        video.currentTime = clamped
        setCurrentTime(clamped)

        // Emit seek event with from/to details
        window.dispatchEvent(new CustomEvent('videoSeek', {
            detail: { from: oldTime, to: clamped }
        }))

        // Determine if it's a rewind or forward
        const diff = clamped - oldTime
        if (Math.abs(diff) > 1) { // Only log if seeking more than 1 second
            if (diff < 0) {
                window.dispatchEvent(new CustomEvent('videoRewind', {
                    detail: { seconds: Math.abs(diff) }
                }))
            } else {
                window.dispatchEvent(new CustomEvent('videoForward', {
                    detail: { seconds: diff }
                }))
            }
        }
    }, [videoDuration])

    // Listen for read-along mode state changes and seek requests from timeline
    useEffect(() => {
        const handleReadAlongState = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>
            setReadAlongMode(customEvent.detail.enabled)
        }
        const handleSeekToTime = (e: Event) => {
            const customEvent = e as CustomEvent<number>
            handleSeekTo(customEvent.detail)
        }
        window.addEventListener('readAlongStateChange', handleReadAlongState)
        window.addEventListener('seekToTime', handleSeekToTime)
        return () => {
            window.removeEventListener('readAlongStateChange', handleReadAlongState)
            window.removeEventListener('seekToTime', handleSeekToTime)
        }
    }, [handleSeekTo])

    const playChime = useCallback(() => {
        try {
            if (!chimeAudioRef.current) {
                const audio = new Audio('/notif.mp3')
                audio.preload = 'auto'
                audio.volume = 0.35
                chimeAudioRef.current = audio
            }
            const audio = chimeAudioRef.current
            if (!audio) return
            audio.currentTime = 0
            void audio.play().catch(() => { })
        } catch (err) {
            console.error('Chime playback failed', err)
        }
    }, [])

    const openCheckpoint = useCallback((checkpoint: LearningCheckpoint) => {
        const video = videoRef.current
        if (video) {
            video.pause()
        }
        setPlaying(false)
        setActiveCheckpoint(checkpoint)
        setUpcomingCheckpointKey(null)
        pendingCheckpointKeyRef.current = null

        if (onCheckpointReached) {
            onCheckpointReached(checkpoint)
        }
        console.log('🎯 Checkpoint modal opened:', checkpoint.prompt)
    }, [onCheckpointReached])

    const handleCheckpointAnswerPersist = useCallback(async (checkpoint: LearningCheckpoint, selectedIndex: number, isCorrect: boolean, feedback?: string) => {
        try {
            const checkpointKey = getCheckpointKey(checkpoint)
            const answeredAt = Date.now()
            const videoTime = videoRef.current?.currentTime
            setCheckpointResponses(prev => ({
                ...prev,
                [checkpointKey]: {
                    selectedIndex,
                    isCorrect,
                    answeredAt,
                    videoTime,
                    feedback,
                }
            }))

            await progressAPI.saveCheckpointResponse({
                userId: studentId,
                studentName,
                videoId,
                checkpointKey,
                checkpointType: checkpoint.type,
                prompt: checkpoint.prompt,
                timestamp: checkpoint.timestamp,
                selectedIndex,
                isCorrect,
                videoTime,
                options: checkpoint.options
            })
        } catch (err) {
            console.error('Failed to persist checkpoint response', err)
        }
    }, [studentId, studentName, videoId])

    const handleCheckpointTextAnswerPersist = useCallback(async (checkpoint: LearningCheckpoint, answerText: string, feedback?: string) => {
        try {
            const checkpointKey = getCheckpointKey(checkpoint)
            const answeredAt = Date.now()
            const videoTime = videoRef.current?.currentTime
            setCheckpointResponses(prev => ({
                ...prev,
                [checkpointKey]: {
                    answeredAt,
                    videoTime,
                    answerText,
                    feedback,
                }
            }))

            await progressAPI.saveCheckpointResponse({
                userId: studentId,
                studentName,
                videoId,
                checkpointKey,
                checkpointType: checkpoint.type,
                prompt: checkpoint.prompt,
                timestamp: checkpoint.timestamp,
                selectedIndex: -1,
                isCorrect: false,
                videoTime,
                options: checkpoint.options,
                answerText,
            })
        } catch (err) {
            console.error('Failed to persist checkpoint text response', err)
        }
    }, [studentId, studentName, videoId])

    const normalizeSemantic = (value: string) =>
        value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()

    const resolveOptionIndexFromSemanticAnswer = useCallback((answerText: string, options: string[]): number | null => {
        const raw = answerText.trim()
        if (!raw) return null

        const normalizedRaw = normalizeSemantic(raw)

        // Handle "option 2", "choice two", "second", etc.
        const wordsToNumber: Record<string, number> = {
            one: 1,
            two: 2,
            three: 3,
            four: 4,
            five: 5,
            six: 6,
            seven: 7,
            eight: 8,
            nine: 9,
            ten: 10,
            first: 1,
            second: 2,
            third: 3,
            fourth: 4,
            fifth: 5,
            sixth: 6,
            seventh: 7,
            eighth: 8,
            ninth: 9,
            tenth: 10,
        }

        const optionMatch = normalizedRaw.match(/\b(?:option|choice|answer)\s+(?<token>[a-z0-9]+)\b/)
        const ordinalMatch = normalizedRaw.match(/\b(?<token>first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/)
        const token = optionMatch?.groups?.token ?? ordinalMatch?.groups?.token
        if (token) {
            const asNumber = Number.parseInt(token, 10)
            const ordinal = wordsToNumber[token]
            const n = Number.isFinite(asNumber) ? asNumber : ordinal
            if (typeof n === 'number' && Number.isFinite(n)) {
                const idx = n - 1
                if (idx >= 0 && idx < options.length) return idx
            }
        }

        // Handle "A", "B", "C" or "1", "2" style answers.
        const letter = raw.trim().toLowerCase()
        if (letter.length === 1) {
            const c = letter.charCodeAt(0)
            if (c >= 97 && c <= 122) {
                const idx = c - 97
                if (idx >= 0 && idx < options.length) return idx
            }
            const num = Number.parseInt(letter, 10)
            if (!Number.isNaN(num)) {
                const idx = num - 1
                if (idx >= 0 && idx < options.length) return idx
            }
        }

        const normalizedAnswer = normalizedRaw
        if (!normalizedAnswer) return null

        let bestIdx: number | null = null
        let bestScore = 0

        const answerTokens = new Set(normalizedAnswer.split(' ').filter(Boolean))

        options.forEach((opt, idx) => {
            const normalizedOpt = normalizeSemantic(opt)
            if (!normalizedOpt) return

            if (normalizedOpt === normalizedAnswer) {
                bestIdx = idx
                bestScore = 1
                return
            }

            // Simple token overlap (Jaccard-like), plus containment boost.
            const optTokens = new Set(normalizedOpt.split(' ').filter(Boolean))
            let overlap = 0
            for (const t of answerTokens) if (optTokens.has(t)) overlap += 1
            const union = new Set([...Array.from(answerTokens), ...Array.from(optTokens)]).size
            const jaccard = union ? overlap / union : 0

            const containsBoost = normalizedOpt.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOpt) ? 0.25 : 0
            const score = Math.min(1, jaccard + containsBoost)

            if (score > bestScore) {
                bestScore = score
                bestIdx = idx
            }
        })

        // Require a minimum confidence.
        if (bestIdx === null) return null
        if (bestScore < 0.35) return null
        return bestIdx
    }, [])

    // Sort checkpoints by timestamp and attach stable unique keys to avoid duplicates
    const sortedCheckpoints = useMemo(() => {
        // Deduplicate checkpoints by timestamp + type + prompt
        const seen = new Map<string, LearningCheckpoint>()
        const deduplicated = checkpoints.filter(cp => {
            const dedupeKey = `${getCheckpointTime(cp) ?? cp.timestamp}-${cp.type}-${cp.prompt}`
            if (seen.has(dedupeKey)) {
                console.log('⚠️ Duplicate checkpoint removed:', dedupeKey)
                return false
            }
            seen.set(dedupeKey, cp)
            return true
        })

        return deduplicated
            .map((cp, idx) => ({
                ...cp,
                __key: `${getCheckpointTime(cp) ?? cp.timestamp}-${cp.type}-${cp.prompt}-${idx}`
            }))
            .sort((a, b) => {
                const aTime = getCheckpointTime(a) ?? 0
                const bTime = getCheckpointTime(b) ?? 0
                return aTime - bTime
            })
    }, [checkpoints])

    // Call onTimeUpdate callback when currentTime changes
    useEffect(() => {
        if (onTimeUpdate) {
            onTimeUpdate(currentTime)
        }
    }, [currentTime, onTimeUpdate])

    // Call onPlayingStateChange callback when playing state changes
    useEffect(() => {
        if (onPlayingStateChange) {
            onPlayingStateChange(playing)
        }
    }, [playing, onPlayingStateChange])

    useEffect(() => {
        // Debug incoming checkpoint data and parsed timestamps when modal is missing
        console.log('🔍 checkpoints loaded', sortedCheckpoints.map(cp => ({
            key: cp.__key,
            ts: getCheckpointTime(cp),
            type: cp.type,
            prompt: cp.prompt,
            contextStartTimestamp: cp.contextStartTimestamp,
            pauseDelaySeconds: cp.pauseDelaySeconds
        })))
    }, [sortedCheckpoints])

    // Set initial time when video is loaded
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleLoadedMetadata = () => {
            if (initialTime > 0 && initialTime < video.duration) {
                video.currentTime = initialTime
                console.log('📍 Resuming from:', initialTime, 'seconds')
            }
            setVideoDuration(video.duration)
        }

        video.addEventListener('loadedmetadata', handleLoadedMetadata)
        return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }, [initialTime])

    // Handle play/pause from button
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        if (playing) {
            video.play().catch((err) => console.error('Play error:', err))
        } else {
            video.pause()
        }
    }, [playing])

    // Handle time updates and checkpoint detection
    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const handleTimeUpdate = () => {
            const time = video.currentTime
            setCurrentTime(time)

            // Check if we've reached a checkpoint (allowing for coarse timeupdate steps)
            // Only trigger if not already completed or scheduled
            const nextCheckpoint = sortedCheckpoints.find(cp => {
                const cpTime = getCheckpointTime(cp)
                if (cpTime === null) return false
                const key = getCheckpointKey(cp)
                const isScheduled = pendingCheckpointKeyRef.current === key
                const isPastCheckpoint = time >= cpTime
                const notCompleted = !completedCheckpointsRef.current.has(key)
                const shouldTrigger = isPastCheckpoint && notCompleted && !isScheduled

                if (isPastCheckpoint) {
                    console.log(`🔍 Checkpoint ${key}: time=${time.toFixed(1)}s, cpTime=${cpTime}s, isScheduled=${isScheduled}, notCompleted=${notCompleted}, completed=${completedCheckpointsRef.current.has(key)}, shouldTrigger=${shouldTrigger}`)
                }

                return shouldTrigger
            })

            // Upcoming cue at T-5s (and not already announced)
            const upcoming = sortedCheckpoints.find(cp => {
                const cpTime = getCheckpointTime(cp)
                if (cpTime === null) return false
                const secondsUntil = cpTime - time
                const key = getCheckpointKey(cp)
                const shouldAnnounce = secondsUntil <= 5 && secondsUntil > 0.5 && !completedCheckpointsRef.current.has(key) && !announcedCheckpointsRef.current.has(key)

                if (shouldAnnounce) {
                    console.log(`🔔 Announcing checkpoint ${key}: secondsUntil=${secondsUntil.toFixed(1)}s`)
                }

                return shouldAnnounce
            })

            if (upcoming) {
                const key = getCheckpointKey(upcoming)
                announcedCheckpointsRef.current.add(key)
                setUpcomingCheckpointKey(key)
                // Removed playChime() - sound plays only when nudge appears
            }

            if (nextCheckpoint) {
                const key = getCheckpointKey(nextCheckpoint)

                // Check if this checkpoint was dismissed - mark as completed and skip
                if (dismissedCheckpointsRef.current.has(key)) {
                    console.log(`⏭️ Checkpoint ${key} was dismissed, marking as completed`)
                    completedCheckpointsRef.current.add(key)
                    // Don't return - continue processing other checkpoints
                } else {
                    console.log(`✅ REACHED checkpoint ${key} - showing soft nudge`)
                    pendingCheckpointKeyRef.current = key

                    // Play notification sound when nudge appears
                    playChime()

                    // SHOW NUDGE instead of auto-pausing
                    setNudgeCheckpoint(nextCheckpoint)

                    // Auto-dismiss nudge after 8 seconds if not interacted with
                    if (nudgeTimeoutRef.current) {
                        window.clearTimeout(nudgeTimeoutRef.current)
                    }

                    nudgeTimeoutRef.current = window.setTimeout(() => {
                        console.log(`⏱️ Nudge auto-dismissed for ${key}`)
                        setNudgeCheckpoint(null)
                        dismissedCheckpointsRef.current.add(key)
                        completedCheckpointsRef.current.add(key)
                        pendingCheckpointKeyRef.current = null
                        nudgeTimeoutRef.current = null

                        // Emit event for parent to track
                        const event = new CustomEvent('checkpointDismissed', {
                            detail: { key }
                        })
                        window.dispatchEvent(event)
                    }, 8000)
                }
            }

            // Detect active concept (show for entire duration) - must match timeline logic
            const activeConcept = sortedConcepts.findIndex((concept, idx) => {
                const conceptTime = parseSeconds(concept.timestamp)
                if (conceptTime === null) return false

                // Match ConceptTimeline.tsx logic exactly
                const nextConceptTime = idx < sortedConcepts.length - 1
                    ? parseSeconds(sortedConcepts[idx + 1].timestamp) ?? Infinity
                    : Infinity
                const displayUntil = Math.min(conceptTime + 60, nextConceptTime)

                const isActive = time >= conceptTime && time < displayUntil
                return isActive
            })

            if (activeConcept !== -1 && activeConcept !== upcomingConceptIndex) {
                setUpcomingConceptIndex(activeConcept)
            } else if (activeConcept === -1 && upcomingConceptIndex !== null) {
                setUpcomingConceptIndex(null)
            }
        }

        const handlePlay = () => setPlaying(true)
        const handlePause = () => setPlaying(false)
        const handleEnded = () => {
            setPlaying(false)
            console.log('🎬 Video ended')
        }
        video.addEventListener('timeupdate', handleTimeUpdate)
        video.addEventListener('play', handlePlay)
        video.addEventListener('pause', handlePause)
        video.addEventListener('ended', handleEnded)

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate)
            video.removeEventListener('play', handlePlay)
            video.removeEventListener('pause', handlePause)
            video.removeEventListener('ended', handleEnded)
            if (pauseTimerRef.current) {
                window.clearTimeout(pauseTimerRef.current)
                pauseTimerRef.current = null
            }
            if (nudgeTimeoutRef.current) {
                window.clearTimeout(nudgeTimeoutRef.current)
                nudgeTimeoutRef.current = null
            }
        }
    }, [sortedCheckpoints, onCheckpointReached, upcomingCheckpointKey, playChime, openCheckpoint, resolvePauseDelaySeconds])

    // Resume video helper
    const resumeVideo = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.play().catch((err) => console.error('Play error:', err))
            setPlaying(true)
        }
    }, [])

    // Listen for global tutor control events (pause/resume, checkpoint answers)
    useEffect(() => {
        const handlePauseVideo = () => {
            const video = videoRef.current
            if (!video) return
            video.pause()
            setPlaying(false)
        }

        const handleResumeVideo = () => {
            resumeVideo()
        }

        const handleTutorCheckpointAnswer = (e: Event) => {
            const checkpoint = activeCheckpoint
            if (!checkpoint) return

            const customEvent = e as CustomEvent<{ selectedIndex?: number; selectedAnswer?: string; textAnswer?: string; answerText?: string }>
            const selectedIndexRaw = customEvent.detail?.selectedIndex
            const selectedAnswer = customEvent.detail?.selectedAnswer
            const textAnswer = (customEvent.detail?.textAnswer ?? customEvent.detail?.answerText)

            const checkpointKey = getCheckpointKey(checkpoint)
            completedCheckpointsRef.current.add(checkpointKey)
            setUpcomingCheckpointKey(null)
            pendingCheckpointKeyRef.current = null

            const scheduleVoiceClose = () => {
                if (voiceCloseTimeoutRef.current) {
                    window.clearTimeout(voiceCloseTimeoutRef.current)
                    voiceCloseTimeoutRef.current = null
                }
                voiceCloseTimeoutRef.current = window.setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('checkpointCompleted', { detail: { key: checkpointKey } }))
                    setActiveCheckpoint(null)
                    resumeVideo()
                    voiceCloseTimeoutRef.current = null
                }, VOICE_CHECKPOINT_CLOSE_DELAY_MS)
            }

            // Free-text checkpoints: persist answer text.
            if (checkpoint.type !== 'quickQuiz') {
                const answer = (textAnswer || selectedAnswer || '').trim()
                if (!answer) return
                void handleCheckpointTextAnswerPersist(checkpoint, answer, 'Saved your answer.')

                window.dispatchEvent(new CustomEvent('checkpointAnswered', {
                    detail: {
                        key: checkpointKey,
                        checkpoint: checkpoint.prompt,
                        type: checkpoint.type,
                        answerText: answer,
                    }
                }))

                scheduleVoiceClose()
                return
            }

            if (!checkpoint.options || checkpoint.options.length === 0) return

            let selectedIndex: number | null = null
            if (typeof selectedIndexRaw === 'number' && Number.isFinite(selectedIndexRaw)) {
                // Treat tutor event index as 0-based; the client tool converts 1-based inputs.
                selectedIndex = Math.trunc(selectedIndexRaw)
            } else if (typeof selectedAnswer === 'string' && selectedAnswer.length) {
                const idx = checkpoint.options.indexOf(selectedAnswer)
                if (idx >= 0) selectedIndex = idx
            } else if (typeof textAnswer === 'string' && textAnswer.trim().length) {
                selectedIndex = resolveOptionIndexFromSemanticAnswer(textAnswer, checkpoint.options)
            }

            // If semantic resolution fails, still persist the free-form answer so
            // the student isn't stuck waiting for the overlay to close.
            if (selectedIndex === null) {
                const semantic = (textAnswer || selectedAnswer || '').trim()
                if (!semantic) return
                void handleCheckpointTextAnswerPersist(checkpoint, semantic, 'Saved your answer.')
                scheduleVoiceClose()
                return
            }
            if (selectedIndex < 0 || selectedIndex >= checkpoint.options.length) return

            const selectedNumber = selectedIndex + 1

            // Mirror CheckpointOverlay correctness logic.
            let correctIndex = -1
            if (checkpoint.correctAnswer !== undefined) {
                const answer = checkpoint.correctAnswer
                if (typeof answer === 'number') {
                    correctIndex = answer
                } else {
                    const numeric = Number.parseInt(answer, 10)
                    if (!Number.isNaN(numeric)) {
                        correctIndex = numeric
                    } else {
                        correctIndex = checkpoint.options.findIndex((opt) => opt === answer)
                    }
                }
            }

            const isCorrect = selectedIndex === correctIndex

            const feedback = isCorrect
                ? 'Correct.'
                : (checkpoint.options?.[correctIndex]
                    ? `Not quite — the correct answer is: ${checkpoint.options[correctIndex]}`
                    : 'Not quite.')

            // Emit answer event for interaction logging parity with UI clicks.
            window.dispatchEvent(new CustomEvent('checkpointAnswered', {
                detail: {
                    key: checkpointKey,
                    checkpoint: checkpoint.prompt,
                    type: checkpoint.type,
                    selectedAnswer: checkpoint.options?.[selectedIndex],
                    correctAnswer: checkpoint.options?.[correctIndex],
                    isCorrect,
                    selectedNumber,
                }
            }))

            void handleCheckpointAnswerPersist(checkpoint, selectedIndex, isCorrect, feedback)
            scheduleVoiceClose()
        }

        window.addEventListener('pauseVideo', handlePauseVideo)
        window.addEventListener('resumeVideo', handleResumeVideo)
        window.addEventListener('tutorCheckpointAnswer', handleTutorCheckpointAnswer)
        return () => {
            window.removeEventListener('pauseVideo', handlePauseVideo)
            window.removeEventListener('resumeVideo', handleResumeVideo)
            window.removeEventListener('tutorCheckpointAnswer', handleTutorCheckpointAnswer)
            if (voiceCloseTimeoutRef.current) {
                window.clearTimeout(voiceCloseTimeoutRef.current)
                voiceCloseTimeoutRef.current = null
            }
        }
    }, [activeCheckpoint, handleCheckpointAnswerPersist, handleCheckpointTextAnswerPersist, resumeVideo, resolveOptionIndexFromSemanticAnswer])

    // Handle nudge engage (user wants to answer)
    const handleNudgeEngage = useCallback(() => {
        if (!nudgeCheckpoint) return

        const key = getCheckpointKey(nudgeCheckpoint)
        console.log(`👆 User engaged with nudge ${key}`)

        // Clear auto-dismiss timeout
        if (nudgeTimeoutRef.current) {
            window.clearTimeout(nudgeTimeoutRef.current)
            nudgeTimeoutRef.current = null
        }

        // Pause video and open checkpoint
        if (videoRef.current) {
            videoRef.current.pause()
            setPlaying(false)
        }

        // Emit interaction event with concept info
        const relatedConcept = getCheckpointConcept(nudgeCheckpoint)
        window.dispatchEvent(new CustomEvent('checkpointEngaged', {
            detail: {
                key,
                type: nudgeCheckpoint.type,
                concept: relatedConcept,
                timestamp: currentTime
            }
        }))

        completedCheckpointsRef.current.add(key)
        openCheckpoint(nudgeCheckpoint)
        setNudgeCheckpoint(null)
        pendingCheckpointKeyRef.current = null
    }, [nudgeCheckpoint, openCheckpoint, concepts, currentTime])

    // Handle nudge dismiss (user wants to continue watching)
    const handleNudgeDismiss = useCallback(() => {
        if (!nudgeCheckpoint) return

        const key = getCheckpointKey(nudgeCheckpoint)
        console.log(`👋 User dismissed nudge ${key}`)

        // Clear auto-dismiss timeout
        if (nudgeTimeoutRef.current) {
            window.clearTimeout(nudgeTimeoutRef.current)
            nudgeTimeoutRef.current = null
        }

        // Mark as dismissed and completed to not show again
        dismissedCheckpointsRef.current.add(key)
        completedCheckpointsRef.current.add(key)
        setNudgeCheckpoint(null)
        pendingCheckpointKeyRef.current = null

        // Emit event for parent to track with concept info
        const relatedConcept = getCheckpointConcept(nudgeCheckpoint)
        const event = new CustomEvent('checkpointDismissed', {
            detail: {
                key,
                type: nudgeCheckpoint.type,
                concept: relatedConcept,
                timestamp: currentTime
            }
        })
        window.dispatchEvent(event)
    }, [nudgeCheckpoint, concepts, currentTime])

    const handleSpeedChange = (speed: number) => {
        setPlaybackSpeed(speed)
        window.dispatchEvent(new CustomEvent('videoSpeedChange', {
            detail: { speed }
        }))
    }

    // Keep volume/mute in sync with element
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.volume = muted ? 0 : volume
        video.muted = muted || volume === 0
    }, [volume, muted])

    // Keep playback speed in sync with element
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.playbackRate = playbackSpeed
    }, [playbackSpeed])

    // Listen for seek to checkpoint events (from Review tab)
    useEffect(() => {
        const handleSeekToCheckpoint = (e: Event) => {
            const customEvent = e as CustomEvent<{
                checkpoint?: LearningCheckpoint
                timestamp?: number
                type?: LearningCheckpoint['type']
                prompt?: string
            }>

            const detail = customEvent.detail
            if (!detail) return

            const video = videoRef.current
            if (!video) return

            let checkpoint = detail.checkpoint
            let timestamp = typeof detail.timestamp === 'number' ? detail.timestamp : undefined

            // Allow tools to target a checkpoint without passing the full object.
            if (!checkpoint && timestamp !== undefined) {
                const targetTimestamp = timestamp
                const prompt = typeof detail.prompt === 'string' ? detail.prompt : undefined
                const type = detail.type

                const candidates = sortedCheckpoints
                    .filter((cp) => {
                        const cpTime = getCheckpointTime(cp)
                        if (cpTime === null) return false
                        return Math.abs(cpTime - targetTimestamp) <= 0.75
                    })
                    .filter((cp) => (type ? cp.type === type : true))
                    .filter((cp) => (prompt ? cp.prompt === prompt : true))

                if (candidates.length > 0) {
                    checkpoint = candidates[0]
                    timestamp = getCheckpointTime(checkpoint) ?? checkpoint.timestamp
                }
            }

            if (!checkpoint || timestamp === undefined) return

            // Seek to checkpoint
            video.currentTime = timestamp

            // Pause and open checkpoint overlay
            video.pause()
            setPlaying(false)

            // Open checkpoint (don't mark as completed yet - wait for answer)
            const key = getCheckpointKey(checkpoint)
            dismissedCheckpointsRef.current.delete(key) // Remove from dismissed list

            // Emit event to update Review tab
            const removeEvent = new CustomEvent('checkpointReEngaged', {
                detail: { key }
            })
            window.dispatchEvent(removeEvent)

            openCheckpoint(checkpoint)

            console.log('🎯 Seeked to checkpoint:', key)
        }

        window.addEventListener('seekToCheckpoint', handleSeekToCheckpoint)
        return () => window.removeEventListener('seekToCheckpoint', handleSeekToCheckpoint)
    }, [getCheckpointTime, openCheckpoint, sortedCheckpoints])

    // Expose resume method to parent via ref
    useEffect(() => {
        if (videoRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (videoRef.current as any).resumeVideo = resumeVideo
        }
    }, [resumeVideo])

    useEffect(() => {
        return () => {
            if (chimeAudioRef.current) {
                chimeAudioRef.current.pause()
                chimeAudioRef.current = null
            }
        }
    }, [])

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const activeRewatchStart = getContextStartTime(activeCheckpoint)

    return (
        <div className="space-y-3">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video group">
                {/* Loading overlay */}
                {loading && !error && (
                    <div className="absolute inset-0 bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center">
                        <div className="loading loading-spinner loading-lg text-primary" aria-label="Loading video" />
                    </div>
                )}

                {/* Error overlay */}
                {error && (
                    <div className="absolute inset-0 bg-error/10 flex items-center justify-center p-6 text-center z-20">
                        <div className="space-y-2 max-w-md">
                            <div className="text-error font-semibold">Failed to load video</div>
                            <div className="text-sm text-base-content/70">{error}</div>
                        </div>
                    </div>
                )}

                {/* Checkpoint Nudge (soft pause) */}
                {nudgeCheckpoint && !activeCheckpoint && (
                    <CheckpointNudge
                        checkpoint={nudgeCheckpoint}
                        onEngage={handleNudgeEngage}
                        onDismiss={handleNudgeDismiss}
                    />
                )}

                {/* COMMENTED OUT: Upcoming checkpoint preview with hover card
                {(upcomingCheckpoint || nudgeCheckpoint) && !activeCheckpoint && (
                    <div className="absolute top-4 left-4 z-30 pointer-events-auto">
                        <div className="group/checkpoint">
                            <div className={`relative w-16 h-16 inline-flex items-center justify-center rounded-full ${
                                nudgeCheckpoint 
                                    ? checkpointTone(nudgeCheckpoint.type).bg 
                                    : upcomingCheckpoint 
                                        ? checkpointTone(upcomingCheckpoint.type).bg 
                                        : 'bg-primary'
                            } text-white shadow-lg ring-2 ring-white/20 cursor-pointer`}>
                                {!nudgeCheckpoint && <span className="absolute inset-0 rounded-full animate-ping bg-white/20" aria-hidden />}
                                <span className="text-3xl text-white relative" aria-hidden>
                                    {renderCheckpointIcon((nudgeCheckpoint || upcomingCheckpoint)!.type)}
                                </span>
                                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="20"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="4"
                                        strokeDasharray={countdownCircumference}
                                        strokeDashoffset={countdownCircumference * (1 - upcomingCountdownProgress)}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <div className={`absolute left-20 top-0 ${
                                nudgeCheckpoint 
                                    ? 'opacity-100 scale-100 pointer-events-auto animate-bounce-in' 
                                    : 'opacity-0 scale-95 pointer-events-none group-hover/checkpoint:opacity-100 group-hover/checkpoint:scale-100 group-hover/checkpoint:pointer-events-auto'
                            } transition-all duration-200`}>
                                <div className={`${
                                    checkpointTone((nudgeCheckpoint || upcomingCheckpoint)!.type).bg
                                } shadow-2xl rounded-2xl p-4 w-80 border-2 border-base-100`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-base-100 flex items-center justify-center text-primary flex-shrink-0">
                                            {renderCheckpointIcon((nudgeCheckpoint || upcomingCheckpoint)!.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-base-100 uppercase tracking-wide">
                                                    {(nudgeCheckpoint || upcomingCheckpoint)!.type}
                                                </span>
                                                {upcomingSecondsLeft !== null && !nudgeCheckpoint && (
                                                    <span className="text-xs font-semibold text-base-100/80">
                                                        in {upcomingSecondsLeft}s
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-base-100/90 font-medium mb-3">
                                                Quick check?
                                            </p>
                                            {nudgeCheckpoint && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleNudgeEngage}
                                                        className="btn btn-sm bg-base-100 hover:bg-base-200 text-base-content border-none flex-1"
                                                    >
                                                        Pause & Answer
                                                    </button>
                                                    <button
                                                        onClick={handleNudgeDismiss}
                                                        className="btn btn-sm btn-ghost text-base-100 hover:bg-base-100/20 border-base-100/30"
                                                    >
                                                        Skip
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                END COMMENTED OUT */}

                {/* Active concept progress indicator */}
                {upcomingConceptIndex !== null && !activeCheckpoint && (
                    <div className="absolute top-4 right-4 z-30 pointer-events-auto group/concept">
                        <div className="relative w-16 h-16 inline-flex items-center justify-center rounded-full bg-info text-white shadow-lg ring-2 ring-white/20">
                            <span className="absolute inset-0 rounded-full animate-pulse bg-white/10" aria-hidden />
                            <div className="relative text-center">
                                <div className="text-xl font-bold leading-none">{upcomingConceptIndex + 1}</div>
                                <div className="text-[10px] opacity-70 leading-none mt-0.5">of {sortedConcepts.length}</div>
                            </div>
                            <span className="sr-only">Concept {upcomingConceptIndex + 1} of {sortedConcepts.length}</span>
                            {(() => {
                                const concept = sortedConcepts[upcomingConceptIndex]
                                if (!concept) return null
                                const conceptTime = parseSeconds(concept.timestamp)
                                if (conceptTime === null) return null

                                // Calculate concept end time
                                const nextConceptTime = upcomingConceptIndex < sortedConcepts.length - 1
                                    ? parseSeconds(sortedConcepts[upcomingConceptIndex + 1].timestamp) ?? (conceptTime + 60)
                                    : conceptTime + 60

                                const conceptDuration = nextConceptTime - conceptTime
                                const elapsed = currentTime - conceptTime
                                const progress = Math.max(0, Math.min(1, elapsed / conceptDuration))
                                const circumference = 2 * Math.PI * 20

                                return (
                                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48" aria-hidden>
                                        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4" />
                                        <circle
                                            cx="24"
                                            cy="24"
                                            r="20"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="4"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={circumference * (1 - progress)}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                )
                            })()}
                        </div>

                        <div className="absolute right-0 top-full pt-2 w-80 opacity-0 scale-95 pointer-events-none group-hover/concept:opacity-100 group-hover/concept:scale-100 group-hover/concept:pointer-events-auto transition-all duration-150">
                            <div className="bg-base-100 text-base-content rounded-xl shadow-2xl border border-info/20 p-4 space-y-3">
                                {(() => {
                                    const concept = sortedConcepts[upcomingConceptIndex]
                                    if (!concept) return null
                                    const conceptTime = parseSeconds(concept.timestamp)
                                    if (conceptTime === null) return null

                                    // Calculate progress
                                    const nextConceptTime = upcomingConceptIndex < sortedConcepts.length - 1
                                        ? parseSeconds(sortedConcepts[upcomingConceptIndex + 1].timestamp) ?? (conceptTime + 60)
                                        : conceptTime + 60

                                    const conceptDuration = nextConceptTime - conceptTime
                                    const elapsed = currentTime - conceptTime
                                    const progressPercent = Math.round((elapsed / conceptDuration) * 100)

                                    return (
                                        <>
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-xs uppercase font-semibold tracking-wide text-info">
                                                    Concept {upcomingConceptIndex + 1} of {sortedConcepts.length}
                                                </div>
                                                <div className="text-xs font-semibold bg-info/15 text-info px-2 py-0.5 rounded-full">{progressPercent}%</div>
                                            </div>
                                            <div className="text-base font-bold line-clamp-2" title={concept.concept}>{concept.concept}</div>
                                            <div className="flex items-center gap-3 mt-3">
                                                <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                    <span className="text-sm font-medium">Read along</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={readAlongMode}
                                                        className="toggle toggle-info"
                                                        onChange={(e) => {
                                                            e.stopPropagation()
                                                            const toggleEvent = new CustomEvent('toggleReadAlong')
                                                            window.dispatchEvent(toggleEvent)
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        title="Show full details while playing"
                                                    />
                                                </label>
                                                <button
                                                    className="btn btn-sm btn-circle btn-ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        // Trigger expansion first
                                                        const expandEvent = new CustomEvent('expandConcept', {
                                                            detail: { conceptIndex: upcomingConceptIndex }
                                                        })
                                                        window.dispatchEvent(expandEvent)

                                                        // Scroll to timeline section first, then to the specific concept
                                                        const timelineElement = document.querySelector('[data-timeline-section]')
                                                        timelineElement?.scrollIntoView({ behavior: 'smooth', block: 'start' })

                                                        // Wait for expansion to complete, then scroll to active concept
                                                        setTimeout(() => {
                                                            const scrollEvent = new CustomEvent('scrollToActiveConcept')
                                                            window.dispatchEvent(scrollEvent)
                                                        }, 300)
                                                    }}
                                                    title="Jump to this concept in timeline"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </>
                                    )
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Checkpoint overlay embedded */}
                {activeCheckpoint && (
                    <CheckpointOverlay
                        checkpoint={activeCheckpoint}
                        onComplete={handleCheckpointComplete}
                        onSkip={handleSkipCheckpoint}
                        studentName={studentName}
                        initialResponse={checkpointResponses[getCheckpointKey(activeCheckpoint)] || null}
                        onAnswer={({ selectedIndex, isCorrect, answerText }) => {
                            if (typeof answerText === 'string' && answerText.trim().length) {
                                void handleCheckpointTextAnswerPersist(activeCheckpoint, answerText.trim())
                                return
                            }
                            if (typeof selectedIndex === 'number' && typeof isCorrect === 'boolean') {
                                void handleCheckpointAnswerPersist(activeCheckpoint, selectedIndex, isCorrect)
                            }
                        }}
                        onRewatch={(targetTime) => {
                            const key = getCheckpointKey(activeCheckpoint)
                            setActiveCheckpoint(null)
                            setUpcomingCheckpointKey(null)
                            pendingCheckpointKeyRef.current = null
                            completedCheckpointsRef.current.delete(key)
                            announcedCheckpointsRef.current.delete(key)
                            const contextStart = getContextStartTime(activeCheckpoint)
                            handleSeekTo(contextStart ?? Math.max(0, targetTime - 5))
                            resumeVideo()
                        }}
                        checkpointTimestamp={activeCheckpoint.timestamp}
                        rewatchTime={activeRewatchStart ?? undefined}
                        formatTime={formatTime}
                    />
                )}

                <video
                    ref={videoRef}
                    src={videoUrl}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover"
                    onContextMenu={(e) => e.preventDefault()}
                    onLoadStart={() => setLoading(true)}
                    onLoadedData={(e) => {
                        setLoading(false)

                        // Generate and cache thumbnail when video loads (only once)
                        if (videoId && videoId !== 'video-unknown' && !e.currentTarget.dataset.thumbnailCaptured) {
                            e.currentTarget.dataset.thumbnailCaptured = 'true'

                            const timestamp = sortedConcepts[0]?.timestamp ? parseSeconds(sortedConcepts[0].timestamp) ?? 1 : 1
                            const originalTime = e.currentTarget.currentTime
                            const videoElement = e.currentTarget // Store reference before async

                            const captureFrame = () => {
                                if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
                                    const canvas = document.createElement('canvas')
                                    canvas.width = 320
                                    canvas.height = 180
                                    const ctx = canvas.getContext('2d')
                                    if (ctx && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                                        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
                                        const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8)

                                        // Cache to Firestore (don't await to avoid blocking)
                                        videosAPI.cacheThumbnail(videoId, thumbnailDataUrl)
                                            .then(() => console.log('✅ Thumbnail cached for video:', videoId))
                                            .catch(err => console.warn('Failed to cache thumbnail:', err))
                                    }
                                }

                                // Reset to original time
                                videoElement.currentTime = originalTime
                            }

                            videoElement.currentTime = timestamp
                            videoElement.addEventListener('seeked', captureFrame, { once: true })
                        }
                    }}
                    onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onPlay={() => {
                        setPlaying(true)
                        // Emit manual play event (only if not auto-playing from checkpoint)
                        window.dispatchEvent(new CustomEvent('manualPlay'))
                    }}
                    onPause={() => {
                        setPlaying(false)
                        // Emit manual pause event (only if not auto-pausing for checkpoint)
                        if (!activeCheckpoint) {
                            window.dispatchEvent(new CustomEvent('manualPause'))
                        }
                    }}
                    onCanPlay={() => setLoading(false)}
                    onError={(e) => {
                        console.error('Video error:', e)
                        setLoading(false)
                        setError('Video file could not be loaded. The signed URL may have expired.')
                    }}
                >
                    <track kind="captions" src="data:text/vtt,WEBVTT" label="Captions" />
                </video>

                {/* Click-to-toggle overlay when idle */}
                {!loading && !error && !activeCheckpoint && (
                    <button
                        type="button"
                        className="absolute inset-0 z-10 cursor-pointer focus:outline-none"
                        onClick={() => setPlaying((prev) => !prev)}
                        aria-label={playing ? 'Pause video' : 'Play video'}
                    >
                        <span className="sr-only">Toggle play</span>
                    </button>
                )}

                {/* Play/Pause hover icon */}
                {!loading && !error && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                            {playing ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white ml-1">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                    </div>
                )}

                {/* Custom Controls */}
                <div className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 rounded-b-lg ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    <div className="px-4 py-3 space-y-3">
                        {/* Timeline */}
                        <div className="relative h-4">
                            <div className="absolute inset-0 h-1.5 bg-white/20 rounded-full cursor-pointer relative group/progress mt-1">
                                <div
                                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                                    style={{ width: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%` }}
                                />

                                {sortedCheckpoints.map((checkpoint) => {
                                    const checkpointTime = getCheckpointTime(checkpoint)
                                    const position = videoDuration && checkpointTime !== null ? (checkpointTime / videoDuration) * 100 : 0
                                    const checkpointKey = getCheckpointKey(checkpoint)
                                    const isCompleted = completedCheckpointsRef.current.has(checkpointKey)

                                    return (
                                        <div
                                            key={checkpointKey}
                                            className="absolute inset-y-0 w-1 cursor-pointer hover:w-1.5 transition-all"
                                            style={{ left: `${position}%` }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSeekTo(checkpoint.timestamp)
                                            }}
                                            title={`${checkpoint.type} at ${formatTime(checkpointTime ?? 0)}`}
                                        >
                                            <div className={`w-full h-full ${isCompleted ? 'bg-success' : 'bg-warning'} opacity-80 hover:opacity-100`} />
                                        </div>
                                    )
                                })}

                                {/* Concept markers */}
                                {sortedConcepts.map((concept, idx) => {
                                    const conceptTime = parseSeconds(concept.timestamp)
                                    if (conceptTime === null || !videoDuration) return null

                                    const position = (conceptTime / videoDuration) * 100
                                    const isPassed = currentTime > conceptTime
                                    const isActive = upcomingConceptIndex === idx

                                    return (
                                        <div
                                            key={`concept-${idx}`}
                                            className="absolute inset-y-0 w-1 cursor-pointer hover:w-1.5 transition-all z-10"
                                            style={{ left: `${position}%` }}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleSeekTo(concept.timestamp)
                                            }}
                                            title={`Concept ${idx + 1}: ${concept.concept} at ${formatTime(conceptTime)}`}
                                        >
                                            <div className={`w-full h-full ${isActive ? 'bg-info animate-pulse' :
                                                isPassed ? 'bg-success/60' :
                                                    'bg-info/40'
                                                } opacity-70 hover:opacity-100`} />
                                        </div>
                                    )
                                })}

                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg"
                                    style={{ left: `${videoDuration ? (currentTime / videoDuration) * 100 : 0}%`, marginLeft: '-6px' }}
                                />
                            </div>

                            <input
                                type="range"
                                min={0}
                                max={videoDuration || 0}
                                step={0.1}
                                value={currentTime}
                                onChange={(e) => handleSeekTo(Number(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                                aria-label="Video progress"
                            />
                        </div>

                        {/* Controls row */}
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-circle btn-sm bg-white/20 hover:bg-white/30 border-none"
                                    onClick={() => setPlaying((prev) => !prev)}
                                    aria-label={playing ? 'Pause' : 'Play'}
                                >
                                    {playing ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                                <div className="text-sm font-mono tabular-nums">
                                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Playback Speed */}
                                <div className="dropdown dropdown-top dropdown-end">
                                    <button
                                        type="button"
                                        tabIndex={0}
                                        className="btn btn-circle btn-sm bg-white/20 hover:bg-white/30 border-none text-xs font-bold"
                                        aria-label="Playback speed"
                                    >
                                        {playbackSpeed}x
                                    </button>
                                    <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-32 mb-2">
                                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                                            <li key={speed}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSpeedChange(speed)}
                                                    className={playbackSpeed === speed ? 'active' : ''}
                                                >
                                                    {speed}x {speed === 1 ? '(Normal)' : ''}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-circle btn-sm bg-white/20 hover:bg-white/30 border-none"
                                    onClick={() => setMuted((prev) => !prev)}
                                    aria-label={muted ? 'Unmute' : 'Mute'}
                                >
                                    {muted || volume === 0 ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                                            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                                        </svg>
                                    )}
                                </button>

                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={muted ? 0 : volume}
                                    onChange={(e) => {
                                        const val = Number.parseFloat(e.target.value)
                                        setVolume(val)
                                        if (val === 0) setMuted(true)
                                        if (val > 0 && muted) setMuted(false)
                                        if (videoRef.current) {
                                            videoRef.current.volume = val
                                            videoRef.current.muted = val === 0
                                        }
                                    }}
                                    className="range range-xs w-24"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
