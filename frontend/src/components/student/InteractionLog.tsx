import { useState } from 'react'

export interface VideoInteraction {
    id: string
    timestamp: number // When the interaction happened (Date.now())
    videoTime: number // Current video playback time
    type: 'manual_pause' | 'manual_play' | 'seek' | 'checkpoint_skip' | 'checkpoint_engage' | 'checkpoint_complete' | 'rewind' | 'forward' | 'speed_change'
    details?: string
    metadata?: Record<string, any>
}

interface InteractionLogProps {
    interactions: VideoInteraction[]
    onClear: () => void
}

export function InteractionLog({ interactions, onClear }: InteractionLogProps) {
    const [filter, setFilter] = useState<string>('all')

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const formatTimestamp = (timestamp: number): string => {
        const date = new Date(timestamp)
        return date.toLocaleTimeString('en-US', { hour12: false })
    }

    const getInteractionIcon = (interaction: VideoInteraction) => {
        switch (interaction.type) {
            case 'manual_pause':
                return (
                    <div className="w-8 h-8 rounded-full bg-error/20 text-error flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            case 'manual_play':
                return (
                    <div className="w-8 h-8 rounded-full bg-success/20 text-success flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            case 'seek':
                return (
                    <div className="w-8 h-8 rounded-full bg-info/20 text-info flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            case 'checkpoint_skip':
                return (
                    <div className="w-8 h-8 rounded-full bg-warning/20 text-warning flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            case 'checkpoint_engage':
                return (
                    <div className="w-8 h-8 rounded-full bg-secondary/20 text-secondary flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            case 'checkpoint_complete':
                // Show green for correct, red for incorrect
                const isCorrect = interaction.metadata?.isCorrect
                const bgColor = isCorrect === true ? 'bg-success/20 text-success'
                    : isCorrect === false ? 'bg-error/20 text-error'
                        : 'bg-success/20 text-success'
                return (
                    <div className={`w-8 h-8 rounded-full ${bgColor} flex items-center justify-center`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            {isCorrect === false ? (
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            ) : (
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            )}
                        </svg>
                    </div>
                )
            case 'rewind':
                return (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
                        </svg>
                    </div>
                )
            case 'forward':
                return (
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-500 flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798l-5.445-3.63z" />
                        </svg>
                    </div>
                )
            case 'speed_change':
                return (
                    <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                    </div>
                )
            default:
                return null
        }
    }

    const getInteractionLabel = (type: VideoInteraction['type']) => {
        const labels: Record<VideoInteraction['type'], string> = {
            manual_pause: 'Manual Pause',
            manual_play: 'Manual Play',
            seek: 'Seek/Scrub',
            checkpoint_skip: 'Checkpoint Skipped',
            checkpoint_engage: 'Checkpoint Engaged',
            checkpoint_complete: 'Checkpoint Completed',
            rewind: 'Rewind',
            forward: 'Forward',
            speed_change: 'Speed Changed'
        }
        return labels[type] || type
    }

    const filteredInteractions = filter === 'all'
        ? interactions
        : interactions.filter(i => i.type === filter)

    const stats = {
        manual_pauses: interactions.filter(i => i.type === 'manual_pause').length,
        manual_plays: interactions.filter(i => i.type === 'manual_play').length,
        seeks: interactions.filter(i => i.type === 'seek').length,
        rewinds: interactions.filter(i => i.type === 'rewind').length,
        forwards: interactions.filter(i => i.type === 'forward').length,
        checkpoint_skips: interactions.filter(i => i.type === 'checkpoint_skip').length,
        checkpoint_engages: interactions.filter(i => i.type === 'checkpoint_engage').length,
        checkpoint_completes: interactions.filter(i => i.type === 'checkpoint_complete').length,
        speed_changes: interactions.filter(i => i.type === 'speed_change').length,
    }

    return (
        <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-error">{stats.manual_pauses}</div>
                    <div className="text-xs text-base-content/60">Manual Pauses</div>
                </div>
                <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-success">{stats.manual_plays}</div>
                    <div className="text-xs text-base-content/60">Manual Plays</div>
                </div>
                <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-info">{stats.seeks}</div>
                    <div className="text-xs text-base-content/60">Seeks/Scrubs</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-500">{stats.rewinds}</div>
                    <div className="text-xs text-base-content/60">Rewinds</div>
                </div>
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-cyan-500">{stats.forwards}</div>
                    <div className="text-xs text-base-content/60">Forwards</div>
                </div>
                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-warning">{stats.checkpoint_skips}</div>
                    <div className="text-xs text-base-content/60">Skipped Checkpoints</div>
                </div>
                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-secondary">{stats.checkpoint_engages}</div>
                    <div className="text-xs text-base-content/60">Engaged Checkpoints</div>
                </div>
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-primary">{stats.checkpoint_completes}</div>
                    <div className="text-xs text-base-content/60">Completed Checkpoints</div>
                </div>
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-accent">{stats.speed_changes}</div>
                    <div className="text-xs text-base-content/60">Speed Changes</div>
                </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2 flex-wrap">
                <select
                    className="select select-sm select-bordered"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">All Interactions ({interactions.length})</option>
                    <option value="manual_pause">Manual Pauses</option>
                    <option value="manual_play">Manual Plays</option>
                    <option value="seek">Seeks</option>
                    <option value="rewind">Rewinds</option>
                    <option value="forward">Forwards</option>
                    <option value="checkpoint_skip">Checkpoint Skips</option>
                    <option value="checkpoint_engage">Checkpoint Engages</option>
                    <option value="checkpoint_complete">Checkpoint Completes</option>
                    <option value="speed_change">Speed Changes</option>
                </select>
                <button onClick={onClear} className="btn btn-sm btn-ghost">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Log
                </button>
                <button
                    onClick={() => {
                        const dataStr = JSON.stringify(interactions, null, 2)
                        const dataBlob = new Blob([dataStr], { type: 'application/json' })
                        const url = URL.createObjectURL(dataBlob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `interaction-log-${new Date().toISOString().split('T')[0]}.json`
                        link.click()
                        URL.revokeObjectURL(url)
                    }}
                    className="btn btn-sm btn-primary"
                    disabled={interactions.length === 0}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export JSON
                </button>
            </div>

            {/* Interaction Log */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {filteredInteractions.length === 0 ? (
                    <div className="text-center py-12 text-base-content/50">
                        <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="font-semibold">No interactions yet</p>
                        <p className="text-sm mt-1">Your video player interactions will appear here</p>
                    </div>
                ) : (
                    filteredInteractions.slice().reverse().map((interaction) => (
                        <div
                            key={interaction.id}
                            className="flex items-start gap-3 p-3 bg-base-200/50 hover:bg-base-200 rounded-lg transition-colors"
                        >
                            {getInteractionIcon(interaction)}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-semibold text-sm">
                                        {getInteractionLabel(interaction.type)}
                                    </span>
                                    <span className="text-xs text-base-content/50">
                                        @ {formatTime(interaction.videoTime)}
                                    </span>
                                    {interaction.metadata?.checkpointType && (
                                        <span className="badge badge-xs badge-ghost">
                                            {interaction.metadata.checkpointType}
                                        </span>
                                    )}
                                </div>
                                {interaction.details && (
                                    <p className="text-xs text-base-content/70 mb-1">{interaction.details}</p>
                                )}
                                {interaction.metadata?.concept && (
                                    <p className="text-xs text-primary/70 font-medium">
                                        {interaction.metadata.concept}
                                    </p>
                                )}
                                <div className="text-xs text-base-content/50 mt-1">
                                    {formatTimestamp(interaction.timestamp)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
