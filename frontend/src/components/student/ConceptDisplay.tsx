import React, { useEffect, useState } from 'react';
import type { Concept } from '../../types/video.types';

interface ConceptDisplayProps {
    concepts: Concept[];
    currentTime: number;
}

export const ConceptDisplay: React.FC<ConceptDisplayProps> = ({
    concepts,
    currentTime,
}) => {
    const [currentConcept, setCurrentConcept] = useState<Concept | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasShown, setHasShown] = useState(new Set<string>());

    // Parse timestamp to seconds
    const parseSeconds = (timestamp: number | string): number => {
        if (typeof timestamp === 'number') return timestamp;
        const parts = String(timestamp).split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        return 0;
    };

    // Sort concepts by timestamp
    const sortedConcepts = [...concepts].sort(
        (a, b) => parseSeconds(a.timestamp) - parseSeconds(b.timestamp)
    );

    useEffect(() => {
        // Find the current concept based on video time
        // Show concept for 10 seconds after its timestamp
        const DISPLAY_DURATION = 10; // seconds to show each concept

        let activeConceptIndex = -1;
        for (let i = sortedConcepts.length - 1; i >= 0; i--) {
            const conceptTime = parseSeconds(sortedConcepts[i].timestamp);
            if (currentTime >= conceptTime && currentTime < conceptTime + DISPLAY_DURATION) {
                activeConceptIndex = i;
                break;
            }
        }

        if (activeConceptIndex >= 0) {
            const concept = sortedConcepts[activeConceptIndex];
            const conceptKey = `${concept.timestamp}-${concept.concept}`;

            // Only show main concepts or important sub-concepts
            const shouldShow = concept.conceptType === 'main' || concept.importance === 'core';

            if (shouldShow && !hasShown.has(conceptKey)) {
                setCurrentConcept(concept);
                setIsVisible(true);
                setHasShown(prev => new Set(prev).add(conceptKey));
            } else if (currentConcept && parseSeconds(currentConcept.timestamp) !== parseSeconds(concept.timestamp)) {
                // New concept at different timestamp
                if (shouldShow) {
                    setCurrentConcept(concept);
                    setIsVisible(true);
                }
            }
        } else if (currentConcept) {
            // Fade out if past display duration
            const conceptTime = parseSeconds(currentConcept.timestamp);
            if (currentTime >= conceptTime + 10) {
                setIsVisible(false);
            }
        }
    }, [currentTime, sortedConcepts, hasShown, currentConcept]);

    // Don't render if no concept or not visible
    if (!currentConcept || !isVisible) return null;

    // Get concept type badge
    const getConceptTypeBadge = () => {
        if (currentConcept.conceptType === 'main') {
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Main Topic
                </span>
            );
        }
        if (currentConcept.importance === 'core') {
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Key Concept
                </span>
            );
        }
        return null;
    };

    return (
        <div
            className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-40
        w-full max-w-2xl px-4
        transition-all duration-500 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}
      `}
        >
            <div className="bg-gradient-to-r from-indigo-900/95 to-purple-900/95 backdrop-blur-lg rounded-lg shadow-2xl border border-white/10 p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                        </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            {getConceptTypeBadge()}
                            <span className="text-xs text-gray-400">
                                Now Learning
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">
                            {currentConcept.concept}
                        </h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {currentConcept.description}
                        </p>
                        {currentConcept.visualEmphasis && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-yellow-300">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                <span>Watch the screen closely</span>
                            </div>
                        )}
                    </div>

                    {/* Close button (optional) */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="flex-shrink-0 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                        aria-label="Dismiss"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};
