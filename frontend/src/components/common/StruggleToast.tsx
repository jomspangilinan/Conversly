import { X, MessageCircle } from 'lucide-react';

interface StruggleToastProps {
    /** Whether to show the toast */
    readonly show: boolean;
    /** Number of times the section was rewatched */
    readonly rewindCount?: number;
    /** Callback when user clicks "Get Help" */
    readonly onHelp: () => void;
    /** Callback when user dismisses the toast */
    readonly onDismiss: () => void;
    /** Optional custom message */
    readonly message?: string;
}

/**
 * Non-blocking toast notification that appears when struggle is detected.
 * 
 * Design principles:
 * - Dismissible (easy to ignore if not needed)
 * - Positioned bottom-right (not covering content)
 * - Gentle animation (not jarring)
 * - Clear action (single button, obvious purpose)
 * 
 * @example
 * <StruggleToast
 *   show={isStruggling}
 *   rewindCount={3}
 *   onHelp={() => openVoiceTutor()}
 *   onDismiss={() => dismissStruggle()}
 * />
 */
export function StruggleToast({
    show,
    rewindCount,
    onHelp,
    onDismiss,
    message
}: StruggleToastProps) {
    if (!show) return null;

    const defaultMessage = rewindCount && rewindCount > 1
        ? `Rewatched this ${rewindCount} times? I can help!`
        : "Stuck on this part?";

    return (
        <div
            className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-2 duration-300"
            role="alert"
            aria-live="polite"
        >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-sm">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {message || defaultMessage}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Voice tutor is ready to explain
                        </p>
                    </div>

                    <button
                        onClick={onDismiss}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 transition-colors"
                        aria-label="Dismiss"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <button
                    onClick={onHelp}
                    className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Get Help
                </button>
            </div>
        </div>
    );
}
