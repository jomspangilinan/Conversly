/* eslint-disable @typescript-eslint/no-explicit-any */

import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Video, Concept } from '../types/video.types'

interface VideoContextType {
    currentVideo: Video | null
    setCurrentVideo: (video: Video | null) => void
    updateConcept: (index: number, concept: Concept) => void
    addConcept: (concept: Concept) => void
    deleteConcept: (index: number) => void
    isModified: boolean
    resetModifications: () => void
}

const VideoContext = createContext<VideoContextType | undefined>(undefined)

export function VideoProvider({ children }: { children: ReactNode }) {
    const [currentVideo, setCurrentVideoState] = useState<Video | null>(null)
    const [isModified, setIsModified] = useState(false)

    const setCurrentVideo = useCallback((video: Video | null) => {
        setCurrentVideoState(video)
        setIsModified(false)
    }, [])

    const updateConcept = useCallback((index: number, concept: Concept) => {
        setCurrentVideoState((prev) => {
            if (!prev) return prev
            const updatedConcepts = [...(prev.concepts || [])]
            updatedConcepts[index] = concept
            setIsModified(true)
            return { ...prev, concepts: updatedConcepts }
        })
    }, [])

    const addConcept = useCallback((concept: Concept) => {
        setCurrentVideoState((prev) => {
            if (!prev) return prev
            const updatedConcepts = [...(prev.concepts || []), concept]
            // Sort by timestamp
            updatedConcepts.sort((a, b) => a.timestamp - b.timestamp)
            setIsModified(true)
            return { ...prev, concepts: updatedConcepts }
        })
    }, [])

    const deleteConcept = useCallback((index: number) => {
        setCurrentVideoState((prev) => {
            if (!prev) return prev
            const updatedConcepts = (prev.concepts || []).filter((_, i) => i !== index)
            setIsModified(true)
            return { ...prev, concepts: updatedConcepts }
        })
    }, [])

    const resetModifications = useCallback(() => {
        setIsModified(false)
    }, [])

    return (
        <VideoContext.Provider
            value={{
                currentVideo,
                setCurrentVideo,
                updateConcept,
                addConcept,
                deleteConcept,
                isModified,
                resetModifications,
            }}
        >
            {children}
        </VideoContext.Provider>
    )
}

export function useVideo() {
    const context = useContext(VideoContext)
    if (context === undefined) {
        throw new Error('useVideo must be used within a VideoProvider')
    }
    return context
}
