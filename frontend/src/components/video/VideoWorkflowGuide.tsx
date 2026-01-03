import type { Video } from '../../types/video.types'

type StepStatus = 'completed' | 'current' | 'upcoming'

interface WorkflowStep {
    id: string
    title: string
    description: string
    status: StepStatus
    action?: string
    actionButton?: string
}

interface VideoWorkflowGuideProps {
    readonly video: Video
    readonly onActionClick: (stepId: string) => void
}

export default function VideoWorkflowGuide({ video, onActionClick }: VideoWorkflowGuideProps) {
    // Calculate workflow steps based on video state
    const steps: WorkflowStep[] = [
        {
            id: 'upload',
            title: '✅ Video Uploaded',
            description: 'Your video has been successfully uploaded and processed',
            status: 'completed'
        },
        {
            id: 'ai-analysis',
            title: video.concepts && video.concepts.length > 0 ? '✅ AI Analysis Complete' : '⏳ AI Processing',
            description: video.concepts && video.concepts.length > 0
                ? `Found ${video.concepts.length} key concepts, ${video.quiz?.length || 0} quiz questions, and ${video.checkpoints?.length || 0} learning checkpoints`
                : 'AI is analyzing your video to extract learning concepts...',
            status: video.concepts && video.concepts.length > 0 ? 'completed' : 'current'
        },
        {
            id: 'review-concepts',
            title: '📝 Review Key Concepts',
            description: 'Check if AI identified all important concepts correctly',
            status: getConceptReviewStatus(video),
            action: 'Review the timeline below and edit any concepts that need refinement',
            actionButton: 'Jump to Timeline'
        },
        {
            id: 'add-missing',
            title: '➕ Add Missing Concepts',
            description: 'Add any important concepts AI might have missed',
            status: getAddMissingStatus(video),
            action: 'Watch the video and add concepts at key moments',
            actionButton: 'Add Concept'
        },
        {
            id: 'verify-checkpoints',
            title: '🎯 Verify Learning Checkpoints',
            description: 'Ensure interactive checkpoints are well-placed',
            status: getCheckpointStatus(video),
            action: 'Review checkpoint placement and questions',
            actionButton: 'View Checkpoints'
        },
        {
            id: 'finalize',
            title: '🚀 Finalize & Publish',
            description: 'Save your changes and make the video available',
            status: 'upcoming',
            action: 'Once satisfied, publish the video for learners',
            actionButton: 'Publish Video'
        }
    ]

    const currentStepIndex = steps.findIndex(s => s.status === 'current')
    const completedCount = steps.filter(s => s.status === 'completed').length
    const progress = (completedCount / steps.length) * 100

    return (
        <div className="card bg-base-200 shadow-xl mb-6">
            <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title text-2xl">
                        📋 Review Workflow
                    </h2>
                    <div className="text-sm font-medium">
                        {completedCount} of {steps.length} steps completed
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-base-300 rounded-full h-2.5 mb-6">
                    <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Steps */}
                <div className="space-y-4">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`
                                border-l-4 pl-4 py-3 transition-all
                                ${step.status === 'completed' ? 'border-success bg-success/5' : ''}
                                ${step.status === 'current' ? 'border-primary bg-primary/10 shadow-lg' : ''}
                                ${step.status === 'upcoming' ? 'border-base-300 opacity-60' : ''}
                            `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg mb-1">
                                        {step.title}
                                    </h3>
                                    <p className="text-sm text-base-content/70 mb-2">
                                        {step.description}
                                    </p>

                                    {step.status === 'current' && step.action && (
                                        <div className="mt-3">
                                            <div className="alert alert-info py-2 px-3 text-sm">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                <span>{step.action}</span>
                                            </div>
                                            {step.actionButton && (
                                                <button
                                                    className="btn btn-primary btn-sm mt-2"
                                                    onClick={() => onActionClick(step.id)}
                                                >
                                                    {step.actionButton}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {step.status === 'completed' && (
                                    <div className="badge badge-success badge-lg ml-4">
                                        ✓
                                    </div>
                                )}
                                {step.status === 'current' && (
                                    <div className="badge badge-primary badge-lg ml-4 animate-pulse">
                                        ▶
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Next Recommended Action */}
                {currentStepIndex >= 0 && (
                    <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/30">
                        <div className="flex items-start gap-3">
                            <div className="text-2xl">💡</div>
                            <div>
                                <h4 className="font-semibold mb-1">Recommended Next Step</h4>
                                <p className="text-sm text-base-content/80">
                                    {steps[currentStepIndex].action}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// Helper functions to determine step status
function getConceptReviewStatus(video: Video): StepStatus {
    if (!video.concepts || video.concepts.length === 0) return 'upcoming'
    // If concepts exist, this becomes the current step
    return 'current'
}

function getAddMissingStatus(video: Video): StepStatus {
    if (!video.concepts || video.concepts.length === 0) return 'upcoming'
    // Always available after AI analysis, but only complete if user has reviewed
    return 'upcoming'
}

function getCheckpointStatus(video: Video): StepStatus {
    if (!video.checkpoints || video.checkpoints.length === 0) return 'upcoming'
    // Could add logic to check if checkpoints have been reviewed
    return 'upcoming'
}
