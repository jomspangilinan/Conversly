import { useNavigate } from "react-router-dom";
import { useAuth, type UserRole } from "../auth/AuthContext";
import LogoutIcon from '@mui/icons-material/Logout';

const GoogleIcon = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

const StudentIcon = () => (
    <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" fill="currentColor" className="text-primary" opacity="0.3" />
        <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="currentColor" className="text-primary" />
    </svg>
);

const SchoolIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z" fill="currentColor" className="text-primary" opacity="0.3" />
        <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="currentColor" className="text-primary" />
    </svg>
);

const VideoIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="currentColor" className="text-primary" />
    </svg>
);

const MicIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor" className="text-primary" />
        <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z" fill="currentColor" className="text-primary" opacity="0.6" />
    </svg>
);

const CheckIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="currentColor" className="text-primary" opacity="0.2" />
        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" />
    </svg>
);

const RocketIcon = () => (
    <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9.19 6.35C8.63 7.12 8 8.24 8 9.5C8 10.88 9.12 12 10.5 12C11.76 12 12.88 11.37 13.65 10.81C15.55 13.04 13.85 15 11.5 15C9.01 15 7 12.99 7 10.5C7 8.15 8.96 6.45 11.19 8.35L9.19 6.35ZM14.5 4C14.22 4 13.95 4 13.67 4.03C13.18 4.08 12.77 4.5 12.77 5C12.77 5.55 13.22 6 13.77 6C15.78 6 17.39 7.61 17.39 9.62C17.39 10.17 17.84 10.62 18.39 10.62C18.89 10.62 19.31 10.21 19.36 9.72C19.39 9.44 19.39 9.17 19.39 8.89C19.39 5.05 16.34 4 14.5 4Z" fill="currentColor" className="text-primary" />
    </svg>
);

export default function SignInPage() {
    const auth = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async (role: UserRole) => {
        await auth.signInWithGoogle(role);
        navigate(role === "student" ? "/student" : "/creator");
    };

    const signedInLabel = auth.user?.displayName || auth.user?.email || "Signed in";

    return (
        <div className="min-h-screen bg-base-200">
            {/* Header */}
            <header className="bg-base-100 shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Conversly
                        </h1>
                        <div className="flex items-center gap-3">
                            {auth.user && (
                                <>
                                    <div className="text-sm text-base-content/70">
                                        {signedInLabel}
                                    </div>
                                    <button className="btn btn-ghost gap-2" onClick={() => void auth.signOut()}>
                                        <LogoutIcon fontSize="small" />
                                        Sign out
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-gradient-to-b from-base-200 to-base-300">
                <div className="container mx-auto px-4 py-16 lg:py-24">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <img
                                src="/conversly_icon_512.png"
                                alt="Conversly"
                                className="h-32 w-auto"
                            />
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                            Are you registering as a
                            <br />
                            <span className="text-primary">creator or a student?</span>
                        </h1>

                        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
                            <div
                                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
                                onClick={() => !auth.loading && void handleSignIn("creator")}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !auth.loading && void handleSignIn("creator")}
                                role="button"
                                tabIndex={0}
                                aria-disabled={auth.loading}
                            >
                                <div className="card-body items-center text-center">
                                    <VideoIcon />
                                    <h2 className="card-title text-2xl">Creator</h2>
                                    <p className="text-base-content/70 mt-2">
                                        Create and manage courses
                                    </p>
                                    <div className="card-actions mt-4">
                                        <div className="btn btn-outline btn-circle btn-lg pointer-events-none">
                                            <GoogleIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                className="card bg-base-200 shadow-xl hover:shadow-2xl transition-all hover:scale-105 cursor-pointer"
                                onClick={() => !auth.loading && void handleSignIn("student")}
                                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !auth.loading && void handleSignIn("student")}
                                role="button"
                                tabIndex={0}
                                aria-disabled={auth.loading}
                            >
                                <div className="card-body items-center text-center">
                                    <StudentIcon />
                                    <h2 className="card-title text-2xl">Student</h2>
                                    <p className="text-base-content/70 mt-2">
                                        Join and access courses
                                    </p>
                                    <div className="card-actions mt-4">
                                        <div className="btn btn-outline btn-circle btn-lg pointer-events-none">
                                            <GoogleIcon />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="mt-4 text-sm text-base-content/60">
                            Sign in with Google • Switch roles anytime
                        </p>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="container mx-auto px-4 py-16">
                <h2 className="text-3xl font-bold text-center mb-12">How Conversly works</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    <div className="card bg-base-200 shadow-lg">
                        <div className="card-body">
                            <div className="flex items-center gap-3 mb-2">
                                <SchoolIcon />
                                <h3 className="card-title text-xl">For Students</h3>
                            </div>
                            <ul className="space-y-2 text-base-content/80">
                                <li>• Watch videos with interactive checkpoints</li>
                                <li>• Answer questions as you learn</li>
                                <li>• Ask the voice tutor when you're stuck</li>
                                <li>• Track your progress across lessons</li>
                            </ul>
                        </div>
                    </div>

                    <div className="card bg-base-200 shadow-lg">
                        <div className="card-body">
                            <div className="flex items-center gap-3 mb-2">
                                <VideoIcon />
                                <h3 className="card-title text-xl">For Creators</h3>
                            </div>
                            <ul className="space-y-2 text-base-content/80">
                                <li>• Upload any educational video</li>
                                <li>• AI generates interactive checkpoints</li>
                                <li>• Review and refine before publishing</li>
                                <li>• Share lessons with students instantly</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Features */}
            <div className="bg-base-200 py-16">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center mb-12">What makes Conversly different</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        <div className="text-center p-6">
                            <div className="flex justify-center mb-3">
                                <MicIcon />
                            </div>
                            <h3 className="font-semibold mb-2">Voice Tutor</h3>
                            <p className="text-sm text-base-content/70">
                                Talk to an AI tutor without pausing your lesson
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="flex justify-center mb-3">
                                <CheckIcon />
                            </div>
                            <h3 className="font-semibold mb-2">Smart Checkpoints</h3>
                            <p className="text-sm text-base-content/70">
                                Questions appear at the perfect moments to reinforce learning
                            </p>
                        </div>
                        <div className="text-center p-6">
                            <div className="flex justify-center mb-3">
                                <RocketIcon />
                            </div>
                            <h3 className="font-semibold mb-2">Instant Setup</h3>
                            <p className="text-sm text-base-content/70">
                                Upload a video and get interactive lessons in minutes
                            </p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
