import { useNavigate } from 'react-router-dom'
import type { Video } from '../../types/video.types'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ApiKeysButton from '../settings/ApiKeysButton'

interface VideoHeaderProps {
    video: Video
    formatDuration: (seconds: number) => string
}

export default function VideoHeader({ video, formatDuration }: VideoHeaderProps) {
    const navigate = useNavigate()

    return (
        <header className="bg-base-100 shadow-lg">
            <div className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="btn btn-ghost gap-2"
                            onClick={() => navigate('/creator')}
                        >
                            <ArrowBackIcon fontSize="small" />
                            Back
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold">{video.title || 'Untitled Video'}</h1>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1 text-sm text-base-content/60">
                                    <AccessTimeIcon fontSize="small" />
                                    {formatDuration(video.duration || 0)}
                                </span>
                                <span className="badge badge-success">
                                    {video.status === 'ready' ? 'Ready for Review' : video.status}
                                </span>
                            </div>
                        </div>
                    </div>
                    <ApiKeysButton />
                </div>
            </div>
        </header>
    )
}
