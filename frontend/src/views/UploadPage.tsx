import VideoUpload from '../components/video/VideoUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import QuizIcon from '@mui/icons-material/Quiz';
import { MOCK_MODE } from '../utils/mock';
import ApiKeysButton from '../components/settings/ApiKeysButton';

export default function UploadPage() {
    const handleUploadComplete = (videoId: string) => {
        console.log('✅ Upload complete! Video ID:', videoId);
        // Success is shown in VideoUpload component, no need for alert
        // TODO: Navigate to /videos/:id review page when it's built
    };

    const handleError = (error: Error) => {
        console.error('❌ Upload error:', error);
    };

    return (
        <div className="min-h-screen bg-base-200">
            {/* Mock Mode Indicator */}
            {MOCK_MODE && (
                <div className="bg-warning text-warning-content px-4 py-2 text-center text-sm font-medium">
                    🧪 MOCK MODE - Videos won't actually upload or process. Using test data.
                </div>
            )}

            {/* Header */}
            <header className="bg-base-100 shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Conversly
                        </h1>
                        <div className="flex gap-4">
                            <ApiKeysButton />
                            <a href="/creator" className="btn btn-ghost">
                                Dashboard
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold mb-4">Upload Your Video</h2>
                    <p className="text-xl text-base-content/70">
                        Upload your lesson and we'll extract the key moments to help you review before publishing
                    </p>
                </div>

                <VideoUpload onUploadComplete={handleUploadComplete} onError={handleError} />

                {/* Info Cards */}
                <div className="grid md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center gap-2 mb-2">
                                <DescriptionIcon className="text-primary" />
                                <h3 className="card-title text-lg">Searchable Transcript</h3>
                            </div>
                            <p className="text-sm text-base-content/70">
                                Full transcript with timestamps - search for any word and jump right to it
                            </p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center gap-2 mb-2">
                                <LightbulbIcon className="text-secondary" />
                                <h3 className="card-title text-lg">Key Moments</h3>
                            </div>
                            <p className="text-sm text-base-content/70">
                                AI finds the important moments so you can review and edit before students see them
                            </p>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl">
                        <div className="card-body">
                            <div className="flex items-center gap-2 mb-2">
                                <QuizIcon className="text-accent" />
                                <h3 className="card-title text-lg">Practice Questions</h3>
                            </div>
                            <p className="text-sm text-base-content/70">
                                Auto-generated questions you can tweak or approve to help students practice
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
