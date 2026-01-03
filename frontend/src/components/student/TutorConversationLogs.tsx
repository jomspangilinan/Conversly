import { useTutorDebug, safeStringify } from "../../contexts/tutorDebug.context";

export function TutorConversationLogs() {
    const { state, clear } = useTutorDebug();

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-base-content/60">
                    Status: {state.status ?? "(unknown)"}
                    {state.agentId ? <span className="ml-2">Agent: {state.agentId}</span> : null}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-ghost btn-xs"
                        type="button"
                        onClick={() => {
                            const exportObj = {
                                agentId: state.agentId,
                                status: state.status,
                                lastContextJson: state.lastContextJson || null,
                                logs: state.logs,
                            };
                            void navigator.clipboard.writeText(JSON.stringify(exportObj, null, 2));
                        }}
                    >
                        Copy
                    </button>
                    <button className="btn btn-ghost btn-xs" type="button" onClick={clear}>
                        Clear
                    </button>
                </div>
            </div>

            <div className="rounded-lg border border-base-300 bg-base-100 p-3">
                <div className="text-[11px] text-base-content/50">
                    Last context payload size: {state.lastContextJson ? `${state.lastContextJson.length} chars` : "(none)"}
                </div>
                {state.lastContextJson ? (
                    <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-base-content/70">Show last context payload</summary>
                        <pre className="mt-2 text-[11px] leading-snug whitespace-pre-wrap">{state.lastContextJson}</pre>
                    </details>
                ) : null}
            </div>

            <div className="h-[520px] overflow-auto rounded-lg border border-base-300 bg-base-100 p-3">
                <pre className="text-[11px] leading-snug whitespace-pre-wrap">
                    {state.logs.length === 0
                        ? "No tutor logs yet. Start a session or send a message."
                        : state.logs
                            .map((l) => {
                                const ts = new Date(l.ts).toLocaleTimeString();
                                const data = l.data === undefined ? "" : `\n${safeStringify(l.data)}`;
                                return `[${ts}] ${l.kind}${data}`;
                            })
                            .join("\n\n")}
                </pre>
            </div>
        </div>
    );
}
