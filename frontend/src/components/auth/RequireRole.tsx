import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../../auth/AuthContext";

export function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
    const auth = useAuth();

    if (auth.loading) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <div className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (!auth.user) {
        return <Navigate to="/signin" replace />;
    }

    // If role is still loading (user exists but role not fetched yet), show loading
    if (!auth.role) {
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center">
                <div className="loading loading-spinner loading-lg text-primary" />
            </div>
        );
    }

    if (auth.role !== role) {
        const redirect = auth.role === "creator" ? "/creator" : "/student";
        return (
            <div className="min-h-screen bg-base-100 flex items-center justify-center p-6">
                <div className="card bg-base-200 shadow-xl w-full max-w-md">
                    <div className="card-body">
                        <h2 className="card-title">Wrong mode</h2>
                        <p className="text-sm text-base-content/70">
                            You are signed in as <b>{auth.role}</b>. This page requires <b>{role}</b>.
                        </p>
                        <div className="mt-4">
                            <a className="btn btn-primary w-full" href={redirect}>
                                Go to my homepage
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
