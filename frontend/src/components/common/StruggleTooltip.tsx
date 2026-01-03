import { MessageCircle, X } from 'lucide-react';

interface StruggleTooltipProps {
    /** Whether to show the tooltip */
    readonly show: boolean;
    /** Number of times the section was rewatched */
    readonly rewindCount?: number;
    /** Callback when user dismisses the tooltip */
    readonly onDismiss: () => void;
    /** Callback when user clicks the tooltip to get help */
    readonly onGetHelp?: () => void;
    /** Optional custom message */
    readonly message?: string;
}

/**
 * Tooltip that appears next to the VoiceOrb when struggle is detected.
 * 
 * Design: Appears above/beside the orb with a gentle pulse animation.
 * Non-intrusive, easy to dismiss, guides student to use voice tutor.
 * 
 * @example
 * <StruggleTooltip
 *   show={isStruggling}
 *   rewindCount={3}
 *   onDismiss={() => dismissStruggle()}
 * />
 */
export function StruggleTooltip({
    show,
    rewindCount,
    onDismiss,
    onGetHelp,
    message
}: StruggleTooltipProps) {
    if (!show) return null;

    const defaultMessage = rewindCount && rewindCount > 1
        ? `Rewatched ${rewindCount} times? Tap here for help!`
        : "Stuck? Tap the orb for help!";

    return (
        <div
            className="absolute bottom-20 left-0 z-[51] animate-in fade-in slide-in-from-bottom-2 duration-300"
            role="status"
            aria-live="polite"
        >
            {/* Tooltip bubble - now clickable */}
            <div
                onClick={() => onGetHelp?.()}
                className="relative bg-blue-600 text-white rounded-lg shadow-lg px-4 py-3 max-w-xs cursor-pointer hover:bg-blue-700 transition-colors"
            >
                {/* Close button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDismiss();
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-3 h-3 text-gray-600" />
                </button>

                {/* Content */}
                <div className="flex items-start gap-2 pr-4">
                    <MessageCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                        {message || defaultMessage}
                    </p>
                </div>

                {/* Pointer arrow */}
                <div className="absolute -bottom-2 left-8 w-4 h-4 bg-blue-600 transform rotate-45" />
            </div>

            {/* Subtle pulse animation */}
            <style>
                {`
          @keyframes gentle-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.95; }
          }
          .animate-in {
            animation: gentle-pulse 3s ease-in-out infinite;
          }
        `}
            </style>
        </div>
    );
}
