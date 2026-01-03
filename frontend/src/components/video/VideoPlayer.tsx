import { useRef, useState, useEffect } from 'react'
import type { Concept } from '../../types/video.types'

interface VideoPlayerProps {
    url: string
    concepts: Concept[]
    duration: number
    onTimeUpdate?: (currentTime: number) => void
    onReady?: () => void
}

export default function VideoPlayer({ url, concepts, duration, onTimeUpdate, onReady }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const [playing, setPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [videoDuration, setVideoDuration] = useState(duration)
    const [volume, setVolume] = useState(0.8)
    const [muted, setMuted] = useState(false)
    const [ready, setReady] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)    // Update parent with current time
    useEffect(() => {
        onTimeUpdate?.(currentTime)
    }, [currentTime, onTimeUpdate])

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

    // Handle volume changes
    useEffect(() => {
        const video = videoRef.current
        if (!video) return
        video.volume = volume
        video.muted = muted
    }, [volume, muted])

    const handleSeekTo = (seconds: number) => {
        const video = videoRef.current
        if (video) {
            video.currentTime = seconds
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const getMarkerPosition = (timestamp: number) => {
        return (timestamp / videoDuration) * 100
    }

    return (
        <div className="space-y-4">
            {/* Video Player Container */}
            <div className="relative bg-black rounded-lg aspect-video group" style={{ overflow: 'visible' }}>
                {/* Thumbnail/Poster - Show while loading */}
                {loading && !error && (
                    <div className="absolute inset-0 bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center rounded-lg">
                        <div className="text-center">

                            <div className="loading loading-spinner loading-lg text-primary"></div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="absolute inset-0 bg-error/10 flex items-center justify-center rounded-lg border-2 border-error/20">
                        <div className="text-center p-8 max-w-md">
                            <div className="text-4xl mb-3">⚠️</div>
                            <p className="text-error font-semibold mb-2">Failed to load video</p>
                            <p className="text-sm text-base-content/70 mb-4">{error}</p>
                            <button
                                className="btn btn-sm btn-error"
                                onClick={() => {
                                    setError(null)
                                    setLoading(true)
                                    if (videoRef.current) {
                                        videoRef.current.load()
                                    }
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}

                {/* Thumbnail overlay when video is ready but not playing */}
                {ready && !loading && !playing && currentTime === 0 && (
                    <div className="absolute inset-0 bg-gradient-to-br from-base-300 to-base-200 flex items-center justify-center rounded-lg cursor-pointer" onClick={() => setPlaying(true)}>
                        <div className="text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 mx-auto hover:bg-primary/30 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-primary ml-1">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-base-content/70 text-sm">Click to play</p>
                        </div>
                    </div>
                )}

                {/* HTML5 Video Element */}
                <video
                    ref={videoRef}
                    src={url}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    preload="auto"
                    onLoadStart={() => setLoading(true)}
                    onLoadedData={() => {
                        setLoading(false)
                        setReady(true)
                        onReady?.() // Notify parent that video is ready
                    }}
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                    onLoadedMetadata={(e) => {
                        setVideoDuration(e.currentTarget.duration)
                        setLoading(false)
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onCanPlay={() => setLoading(false)}
                    onError={(e) => {
                        console.error('Video error:', e)
                        setLoading(false)
                        setError('Video file could not be loaded. The signed URL may have expired.')
                    }}
                    onClick={() => setPlaying(!playing)}
                />

                {/* Play/Pause Icon Overlay - Shows on hover */}
                {ready && !loading && currentTime > 0 && (
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

                {/* Custom Controls - Show on hover or when paused */}
                <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 rounded-b-lg ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                    <div className="px-4 py-3">
                        {/* Timeline with Markers */}
                        <div className="relative mb-4">
                            {/* Clickable Progress Bar */}
                            <div
                                className="h-1.5 bg-white/20 rounded-full cursor-pointer relative group/progress"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const percentage = x / rect.width
                                    handleSeekTo(percentage * videoDuration)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        setPlaying(!playing)
                                    }
                                }}
                                role="progressbar"
                                tabIndex={0}
                                aria-valuemin={0}
                                aria-valuemax={videoDuration}
                                aria-valuenow={currentTime}
                            >
                                {/* Progress Fill */}
                                <div
                                    className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                                    style={{ width: `${(currentTime / videoDuration) * 100}%` }}
                                />

                                {/* Timeline Markers - Positioned on the bar */}
                                {concepts.map((concept) => (
                                    <button
                                        key={`${concept.concept}-${concept.timestamp}`}
                                        type="button"
                                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group/marker cursor-pointer transition-all hover:scale-125 z-10"
                                        style={{ left: `${getMarkerPosition(concept.timestamp)}%` }}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleSeekTo(concept.timestamp)
                                        }}
                                    >
                                        {/* Marker dot - same style as scrubber */}
                                        <div className="w-3 h-3 bg-primary rounded-full shadow-lg ring-2 ring-white" />

                                        {/* Tooltip on Hover */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 opacity-0 group-hover/marker:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                                            <div className="bg-base-100 text-base-content px-3 py-2 rounded-lg shadow-xl text-sm border border-base-300">
                                                <div className="font-semibold">{concept.concept}</div>
                                                <div className="flex items-center gap-2 text-xs text-base-content/60 mt-1">
                                                    <span>{formatTime(concept.timestamp)}</span>
                                                    <span className="text-primary font-medium">• {concept.importance}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}

                                {/* Scrubber Handle - Shows on hover */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                    style={{ left: `${(currentTime / videoDuration) * 100}%`, marginLeft: '-6px' }}
                                />
                            </div>
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between text-white">
                            {/* Left: Play/Pause & Time */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    className="btn btn-circle btn-sm bg-white/20 hover:bg-white/30 border-none transition-all"
                                    onClick={() => setPlaying(!playing)}
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

                            {/* Right: Volume */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="btn btn-circle btn-sm bg-white/20 hover:bg-white/30 border-none transition-all"
                                    onClick={() => setMuted(!muted)}
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
                                    value={volume}
                                    onChange={(e) => {
                                        setVolume(Number.parseFloat(e.target.value))
                                        if (muted) setMuted(false)
                                    }}
                                    className="range range-xs w-20"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Marker Legend */}
            <div className="flex items-center gap-2 text-sm text-base-content/60">
                <div className="w-3 h-3 bg-primary rounded-full shadow-lg ring-2 ring-white" />
                <span>Key Concepts (hover for details)</span>
            </div>
        </div>
    )
}
