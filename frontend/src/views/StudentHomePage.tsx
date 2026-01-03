import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { videosAPI } from "../api/videos.api";
import type { Video } from "../types/video.types";
import { useAuth } from "../auth/AuthContext";
import LogoutIcon from '@mui/icons-material/Logout';
import ApiKeysButton from "../components/settings/ApiKeysButton";

export default function StudentHomePage() {
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [generatingThumbnails, setGeneratingThumbnails] = useState<Set<string>>(new Set());
    const navigate = useNavigate();
    const auth = useAuth();

    // Generate thumbnail from video using canvas (same as creator view)
    const generateThumbnailFromVideo = useCallback((timestamp: number, videoUrl: string): Promise<string> => {
        return new Promise((resolve) => {
            const videoElement = document.createElement('video');
            videoElement.src = videoUrl;
            videoElement.crossOrigin = 'anonymous';
            videoElement.currentTime = timestamp;

            videoElement.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                }
            }, { once: true });

            videoElement.load();
        });
    }, []);

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

    // Generate thumbnail client-side and cache to Firestore
    const handleGenerateThumbnail = async (videoId: string) => {
        if (generatingThumbnails.has(videoId)) return;

        setGeneratingThumbnails(prev => new Set(prev).add(videoId));

        try {
            // Find the video to get its URL and concepts
            const video = videos.find(v => v.id === videoId);
            if (!video || !video.downloadUrl) {
                console.warn('Video not ready for thumbnail generation');
                return;
            }

            // Use first concept timestamp or 1 second
            const timestamp = video.concepts?.[0]?.timestamp ?? 1;

            // Generate thumbnail client-side using canvas
            const thumbnailDataUrl = await generateThumbnailFromVideo(timestamp, video.downloadUrl);

            // Cache to Firestore
            const { thumbnailUrl } = await videosAPI.cacheThumbnail(videoId, thumbnailDataUrl);

            // Update the video in the list with the cached thumbnail URL
            setVideos(prev => prev.map(v =>
                v.id === videoId ? { ...v, thumbnailUrl } : v
            ));

            console.log('✅ Thumbnail generated and cached for video:', videoId);
        } catch (error) {
            console.error('Failed to generate thumbnail:', error);
        } finally {
            setGeneratingThumbnails(prev => {
                const next = new Set(prev);
                next.delete(videoId);
                return next;
            });
        }
    };

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
                                {auth.user?.displayName || auth.user?.email || "Student"}
                            </div>
                            <ApiKeysButton />
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
                    <h1 className="text-3xl font-bold">My Courses</h1>
                    <p className="mt-2 text-base-content/70">
                        Pick a video to continue learning
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
                            onClick={() => {
                                // Generate thumbnail on click if not available
                                if (!v.thumbnailUrl && !generatingThumbnails.has(v.id)) {
                                    void handleGenerateThumbnail(v.id);
                                }
                                navigate(`/student/watch/${v.id}`);
                            }}
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
                                            {generatingThumbnails.has(v.id) ? (
                                                <span className="loading loading-spinner loading-lg text-primary" />
                                            ) : (
                                                <>
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
                                                </>
                                            )}
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
                                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
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
                                    {v.engagementAnalysis?.engagementRate?.score && (
                                        <div className="badge badge-success badge-sm gap-1">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                            </svg>
                                            {Math.round(v.engagementAnalysis.engagementRate.score)}% engagement
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {!loading && videos.length === 0 ? (
                        <div className="text-base-content/60 mt-6">
                            No videos available yet. Ask your instructor/creator to upload and publish one.
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
