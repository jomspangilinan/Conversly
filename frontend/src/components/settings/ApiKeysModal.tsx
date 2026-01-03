import { useState, useEffect } from 'react';
import { useApiKeys } from '../../contexts/ApiKeysContext';
import apiClient from '../../api/client';
import WarningIcon from '@mui/icons-material/Warning';

interface ApiKeysModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ApiKeysModal({ isOpen, onClose }: ApiKeysModalProps) {
    const { keys, setKeys } = useApiKeys();
    const [geminiKey, setGeminiKey] = useState(keys.gemini || '');
    const [elevenLabsKey, setElevenLabsKey] = useState(keys.elevenlabs || '');
    const [needsKeys, setNeedsKeys] = useState(false);

    // Check if backend needs API keys
    useEffect(() => {
        const checkBackendKeys = async () => {
            try {
                const res = await apiClient.get('/api/config/api-keys-required');
                const data = res.data as { required?: boolean };
                setNeedsKeys(Boolean(data.required));
            } catch (error) {
                console.error('Failed to check API keys requirement:', error);
            }
        };
        checkBackendKeys();
    }, []);

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        setKeys({
            gemini: geminiKey || undefined,
            elevenlabs: elevenLabsKey || undefined,
        });
        onClose();
    };

    return (
        <>
            {/* Modal */}
            <dialog className={`modal ${isOpen ? 'modal-open' : ''}`}>
                <div className="modal-box max-w-2xl">
                    <div className="flex items-center gap-3 mb-4">
                        {needsKeys && (
                            <WarningIcon className="text-warning" fontSize="large" />
                        )}
                        <div>
                            <h3 className="font-bold text-2xl">API Keys Configuration</h3>
                            {needsKeys ? (
                                <p className="text-warning mt-1">
                                    API keys are required to use this application
                                </p>
                            ) : (
                                <p className="text-sm text-base-content/70 mt-1">
                                    Optional: Use your own API keys for this session
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="alert alert-info mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <div className="text-sm">
                            <p className="font-semibold">Keys are stored in session storage only</p>
                            <p>They will be cleared when you close the browser tab.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="space-y-4">
                            {/* Gemini API Key */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">Gemini API Key</span>
                                    <a
                                        href="https://makersuite.google.com/app/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="label-text-alt link link-primary"
                                    >
                                        Get API key →
                                    </a>
                                </label>
                                <input
                                    type="password"
                                    placeholder="AIza..."
                                    className="input input-bordered w-full"
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                />
                                <label className="label">
                                    <span className="label-text-alt text-base-content/60">
                                        Used for video analysis and checkpoint generation
                                    </span>
                                </label>
                            </div>

                            {/* ElevenLabs API Key */}
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text font-semibold">ElevenLabs API Key</span>
                                    <a
                                        href="https://elevenlabs.io/app/settings/api-keys"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="label-text-alt link link-primary"
                                    >
                                        Get API key →
                                    </a>
                                </label>
                                <input
                                    type="password"
                                    placeholder="sk_..."
                                    className="input input-bordered w-full"
                                    value={elevenLabsKey}
                                    onChange={(e) => setElevenLabsKey(e.target.value)}
                                />
                                <label className="label">
                                    <span className="label-text-alt text-base-content/60">
                                        Used for voice tutor conversations
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className="modal-action">
                            {!needsKeys && (
                                <button type="button" className="btn btn-ghost" onClick={onClose}>
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={needsKeys && (!geminiKey || !elevenLabsKey)}
                            >
                                Save Keys
                            </button>
                        </div>
                    </form>
                </div>
                {!needsKeys && (
                    <form method="dialog" className="modal-backdrop" onClick={onClose}>
                        <button>close</button>
                    </form>
                )}
            </dialog>
        </>
    );
}
