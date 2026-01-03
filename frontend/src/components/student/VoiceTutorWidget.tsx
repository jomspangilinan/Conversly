import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { AudioLinesIcon, PhoneOffIcon, SendIcon } from "lucide-react";

import type { Concept, LearningCheckpoint, TranscriptItem } from "../../types/video.types";
import type { VideoInteraction } from "./InteractionLog";
import {
    buildTutorContextSnapshot,
    conversationsAPI,
    type TutorMessage,
} from "../../api/conversations.api";

import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ui/conversation";
import { Orb } from "@/components/ui/orb";
import { useTutorDebug } from "../../contexts/tutorDebug.context";
import { StruggleTooltip } from "../common/StruggleTooltip";

interface VoiceTutorWidgetProps {
    videoId: string;
    currentTime: number;
    transcript?: TranscriptItem[];
    concepts?: Concept[];
    checkpoints?: LearningCheckpoint[];
    interactions?: VideoInteraction[];
    isStruggling?: boolean;
    rewindCount?: number;
    onDismissStruggle?: () => void;
}

export function VoiceTutorWidget(props: Readonly<VoiceTutorWidgetProps>) {
    const { videoId, currentTime, transcript, concepts, checkpoints, interactions, isStruggling, rewindCount, onDismissStruggle } = props;

    const tutorDebug = useTutorDebug();

    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<TutorMessage[]>([]);
    const [draft, setDraft] = useState("");
    const [connecting, setConnecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [assistantTyping, setAssistantTyping] = useState(false);
    const [agentActivity, setAgentActivity] = useState<string | null>(null);

    const listRef = useRef<HTMLDivElement>(null);
    const isTextOnlyModeRef = useRef<boolean>(true);
    const lastContextBucketRef = useRef<number | null>(null);
    const lastContextDataKeyRef = useRef<string | null>(null);
    const lastContextSentHashRef = useRef<number | null>(null);
    const lastContextSentAtRef = useRef<number>(0);
    const pendingUserEchoRef = useRef<Map<string, number>>(new Map());
    const lastUserInitiatedAtRef = useRef<number>(0);
    const hasAcceptedAssistantMessageRef = useRef<boolean>(false);
    const conversationStatusRef = useRef<string>("disconnected");
    const assistantTypingTimeoutRef = useRef<number | null>(null);
    const desiredVoiceActiveRef = useRef<boolean>(false);
    const lastDisconnectDetailsRef = useRef<unknown>(null);
    const reconnectAttemptsRef = useRef<number>(0);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const preferredVoiceConnectionTypeRef = useRef<"webrtc" | "websocket">("websocket");
    const connectedAtRef = useRef<number>(0);
    const forceVoiceWebsocketRef = useRef<boolean>(false);
    const currentAssistantMessageIdRef = useRef<number | null>(null);
    const typingIntervalRef = useRef<number | null>(null);
    const fullTextToTypeRef = useRef<string>("");
    const currentTypedTextRef = useRef<string>("");

    const agentId = (import.meta.env.VITE_ELEVENLABS_AGENT_ID as string | undefined) ?? "";

    const transportStorageKey = useMemo(() => {
        const safeAgent = agentId || "unknown-agent";
        return `voiceTutor.transport.${safeAgent}`;
    }, [agentId]);

    const messageStorageKey = useMemo(() => {
        const safeAgent = agentId || "unknown-agent";
        return `voiceTutor.messages.${safeAgent}.${videoId}`;
    }, [agentId, videoId]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(messageStorageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as TutorMessage[];
            if (Array.isArray(parsed)) setMessages(parsed);
        } catch {
            // ignore
        }
    }, [messageStorageKey]);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(transportStorageKey);
            if (raw === "webrtc" || raw === "websocket") {
                preferredVoiceConnectionTypeRef.current = raw;
            }
        } catch {
            // ignore
        }
    }, [transportStorageKey]);

    useEffect(() => {
        try {
            sessionStorage.setItem(messageStorageKey, JSON.stringify(messages.slice(-200)));
        } catch {
            // ignore
        }
    }, [messageStorageKey, messages]);

    const hashString = useCallback((value: string) => {
        // Small stable hash for dedupe/cache keys (not cryptographic).
        let hash = 0;
        for (let i = 0; i < value.length;) {
            const cp = value.codePointAt(i) ?? 0;
            hash = Math.trunc((Math.imul(hash, 31) + cp) % 2147483647);
            i += cp > 0xffff ? 2 : 1;
        }
        return hash;
    }, []);

    const pushLog = useCallback(
        (kind: string, data?: unknown) => {
            tutorDebug.pushLog(kind, data);
        },
        [tutorDebug]
    );

    const didLogClientToolsRef = useRef(false);
    useEffect(() => {
        if (didLogClientToolsRef.current) return;
        didLogClientToolsRef.current = true;
        tutorDebug.pushLog("clientToolsRegistered", {
            tools: [
                "getContext",
                "getContextBriefing",
                "seekToTime",
                "seekToCheckpoint",
                "openTab",
                "pauseVideo",
                "resumeVideo",
                "answerCheckpoint",
                "replaySection"
            ],
        });
        // Intentionally omit tutorDebug from deps: we only want this once per mount,
        // and tutorDebug.pushLog is stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const conversation = useConversation({
        // Always voice-ready. Actual mode (text vs voice) is controlled via startSession overrides.
        textOnly: false,
        clientTools: {
            getContext: (parameters?: {
                detail?: "brief" | "normal" | "detailed";
                maxTranscriptChars?: number;
                max_transcript_chars?: number;
            }) => {
                const detail = parameters?.detail ?? "brief";
                const maxTranscriptCharsRaw =
                    typeof parameters?.maxTranscriptChars === "number"
                        ? parameters.maxTranscriptChars
                        : parameters?.max_transcript_chars;
                const maxTranscriptChars = Math.max(200, Math.min(maxTranscriptCharsRaw ?? 1200, 8000));

                const snapshot = buildTutorContextSnapshot({
                    currentTime,
                    transcript,
                    concepts,
                    checkpoints,
                    interactions,
                    recentMessages: messages,
                });

                const transcriptSnippet = (snapshot.transcriptSnippet || "")
                    .slice(0, maxTranscriptChars)
                    .trim();

                const payload = {
                    tool: "getContext",
                    version: 1,
                    videoId,
                    generatedAt: new Date().toISOString(),
                    currentTime: snapshot.currentTime,
                    transcriptSnippet,
                    nearbyConcepts: snapshot.nearbyConcepts ?? [],
                    allConcepts: (() => {
                        const all = snapshot.allConcepts ?? [];
                        if (detail === "detailed") return all;
                        if (detail === "normal") return all.slice(0, 25);
                        return all.slice(0, 10);
                    })(),
                    nearbyCheckpoints: snapshot.nearbyCheckpoints ?? [],
                    interactionSummary: snapshot.interactionSummary ?? null,
                    recentMessages: (snapshot.recentMessages ?? []).slice(0, 12),
                    // Include struggle state so agent knows student needs help
                    strugglingState: isStruggling ? {
                        isStruggling: true,
                        rewindCount: rewindCount || 0,
                        message: `Student has rewatched this section ${rewindCount || 'multiple'} times and may need help.`
                    } : null,
                };

                pushLog("clientTool.getContext", { parameters, payloadPreview: { ...payload, transcriptSnippet: transcriptSnippet.slice(0, 200) } });

                // Return JSON so the agent can parse reliably.
                return JSON.stringify(payload);
            },

            getContextBriefing: async (parameters?: { timeoutMs?: number; timeout_ms?: number }) => {
                const timeoutMsRaw =
                    typeof parameters?.timeoutMs === "number" ? parameters.timeoutMs : parameters?.timeout_ms;
                const timeoutMs = Math.max(1500, Math.min(timeoutMsRaw ?? 6000, 15_000));
                const payload = { videoId, ...contextSnapshot };
                const timeout = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error("getContextBriefing_timeout")), timeoutMs)
                );

                try {
                    pushLog("clientTool.getContextBriefing", { timeoutMs });
                    const request = conversationsAPI.summarizeContext({
                        videoId,
                        context: payload,
                    });
                    const result = await Promise.race([request, timeout]);
                    const summary = (result?.summary || "").trim();
                    return summary || "(No briefing available.)";
                } catch (err) {
                    pushLog("clientTool.getContextBriefingFailed", { error: String(err) });
                    return "(Context briefing failed.)";
                }
            },

            seekToTime: (parameters: { seconds: number }) => {
                const secondsRaw = Number(parameters?.seconds);
                const seconds = Number.isFinite(secondsRaw) ? Math.max(0, secondsRaw) : 0;
                window.dispatchEvent(new CustomEvent("seekToTime", { detail: seconds }));
                pushLog("clientTool.seekToTime", { seconds });
                return `Seeking to ${Math.floor(seconds)}s`;
            },

            seekToCheckpoint: (parameters: {
                timestamp: number;
                type?: "quickQuiz" | "reflection" | "prediction" | "application";
                prompt?: string;
            }) => {
                // This tool automatically opens the checkpoint modal at the specified timestamp
                const timestampRaw = Number(parameters?.timestamp);
                const timestamp = Number.isFinite(timestampRaw) ? Math.max(0, timestampRaw) : 0;
                const type = parameters?.type;
                const prompt = parameters?.prompt;

                window.dispatchEvent(
                    new CustomEvent("seekToCheckpoint", {
                        detail: { timestamp, type, prompt },
                    })
                );
                pushLog("clientTool.seekToCheckpoint", { timestamp, type, prompt });
                return `Opening checkpoint at ${Math.floor(timestamp)}s`;
            },

            openTab: (parameters: {
                tab: "outline" | "transcript" | "review" | "interactions" | "logs";
            }) => {
                const tab = parameters?.tab;
                window.dispatchEvent(new CustomEvent("tutorOpenTab", { detail: { tab } }));
                pushLog("clientTool.openTab", { tab });
                return tab ? `Opened ${tab} tab` : "Opened tab";
            },

            pauseVideo: () => {
                window.dispatchEvent(new CustomEvent("pauseVideo"));
                pushLog("clientTool.pauseVideo");
                return "Paused video";
            },

            resumeVideo: () => {
                window.dispatchEvent(new CustomEvent("resumeVideo"));
                // Auto-minimize the tutor UI on resume.
                setOpen(false);
                pushLog("clientTool.resumeVideo", { minimized: true });
                return "Resumed video";
            },

            answerCheckpoint: (parameters: {
                selectedNumber?: number;
                selectedIndex?: number; // treated as 1-based if provided
                selectedAnswer?: string;
                textAnswer?: string;
                // Back-compat with older tool schema variants.
                selected_number?: number;
                selected_index?: number; // treated as 1-based if provided
                selected_answer?: string;
                text_answer?: string;
            }) => {
                const selectedNumberCandidate =
                    typeof parameters?.selectedNumber === "number"
                        ? parameters.selectedNumber
                        : parameters?.selected_number;
                const selectedIndexCandidate =
                    typeof parameters?.selectedIndex === "number" ? parameters.selectedIndex : parameters?.selected_index;
                const selectedAnswerCandidate =
                    typeof parameters?.selectedAnswer === "string" ? parameters.selectedAnswer : parameters?.selected_answer;
                const textAnswerCandidate =
                    typeof parameters?.textAnswer === "string" ? parameters.textAnswer : parameters?.text_answer;

                const selectedNumber =
                    typeof selectedNumberCandidate === "number" && Number.isFinite(selectedNumberCandidate)
                        ? Math.trunc(selectedNumberCandidate)
                        : undefined;

                const selectedIndexFromNumber =
                    typeof selectedNumber === "number" && selectedNumber > 0 ? selectedNumber - 1 : undefined;

                const selectedIndexFromIndexCandidate = (() => {
                    if (!(typeof selectedIndexCandidate === "number" && Number.isFinite(selectedIndexCandidate))) return undefined;
                    const raw = Math.trunc(selectedIndexCandidate);
                    // Enforce 1-based numeric selection.
                    if (raw <= 0) return undefined;
                    return raw - 1;
                })();

                const selectedIndex =
                    typeof selectedIndexFromNumber === "number"
                        ? selectedIndexFromNumber
                        : selectedIndexFromIndexCandidate;
                const selectedAnswer = typeof selectedAnswerCandidate === "string" ? selectedAnswerCandidate : undefined;
                const textAnswer = typeof textAnswerCandidate === "string" ? textAnswerCandidate : undefined;

                window.dispatchEvent(
                    new CustomEvent("tutorCheckpointAnswer", {
                        detail: { selectedIndex, selectedAnswer, textAnswer },
                    })
                );
                pushLog("clientTool.answerCheckpoint", { selectedNumber, selectedIndex, selectedAnswer, textAnswer });
                return "Submitted checkpoint answer";
            },

            replaySection: (parameters?: { seconds?: number }) => {
                const seconds = typeof parameters?.seconds === "number" ? parameters.seconds : 10;
                window.dispatchEvent(new CustomEvent("rewindVideo", { detail: { seconds } }));
                pushLog("clientTool.replaySection", { seconds });
                return `Rewound ${seconds} seconds`;
            },
        },
        onConnect: () => {
            setConnecting(false);
            setErrorMessage(null);
            setAgentActivity(null);
            reconnectAttemptsRef.current = 0;
            connectedAtRef.current = Date.now();
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            pushLog("onConnect");
        },
        onDisconnect: (details) => {
            setConnecting(false);
            setAssistantTyping(false);
            setAgentActivity("Disconnected");
            lastDisconnectDetailsRef.current = details;

            // If voice is unstable over LiveKit (webrtc), fall back to websocket transport.
            if (!isTextOnlyModeRef.current) {
                const d = details as { reason?: string; message?: string } | null;
                const msg = (d?.message ?? "").toLowerCase();
                const looksLikeLiveKit = msg.includes("livekit");
                const sinceConnectMs = connectedAtRef.current ? (Date.now() - connectedAtRef.current) : 0;
                const rapidDrop = sinceConnectMs > 0 && sinceConnectMs < 5000;

                if (looksLikeLiveKit || rapidDrop) {
                    // Force websocket voice for future sessions to avoid LiveKit flakiness.
                    forceVoiceWebsocketRef.current = true;
                }

                if ((looksLikeLiveKit || rapidDrop) && preferredVoiceConnectionTypeRef.current !== "websocket") {
                    preferredVoiceConnectionTypeRef.current = "websocket";
                    try {
                        sessionStorage.setItem(transportStorageKey, "websocket");
                    } catch {
                        // ignore
                    }
                    pushLog("voiceFallbackToWebsocket", { reason: d?.reason, message: d?.message, sinceConnectMs });
                }
            }

            if (assistantTypingTimeoutRef.current) {
                window.clearTimeout(assistantTypingTimeoutRef.current);
                assistantTypingTimeoutRef.current = null;
            }
            pushLog("onDisconnect", details);
        },
        onStatusChange: ({ status }) => {
            conversationStatusRef.current = status;
            setConnecting(status === "connecting" || status === "disconnecting");
            tutorDebug.setMeta({ status });
            pushLog("onStatusChange", { status });

            if (status === "connecting") setAgentActivity("Connecting…");
            if (status === "connected") setAgentActivity(null);
            if (status === "disconnected") setAgentActivity("Disconnected");

            if (status === "connected") {
                // If voice mode is active, pause the video to avoid audio competing.
                if (!isTextOnlyModeRef.current) {
                    window.dispatchEvent(new CustomEvent("pauseVideo"));
                    pushLog("autoPauseVideoOnVoiceConnect");

                    // Send a single context snapshot on voice connect so reconnects don't feel
                    // like a fresh conversation.
                    try {
                        sendContextUpdate();
                        pushLog("voiceInitialContextSent");
                    } catch (err) {
                        pushLog("sendContextualUpdateFailed", { error: String(err) });
                    }
                    return;
                }

                // For text chat, send context immediately after connect.
                try {
                    sendContextUpdate();
                } catch (err) {
                    pushLog("sendContextualUpdateFailed", { error: String(err) });
                }
            }
        },
        onError: (message, context) => {
            setConnecting(false);
            setErrorMessage(message || "Voice chat error. Check console for details.");
            console.error("ElevenLabs conversation error:", message, context);
            pushLog("onError", { message, context });
        },
        onUnhandledClientToolCall: (payload) => {
            pushLog("onUnhandledClientToolCall", payload);
        },
        onMessage: (payload) => {
            const text = payload.message?.trim();
            if (!text) return;

            const role: "user" | "assistant" = payload.role === "agent" ? "assistant" : "user";

            // ElevenLabs ConvAI emits user transcript events (role=user) even for text messages.
            // Since we already optimistically add the user's typed message to the UI, ignore
            // the echoed transcript to avoid duplicate bubbles.
            if (role === "user") {
                const pendingTs = pendingUserEchoRef.current.get(text);
                if (pendingTs !== undefined) {
                    pendingUserEchoRef.current.delete(text);
                    pushLog("dedupeUserTranscript", { text });
                    return;
                }
                // User messages - add immediately
                setMessages((prev) => [...prev, { role, text, timestamp: Date.now() }]);
                pushLog("onMessage", payload);
                return;
            }

            // Handle assistant messages with typing animation
            if (role === "assistant") {
                // Some agents send an automatic greeting on connect, suppress it
                if (!hasAcceptedAssistantMessageRef.current) {
                    const normalized = text.toLowerCase();
                    const looksLikeGreeting =
                        (normalized.startsWith("hello") || normalized.startsWith("hi") || normalized.startsWith("hey")) &&
                        (normalized.includes("how can i help") || normalized.includes("how can i assist")) &&
                        text.length <= 140;
                    const msSinceUserInitiated = Date.now() - lastUserInitiatedAtRef.current;

                    if (looksLikeGreeting && msSinceUserInitiated >= 0 && msSinceUserInitiated < 6000) {
                        pushLog("dedupeInitialGreeting", { text, msSinceUserInitiated });
                        return;
                    }
                }

                // Clear any existing typing animation
                if (typingIntervalRef.current) {
                    clearInterval(typingIntervalRef.current);
                    typingIntervalRef.current = null;
                }

                // Start typing animation
                const timestamp = Date.now();
                fullTextToTypeRef.current = text;
                currentTypedTextRef.current = "";
                let charIndex = 0;

                // Add empty message that will be filled character by character
                setMessages((prev) => [...prev, { role, text: "", timestamp }]);
                currentAssistantMessageIdRef.current = timestamp;

                // Type out character by character (faster speed: 15ms per char for natural feel)
                typingIntervalRef.current = window.setInterval(() => {
                    if (charIndex < fullTextToTypeRef.current.length) {
                        currentTypedTextRef.current += fullTextToTypeRef.current[charIndex];
                        charIndex++;

                        setMessages((prev) => {
                            const updated = [...prev];
                            const lastIdx = updated.length - 1;
                            if (lastIdx >= 0 && updated[lastIdx].timestamp === currentAssistantMessageIdRef.current) {
                                updated[lastIdx] = {
                                    ...updated[lastIdx],
                                    text: currentTypedTextRef.current
                                };
                            }
                            return updated;
                        });
                    } else {
                        // Finished typing
                        if (typingIntervalRef.current) {
                            clearInterval(typingIntervalRef.current);
                            typingIntervalRef.current = null;
                        }
                        currentAssistantMessageIdRef.current = null;
                    }
                }, 15); // 15ms per character = ~66 chars/second (fast but readable)

                hasAcceptedAssistantMessageRef.current = true;
                setAssistantTyping(false);
                setAgentActivity(null);
                if (assistantTypingTimeoutRef.current) {
                    window.clearTimeout(assistantTypingTimeoutRef.current);
                    assistantTypingTimeoutRef.current = null;
                }
            }

            pushLog("onMessage", payload);
        },
        onDebug: (debug) => {
            pushLog("onDebug", debug);
        },
    });

    useEffect(() => {
        tutorDebug.setMeta({ agentId: agentId || null, status: conversation.status });
    }, [agentId, conversation.status, tutorDebug]);

    useEffect(() => {
        if (!open) return;
        queueMicrotask(() => {
            listRef.current?.scrollTo({
                top: listRef.current.scrollHeight,
                behavior: "smooth",
            });
        });
    }, [open, messages.length]);

    const contextSnapshot = useMemo(() => {
        return buildTutorContextSnapshot({
            currentTime,
            transcript,
            concepts,
            checkpoints,
            interactions,
            recentMessages: messages,
        });
    }, [currentTime, transcript, concepts, checkpoints, interactions, messages]);

    const formatContextForAgent = useCallback(
        (payload: { videoId: string } & typeof contextSnapshot) => {
            const { videoId: vid, currentTime: t } = payload;

            const coreConcepts = (payload.allConcepts ?? [])
                .filter((c) => c.importance === "core")
                .slice(0, 5)
                .map((c) => `- ${c.concept} (${Math.floor(c.timestamp)}s)`)
                .join("\n");

            const nearbyConceptsText = (payload.nearbyConcepts ?? [])
                .slice(0, 5)
                .map((c) => `- ${c.concept} (${Math.floor(c.timestamp)}s, ${c.importance})`)
                .join("\n");

            const nearbyCheckpointsText = (payload.nearbyCheckpoints ?? [])
                .slice(0, 5)
                .map((cp) => `- [${Math.floor(cp.timestamp)}s] ${cp.type}: ${cp.prompt}`)
                .join("\n");

            const transcriptSnippet = payload.transcriptSnippet
                ? payload.transcriptSnippet
                : "(Transcript snippet not available yet)";

            const recentMessagesText = (payload.recentMessages ?? [])
                .slice(-8)
                .map((m) => `- ${m.role === "assistant" ? "Tutor" : "User"}: ${String(m.text).slice(0, 200)}`)
                .join("\n");

            const topicLine = coreConcepts
                ? "You are tutoring the user on the video topic: modern banking architecture and Banking-as-a-Service (BaaS)."
                : "You are tutoring the user on the current video.";

            // Add struggle detection status if student is struggling
            const struggleNote = isStruggling && rewindCount
                ? `\n\n⚠️ STUDENT STRUGGLING: Has rewatched current section ${rewindCount} times. May need help understanding this part.`
                : "";

            // Build interaction awareness section
            const interactionNote = payload.interactionSummary ? (() => {
                const { counts, lastCheckpointResult } = payload.interactionSummary;
                const parts: string[] = [];

                // Interaction counts
                if (Object.keys(counts).length > 0) {
                    const countText = Object.entries(counts)
                        .map(([type, count]) => `${type}: ${count}`)
                        .join(", ");
                    parts.push(`Recent actions (last 3 min): ${countText}`);
                }

                // Last checkpoint result
                if (lastCheckpointResult) {
                    const { isCorrect, checkpointType, selectedAnswer, correctAnswer } = lastCheckpointResult;
                    if (isCorrect === true) {
                        parts.push(`Last checkpoint: CORRECT (✅ ${checkpointType})`);
                    } else if (isCorrect === false) {
                        parts.push(`Last checkpoint: INCORRECT (❌ ${checkpointType}) - Selected "${selectedAnswer}", correct was "${correctAnswer}"`);
                    }
                }

                return parts.length > 0 ? `\n\nStudent Behavior:\n${parts.join("\n")}` : "";
            })() : "";

            return [
                topicLine,
                `VideoId: ${vid}`,
                `Current time: ${Math.floor(t)}s`,
                struggleNote,
                interactionNote,
                "",
                "Core concepts (high-level outline):",
                coreConcepts || "- (No core concepts available)",
                "",
                "Nearby concepts (around current time):",
                nearbyConceptsText || "- (None)",
                "",
                "Nearby checkpoints/questions:",
                nearbyCheckpointsText || "- (None)",
                "",
                "Transcript snippet:",
                transcriptSnippet,
                "",
                "Recent conversation:",
                recentMessagesText || "- (None)",
            ].join("\n");
        },
        [isStruggling, rewindCount]
    );

    const sendContextUpdate = useCallback(() => {
        if (conversationStatusRef.current !== "connected") {
            pushLog("skipContextualUpdate", { status: conversationStatusRef.current });
            return;
        }
        const payload = { videoId, ...contextSnapshot };
        const json = JSON.stringify(payload);
        const contextText = formatContextForAgent(payload);

        // Guard against duplicate sends.
        const hash = hashString(contextText);
        const now = Date.now();
        if (lastContextSentHashRef.current === hash) {
            pushLog("dedupeContextualUpdate", { hash, msSinceLast: now - lastContextSentAtRef.current });
            return;
        }
        lastContextSentHashRef.current = hash;
        lastContextSentAtRef.current = now;

        tutorDebug.setLastContextJson(json);
        try {
            conversation.sendContextualUpdate(contextText);
            pushLog("sendContextualUpdate", { payload, contextTextLength: contextText.length });
        } catch (err) {
            pushLog("sendContextualUpdateFailed", { error: String(err) });
        }
    }, [
        conversation,
        contextSnapshot,
        formatContextForAgent,
        hashString,
        pushLog,
        tutorDebug,
        videoId,
    ]);

    useEffect(() => {
        if (!open) return;
        if (conversation.status !== "connected") return;
        // In voice sessions, avoid auto-context pushes which can feel interruptive.
        if (!isTextOnlyModeRef.current) return;
        // Send context when time bucket changes OR when core context data finishes loading,
        // even if the video is paused (e.g., stuck at 0s).
        const bucket = Math.floor(currentTime / 10);
        const dataKey = `t${transcript?.length ?? 0}|c${concepts?.length ?? 0}|p${checkpoints?.length ?? 0}|i${interactions?.length ?? 0}`;

        const bucketChanged = lastContextBucketRef.current !== bucket;
        const dataChanged = lastContextDataKeyRef.current !== dataKey;

        if (!bucketChanged && !dataChanged) return;

        lastContextBucketRef.current = bucket;
        lastContextDataKeyRef.current = dataKey;
        sendContextUpdate();
    }, [open, conversation.status, currentTime, transcript?.length, concepts?.length, checkpoints?.length, interactions?.length, sendContextUpdate]);

    const startSession = useCallback(
        async (textOnly: boolean, keepMessages: boolean) => {
            if (!agentId) {
                setErrorMessage("Missing VITE_ELEVENLABS_AGENT_ID.");
                pushLog("startSessionBlocked", { reason: "missing_agent_id" });
                return false;
            }

            isTextOnlyModeRef.current = textOnly;
            hasAcceptedAssistantMessageRef.current = false;
            currentAssistantMessageIdRef.current = null;
            setErrorMessage(null);
            setConnecting(true);

            if (!keepMessages) setMessages([]);

            try {
                const connectionType = textOnly
                    ? "websocket"
                    : (forceVoiceWebsocketRef.current ? "websocket" : preferredVoiceConnectionTypeRef.current);

                await conversation.startSession({
                    agentId,
                    connectionType,
                    overrides: {
                        conversation: { textOnly },
                    },
                });
                lastContextBucketRef.current = null;
                lastContextDataKeyRef.current = null;
                pushLog("startSession", { textOnly, connectionType, forcedWebsocket: forceVoiceWebsocketRef.current });
                return true;
            } catch (err) {
                setConnecting(false);
                setErrorMessage("Failed to start ElevenLabs session.");
                console.error("startSession failed:", err);
                pushLog("startSessionFailed", { error: String(err) });
                return false;
            }
        },
        [agentId, conversation, pushLog]
    );

    const stopSession = useCallback(async () => {
        setConnecting(true);
        try {
            await conversation.endSession();
            pushLog("endSession");
        } catch (err) {
            console.error("endSession failed:", err);
            pushLog("endSessionFailed", { error: String(err) });
        } finally {
            setConnecting(false);
        }
    }, [conversation, pushLog]);

    const handleCall = useCallback(async () => {
        if (conversation.status === "connected" && !isTextOnlyModeRef.current) {
            // Already in voice mode, disconnect
            desiredVoiceActiveRef.current = false;
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            await stopSession();
            return;
        }

        // If connected in text mode, disconnect first
        if (conversation.status === "connected") {
            await stopSession();
            // Small delay to ensure clean disconnect
            await new Promise<void>(resolve => setTimeout(resolve, 200));
        }

        desiredVoiceActiveRef.current = true;
        await startSession(false, true);
    }, [conversation.status, startSession, stopSession]);

    const handleStruggleHelp = useCallback(async () => {
        console.log('🆘 Struggle help requested - opening voice tutor');
        setOpen(true);
        // DON'T dismiss - keep tooltip visible to show we're aware
        // onDismissStruggle?.();

        // Wait for widget to open
        await new Promise<void>(resolve => setTimeout(resolve, 100));

        // Build detailed struggle context with current concept
        const nearbyConcepts = contextSnapshot.nearbyConcepts ?? [];
        const currentConcept = nearbyConcepts.length > 0 ? nearbyConcepts[0] : null;
        const conceptInfo = currentConcept
            ? `The student is at ${Math.floor(currentTime)}s, near the concept "${currentConcept.concept}" (at ${Math.floor(currentConcept.timestamp)}s).`
            : `The student is at ${Math.floor(currentTime)}s.`;

        const struggleContext = [
            `[URGENT - STUDENT STRUGGLING]`,
            `The student has rewatched this section ${rewindCount || 'multiple'} times and clicked "Get Help".`,
            conceptInfo,
            `Proactively ask what's confusing them about this specific part. Be warm and encouraging.`,
        ].join(' ');

        // Auto-start voice session
        if (conversation.status === "disconnected") {
            console.log('🎤 Auto-starting voice session for struggle help');
            desiredVoiceActiveRef.current = true;
            await startSession(false, true);

            // Wait for connection then send context about the struggle
            const checkConnection = setInterval(() => {
                if (conversation.status === "connected") {
                    clearInterval(checkConnection);
                    console.log('📨 Sending struggle context to agent:', struggleContext);
                    try {
                        conversation.sendContextualUpdate(struggleContext);
                    } catch (err) {
                        console.error('Failed to send struggle context:', err);
                    }
                }
            }, 100);

            // Clear interval after 5 seconds if not connected
            setTimeout(() => clearInterval(checkConnection), 5000);
        } else if (conversation.status === "connected") {
            // Already connected, send context immediately
            console.log('📨 Sending struggle context to agent:', struggleContext);
            try {
                conversation.sendContextualUpdate(struggleContext);
            } catch (err) {
                console.error('Failed to send struggle context:', err);
            }
        }
    }, [conversation, currentTime, contextSnapshot, rewindCount, startSession]);

    useEffect(() => {
        if (conversation.status !== 'disconnected') return;
        if (!desiredVoiceActiveRef.current) return;
        if (isTextOnlyModeRef.current) return;

        const details = lastDisconnectDetailsRef.current as { reason?: string; message?: string } | null;
        const reason = details?.reason;
        const sinceConnectMs = connectedAtRef.current ? (Date.now() - connectedAtRef.current) : 0;
        const rapidDrop = sinceConnectMs > 0 && sinceConnectMs < 5000;
        // Auto-reconnect on transport errors (e.g., LiveKit flakiness) and also on
        // rapid "agent" disconnects that behave like transport drops.
        if (reason !== 'error' && !(reason === 'agent' && rapidDrop)) return;

        if (reconnectTimeoutRef.current) return;
        if (reconnectAttemptsRef.current >= 3) {
            pushLog('autoReconnectGivingUp', { reason, message: details?.message });
            return;
        }

        const attempt = reconnectAttemptsRef.current + 1;
        reconnectAttemptsRef.current = attempt;
        const delayMs = 400 * Math.pow(2, attempt - 1);
        pushLog('autoReconnectScheduled', { attempt, delayMs, reason, message: details?.message });

        reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectTimeoutRef.current = null;
            if (!desiredVoiceActiveRef.current) return;
            if (conversationStatusRef.current !== 'disconnected') return;
            void startSession(false, true);
        }, delayMs);
    }, [conversation.status, pushLog, startSession]);

    const sendText = useCallback(async () => {
        const message = draft.trim();
        if (!message) return;
        setDraft("");

        pushLog("sendUserMessage", { message, status: conversation.status });

        setAssistantTyping(true);
        setAgentActivity("Tutor is thinking…");
        if (assistantTypingTimeoutRef.current) window.clearTimeout(assistantTypingTimeoutRef.current);
        assistantTypingTimeoutRef.current = window.setTimeout(() => {
            pushLog("assistantTypingTimeout");
        }, 20_000);

        if (conversation.status !== "connected") {
            // Start a text-only session but keep the message in UI.
            setMessages((prev) => [...prev, { role: "user", text: message, timestamp: Date.now() }]);
            lastUserInitiatedAtRef.current = Date.now();
            const ok = await startSession(true, true);
            if (!ok) return;
            // Ensure context lands before the first user message reaches the agent.
            sendContextUpdate();
            pendingUserEchoRef.current.set(message, Date.now());
            conversation.sendUserMessage(message);
            return;
        }

        // If struggling, send updated context before message so agent knows the situation
        if (isStruggling) {
            sendContextUpdate();
        }

        setMessages((prev) => [...prev, { role: "user", text: message, timestamp: Date.now() }]);
        pendingUserEchoRef.current.set(message, Date.now());
        conversation.sendUserMessage(message);
    }, [conversation, draft, pushLog, sendContextUpdate, startSession, isStruggling]);

    useEffect(() => {
        // Clean up any stale pending echoes (e.g., if the server never sends user_transcript).
        const now = Date.now();
        for (const [text, ts] of pendingUserEchoRef.current.entries()) {
            if (now - ts > 10_000) pendingUserEchoRef.current.delete(text);
        }
    }, [messages.length]);

    const isCallActive = conversation.status === "connected" && !isTextOnlyModeRef.current;
    const canSend = draft.trim().length > 0 && !connecting;

    const getInputVolume = useCallback(() => {
        const raw = conversation.getInputVolume?.() ?? 0;
        return Math.min(1, Math.pow(raw, 0.5) * 2.5);
    }, [conversation]);

    const getOutputVolume = useCallback(() => {
        const raw = conversation.getOutputVolume?.() ?? 0;
        return Math.min(1, Math.pow(raw, 0.5) * 2.5);
    }, [conversation]);

    useEffect(() => {
        return () => {
            if (assistantTypingTimeoutRef.current) {
                window.clearTimeout(assistantTypingTimeoutRef.current);
                assistantTypingTimeoutRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
        };
    }, []);

    return (
        <div className="fixed bottom-6 left-6 z-50">
            {open ? (
                <div className="card bg-base-200 shadow-2xl border border-base-300 w-[420px]">
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full overflow-hidden border border-base-300">
                                        <Orb
                                            volumeMode="manual"
                                            getInputVolume={getInputVolume}
                                            getOutputVolume={getOutputVolume}
                                        />
                                    </div>
                                    <div className="font-bold">Conversly AI</div>
                                </div>
                                <div className="text-xs text-base-content/60 truncate">
                                    Context @ {Math.floor(currentTime)}s
                                </div>
                                {agentActivity && (
                                    <div className="mt-1 text-xs text-base-content/60">{agentActivity}</div>
                                )}
                                {errorMessage && (
                                    <div className="mt-1 text-xs text-error">{errorMessage}</div>
                                )}
                                {!agentId && (
                                    <div className="mt-1 text-xs text-warning">
                                        Set VITE_ELEVENLABS_AGENT_ID to enable ElevenLabs chat.
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => void handleCall()}
                                    disabled={connecting}
                                    aria-label={isCallActive ? "End voice call" : "Start voice call"}
                                    title={isCallActive ? "End call" : "Start call"}
                                >
                                    {isCallActive ? (
                                        <PhoneOffIcon className="size-4" />
                                    ) : (
                                        <AudioLinesIcon className="size-4" />
                                    )}
                                </button>

                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setMessages([])}
                                    disabled={messages.length === 0}
                                >
                                    Clear
                                </button>

                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => setOpen(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div ref={listRef} className="mt-3 h-[320px] overflow-auto">
                            <Conversation className="bg-base-100 rounded-lg border border-base-300">
                                <ConversationContent>
                                    {messages.length === 0 ? (
                                        <ConversationEmptyState
                                            title={connecting ? "Connecting…" : "Talk or type"}
                                            description="I’ll use transcript + concepts + your recent interactions as context."
                                        />
                                    ) : (
                                        <div className="space-y-3">
                                            {messages.map((m, idx) => (
                                                <div
                                                    key={`${m.timestamp}-${idx}`}
                                                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === "user"
                                                            ? "bg-primary text-primary-content"
                                                            : "bg-base-200 text-base-content"
                                                            }`}
                                                    >
                                                        {m.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {assistantTyping && (
                                                <div className="flex justify-start">
                                                    <div className="max-w-[85%] rounded-xl px-3 py-2 text-sm bg-base-200 text-base-content flex items-center gap-2">
                                                        <span className="loading loading-spinner loading-xs" />
                                                        Thinking…
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </ConversationContent>
                                <ConversationScrollButton />
                            </Conversation>
                        </div>

                        <div className="mt-2 flex items-end gap-2">
                            <textarea
                                className="textarea textarea-bordered w-full"
                                placeholder="Type a question…"
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        void sendText();
                                    }
                                }}
                                disabled={connecting || !agentId}
                            />

                            <button
                                className="btn btn-primary"
                                onClick={() => void sendText()}
                                disabled={!canSend || !agentId}
                                aria-label="Send message"
                                title="Send"
                            >
                                <SendIcon className="size-4" />
                            </button>
                        </div>

                        <div className="mt-2 text-[11px] text-base-content/50">
                            Tip: try “explain that again”, “what did I miss?”, or “quiz me on this concept”.
                        </div>
                    </div>
                </div>
            ) : (
                <div className="relative">
                    {/* Struggle detection tooltip */}
                    <StruggleTooltip
                        show={isStruggling ?? false}
                        rewindCount={rewindCount}
                        onDismiss={() => onDismissStruggle?.()}
                        onGetHelp={() => void handleStruggleHelp()}
                    />

                    <button
                        className="w-16 h-16 rounded-full shadow-2xl bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center"
                        onClick={() => setOpen(true)}
                        aria-label="Open Conversly AI"
                    >
                        <div className="w-14 h-14">
                            <Orb
                                volumeMode="manual"
                                getInputVolume={getInputVolume}
                                getOutputVolume={getOutputVolume}
                            />
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
