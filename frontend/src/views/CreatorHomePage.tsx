import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { videosAPI } from "../api/videos.api";
import type { Video } from "../types/video.types";
import { useAuth } from "../auth/AuthContext";
import UploadIcon from '@mui/icons-material/Upload';
import LogoutIcon from '@mui/icons-material/Logout';
import ApiKeysButton from '../components/settings/ApiKeysButton';

export default function CreatorHomePage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const auth = useAuth();

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                setLoading(true);
                const res = await videosAPI.getVideos();
                if (!alive) return;
                setVideos(res.videos ?? []);
                setError(null);
            } catch (err) {
                if (!alive) return;
                setError("Failed to load videos");
                console.error(err);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    return (
        <div className="min-h-screen bg-base-200">
            <header className="bg-base-100 shadow-lg">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                            Conversly
                        </h1>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-base-content/70">
                                {auth.user?.displayName || auth.user?.email || "Creator"}
                            </div>
                            <ApiKeysButton />
                            <button className="btn btn-primary gap-2" onClick={() => navigate("/creator/upload")}>
                                <UploadIcon fontSize="small" />
                                Upload Video
                            </button>
                            <button className="btn btn-ghost gap-2" onClick={() => void auth.signOut()}>
                                <LogoutIcon fontSize="small" />
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto p-4">
                <div className="max-w-3xl">
                    <h1 className="text-3xl font-bold">My Videos</h1>
                    <p className="mt-2 text-base-content/70">
                        Create interactive learning experiences from your videos
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center gap-2 text-base-content/70 mb-6 mt-4">
                        <span className="loading loading-spinner loading-sm" /> Loading…
                    </div>
                ) : null}

                {error ? <div className="text-error mb-6 mt-4">{error}</div> : null}

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                    {videos.map((v) => (
                        <div
                            key={v.id}
                            className="card bg-base-200 shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
                            onClick={() => navigate(`/creator/videos/${v.id}`)}
                        >
                            <figure className="relative aspect-video bg-gradient-to-br from-primary/20 to-secondary/20">
                                {v.thumbnailUrl ? (
                                    <img
                                        src={v.thumbnailUrl}
                                        alt={v.title || "Video thumbnail"}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <div className="text-center">
                                            <svg
                                                className="w-20 h-20 mx-auto text-base-content/40"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                                            </svg>
                                            <div className="mt-2 text-xs text-base-content/50 font-medium">
                                                {v.title || "Video"}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                    <button className="btn btn-primary btn-circle opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg
                                            className="w-6 h-6"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </figure>
                            <div className="card-body p-4">
                                <h3 className="card-title text-base line-clamp-2">
                                    {v.title || "Untitled Video"}
                                </h3>
                                {v.description && (
                                    <p className="text-sm text-base-content/70 line-clamp-2">
                                        {v.description}
                                    </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                    {v.duration && (
                                        <div className="flex items-center gap-1 text-xs text-base-content/60">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{Math.floor(v.duration / 60)} min</span>
                                        </div>
                                    )}
                                    {v.concepts && v.concepts.length > 0 && (
                                        <div className="flex items-center gap-1 text-xs text-base-content/60">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                            <span>{v.concepts.length} concepts</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <div className="badge badge-sm">
                                        {v.status || "unknown"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && videos.length === 0 && (
                        <div className="col-span-full text-center py-12">
                            <svg
                                className="w-16 h-16 mx-auto text-base-content/20 mb-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                            <p className="text-base-content/60 mb-4">No videos yet</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate("/creator/upload")}
                            >
                                Upload Your First Video
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
