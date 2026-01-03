import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getVideoById } from '../api/videos.api'
import VideoPlayer from '../components/video/VideoPlayer'
import VideoHeader from '../components/video/VideoHeader'
import VideoKeyConcepts from '../components/video/VideoKeyConceptsHorizontal'
import VideoCheckpoints from '../components/video/VideoCheckpoints'
import VideoQuiz from '../components/video/VideoQuiz'
import AIRefinementModal from '../components/video/AIRefinementModal'
import EngagementAnalysisModal from '../components/video/EngagementAnalysisModal'
import type { Video, Concept, LearningCheckpoint } from '../types/video.types'
// Material UI Icons
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import InfoIcon from '@mui/icons-material/Info'
import FlagIcon from '@mui/icons-material/Flag'

export default function VideoReviewPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [video, setVideo] = useState<Video | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [thumbnails, setThumbnails] = useState<Record<number, string>>({})

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingConcept, setEditingConcept] = useState<Concept | null>(null)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [modalType, setModalType] = useState<'main' | 'sub' | null>(null)

    // Checkpoint modal state
    const [isCheckpointModalOpen, setIsCheckpointModalOpen] = useState(false)
    const [editingCheckpoint, setEditingCheckpoint] = useState<LearningCheckpoint | null>(null)
    const [editingCheckpointIndex, setEditingCheckpointIndex] = useState<number | null>(null)

    // AI Refinement modal state
    const [isRefinementModalOpen, setIsRefinementModalOpen] = useState(false)
    const [refinementLoading, setRefinementLoading] = useState(false)
    const [refinementSuggestions, setRefinementSuggestions] = useState<any>(null)

    // Engagement Analysis modal state
    const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false)
    const [engagementLoading, setEngagementLoading] = useState(false)
    const [engagementAnalysis, setEngagementAnalysis] = useState<any>(null)

    // Function to seek to a specific timestamp
    const seekToTimestamp = (timestamp: number) => {
        // Find the video element in the DOM and seek
        const videoElement = document.querySelector('video')
        if (videoElement) {
            videoElement.currentTime = timestamp
            // Start playing after seeking
            videoElement.play().catch(err => console.error('Play error:', err))
        }
        // Scroll to video player smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Open edit modal
    const handleEditConcept = (concept: Concept, index: number, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent seeking to timestamp
        setEditingConcept({ ...concept })
        setEditingIndex(index)
        setModalType(concept.conceptType || 'main')
        setIsEditModalOpen(true)
    }

    // Add new concept (can be main or sub)
    const handleAddConcept = (type: 'main' | 'sub' = 'main') => {
        const newConcept: Concept = {
            concept: '',
            description: '',
            timestamp: currentTime || 0,
            importance: '' as any, // Optional - can be set by user or AI
            visualElements: '',
            conceptType: type
        }
        setEditingConcept(newConcept)
        setEditingIndex(null) // null means adding new
        setModalType(type)
        setIsEditModalOpen(true)
    }

    // Save concept (add or update)
    const handleSaveConcept = () => {
        if (!editingConcept || !video) return

        const updatedConcepts = [...(video.concepts || [])]

        if (editingIndex === null) {
            // Add new
            updatedConcepts.push(editingConcept)
            // Sort by timestamp
            updatedConcepts.sort((a, b) => a.timestamp - b.timestamp)
        } else {
            // Update existing
            updatedConcepts[editingIndex] = editingConcept
        }

        setVideo({ ...video, concepts: updatedConcepts })
        setIsEditModalOpen(false)
        setEditingConcept(null)
        setEditingIndex(null)
        setModalType(null)

        // Save to Firestore (mock mode will skip actual save)
        console.log('Saving concept to Firestore:', editingConcept)
    }

    // Close modal helper
    const handleCloseModal = () => {
        setIsEditModalOpen(false)
        setEditingConcept(null)
        setEditingIndex(null)
        setModalType(null)
    }

    // Add new checkpoint
    const handleAddCheckpoint = () => {
        const newCheckpoint: LearningCheckpoint = {
            timestamp: currentTime || 0,
            type: 'reflection',
            prompt: '',
            relatedConcept: ''
        }
        setEditingCheckpoint(newCheckpoint)
        setEditingCheckpointIndex(null)
        setIsCheckpointModalOpen(true)
    }

    // Save checkpoint
    const handleSaveCheckpoint = () => {
        if (!editingCheckpoint || !video) return

        const updatedCheckpoints = [...(video.checkpoints || [])]

        if (editingCheckpointIndex === null) {
            // Add new
            updatedCheckpoints.push(editingCheckpoint)
            updatedCheckpoints.sort((a, b) => a.timestamp - b.timestamp)
        } else {
            // Update existing
            updatedCheckpoints[editingCheckpointIndex] = editingCheckpoint
        }

        setVideo({ ...video, checkpoints: updatedCheckpoints })
        setIsCheckpointModalOpen(false)
        setEditingCheckpoint(null)
        setEditingCheckpointIndex(null)

        console.log('Saving checkpoint to Firestore:', editingCheckpoint)
    }

    // Close checkpoint modal
    const handleCloseCheckpointModal = () => {
        setIsCheckpointModalOpen(false)
        setEditingCheckpoint(null)
        setEditingCheckpointIndex(null)
    }

    // Open AI Refinement modal (don't auto-start)
    const handleAIRefinement = async () => {
        if (!video) return

        console.log('🤖 Opening AI refinement modal')
        console.log('🤖 Video status:', {
            videoId: video.id,
            hasSuggestions: !!video.refinementSuggestions,
            status: video.refinementStatus,
            completedAt: video.refinementCompletedAt,
            suggestionKeys: video.refinementSuggestions ? Object.keys(video.refinementSuggestions) : []
        })

        setIsRefinementModalOpen(true)

        // Check if we already have refinement results
        if (video.refinementSuggestions && video.refinementStatus === 'complete') {
            console.log('✅ Loading cached refinement suggestions from video object')
            setRefinementSuggestions(video.refinementSuggestions)
            setRefinementLoading(false)
            return
        }

        // NEVER auto-resume polling - creator must click Start
        console.log('💡 No cached suggestions - showing focus selection / start button')
        setRefinementLoading(false)
        setRefinementSuggestions(null)
    }

    // Start new refinement analysis (triggered by button)
    const handleStartRefinement = async (focusArea?: string) => {
        if (!video) return

        setRefinementLoading(true)
        setRefinementSuggestions(null)

        try {
            console.log('🔍 Starting AI refinement for video:', video.id)
            if (focusArea) {
                console.log('🎯 Focus area:', focusArea)
            }
            const { videosAPI } = await import('../api/videos.api')

            // Start refinement (returns immediately)
            await videosAPI.refineConceptsWithAI(video.id, focusArea)
            console.log('✅ Refinement started, beginning polling...')
            startRefinementPolling(videosAPI)
        } catch (error) {
            console.error('❌ Error starting refinement:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            alert(`Failed to start AI refinement: ${errorMessage}`)
            setRefinementLoading(false)
        }
    }

    // Separate polling function for refinement
    const startRefinementPolling = async (videosAPI: any) => {
        if (!video) return

        // Poll for completion using lightweight status endpoint
        let attempts = 0
        const maxAttempts = 240 // 12 minutes max (240 * 3 seconds)

        const pollInterval = setInterval(async () => {
            try {
                attempts++
                const status = await videosAPI.getRefinementStatus(video.id)

                console.log(`🔄 Polling attempt ${attempts}: refinementStatus = ${status.refinementStatus}`)

                // Check if complete
                if (status.refinementStatus === 'complete') {
                    clearInterval(pollInterval)
                    console.log('✅ Refinement complete!', status.refinementSuggestions)
                    setRefinementSuggestions(status.refinementSuggestions || null)
                    setRefinementLoading(false)

                    // Reload full video to cache the results
                    const response = await videosAPI.getVideo(video.id)
                    if (response?.video && setVideo) {
                        setVideo(response.video)
                        console.log('✅ Video reloaded with cached refinement suggestions')
                    }
                } else if (status.refinementStatus === 'error') {
                    clearInterval(pollInterval)
                    console.error('❌ Refinement error:', status.refinementError)
                    alert(`AI Refinement failed: ${status.refinementError || 'Unknown error'}`)
                    setIsRefinementModalOpen(false)
                    setRefinementLoading(false)
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval)
                    console.error('❌ Refinement polling timeout')
                    alert('AI Refinement is taking too long. Please try again later.')
                    setIsRefinementModalOpen(false)
                    setRefinementLoading(false)
                }
            } catch (pollError) {
                console.error('❌ Error polling refinement status:', pollError)
                clearInterval(pollInterval)
                alert('Error checking refinement status. Please refresh the page.')
                setIsRefinementModalOpen(false)
                setRefinementLoading(false)
            }
        }, 3000) // Poll every 3 seconds
    }

    // Accept a suggestion and apply it to Firestore
    const handleAcceptSuggestion = async (suggestion: any, suggestionType: string) => {
        if (!video) {
            console.error('❌ Cannot accept suggestion: video is undefined')
            return
        }

        console.log('📝 Accepting suggestion for video:', video.id, suggestionType)

        try {
            const { videosAPI } = await import('../api/videos.api')

            // Apply suggestion via backend (updates Firestore)
            const response = await videosAPI.applySuggestion(video.id, suggestionType, suggestion)

            // Update local state with Firestore data
            setVideo(response.video)

            // Remove accepted suggestion from list
            if (refinementSuggestions) {
                const newSuggestions = { ...refinementSuggestions }

                switch (suggestionType) {
                    case 'conceptAdd':
                        newSuggestions.conceptsToAdd = newSuggestions.conceptsToAdd?.filter((s: any) => s !== suggestion) || []
                        break
                    case 'conceptImprove':
                        newSuggestions.conceptsToImprove = newSuggestions.conceptsToImprove?.filter((s: any) => s !== suggestion) || []
                        break
                    case 'checkpointAdd':
                        newSuggestions.checkpointsToAdd = newSuggestions.checkpointsToAdd?.filter((s: any) => s !== suggestion) || []
                        break
                    case 'checkpointImprove':
                        newSuggestions.checkpointsToImprove = newSuggestions.checkpointsToImprove?.filter((s: any) => s !== suggestion) || []
                        break
                    case 'quizAdd':
                        newSuggestions.quizQuestionsToAdd = newSuggestions.quizQuestionsToAdd?.filter((s: any) => s !== suggestion) || []
                        break
                    case 'quizImprove':
                        newSuggestions.quizQuestionsToImprove = newSuggestions.quizQuestionsToImprove?.filter((s: any) => s !== suggestion) || []
                        break
                }

                setRefinementSuggestions(newSuggestions)
            }

            console.log('✅ Suggestion applied successfully')
        } catch (error) {
            console.error('❌ Error accepting suggestion:', error)
            alert('Failed to apply suggestion. Please try again.')
        }
    }

    // Close AI Refinement modal
    const handleCloseRefinementModal = () => {
        setIsRefinementModalOpen(false)
        setRefinementSuggestions(null)
    }

    // Open Engagement Analysis modal (don't auto-start)
    const handleEngagementAnalysis = async () => {
        if (!video) {
            console.log('❌ No video found')
            return
        }

        console.log('📊 Opening engagement analysis modal')
        console.log('📊 Current video object:', {
            id: video.id,
            hasAnalysis: !!video.engagementAnalysis,
            status: video.engagementStatus,
            analyzedAt: video.engagementAnalyzedAt,
            analysisKeys: video.engagementAnalysis ? Object.keys(video.engagementAnalysis) : []
        })

        setIsEngagementModalOpen(true)

        // Check if we already have engagement analysis results
        if (video.engagementAnalysis && video.engagementStatus === 'complete') {
            console.log('✅ Loading existing engagement analysis results from video object')
            setEngagementAnalysis(video.engagementAnalysis)
            setEngagementLoading(false)
            return
        }

        // NEVER auto-resume polling - creator must click Start
        console.log('💡 Showing Start Analysis button (no cached results)')
        setEngagementLoading(false)
        setEngagementAnalysis(null)
    }

    // Start new engagement analysis (triggered by button)
    const handleStartEngagement = async () => {
        if (!video) return

        setEngagementLoading(true)
        setEngagementAnalysis(null)

        try {
            console.log('📊 Starting engagement analysis for video:', video.id)
            const { videosAPI } = await import('../api/videos.api')

            // Start analysis (returns immediately)
            await videosAPI.analyzeEngagement(video.id)
            console.log('✅ Engagement analysis started, beginning polling...')
            startEngagementPolling(videosAPI)
        } catch (error) {
            console.error('❌ Error starting engagement analysis:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            alert(`Failed to start engagement analysis: ${errorMessage}`)
            setEngagementLoading(false)
        }
    }

    // Separate polling function for engagement
    const startEngagementPolling = async (videosAPI: any) => {
        if (!video) return

        // Poll for completion using lightweight status endpoint
        let attempts = 0
        const maxAttempts = 240 // 12 minutes max (240 * 3 seconds)

        const pollInterval = setInterval(async () => {
            try {
                attempts++
                const status = await videosAPI.getEngagementStatus(video.id)

                console.log(`🔄 Polling attempt ${attempts}: engagementStatus = ${status.engagementStatus}`)

                // Check if complete
                if (status.engagementStatus === 'complete') {
                    clearInterval(pollInterval)
                    console.log('✅ Engagement analysis complete!', status.engagementAnalysis)
                    setEngagementAnalysis(status.engagementAnalysis || null)
                    setEngagementLoading(false)

                    // Reload full video to cache the results
                    console.log('🔄 Reloading video to cache engagement analysis...')
                    const response = await videosAPI.getVideo(video.id)
                    console.log('📦 Reloaded video response:', {
                        hasVideo: !!response?.video,
                        videoId: response?.video?.id,
                        hasAnalysis: !!response?.video?.engagementAnalysis,
                        status: response?.video?.engagementStatus,
                        analysisKeys: response?.video?.engagementAnalysis ? Object.keys(response.video.engagementAnalysis) : []
                    })
                    if (response?.video && setVideo) {
                        setVideo(response.video)
                        console.log('✅ Video state updated with cached engagement analysis')
                    }
                } else if (status.engagementStatus === 'error') {
                    clearInterval(pollInterval)
                    console.error('❌ Engagement analysis error:', status.engagementError)
                    alert(`Engagement Analysis failed: ${status.engagementError || 'Unknown error'}`)
                    setIsEngagementModalOpen(false)
                    setEngagementLoading(false)
                } else if (attempts >= maxAttempts) {
                    clearInterval(pollInterval)
                    console.error('❌ Engagement analysis polling timeout')
                    alert('Engagement Analysis is taking too long. Please try again later.')
                    setIsEngagementModalOpen(false)
                    setEngagementLoading(false)
                }
            } catch (pollError) {
                console.error('❌ Error polling engagement status:', pollError)
                clearInterval(pollInterval)
                alert('Error checking engagement status. Please refresh the page.')
                setIsEngagementModalOpen(false)
                setEngagementLoading(false)
            }
        }, 3000) // Poll every 3 seconds
    }

    // Close Engagement Analysis modal
    const handleCloseEngagementModal = () => {
        setIsEngagementModalOpen(false)
        setEngagementAnalysis(null)
    }

    // Delete concept
    const handleDeleteConcept = (index: number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!video || !confirm('Are you sure you want to delete this concept?')) return

        const updatedConcepts = video.concepts?.filter((_, i) => i !== index) || []
        setVideo({ ...video, concepts: updatedConcepts })

        // Save to Firestore (mock mode will skip actual save)
        console.log('Deleting concept from Firestore')
    }

    // Generate thumbnail from video at specific timestamp
    const generateThumbnail = useCallback((timestamp: number, videoUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const videoElement = document.createElement('video')
            videoElement.src = videoUrl
            videoElement.crossOrigin = 'anonymous'
            videoElement.currentTime = timestamp

            videoElement.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas')
                canvas.width = 320
                canvas.height = 180
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
                    resolve(canvas.toDataURL('image/jpeg', 0.8))
                }
            }, { once: true })

            videoElement.load()
        })
    }, [])

    // Generate thumbnails for all concepts when video loads or concepts change
    useEffect(() => {
        if (!video?.concepts || !video.downloadUrl) return

        const videoUrl = video.downloadUrl || video.storagePath
        if (!videoUrl) return

        // Generate thumbnails for any concepts that don't have one yet
        video.concepts.forEach(async (concept) => {
            // Skip if we already have a thumbnail for this timestamp
            if (thumbnails[concept.timestamp]) return

            try {
                const thumbnail = await generateThumbnail(concept.timestamp, videoUrl)
                setThumbnails(prev => ({ ...prev, [concept.timestamp]: thumbnail }))
                console.log('✅ Generated thumbnail for new concept at', concept.timestamp)
            } catch (err) {
                console.error('Failed to generate thumbnail:', err)
            }
        })
    }, [video?.id, video?.concepts, video?.downloadUrl, generateThumbnail, thumbnails])


    useEffect(() => {
        if (!id) return

        const fetchVideo = async () => {
            try {
                setLoading(true)
                setError(null)
                console.log('📹 Fetching video from API:', id)
                const data = await getVideoById(id)
                console.log('📦 Video loaded from Firestore:', {
                    id: data.id,
                    status: data.status,
                    refinementStatus: data.refinementStatus,
                    hasRefinementSuggestions: !!data.refinementSuggestions,
                    refinementSuggestionKeys: data.refinementSuggestions ? Object.keys(data.refinementSuggestions) : [],
                    engagementStatus: data.engagementStatus,
                    hasEngagementAnalysis: !!data.engagementAnalysis,
                    engagementAnalysisKeys: data.engagementAnalysis ? Object.keys(data.engagementAnalysis) : []
                })
                setVideo(data)
            } catch (err) {
                console.error('Failed to fetch video:', err)
                setError('Failed to load video. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchVideo()
    }, [id])

    // Show error only after loading is complete and there's actually an error or no video
    if (!loading && (error || !video)) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold mb-2">Oops!</h2>
                    <p className="text-base-content/70 mb-6">{error || 'Video not found'}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/creator')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    // Still loading, show nothing yet (will show loading spinner in video player area)
    if (!video) {
        return null
    }

    // Format seconds to MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Format duration to HH:MM:SS or MM:SS
    const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = Math.floor(seconds % 60)

        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-base-100">
            {/* Header */}
            <VideoHeader video={video} formatDuration={formatDuration} />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Video Player Section - Centered and with shadow */}
                <div className="card bg-base-200 shadow-xl mb-8">
                    <div className="card-body p-0">
                        {loading ? (
                            <div className="aspect-video bg-base-200 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-base-content">Loading video data...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="aspect-video bg-error/10 rounded-lg flex items-center justify-center border-2 border-error/20">
                                <div className="text-center p-8">
                                    <div className="text-4xl mb-3">⚠️</div>
                                    <p className="text-error font-semibold mb-2">Video not accessible</p>
                                    <p className="text-sm text-base-content/70">The video file might not have been uploaded yet.</p>
                                </div>
                            </div>
                        ) : (video?.downloadUrl || video?.storagePath) ? (
                            <VideoPlayer
                                url={video.downloadUrl || video.storagePath}
                                concepts={video.concepts || []}
                                duration={video.duration || 0}
                                onTimeUpdate={setCurrentTime}
                                onReady={() => console.log('Video ready')}
                            />
                        ) : (
                            <div className="aspect-video bg-warning/10 rounded-lg flex items-center justify-center border-2 border-warning/20">
                                <div className="text-center p-8">
                                    <div className="text-4xl mb-3">📹</div>
                                    <p className="text-warning font-semibold mb-2">Video upload incomplete</p>
                                    <p className="text-sm text-base-content/70">Please complete the upload process.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Learning Timeline Section - Full width with card */}
                <div className="card bg-base-200 shadow-xl mb-8">
                    <div className="card-body">
                        <VideoKeyConcepts
                            video={video}
                            onAddConcept={handleAddConcept}
                            onEditConcept={handleEditConcept}
                            onDeleteConcept={handleDeleteConcept}
                            onSeekTo={seekToTimestamp}
                            formatTime={formatTime}
                            thumbnails={thumbnails}
                            currentTime={currentTime}
                            onAddCheckpoint={handleAddCheckpoint}
                            onAIRefinement={handleAIRefinement}
                            onAnalyzeEngagement={handleEngagementAnalysis}
                        />
                    </div>
                </div>

                {/* Two Column Carousel Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Learning Checkpoints Carousel */}
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h3 className="text-lg font-bold mb-4">Learning Checkpoints</h3>
                            {video?.checkpoints && video.checkpoints.length > 0 ? (
                                <VideoCheckpoints
                                    video={video}
                                    formatTime={formatTime}
                                    onSeekTo={seekToTimestamp}
                                    carousel={true}
                                />
                            ) : (
                                <div className="text-center text-base-content/60 py-12">
                                    No checkpoints available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quiz Carousel */}
                    <div className="card bg-base-200 shadow-xl">
                        <div className="card-body">
                            <h3 className="text-lg font-bold mb-4">Quiz Questions</h3>
                            {video?.quiz && video.quiz.length > 0 ? (
                                <VideoQuiz video={video} carousel={true} />
                            ) : (
                                <div className="text-center text-base-content/60 py-12">
                                    No quiz questions available
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Concept Modal */}
            {isEditModalOpen && editingConcept && modalType === 'main' && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
                            {editingIndex === null ? (
                                <>
                                    <AddIcon /> Add Main Concept
                                </>
                            ) : (
                                <>
                                    <EditIcon /> Edit Main Concept
                                </>
                            )}
                        </h3>
                        <p className="text-sm text-base-content/60 mb-6">
                            Mark a major topic boundary in your video
                        </p>

                        <div className="space-y-4">
                            {/* Concept Title */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Concept Title</span>
                                    <span className="label-text-alt">{editingConcept.concept.length}/100</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Understanding Neural Networks"
                                    className="input input-bordered w-full"
                                    maxLength={100}
                                    value={editingConcept.concept}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, concept: e.target.value })}
                                />
                            </div>

                            {/* Timestamp */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Timestamp</span>
                                    <span className="label-text-alt font-mono text-primary">
                                        {Math.floor(editingConcept.timestamp / 60)}:{String(Math.floor(editingConcept.timestamp % 60)).padStart(2, '0')}
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="120"
                                        className="input input-bordered flex-1"
                                        value={editingConcept.timestamp}
                                        onChange={(e) => setEditingConcept({ ...editingConcept, timestamp: Number.parseFloat(e.target.value) || 0 })}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setEditingConcept({ ...editingConcept, timestamp: currentTime })}
                                    >
                                        Use Current Time
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Description</span>
                                    <span className="label-text-alt">{editingConcept.description.length}/300</span>
                                </label>
                                <textarea
                                    placeholder="Brief explanation for students... Keep it concise!"
                                    className="textarea textarea-bordered h-20 w-full"
                                    maxLength={300}
                                    value={editingConcept.description}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, description: e.target.value })}
                                />
                            </div>

                            {/* Importance Level */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Importance Level (Optional)</span>
                                    <span className="label-text-alt text-base-content/60">AI can suggest this later</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingConcept.importance || ''}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, importance: e.target.value as any })}
                                >
                                    <option value="">Not Set</option>
                                    <option value="core">Core - Must understand</option>
                                    <option value="supporting">Supporting - Important</option>
                                    <option value="supplementary">Supplementary - Good to know</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary gap-2"
                                onClick={handleSaveConcept}
                                disabled={!editingConcept.concept.trim() || !editingConcept.description.trim()}
                            >
                                {editingIndex === null ? (
                                    <>
                                        <AddIcon fontSize="small" />
                                        Add Concept
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon fontSize="small" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-backdrop"
                        onClick={handleCloseModal}
                        aria-label="Close modal"
                    />
                </div>
            )}

            {/* Sub-Concept Modal */}
            {isEditModalOpen && editingConcept && modalType === 'sub' && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
                            {editingIndex === null ? (
                                <>
                                    <AddIcon /> Add Sub-Concept
                                </>
                            ) : (
                                <>
                                    <EditIcon /> Edit Sub-Concept
                                </>
                            )}
                        </h3>
                        <p className="text-sm text-base-content/60 mb-6">
                            Add a detail or example under a main concept
                        </p>

                        <div className="space-y-4">
                            {/* Parent Concept Selector */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Parent Main Concept</span>
                                    <span className="label-text-alt text-info cursor-help flex items-center gap-1" title="Which main concept does this detail belong to?">
                                        <InfoIcon fontSize="small" />
                                    </span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingConcept.parentId || ''}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, parentId: e.target.value })}
                                >
                                    <option value="">Select a main concept...</option>
                                    {video?.concepts?.filter(c => c.conceptType === 'main').map((c, i) => (
                                        <option key={i} value={c.concept}>
                                            {c.concept}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Concept Title */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Sub-Concept Title</span>
                                    <span className="label-text-alt">{editingConcept.concept.length}/100</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Activation Functions Explained"
                                    className="input input-bordered w-full"
                                    maxLength={100}
                                    value={editingConcept.concept}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, concept: e.target.value })}
                                />
                            </div>

                            {/* Timestamp */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Timestamp</span>
                                    <span className="label-text-alt font-mono text-primary">
                                        {Math.floor(editingConcept.timestamp / 60)}:{String(Math.floor(editingConcept.timestamp % 60)).padStart(2, '0')}
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="120"
                                        className="input input-bordered flex-1"
                                        value={editingConcept.timestamp}
                                        onChange={(e) => setEditingConcept({ ...editingConcept, timestamp: Number.parseFloat(e.target.value) || 0 })}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setEditingConcept({ ...editingConcept, timestamp: currentTime })}
                                    >
                                        Use Current Time
                                    </button>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Description</span>
                                    <span className="label-text-alt">{editingConcept.description.length}/300</span>
                                </label>
                                <textarea
                                    placeholder="Brief explanation for students... Keep it concise!"
                                    className="textarea textarea-bordered h-20 w-full"
                                    maxLength={300}
                                    value={editingConcept.description}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, description: e.target.value })}
                                />
                            </div>

                            {/* Importance Level */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Importance Level (Optional)</span>
                                    <span className="label-text-alt text-base-content/60">AI can suggest this later</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingConcept.importance || ''}
                                    onChange={(e) => setEditingConcept({ ...editingConcept, importance: e.target.value as any })}
                                >
                                    <option value="">Not Set</option>
                                    <option value="core">Core - Must understand</option>
                                    <option value="supporting">Supporting - Important</option>
                                    <option value="supplementary">Supplementary - Good to know</option>
                                </select>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary gap-2"
                                onClick={handleSaveConcept}
                                disabled={!editingConcept.concept.trim() || !editingConcept.description.trim() || !editingConcept.parentId}
                            >
                                {editingIndex === null ? (
                                    <>
                                        <AddIcon fontSize="small" />
                                        Add Sub-Concept
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon fontSize="small" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-backdrop"
                        onClick={handleCloseModal}
                        aria-label="Close modal"
                    />
                </div>
            )}

            {/* Checkpoint Modal */}
            {isCheckpointModalOpen && editingCheckpoint && (
                <div className="modal modal-open">
                    <div className="modal-box max-w-2xl">
                        <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
                            {editingCheckpointIndex === null ? (
                                <>
                                    <FlagIcon /> Add Checkpoint
                                </>
                            ) : (
                                <>
                                    <EditIcon /> Edit Checkpoint
                                </>
                            )}
                        </h3>
                        <p className="text-sm text-base-content/60 mb-6">
                            Create an interactive pause moment for student engagement
                        </p>

                        <div className="space-y-4">
                            {/* Timestamp */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Timestamp</span>
                                    <span className="label-text-alt font-mono text-primary">
                                        {Math.floor(editingCheckpoint.timestamp / 60)}:{String(Math.floor(editingCheckpoint.timestamp % 60)).padStart(2, '0')}
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="120"
                                        className="input input-bordered flex-1"
                                        value={editingCheckpoint.timestamp}
                                        onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, timestamp: Number.parseFloat(e.target.value) || 0 })}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setEditingCheckpoint({ ...editingCheckpoint, timestamp: currentTime })}
                                    >
                                        Use Current Time
                                    </button>
                                </div>
                            </div>

                            {/* Checkpoint Type */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Checkpoint Type</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingCheckpoint.type}
                                    onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, type: e.target.value as any })}
                                >
                                    <option value="quickQuiz">Quick Quiz - Test understanding</option>
                                    <option value="reflection">Reflection - Think about it</option>
                                    <option value="prediction">Prediction - What happens next?</option>
                                    <option value="application">Application - Real-world use</option>
                                </select>
                            </div>

                            {/* Prompt */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Prompt</span>
                                    <span className="label-text-alt">{editingCheckpoint.prompt.length}/300</span>
                                </label>
                                <textarea
                                    placeholder="e.g., Can you explain why we use async/await here?"
                                    className="textarea textarea-bordered h-20 w-full"
                                    maxLength={300}
                                    value={editingCheckpoint.prompt}
                                    onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, prompt: e.target.value })}
                                />
                            </div>

                            {/* Quiz Options (only if type is quickQuiz) */}
                            {editingCheckpoint.type === 'quickQuiz' && (
                                <>
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Answer Options</span>
                                            <span className="label-text-alt text-info cursor-help flex items-center gap-1" title="Enter 2-4 answer choices">
                                                <InfoIcon fontSize="small" />
                                            </span>
                                        </label>
                                        {(editingCheckpoint.options || ['', '']).map((option, idx) => (
                                            <div key={idx} className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    placeholder={`Option ${idx + 1}`}
                                                    className="input input-bordered flex-1"
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(editingCheckpoint.options || ['', ''])]
                                                        newOptions[idx] = e.target.value
                                                        setEditingCheckpoint({ ...editingCheckpoint, options: newOptions })
                                                    }}
                                                />
                                                {idx >= 2 && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => {
                                                            const newOptions = [...(editingCheckpoint.options || [])]
                                                            newOptions.splice(idx, 1)
                                                            setEditingCheckpoint({ ...editingCheckpoint, options: newOptions })
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm mt-2"
                                            onClick={() => {
                                                const newOptions = [...(editingCheckpoint.options || ['', '']), '']
                                                setEditingCheckpoint({ ...editingCheckpoint, options: newOptions })
                                            }}
                                            disabled={(editingCheckpoint.options || []).length >= 4}
                                        >
                                            + Add Option
                                        </button>
                                    </div>

                                    {/* Correct Answer */}
                                    <div className="form-control">
                                        <label className="label">
                                            <span className="label-text font-semibold">Correct Answer</span>
                                        </label>
                                        <select
                                            className="select select-bordered w-full"
                                            value={editingCheckpoint.correctAnswer || ''}
                                            onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, correctAnswer: e.target.value })}
                                        >
                                            <option value="">Select correct option...</option>
                                            {(editingCheckpoint.options || []).map((option, idx) => (
                                                <option key={idx} value={option}>
                                                    {option || `Option ${idx + 1}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Related Concept */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Related Concept (Optional)</span>
                                </label>
                                <select
                                    className="select select-bordered w-full"
                                    value={editingCheckpoint.relatedConcept || ''}
                                    onChange={(e) => setEditingCheckpoint({ ...editingCheckpoint, relatedConcept: e.target.value })}
                                >
                                    <option value="">None - standalone checkpoint</option>
                                    {video?.concepts?.map((c, i) => (
                                        <option key={i} value={c.concept}>
                                            {c.concept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="modal-action">
                            <button
                                className="btn btn-ghost"
                                onClick={handleCloseCheckpointModal}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary gap-2"
                                onClick={handleSaveCheckpoint}
                                disabled={!editingCheckpoint.prompt.trim() || (editingCheckpoint.type === 'quickQuiz' && (!editingCheckpoint.options || editingCheckpoint.options.length < 2 || !editingCheckpoint.correctAnswer))}
                            >
                                {editingCheckpointIndex === null ? (
                                    <>
                                        <AddIcon fontSize="small" />
                                        Add Checkpoint
                                    </>
                                ) : (
                                    <>
                                        <SaveIcon fontSize="small" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="modal-backdrop"
                        onClick={handleCloseCheckpointModal}
                        aria-label="Close modal"
                    />
                </div>
            )}

            {/* AI Refinement Modal */}
            <AIRefinementModal
                isOpen={isRefinementModalOpen}
                loading={refinementLoading}
                suggestions={refinementSuggestions}
                hasExistingResults={!!(video?.refinementSuggestions && video?.refinementStatus === 'complete')}
                engagementAnalysis={video?.engagementAnalysis}
                onClose={handleCloseRefinementModal}
                onAcceptSuggestion={handleAcceptSuggestion}
                onStartAnalysis={handleStartRefinement}
            />

            {/* Engagement Analysis Modal */}
            <EngagementAnalysisModal
                isOpen={isEngagementModalOpen}
                loading={engagementLoading}
                analysis={engagementAnalysis}
                hasExistingResults={!!(video?.engagementAnalysis && video?.engagementStatus === 'complete')}
                onClose={handleCloseEngagementModal}
                onStartAnalysis={handleStartEngagement}
                onOpenRefinement={() => {
                    setIsEngagementModalOpen(false)
                    handleAIRefinement()
                }}
            />
        </div>
    )
}
