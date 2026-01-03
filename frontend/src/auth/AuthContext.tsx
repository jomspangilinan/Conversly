import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    signOut as firebaseSignOut,
    type User,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";
import { setAuthToken } from "./authTokenStore";
import apiClient from "../api/client";

export type UserRole = "student" | "creator";

type AuthState = {
    user: User | null;
    idToken: string | null;
    role: UserRole | null;
    loading: boolean;
};

type AuthApi = AuthState & {
    signInWithGoogle: (roleIntent: UserRole) => Promise<void>;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

async function fetchRole(): Promise<UserRole | null> {
    try {
        const res = await apiClient.get("/api/auth/me");
        const role = res.data?.profile?.role;
        return role === "student" || role === "creator" ? role : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        idToken: null,
        role: null,
        loading: true,
    });

    const refreshProfile = useCallback(async () => {
        const role = await fetchRole();
        setState((prev) => ({ ...prev, role }));
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            try {
                if (!user) {
                    setAuthToken(null);
                    setState({ user: null, idToken: null, role: null, loading: false });
                    return;
                }

                const token = await user.getIdToken();
                setAuthToken(token);

                setState((prev) => ({
                    ...prev,
                    user,
                    idToken: token,
                    loading: false,
                }));

                const role = await fetchRole();
                setState((prev) => ({ ...prev, role }));
            } catch {
                setAuthToken(null);
                setState({ user: null, idToken: null, role: null, loading: false });
            }
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = useCallback(async (roleIntent: UserRole) => {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(firebaseAuth, provider);
        const user = result.user;
        const token = await user.getIdToken();
        setAuthToken(token);

        setState((prev) => ({
            ...prev,
            user,
            idToken: token,
            loading: false,
        }));

        // Persist desired role in backend user profile.
        await apiClient.post("/api/auth/upsert-profile", {
            role: roleIntent,
            displayName: user.displayName,
            photoURL: user.photoURL,
        });

        setState((prev) => ({ ...prev, role: roleIntent }));
    }, []);

    const signOut = useCallback(async () => {
        await firebaseSignOut(firebaseAuth);
        setAuthToken(null);
        setState({ user: null, idToken: null, role: null, loading: false });
    }, []);

    const value = useMemo<AuthApi>(
        () => ({
            ...state,
            signInWithGoogle,
            signOut,
            refreshProfile,
        }),
        [state, signInWithGoogle, signOut, refreshProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
