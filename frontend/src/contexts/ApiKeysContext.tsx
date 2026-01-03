import React, { createContext, useContext, useState } from 'react';

interface ApiKeys {
    gemini?: string;
    elevenlabs?: string;
}

interface ApiKeysContextType {
    keys: ApiKeys;
    setKeys: (keys: ApiKeys) => void;
    hasKeys: boolean;
}

const ApiKeysContext = createContext<ApiKeysContextType | null>(null);

export function ApiKeysProvider({ children }: { children: React.ReactNode }) {
    const [keys, setKeysState] = useState<ApiKeys>(() => {
        // Load from sessionStorage on mount
        const stored = sessionStorage.getItem('apiKeys');
        return stored ? JSON.parse(stored) : {};
    });

    const setKeys = (newKeys: ApiKeys) => {
        setKeysState(newKeys);
        // Save to sessionStorage (cleared on browser close/refresh)
        sessionStorage.setItem('apiKeys', JSON.stringify(newKeys));
    };

    const hasKeys = Boolean(keys.gemini && keys.elevenlabs);

    return (
        <ApiKeysContext.Provider value={{ keys, setKeys, hasKeys }}>
            {children}
        </ApiKeysContext.Provider>
    );
}

export function useApiKeys() {
    const context = useContext(ApiKeysContext);
    if (!context) {
        throw new Error('useApiKeys must be used within ApiKeysProvider');
    }
    return context;
}
