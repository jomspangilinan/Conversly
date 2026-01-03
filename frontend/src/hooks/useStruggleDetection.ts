import { useEffect, useState, useMemo } from "react";

interface InteractionLog {
  timestamp: number;
  type:
    | "seek"
    | "pause"
    | "resume"
    | "manual_pause"
    | "manual_play"
    | "checkpoint_complete"
    | "checkpoint_skip"
    | "checkpoint_engage"
    | "rewind"
    | "forward"
    | "speed_change";
  videoTime?: number;
  data?: unknown;
}

interface StruggleDetectionOptions {
  /** Number of rewinds to same section before triggering (default: 3) */
  rewindThreshold?: number;
  /** Time window in seconds to consider rewinds related (default: 15) */
  sectionWindow?: number;
  /** Time window in seconds to count rewinds (default: 90) */
  timeWindow?: number;
  /** Interaction logs to analyze */
  interactionLogs?: InteractionLog[];
  /** Current video time in seconds */
  currentVideoTime?: number;
}

interface StruggleDetection {
  /** Whether struggle is currently detected */
  isStruggling: boolean;
  /** Number of rewinds detected */
  rewindCount: number;
  /** Video time where struggle is detected */
  struggleTime: number | null;
  /** Dismiss the current struggle detection */
  dismiss: () => void;
}

/**
 * Detects when a student is struggling by analyzing interaction patterns.
 *
 * Triggers when student rewinds to the same section multiple times in a short period.
 * This is a "soft nudge" - non-blocking, dismissible, context-aware.
 *
 * @example
 * const { isStruggling, rewindCount, struggleTime, dismiss } = useStruggleDetection({
 *   interactionLogs: logs,
 *   currentVideoTime: videoRef.current?.currentTime,
 *   rewindThreshold: 3,
 *   sectionWindow: 15,
 *   timeWindow: 90
 * });
 *
 * if (isStruggling) {
 *   <Toast message="Stuck on this part?" onHelp={openTutor} onDismiss={dismiss} />
 * }
 */
export function useStruggleDetection(
  options: StruggleDetectionOptions = {}
): StruggleDetection {
  const {
    rewindThreshold = 3,
    sectionWindow = 15,
    timeWindow = 90,
    interactionLogs = [],
    currentVideoTime = 0,
  } = options;

  const [isStruggling, setIsStruggling] = useState(false);
  const [rewindCount, setRewindCount] = useState(0);
  const [struggleTime, setStruggleTime] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [currentTimestamp] = useState(() => Date.now());

  // Compute struggle detection state
  const struggleState = useMemo(() => {
    // Don't re-trigger if already dismissed
    if (dismissed) {
      return { isStruggling: false, rewindCount: 0, struggleTime: null };
    }

    // Filter to recent seek events within time window (use stable timestamp)
    const recentSeeks = interactionLogs
      .filter(
        (log) =>
          log.type === "seek" &&
          currentTimestamp - log.timestamp < timeWindow * 1000
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    if (recentSeeks.length < rewindThreshold) {
      return { isStruggling: false, rewindCount: 0, struggleTime: null };
    }

    // Group seeks by video section (using sectionWindow)
    const sectionGroups = new Map<number, InteractionLog[]>();

    recentSeeks.forEach((seek) => {
      if (seek.videoTime === undefined) return;

      // Round video time to section window
      const sectionKey =
        Math.floor(seek.videoTime / sectionWindow) * sectionWindow;

      if (!sectionGroups.has(sectionKey)) {
        sectionGroups.set(sectionKey, []);
      }
      sectionGroups.get(sectionKey)!.push(seek);
    });

    // Find section with most rewinds
    let maxRewinds = 0;
    let maxSection = 0;

    sectionGroups.forEach((seeks, sectionKey) => {
      if (seeks.length > maxRewinds) {
        maxRewinds = seeks.length;
        maxSection = sectionKey;
      }
    });

    // Check if current video time is near the struggle section
    const nearStruggleSection =
      Math.abs(currentVideoTime - maxSection) < sectionWindow * 2;

    // Trigger struggle detection if threshold met and student is near that section
    return {
      isStruggling: maxRewinds >= rewindThreshold && nearStruggleSection,
      rewindCount: maxRewinds,
      struggleTime:
        maxRewinds >= rewindThreshold && nearStruggleSection
          ? maxSection
          : null,
    };
  }, [
    interactionLogs,
    currentVideoTime,
    rewindThreshold,
    sectionWindow,
    timeWindow,
    dismissed,
    currentTimestamp,
  ]);

  // Sync computed state to component state
  useEffect(() => {
    setIsStruggling(struggleState.isStruggling);
    setRewindCount(struggleState.rewindCount);
    setStruggleTime(struggleState.struggleTime);
  }, [struggleState]);

  const dismiss = () => {
    setDismissed(true);
    setIsStruggling(false);
    setRewindCount(0);
    setStruggleTime(null);

    // Reset dismissed state after time window expires
    setTimeout(() => {
      setDismissed(false);
    }, timeWindow * 1000);
  };

  return {
    isStruggling,
    rewindCount,
    struggleTime,
    dismiss,
  };
}
