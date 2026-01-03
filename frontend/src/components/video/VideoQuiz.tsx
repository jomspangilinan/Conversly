
import { useEffect, useState, type ReactNode } from 'react'
import type { Video } from '../../types/video.types'

interface VideoQuizProps {
    video: Video
    carousel?: boolean // Enable carousel mode
}

type QuizQuestion = NonNullable<Video['quiz']>[number]

function makeSafeId(input: string) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}

export default function VideoQuiz({ video, carousel = false }: VideoQuizProps) {
    const [quizIndex, setQuizIndex] = useState(0)

    const quiz = video.quiz ?? []
    const hasQuiz = quiz.length > 0

    const getQuizKey = (q: QuizQuestion) => `${q.question}::${q.relatedConcept ?? ''}::${q.options.join('|')}`
    const getQuizId = (q: QuizQuestion) => `quiz-${makeSafeId(getQuizKey(q))}`

    const scrollToQuiz = (index: number) => {
        const target = quiz[index]
        if (!target) return
        document.getElementById(getQuizId(target))?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        setQuizIndex((current) => (current > quiz.length - 1 ? 0 : current))
    }, [quiz.length])

    let quizBody: ReactNode

    if (!hasQuiz) {
        quizBody = (
            <div className="text-center py-8 text-base-content/60">
                No quiz questions generated yet
            </div>
        )
    } else if (carousel) {
        // Carousel mode
        quizBody = (
            <>
                <div className="carousel w-full">
                    {quiz.map((q, index) => (
                        <div
                            key={getQuizKey(q)}
                            id={getQuizId(q)}
                            className="carousel-item w-full"
                        >
                            <div className="w-full space-y-4">
                                <h4 className="font-semibold text-lg">
                                    Q{index + 1}: {q.question}
                                </h4>
                                {q.relatedConcept && (
                                    <div className="text-xs text-base-content/60">
                                        → Related: {q.relatedConcept}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    {q.options.map((option, optIndex) => (
                                        <div
                                            key={`${getQuizKey(q)}::option::${option}`}
                                            className={`p-3 rounded-lg ${optIndex === q.correctAnswer
                                                ? 'bg-success/20 border-2 border-success'
                                                : 'bg-base-300'
                                                }`}
                                        >
                                            <span className="font-semibold">
                                                {String.fromCodePoint(65 + optIndex)})
                                            </span> {option}
                                            {optIndex === q.correctAnswer && (
                                                <span className="ml-2 text-success font-bold">✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {q.explanation && (
                                    <div className="alert alert-info">
                                        <div>
                                            <span className="font-semibold">Explanation: </span>
                                            <span className="text-sm">{q.explanation}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Carousel Navigation */}
                <div className="flex w-full justify-center items-center gap-2 py-4">
                    {/* Previous Button */}
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            const newIndex = Math.max(0, quizIndex - 1)
                            setQuizIndex(newIndex)
                            scrollToQuiz(newIndex)
                        }}
                        disabled={quizIndex === 0}
                    >
                        ‹
                    </button>

                    {/* Show only 5 indicators, centered on current */}
                    {quiz.length <= 5 ? (
                        // Show all if 5 or fewer
                        quiz.map((q, index) => (
                            <a
                                key={getQuizKey(q)}
                                href={`#${getQuizId(q)}`}
                                className={`btn btn-sm ${index === quizIndex ? 'btn-secondary' : 'btn-ghost'}`}
                                onClick={() => setQuizIndex(index)}
                            >
                                {index + 1}
                            </a>
                        ))
                    ) : (
                        // Show 5 indicators centered on current
                        (() => {
                            const total = quiz.length
                            const maxVisible = 5
                            let start = Math.max(0, quizIndex - Math.floor(maxVisible / 2))
                            const end = Math.min(total, start + maxVisible)

                            // Adjust if we're near the end
                            if (end - start < maxVisible) {
                                start = Math.max(0, end - maxVisible)
                            }

                            return Array.from({ length: end - start }, (_, i) => start + i).map((index) => {
                                const q = quiz[index]
                                return (
                                    <a
                                        key={getQuizKey(q)}
                                        href={`#${getQuizId(q)}`}
                                        className={`btn btn-sm ${index === quizIndex ? 'btn-secondary' : 'btn-ghost'}`}
                                        onClick={() => setQuizIndex(index)}
                                    >
                                        {index + 1}
                                    </a>
                                )
                            })
                        })()
                    )}

                    {/* Next Button */}
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => {
                            const newIndex = Math.min(quiz.length - 1, quizIndex + 1)
                            setQuizIndex(newIndex)
                            scrollToQuiz(newIndex)
                        }}
                        disabled={quizIndex === quiz.length - 1}
                    >
                        ›
                    </button>
                </div>
            </>
        )
    } else {
        // List mode (default)
        quizBody = (
            <div className="space-y-4">
                {quiz.map((q, index) => (
                    <div key={getQuizKey(q)} className="card bg-base-200">
                        <div className="card-body">
                            <h3 className="font-semibold mb-3">
                                Q{index + 1}: {q.question}
                            </h3>
                            {q.relatedConcept && (
                                <div className="text-xs text-base-content/60 mb-2">
                                    → Related: {q.relatedConcept}
                                </div>
                            )}
                            <div className="space-y-2">
                                {q.options.map((option, optIndex) => (
                                    <div
                                        key={`${getQuizKey(q)}::option::${option}`}
                                        className={`p-2 rounded ${optIndex === q.correctAnswer
                                            ? 'bg-success/20 border border-success'
                                            : 'bg-base-300'
                                            }`}
                                    >
                                        <span className="font-semibold">
                                            {String.fromCodePoint(65 + optIndex)})
                                        </span> {option}
                                        {optIndex === q.correctAnswer && (
                                            <span className="ml-2 text-success">✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-sm text-base-content/70">
                                <span className="font-semibold">Explanation: </span>
                                {q.explanation}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-secondary">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c-.89-.777-2.366-.777-3.255 0a.75.75 0 01-.988-1.129c1.454-1.272 3.776-1.272 5.23 0 1.513 1.324 1.513 3.518 0 4.842a3.75 3.75 0 01-.837.552c-.676.328-1.028.774-1.028 1.152v.75a.75.75 0 01-1.5 0v-.75c0-1.279 1.06-2.107 1.875-2.502.182-.088.351-.199.503-.331.83-.727.83-1.857 0-2.584zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
                Quiz Questions
                <span className="badge badge-neutral">{quiz.length}</span>
            </h2>

            {quizBody}
        </div>
    )
}
