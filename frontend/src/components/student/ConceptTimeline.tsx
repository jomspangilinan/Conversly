import React, { useEffect, useState, useRef } from 'react';
import { ReviewTab } from './ReviewTab';
import { InteractionLog, type VideoInteraction } from './InteractionLog';
import { TutorConversationLogs } from './TutorConversationLogs';
import type { Concept, TranscriptItem, LearningCheckpoint } from '../../types/video.types';

interface ConceptTimelineProps {
    concepts: Concept[];
    currentTime: number;
    transcript?: TranscriptItem[];
    isPlaying: boolean;
    checkpoints?: LearningCheckpoint[];
    dismissedCheckpoints?: Set<string>;
    completedCheckpoints?: Set<string>;
    interactions?: VideoInteraction[];
    onClearInteractions?: () => void;
    onSeekToCheckpoint?: (checkpoint: LearningCheckpoint) => void;
}

export const ConceptTimeline: React.FC<ConceptTimelineProps> = ({
    concepts,
    currentTime,
    transcript,
    isPlaying,
    checkpoints = [],
    dismissedCheckpoints = new Set(),
    completedCheckpoints = new Set(),
    interactions = [],
    onClearInteractions,
    onSeekToCheckpoint,
}) => {
    const [activeTab, setActiveTab] = useState<'outline' | 'transcript' | 'review' | 'interactions' | 'logs'>('outline');
    const [manuallyExpanded, setManuallyExpanded] = useState<string | null>(null);
    const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set()); // Track explicitly collapsed concepts
    const [readAlongMode, setReadAlongMode] = useState(false); // User explicitly wants full details while playing
    const activeConceptRef = useRef<HTMLDivElement>(null);
    const prevActiveConceptRef = useRef<string | null>(null);

    // Listen for expand concept events from video player (Read Along button)
    useEffect(() => {
        const handleExpand = (e: Event) => {
            const customEvent = e as CustomEvent<{ conceptIndex: number }>;
            if (customEvent.detail?.conceptIndex !== undefined) {
                const concept = concepts[customEvent.detail.conceptIndex];
                if (concept) {
                    const conceptKey = `${concept.timestamp}-${customEvent.detail.conceptIndex}`;
                    setManuallyExpanded(conceptKey);
                    setReadAlongMode(true); // Enable read-along mode
                    // Broadcast state change
                    const stateEvent = new CustomEvent('readAlongStateChange', {
                        detail: { enabled: true }
                    })
                    window.dispatchEvent(stateEvent)
                }
            }
        };

        const handleScrollToActive = () => {
            // Scroll to the active concept card
            if (activeConceptRef.current) {
                activeConceptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        const handleToggleReadAlong = () => {
            setReadAlongMode(prev => {
                const newState = !prev
                // Broadcast state change so checkbox can update
                const stateEvent = new CustomEvent('readAlongStateChange', {
                    detail: { enabled: newState }
                })
                window.dispatchEvent(stateEvent)
                return newState
            });
        };

        const handleTutorOpenTab = (e: Event) => {
            const customEvent = e as CustomEvent<{ tab?: 'outline' | 'transcript' | 'review' | 'interactions' | 'logs' }>
            const tab = customEvent.detail?.tab
            if (!tab) return
            setActiveTab(tab)
        }

        window.addEventListener('expandConcept', handleExpand);
        window.addEventListener('scrollToActiveConcept', handleScrollToActive);
        window.addEventListener('toggleReadAlong', handleToggleReadAlong);
        window.addEventListener('tutorOpenTab', handleTutorOpenTab);
        return () => {
            window.removeEventListener('expandConcept', handleExpand);
            window.removeEventListener('scrollToActiveConcept', handleScrollToActive);
            window.removeEventListener('toggleReadAlong', handleToggleReadAlong);
            window.removeEventListener('tutorOpenTab', handleTutorOpenTab);
        };
    }, [concepts]);

    // Auto-follow active concept in read-along mode
    useEffect(() => {
        if (!readAlongMode) return;

        const parseSeconds = (timestamp: number | string): number => {
            if (typeof timestamp === 'number') return timestamp;
            const parts = String(timestamp).split(':').map(Number);
            if (parts.length === 2) return parts[0] * 60 + parts[1];
            if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
            return 0;
        };

        const sortedConcepts = [...concepts].sort((a, b) => parseSeconds(a.timestamp) - parseSeconds(b.timestamp));
        const activeIndex = sortedConcepts.findIndex((concept, index) => {
            const conceptTime = parseSeconds(concept.timestamp);
            const nextConceptTime = index < sortedConcepts.length - 1
                ? parseSeconds(sortedConcepts[index + 1].timestamp)
                : Infinity;
            const displayUntil = Math.min(conceptTime + 60, nextConceptTime);
            return currentTime >= conceptTime && currentTime < displayUntil;
        });

        if (activeIndex !== -1) {
            const activeConcept = sortedConcepts[activeIndex];
            const activeKey = `${activeConcept.timestamp}-${activeIndex}`;

            // Move expansion to new active concept and scroll to it
            if (activeKey !== prevActiveConceptRef.current) {
                // Clear any manual collapse for the new active concept (in read-along mode, we want to show it)
                setManuallyCollapsed(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(activeKey);
                    return newSet;
                });
                prevActiveConceptRef.current = activeKey;

                // Scroll to active concept
                if (activeConceptRef.current) {
                    activeConceptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [currentTime, concepts, readAlongMode]);

    const parseSeconds = (timestamp: number | string): number => {
        if (typeof timestamp === 'number') return timestamp;
        const parts = String(timestamp).split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    };

    const sortedConcepts = [...concepts].sort(
        (a, b) => parseSeconds(a.timestamp) - parseSeconds(b.timestamp)
    );

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (concepts.length === 0) {
        return (
            <div className="text-center py-12 text-base-content/50">
                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-semibold">No concepts available</p>
                <p className="text-sm mt-1">Concepts will appear as the video is analyzed</p>
            </div>
        );
    }

    return (
        <div>
            <div className="tabs tabs-boxed bg-base-300 mb-3">
                <button
                    className={`tab gap-2 ${activeTab === 'outline' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('outline')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Outline
                </button>
                <button
                    className={`tab gap-2 ${activeTab === 'review' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('review')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Review
                    {dismissedCheckpoints.size > 0 && (
                        <span className="badge badge-sm badge-primary">{dismissedCheckpoints.size}</span>
                    )}
                </button>
                <button
                    className={`tab gap-2 ${activeTab === 'interactions' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('interactions')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Interactions
                    {interactions.length > 0 && (
                        <span className="badge badge-sm badge-info">{interactions.length}</span>
                    )}
                </button>

                <button
                    className={`tab gap-2 ${activeTab === 'logs' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8L3 20l1.2-3A7.78 7.78 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                    </svg>
                    Tutor Logs
                </button>
                {transcript && (
                    <button
                        className={`tab gap-2 ${activeTab === 'transcript' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('transcript')}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Transcript
                    </button>
                )}
            </div>

            <div>
                {activeTab === 'outline' && (
                    <div className="space-y-3">
                        {/* Progress indicator */}
                        <div className="flex items-center gap-3 mb-4 p-4 rounded-lg bg-success/10 border border-success/20">
                            <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center text-white font-bold text-lg">
                                {sortedConcepts.filter((c, idx) => {
                                    const conceptTime = parseSeconds(c.timestamp);
                                    const nextConceptTime = idx < sortedConcepts.length - 1
                                        ? parseSeconds(sortedConcepts[idx + 1].timestamp)
                                        : Infinity;
                                    const displayUntil = Math.min(conceptTime + 60, nextConceptTime);
                                    return currentTime >= displayUntil;
                                }).length}/{sortedConcepts.length}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-base-content">
                                        {sortedConcepts.filter((c, idx) => {
                                            const conceptTime = parseSeconds(c.timestamp);
                                            const nextConceptTime = idx < sortedConcepts.length - 1
                                                ? parseSeconds(sortedConcepts[idx + 1].timestamp)
                                                : Infinity;
                                            const displayUntil = Math.min(conceptTime + 60, nextConceptTime);
                                            return currentTime >= displayUntil;
                                        }).length} of {sortedConcepts.length} concepts mastered - {Math.round((sortedConcepts.filter((c, idx) => {
                                            const conceptTime = parseSeconds(c.timestamp);
                                            const nextConceptTime = idx < sortedConcepts.length - 1
                                                ? parseSeconds(sortedConcepts[idx + 1].timestamp)
                                                : Infinity;
                                            const displayUntil = Math.min(conceptTime + 60, nextConceptTime);
                                            return currentTime >= displayUntil;
                                        }).length / sortedConcepts.length) * 100)}% complete!
                                    </p>
                                    <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-base-content/60">
                                        Keep going - you're learning actively!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {sortedConcepts.map((concept, index) => {
                                const conceptTime = parseSeconds(concept.timestamp);
                                const nextConceptTime = index < sortedConcepts.length - 1
                                    ? parseSeconds(sortedConcepts[index + 1].timestamp)
                                    : Infinity;
                                const displayUntil = Math.min(conceptTime + 60, nextConceptTime);

                                const isActive = currentTime >= conceptTime && currentTime < displayUntil;
                                const isPassed = currentTime >= displayUntil; // Passed when we're beyond the display window
                                const conceptKey = `${concept.timestamp}-${index}`;

                                // ALWAYS expand active concepts, respect manual collapse for passed/future only
                                const isExpanded = isActive || (!manuallyCollapsed.has(conceptKey) && (isPassed || manuallyExpanded === conceptKey));

                                return (
                                    <div key={conceptKey} className="flex gap-3 relative group/timeline-item">
                                        {/* Timeline connector */}
                                        <div className="flex flex-col items-center flex-shrink-0 -my-1.5">
                                            {/* Connecting line from previous (appears above circle) */}
                                            {index > 0 ? (
                                                <div className={`w-0.5 h-9 ${sortedConcepts[index - 1] && currentTime >= (parseSeconds(sortedConcepts[index - 1].timestamp) ?? 0) + (sortedConcepts[index - 1].displayDurationSeconds || 5)
                                                    ? 'bg-success/30'
                                                    : isActive
                                                        ? 'bg-primary/30'
                                                        : 'bg-base-300'
                                                    }`} />
                                            ) : (
                                                <div className="h-9" />
                                            )}
                                            {/* Circle/icon indicator */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all flex-shrink-0 ${isActive
                                                ? 'bg-primary text-primary-content ring-4 ring-primary/20 animate-pulse'
                                                : isPassed
                                                    ? 'bg-success text-success-content shadow-lg'
                                                    : 'bg-base-300 text-base-content opacity-50 group-hover/timeline-item:opacity-75'
                                                }`}>
                                                {isPassed ? (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                ) : isActive ? (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <span className="text-base font-bold">{index + 1}</span>
                                                )}
                                            </div>
                                            {/* Connecting line to next (appears below circle) */}
                                            <div className={`w-0.5 flex-1 ${index < sortedConcepts.length - 1 ? (isPassed ? 'bg-success/30' : isActive ? 'bg-primary/30' : 'bg-base-300') : 'bg-transparent'
                                                }`} />
                                        </div>

                                        {/* Concept Card */}
                                        <div
                                            ref={isActive ? activeConceptRef : null}
                                            className={`flex-1 group relative overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${concept.visualEmphasis && isActive ? 'animate-pulse ring-4 ring-warning/50' : ''
                                                } ${isActive
                                                    ? 'bg-primary/10 border-primary shadow-2xl'
                                                    : isPassed
                                                        ? 'bg-success/5 border-success/30 hover:border-success/50'
                                                        : 'bg-base-200/50 border-base-300/50 hover:border-primary/40 hover:shadow-lg opacity-50 hover:opacity-75'
                                                }`}
                                            onClick={() => {
                                                // Active concepts cannot be collapsed - they always show full details
                                                if (isActive) {
                                                    return; // Do nothing
                                                }

                                                if (isPassed) {
                                                    // Passed concept: toggle collapse state
                                                    const newCollapsed = new Set(manuallyCollapsed);
                                                    if (isExpanded) {
                                                        newCollapsed.add(conceptKey);
                                                    } else {
                                                        newCollapsed.delete(conceptKey);
                                                    }
                                                    setManuallyCollapsed(newCollapsed);
                                                } else {
                                                    // Future concepts: toggle manual expansion
                                                    setManuallyExpanded(manuallyExpanded === conceptKey ? null : conceptKey);
                                                }
                                            }}
                                        >
                                            {/* Animated glow for active concept */}
                                            {isActive && (
                                                <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" />
                                            )}

                                            {/* Read-along mode indicator */}
                                            {isActive && readAlongMode && isPlaying && (
                                                <div className="absolute top-3 right-3 z-10 text-xs font-semibold bg-info text-info-content px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    Reading Along
                                                </div>
                                            )}

                                            <div className="relative p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        {/* Header */}
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.dispatchEvent(new CustomEvent('seekToTime', { detail: conceptTime }));
                                                                }}
                                                                className={`text-xs font-mono px-2 py-1 rounded transition-all hover:scale-105 ${isActive
                                                                    ? 'bg-primary/20 text-primary font-bold'
                                                                    : 'bg-base-300 text-base-content/50 hover:bg-primary/10 hover:text-primary'
                                                                    }`}
                                                            >
                                                                {formatTime(conceptTime)}
                                                            </button>
                                                            {/* Max 2 badges: Priority is importance > visual */}
                                                            {concept.importance === 'core' && (
                                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-error/20 text-error border border-error/40 font-semibold">
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                    Core
                                                                </span>
                                                            )}
                                                            {concept.importance === 'supporting' && (
                                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-info/20 text-info border border-info/40 font-semibold">
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Supporting
                                                                </span>
                                                            )}
                                                            {concept.visualEmphasis && !concept.importance && (
                                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-warning/20 text-warning border border-warning/40">
                                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                    Visual
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Title - larger when active, with proper overflow handling */}
                                                        <h4 className={`font-bold leading-tight transition-all ${isActive
                                                            ? 'text-xl md:text-2xl text-primary mb-3'
                                                            : isPassed
                                                                ? 'text-base text-success/80'
                                                                : 'text-base text-base-content'
                                                            }`}>
                                                            {concept.concept}
                                                        </h4>

                                                        {/* Show full details when expanded */}
                                                        {isExpanded && (
                                                            <div className={`mt-4 pt-4 border-t-2 space-y-3 ${isActive ? 'border-primary/30' : 'border-base-content/10'}`}>
                                                                {/* Description */}
                                                                <div className={`leading-relaxed ${isActive
                                                                    ? 'text-base text-base-content font-medium'
                                                                    : 'text-sm text-base-content/70'
                                                                    }`}>
                                                                    {concept.description}
                                                                </div>

                                                                {/* Visual elements - Diagram/Screen content */}
                                                                {concept.visualElements && (
                                                                    <div className={`rounded-lg border-2 overflow-hidden ${isActive
                                                                        ? 'bg-warning/10 border-warning shadow-lg'
                                                                        : 'bg-base-100 border-warning/30'
                                                                        }`}>
                                                                        <div className={`px-3 py-2 flex items-center gap-2 ${isActive ? 'bg-warning/20' : 'bg-warning/10'
                                                                            }`}>
                                                                            <svg className="w-5 h-5 text-warning" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                                            </svg>
                                                                            <span className={`font-bold ${isActive ? 'text-base' : 'text-sm'
                                                                                } text-warning`}>
                                                                                Watch the screen
                                                                            </span>
                                                                        </div>
                                                                        <div className="px-3 py-3">
                                                                            <p className={`${isActive ? 'text-sm' : 'text-xs'
                                                                                } text-base-content/80 leading-relaxed`}>
                                                                                {concept.visualElements}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {/* Transcript Snippet - what instructor actually said */}
                                                                {concept.transcriptSnippet && (
                                                                    <div className="rounded-lg border-2 border-info/30 bg-info/5 overflow-hidden">
                                                                        <div className="px-3 py-2 bg-info/10 flex items-center gap-2">
                                                                            <svg className="w-5 h-5 text-info" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                                                            </svg>
                                                                            <span className={`font-bold ${isActive ? 'text-base' : 'text-sm'
                                                                                } text-info`}>
                                                                                Instructor says
                                                                            </span>
                                                                        </div>
                                                                        <div className="px-3 py-3">
                                                                            <p className={`${isActive ? 'text-sm' : 'text-xs'
                                                                                } text-base-content/70 italic leading-relaxed`}>
                                                                                "{concept.transcriptSnippet}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Expand indicator */}
                                                    <div className={`flex-shrink-0 transition-all ${isActive ? 'text-primary' : 'text-base-content/30 group-hover:text-base-content/60'
                                                        }`}>
                                                        <svg
                                                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'transcript' && (
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        {transcript && transcript.length > 0 ? (
                            <div className="bg-base-200 rounded-lg p-6 space-y-3">
                                {transcript.map((item, idx) => {
                                    const mins = Math.floor(item.timestamp / 60);
                                    const secs = Math.floor(item.timestamp % 60);
                                    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                                    return (
                                        <div key={idx} className="flex gap-3">
                                            <span className="text-xs text-primary font-mono shrink-0 mt-0.5">
                                                {timeStr}
                                            </span>
                                            <p className="text-sm text-base-content/80 leading-relaxed">
                                                {item.text}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-base-content/50">
                                <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="font-semibold">No transcript available</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'review' && (
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        <ReviewTab
                            dismissedCheckpoints={dismissedCheckpoints}
                            completedCheckpoints={completedCheckpoints}
                            allCheckpoints={checkpoints}
                            onSeekToCheckpoint={(checkpoint) => onSeekToCheckpoint?.(checkpoint)}
                        />
                    </div>
                )}

                {activeTab === 'interactions' && (
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        <InteractionLog
                            interactions={interactions}
                            onClear={() => onClearInteractions?.()}
                        />
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div className="max-h-[600px] overflow-y-auto pr-2">
                        <TutorConversationLogs />
                    </div>
                )}
            </div>
        </div>
    );
};
