import React, { createContext, useCallback, useContext, useRef, useState } from "react";

export type TutorDebugLogEntry = {
    ts: number;
    kind: string;
    data?: unknown;
};

type TutorDebugState = {
    agentId: string | null;
    status: string | null;
    lastContextJson: string;
    logs: TutorDebugLogEntry[];
};

type TutorDebugApi = {
    state: TutorDebugState;
    pushLog: (kind: string, data?: unknown) => void;
    setLastContextJson: (json: string) => void;
    setMeta: (meta: { agentId?: string | null; status?: string | null }) => void;
    clear: () => void;
};

const TutorDebugContext = createContext<TutorDebugApi | null>(null);

export function TutorDebugProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<TutorDebugState>({
        agentId: null,
        status: null,
        lastContextJson: "",
        logs: [],
    });

    const pushLog = useCallback((kind: string, data?: unknown) => {
        setState((prev) => {
            const nextLogs = [...prev.logs, { ts: Date.now(), kind, data }].slice(-500);
            return { ...prev, logs: nextLogs };
        });
    }, []);

    const setLastContextJson = useCallback((json: string) => {
        setState((prev) => ({ ...prev, lastContextJson: json }));
    }, []);

    const setMeta = useCallback((meta: { agentId?: string | null; status?: string | null }) => {
        setState((prev) => ({
            ...prev,
            agentId: meta.agentId !== undefined ? meta.agentId : prev.agentId,
            status: meta.status !== undefined ? meta.status : prev.status,
        }));
    }, []);

    const clear = useCallback(() => {
        setState((prev) => ({ ...prev, logs: [], lastContextJson: "" }));
    }, []);

    const apiRef = useRef<TutorDebugApi>({ state, pushLog, setLastContextJson, setMeta, clear });
    apiRef.current.state = state;

    return <TutorDebugContext.Provider value={apiRef.current}>{children}</TutorDebugContext.Provider>;
}

export function useTutorDebug(): TutorDebugApi {
    const ctx = useContext(TutorDebugContext);
    if (!ctx) {
        throw new Error("useTutorDebug must be used within TutorDebugProvider");
    }
    return ctx;
}

export function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}
