import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Video, LearningCheckpoint } from '../types/video.types'
import videosAPI from '../api/videos.api'
import progressAPI from '../api/progress.api'
import StudentVideoPlayer from '../components/student/StudentVideoPlayer'
import { ConceptTimeline } from '../components/student/ConceptTimeline'
import type { VideoInteraction } from '../components/student/InteractionLog'
import { VoiceTutorWidget } from '../components/student/VoiceTutorWidget'
import { TutorDebugProvider } from '../contexts/tutorDebug.context'
import { useAuth } from '../auth/AuthContext'
import { useStruggleDetection } from '../hooks/useStruggleDetection'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ApiKeysButton from '../components/settings/ApiKeysButton'

export default function StudentWatchPage() {
    const auth = useAuth()
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [video, setVideo] = useState<Video | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [showBackToVideo, setShowBackToVideo] = useState(false)
    const [timelineWidth, setTimelineWidth] = useState(460)
    const [isResizing, setIsResizing] = useState(false)
    const [dismissedCheckpoints, setDismissedCheckpoints] = useState<Set<string>>(new Set())
    const [completedCheckpoints, setCompletedCheckpoints] = useState<Set<string>>(new Set())
    const [interactions, setInteractions] = useState<VideoInteraction[]>([])
    const videoPlayerRef = useRef<HTMLDivElement>(null)
    const timelineRef = useRef<HTMLDivElement>(null)
    const studentId = auth.user?.uid || 'student-guest'
    const studentName = auth.user?.displayName || auth.user?.email || 'Student'

    // Struggle detection with soft nudges
    const { isStruggling, rewindCount, dismiss: dismissStruggle } = useStruggleDetection({
        interactionLogs: interactions,
        currentVideoTime: currentTime,
        rewindThreshold: 3,
        sectionWindow: 15,
        timeWindow: 90
    })

    useEffect(() => {
        if (!id) return

        const fetchVideo = async () => {
            try {
                setLoading(true)
                setError(null)
                console.log('📹 Loading video for student:', id)

                const response = await videosAPI.getVideoForStudent(id)
                setVideo(response.video)
            } catch (err) {
                console.error('Failed to fetch video:', err)
                const error = err as { response?: { data?: { message?: string } }; message?: string }
                const errorMessage = error.response?.data?.message || error.message || 'Failed to load video. Please try again.'
                setError(errorMessage)
            } finally {
                setLoading(false)
            }
        }

        fetchVideo()
    }, [id])

    // Listen for dismissed checkpoint events from video player
    useEffect(() => {
        const handleDismissed = (e: Event) => {
            const customEvent = e as CustomEvent<{ key: string; type?: string; concept?: string; timestamp?: number }>
            if (customEvent.detail?.key) {
                console.log('📋 Review tab received dismissed checkpoint:', customEvent.detail.key)
                setDismissedCheckpoints(prev => {
                    const newSet = new Set(prev)
                    newSet.add(customEvent.detail.key)
                    console.log('📋 Updated dismissed checkpoints count:', newSet.size)
                    return newSet
                })
                // Log interaction with concept info
                const { key, type, concept, timestamp: videoTime } = customEvent.detail
                setInteractions(prev => [...prev, {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    videoTime: videoTime || currentTime,
                    type: 'checkpoint_skip',
                    details: concept
                        ? `Skipped ${type || 'checkpoint'} at concept: ${concept}`
                        : `Skipped ${type || 'checkpoint'}`,
                    metadata: { key, checkpointType: type, concept }
                }])
            }
        }

        const handleEngaged = (e: Event) => {
            const customEvent = e as CustomEvent<{ key: string; type?: string; concept?: string; timestamp?: number }>
            if (customEvent.detail?.key) {
                console.log('👆 Checkpoint engaged:', customEvent.detail.key)
                // Log interaction with concept info
                const { key, type, concept, timestamp: videoTime } = customEvent.detail
                setInteractions(prev => [...prev, {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    videoTime: videoTime || currentTime,
                    type: 'checkpoint_engage',
                    details: concept
                        ? `Engaged ${type || 'checkpoint'} at concept: ${concept}`
                        : `Engaged ${type || 'checkpoint'}`,
                    metadata: { key, checkpointType: type, concept }
                }])
            }
        }

        const handleAnswered = (e: Event) => {
            const customEvent = e as CustomEvent<{
                key?: string
                checkpoint: string
                type?: string
                selectedAnswer?: string
                correctAnswer?: string
                isCorrect?: boolean
                answerText?: string
                selectedNumber?: number
            }>
            if (customEvent.detail) {
                const { key, checkpoint, type, selectedAnswer, correctAnswer, isCorrect, answerText, selectedNumber } = customEvent.detail

                const hasGradedResult = typeof isCorrect === 'boolean'
                if (hasGradedResult) {
                    console.log(`Answer ${isCorrect ? 'correct' : 'incorrect'}:`, checkpoint)
                } else {
                    console.log('Checkpoint response submitted:', checkpoint)
                }

                // Log interaction locally
                setInteractions(prev => [...prev, {
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    timestamp: Date.now(),
                    videoTime: currentTime,
                    type: 'checkpoint_complete',
                    details: hasGradedResult
                        ? (isCorrect
                            ? `Correct answer: "${selectedAnswer}"`
                            : `Wrong answer: "${selectedAnswer}" (Correct: "${correctAnswer}")`)
                        : `Submitted response${typeof selectedNumber === 'number' ? ` (Option ${selectedNumber})` : ''}: "${answerText || selectedAnswer || ''}"`,
                    metadata: {
                        key,
                        checkpoint,
                        checkpointType: type,
                        selectedAnswer,
                        correctAnswer,
                        isCorrect,
                        answerText,
                        selectedNumber,
                    }
                }])

                // Persist to backend
                if (video && key) {
                    const checkpointObj = video.checkpoints?.find(cp => {
                        const cpKey = `${cp.type}-${cp.timestamp}`
                        return cpKey === key
                    })

                    const selectedIndex = typeof selectedNumber === 'number' ? selectedNumber - 1 : undefined

                    void progressAPI.saveCheckpointResponse({
                        userId: studentId,
                        videoId: video.id,
                        checkpointKey: key,
                        checkpointType: type || '',
                        prompt: checkpoint,
                        timestamp: checkpointObj?.timestamp ? parseFloat(String(checkpointObj.timestamp)) : 0,
                        selectedIndex,
                        isCorrect,
                        answerText,
                        videoTime: currentTime,
                        options: checkpointObj?.options,
                        studentName,
                    }).catch(err => {
                        console.error('Failed to save checkpoint response:', err)
                    })
                }
            }
        }

        const handleReEngaged = (e: Event) => {
            const customEvent = e as CustomEvent<{ key: string }>
            if (customEvent.detail?.key) {
                console.log('✅ Checkpoint re-engaged from Review tab:', customEvent.detail.key)
                setDismissedCheckpoints(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(customEvent.detail.key)
                    console.log('📋 Updated dismissed checkpoints count:', newSet.size)
                    return newSet
                })
            }
        }

        const handleCompleted = (e: Event) => {
            const customEvent = e as CustomEvent<{ key: string }>
            if (customEvent.detail?.key) {
                console.log('🎯 Checkpoint completed:', customEvent.detail.key)
                setCompletedCheckpoints(prev => {
                    const newSet = new Set(prev)
                    newSet.add(customEvent.detail.key)
                    return newSet
                })
            }
        }

        const logInteraction = (type: VideoInteraction['type'], details?: string, metadata?: Record<string, any>) => {
            const interaction: VideoInteraction = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                videoTime: currentTime,
                type,
                details,
                metadata
            }
            setInteractions(prev => [...prev, interaction])
        }

        const handleManualPause = () => logInteraction('manual_pause', 'User clicked pause')
        const handleManualPlay = () => logInteraction('manual_play', 'User clicked play')
        const handleSeek = (e: Event) => {
            const customEvent = e as CustomEvent<{ from: number; to: number }>
            const details = customEvent.detail
                ? `Seeked from ${Math.floor(customEvent.detail.from)}s to ${Math.floor(customEvent.detail.to)}s`
                : 'User scrubbed timeline'
            logInteraction('seek', details, customEvent.detail)
        }
        const handleRewind = (e: Event) => {
            const customEvent = e as CustomEvent<{ seconds: number }>
            logInteraction('rewind', `Rewound ${customEvent.detail?.seconds || 10}s`, customEvent.detail)
        }
        const handleForward = (e: Event) => {
            const customEvent = e as CustomEvent<{ seconds: number }>
            logInteraction('forward', `Forwarded ${customEvent.detail?.seconds || 10}s`, customEvent.detail)
        }
        const handleSpeedChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ speed: number }>
            logInteraction('speed_change', `Speed changed to ${customEvent.detail?.speed}x`, customEvent.detail)
        }

        window.addEventListener('checkpointDismissed', handleDismissed)
        window.addEventListener('checkpointEngaged', handleEngaged)
        window.addEventListener('checkpointAnswered', handleAnswered)
        window.addEventListener('checkpointReEngaged', handleReEngaged)
        window.addEventListener('checkpointCompleted', handleCompleted)
        window.addEventListener('manualPause', handleManualPause)
        window.addEventListener('manualPlay', handleManualPlay)
        window.addEventListener('videoSeek', handleSeek)
        window.addEventListener('videoRewind', handleRewind)
        window.addEventListener('videoForward', handleForward)
        window.addEventListener('videoSpeedChange', handleSpeedChange)
        return () => {
            window.removeEventListener('checkpointDismissed', handleDismissed)
            window.removeEventListener('checkpointEngaged', handleEngaged)
            window.removeEventListener('checkpointAnswered', handleAnswered)
            window.removeEventListener('checkpointReEngaged', handleReEngaged)
            window.removeEventListener('checkpointCompleted', handleCompleted)
            window.removeEventListener('manualPause', handleManualPause)
            window.removeEventListener('manualPlay', handleManualPlay)
            window.removeEventListener('videoSeek', handleSeek)
            window.removeEventListener('videoRewind', handleRewind)
            window.removeEventListener('videoForward', handleForward)
            window.removeEventListener('videoSpeedChange', handleSpeedChange)
        }
    }, [currentTime])

    const handleSeekToCheckpoint = (checkpoint: LearningCheckpoint) => {
        // Parse timestamp to seconds
        const parseSeconds = (timestamp: string | number): number => {
            if (typeof timestamp === 'number') return timestamp
            const parts = String(timestamp).split(':').map(Number)
            if (parts.length === 2) return parts[0] * 60 + parts[1]
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
            return 0
        }

        const targetTime = parseSeconds(checkpoint.timestamp)

        // Dispatch event to video player to seek and engage
        const seekEvent = new CustomEvent('seekToCheckpoint', {
            detail: { checkpoint, timestamp: targetTime }
        })
        window.dispatchEvent(seekEvent)

        // Scroll to video player
        scrollToVideo()
    }

    // Handle resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return
            const newWidth = window.innerWidth - e.clientX
            setTimelineWidth(Math.max(280, Math.min(600, newWidth)))
        }

        const handleMouseUp = () => {
            setIsResizing(false)
        }

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = 'ew-resize'
            document.body.style.userSelect = 'none'
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
        }
    }, [isResizing])

    // Show "Back to Video" button when scrolled past video player
    useEffect(() => {
        const handleScroll = () => {
            if (videoPlayerRef.current) {
                const rect = videoPlayerRef.current.getBoundingClientRect()
                // Show button if video is above viewport (scrolled past it)
                setShowBackToVideo(rect.bottom < 0)
            }
        }

        window.addEventListener('scroll', handleScroll)
        handleScroll() // Check initial state

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const scrollToVideo = () => {
        videoPlayerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    if (loading) {
        return (
            <TutorDebugProvider>
                <div className="min-h-screen bg-base-100 flex items-center justify-center">
                    <div className="text-center">
                        <div className="loading loading-spinner loading-lg text-primary"></div>
                        <p className="mt-4 text-base-content/60">Loading video...</p>
                    </div>
                </div>
            </TutorDebugProvider>
        )
    }

    if (error || !video) {
        return (
            <TutorDebugProvider>
                <div className="min-h-screen bg-base-100 flex items-center justify-center p-4">
                    <div className="card bg-base-200 shadow-xl max-w-md w-full">
                        <div className="card-body text-center">
                            <h2 className="card-title justify-center text-error">Error</h2>
                            <p className="text-base-content/70">{error || 'Video not found'}</p>
                            <div className="card-actions justify-center mt-4">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate('/student')}
                                >
                                    Back to Dashboard
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </TutorDebugProvider>
        )
    }

    return (
        <TutorDebugProvider>
            <div className="h-screen bg-base-100 flex flex-col">
                <header className="bg-base-100 shadow-lg flex-shrink-0">
                    <div className="container mx-auto px-4 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    className="btn btn-ghost gap-2"
                                    onClick={() => navigate('/student')}
                                >
                                    <ArrowBackIcon fontSize="small" />
                                    Back
                                </button>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                                    Conversly
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <ApiKeysButton />
                                <div className="text-sm text-base-content/70">
                                    {auth.user?.displayName || auth.user?.email || "Student"}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex gap-4 flex-1 min-h-0">
                    {/* Left Column - Video Player */}
                    <div className="flex-1 min-w-0 overflow-y-auto">
                        {/* Video Player Section */}
                        <div className="mb-6" ref={videoPlayerRef}>
                            <StudentVideoPlayer
                                videoUrl={video.downloadUrl || ''}
                                checkpoints={video.checkpoints || []}
                                concepts={video.concepts || []}
                                initialTime={0}
                                videoId={video.id}
                                studentId={studentId}
                                studentName={studentName}
                                onTimeUpdate={setCurrentTime} onPlayingStateChange={setIsPlaying} />

                            {/* Video Title & Stats */}
                            <div className="mt-4 px-2">
                                <h1 className="text-3xl font-bold mb-2">{video.title || 'Untitled Video'}</h1>
                                <div className="flex items-center gap-4 text-sm text-base-content/60">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                        {video.concepts?.length || 0} concepts
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {video.checkpoints?.length || 0} learning moments
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Description Card - Below video on left side */}
                        {video.description && (
                            <div className="card bg-base-200 shadow-xl mb-6">
                                <div className="card-body">
                                    <h3 className="card-title text-lg">About this lesson</h3>
                                    <p className="text-base-content/70">{video.description}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Learning Timeline */}
                    <div
                        className="flex-shrink-0 relative h-full"
                        style={{ width: `${timelineWidth}px` }}
                    >
                        {/* Resize Handle */}
                        <div
                            className="absolute left-0 top-0 bottom-0 w-1 hover:w-2 bg-base-300 hover:bg-primary cursor-ew-resize z-10 transition-all"
                            onMouseDown={() => setIsResizing(true)}
                        />
                        <div className="h-full ml-1">
                            <div ref={timelineRef} data-timeline-section className="card bg-base-200 shadow-lg border border-base-300 h-full flex flex-col overflow-hidden">
                                <div className="p-3 flex-shrink-0">
                                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-base-300">
                                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                                            <svg className="w-5 h-5 text-primary-content" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        </div>
                                        <h2 className="text-lg font-bold">Learning Timeline</h2>
                                    </div>
                                </div>
                                <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0 px-3 pb-6">
                                    <ConceptTimeline
                                        concepts={video.concepts || []}
                                        currentTime={currentTime}
                                        transcript={video.transcript}
                                        isPlaying={isPlaying}
                                        checkpoints={video.checkpoints || []}
                                        dismissedCheckpoints={dismissedCheckpoints}
                                        completedCheckpoints={completedCheckpoints}
                                        interactions={interactions}
                                        onClearInteractions={() => setInteractions([])}
                                        onSeekToCheckpoint={handleSeekToCheckpoint}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Back to Video button */}
                {/* Floating Back to Video button */}
                {showBackToVideo && (
                    <button
                        onClick={scrollToVideo}
                        className="fixed bottom-6 right-6 btn btn-circle btn-lg btn-primary shadow-2xl z-50"
                        aria-label="Scroll back to video player"
                        title="Jump to video"
                    >
                        <ArrowBackIcon />
                    </button>
                )}

                {/* Voice Tutor Widget */}
                <VoiceTutorWidget
                    videoId={video.id}
                    currentTime={currentTime}
                    transcript={video.transcript}
                    concepts={video.concepts || []}
                    checkpoints={video.checkpoints || []}
                    interactions={interactions}
                    isStruggling={isStruggling}
                    rewindCount={rewindCount}
                    onDismissStruggle={dismissStruggle}
                />
            </div>
        </TutorDebugProvider>
    )
}
