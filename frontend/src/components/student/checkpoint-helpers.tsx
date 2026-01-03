import QuizIcon from '@mui/icons-material/Quiz'
import PsychologyIcon from '@mui/icons-material/Psychology'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import FlashOnIcon from '@mui/icons-material/FlashOn'
import type { LearningCheckpoint } from '../../types/video.types'

export const renderCheckpointIcon = (type: LearningCheckpoint['type']) => {
    switch (type) {
        case 'quickQuiz':
            return <QuizIcon fontSize="small" />
        case 'reflection':
            return <PsychologyIcon fontSize="small" />
        case 'prediction':
            return <LightbulbIcon fontSize="small" />
        case 'application':
            return <FlashOnIcon fontSize="small" />
        default:
            return <QuizIcon fontSize="small" />
    }
}

export const checkpointTone = (type: LearningCheckpoint['type']) => {
    switch (type) {
        case 'prediction':
            return { bg: 'bg-info', text: 'text-info' } // Blue - anticipation/thinking ahead
        case 'quickQuiz':
            return { bg: 'bg-success', text: 'text-success' } // Green - test knowledge
        case 'reflection':
            return { bg: 'bg-secondary', text: 'text-secondary' } // Purple - deeper thinking
        case 'application':
            return { bg: 'bg-warning', text: 'text-warning' } // Orange - practical use
        default:
            return { bg: 'bg-neutral', text: 'text-neutral-content' }
    }
}
