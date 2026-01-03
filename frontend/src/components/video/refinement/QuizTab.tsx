/* eslint-disable @typescript-eslint/no-explicit-any */
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'

interface QuizTabProps {
    suggestions: any
    onAccept: (suggestion: any, type: string) => void
}

export default function QuizTab({ suggestions, onAccept }: QuizTabProps) {
    const hasAnySuggestions = (suggestions.quizQuestionsToAdd?.length || 0) +
        (suggestions.quizQuestionsToImprove?.length || 0) > 0

    if (!hasAnySuggestions) {
        return (
            <div className="alert alert-success">
                <CheckCircleIcon />
                <div>
                    <div className="font-semibold">Great work!</div>
                    <div className="text-sm">Your quiz questions are comprehensive. No improvements needed.</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Quiz Questions to Add */}
            {suggestions.quizQuestionsToAdd && suggestions.quizQuestionsToAdd.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <AddIcon className="text-success" />
                        Add New Questions ({suggestions.quizQuestionsToAdd.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.quizQuestionsToAdd.map((item: any, idx: number) => (
                            <div key={idx} className="card bg-base-200 shadow">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <h5 className="font-semibold text-base">{item.question.question}</h5>
                                            <div className="text-sm text-base-content/70 mt-2 space-y-1">
                                                {item.question.options.map((opt: string, i: number) => (
                                                    <div key={i} className={i === item.question.correctAnswer ? 'text-success font-medium' : ''}>
                                                        {String.fromCharCode(65 + i)}. {opt}
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-base-content/60 mt-2">
                                                Explanation: {item.question.explanation}
                                            </p>
                                            <p className="text-xs text-info mt-2 flex items-center gap-1">
                                                <AutoFixHighIcon fontSize="small" />
                                                {item.reason}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-success btn-sm gap-1"
                                            onClick={() => onAccept(item, 'quizAdd')}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quiz Questions to Improve */}
            {suggestions.quizQuestionsToImprove && suggestions.quizQuestionsToImprove.length > 0 && (
                <div>
                    <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <EditIcon className="text-warning" />
                        Improve Existing Questions ({suggestions.quizQuestionsToImprove.length})
                    </h4>
                    <div className="space-y-3">
                        {suggestions.quizQuestionsToImprove.map((item: any, idx: number) => (
                            <div key={idx} className="card bg-base-200 shadow">
                                <div className="card-body p-4">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="badge badge-ghost badge-sm mb-1">Before</div>
                                                <p className="text-sm text-base-content/60 line-through">{item.original.question}</p>
                                            </div>
                                            <div>
                                                <div className="badge badge-warning badge-sm mb-1">After</div>
                                                <p className="text-sm font-medium">{item.improved.question}</p>
                                                <div className="text-xs text-base-content/70 mt-1">
                                                    Correct: {item.improved.options[item.improved.correctAnswer]}
                                                </div>
                                            </div>
                                            <p className="text-xs text-info flex items-center gap-1">
                                                <AutoFixHighIcon fontSize="small" />
                                                {item.reason}
                                            </p>
                                        </div>
                                        <button
                                            className="btn btn-warning btn-sm gap-1"
                                            onClick={() => onAccept(item, 'quizImprove')}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            Accept
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
