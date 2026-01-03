import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { videosAPI } from '../../api/videos.api';
import { validateVideoFile } from '../../utils/validators';
import { formatFileSize } from '../../utils/formatters';
import type { UploadProgress } from '../../types/video.types';

interface VideoUploadProps {
    onUploadComplete?: (videoId: string) => void;
    onError?: (error: Error) => void;
}

export default function VideoUpload({ onUploadComplete, onError }: VideoUploadProps) {
    const navigate = useNavigate();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
        status: 'idle',
        progress: 0,
    });
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleFileSelect = (file: File) => {
        const validation = validateVideoFile(file);

        if (!validation.isValid) {
            setUploadProgress({
                status: 'error',
                progress: 0,
                error: validation.error,
            });
            return;
        }

        setSelectedFile(file);
        setUploadProgress({ status: 'idle', progress: 0 });

        // Auto-set title from filename if not set
        if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        try {
            setUploadProgress({ status: 'uploading', progress: 0, message: 'Getting ready...' });

            // Step 1: Request upload URL
            const { videoId, uploadUrl } = await videosAPI.requestUploadUrl({
                filename: selectedFile.name,
                title: title || selectedFile.name,
                description: description || undefined,
            });

            setUploadProgress({ status: 'uploading', progress: 10, message: 'Uploading your video...' });

            // Step 2: Upload file to Cloud Storage
            await videosAPI.uploadToStorage(uploadUrl, selectedFile, (progress) => {
                setUploadProgress({
                    status: 'uploading',
                    progress: 10 + (progress * 0.6), // 10-70%
                    message: `Uploading...`,
                });
            });

            setUploadProgress({ status: 'processing', progress: 70, message: 'Starting AI analysis...' });

            // Step 3: Trigger processing
            await videosAPI.processVideo(videoId);

            // Step 4: Poll for processing status
            setUploadProgress({ status: 'processing', progress: 75, message: 'Analyzing your video...' });

            let attempts = 0;
            const maxAttempts = 240; // 12 minutes max (240 * 3 seconds)

            const checkStatus = setInterval(async () => {
                try {
                    attempts++;
                    const { video } = await videosAPI.getVideo(videoId);

                    // Update progress based on processing stage
                    if (video.processingStage === 'uploading_to_gemini') {
                        setUploadProgress({
                            status: 'processing',
                            progress: 80,
                            message: 'Sending video to AI...',
                            processingStage: video.processingStage,
                        });
                    } else if (video.processingStage === 'analyzing_content') {
                        setUploadProgress({
                            status: 'processing',
                            progress: 85,
                            message: 'Extracting key moments and transcript...',
                            processingStage: video.processingStage,
                        });
                    }

                    // Check if complete
                    if (video.status === 'ready') {
                        clearInterval(checkStatus);
                        setUploadProgress({
                            status: 'complete',
                            progress: 100,
                            message: 'Done! Redirecting to review page...',
                        });

                        // Notify parent
                        onUploadComplete?.(videoId);

                        // Navigate to review page
                        setTimeout(() => {
                            navigate(`/videos/${videoId}`);
                        }, 1500);
                    } else if (video.status === 'error') {
                        clearInterval(checkStatus);
                        setUploadProgress({
                            status: 'error',
                            progress: 0,
                            error: video.error || 'Something went wrong while processing your video',
                        });
                    } else if (attempts >= maxAttempts) {
                        clearInterval(checkStatus);
                        setUploadProgress({
                            status: 'error',
                            progress: 0,
                            error: 'This is taking longer than usual. Check back in a few minutes and your video should be ready.',
                        });
                    }
                } catch (error) {
                    console.error('Error checking status:', error);
                }
            }, 3000); // Check every 3 seconds

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.';
            setUploadProgress({
                status: 'error',
                progress: 0,
                error: errorMessage,
            });
            onError?.(error instanceof Error ? error : new Error(errorMessage));
        }
    };

    const handleCancel = () => {
        setSelectedFile(null);
        setTitle('');
        setDescription('');
        setUploadProgress({ status: 'idle', progress: 0 });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const openFileBrowser = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
            />

            {/* Drag & Drop Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={selectedFile ? undefined : openFileBrowser}
                className={`
          card bg-base-100 border-2 border-dashed transition-all cursor-pointer
          ${isDragging ? 'border-primary bg-primary/5' : 'border-base-300 hover:border-primary/50'}
          ${selectedFile ? 'cursor-default' : 'cursor-pointer'}
        `}
            >
                <div className="card-body items-center text-center p-12">
                    {!selectedFile ? (
                        <>
                            {/* Upload Icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-16 h-16 text-base-content/40 mb-4"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                />
                            </svg>

                            <h3 className="text-2xl font-bold mb-2">Drop your video here</h3>
                            <p className="text-base-content/60 mb-4">
                                or click to browse your files
                            </p>
                            <div className="text-sm text-base-content/40">
                                We support MP4, WebM, MOV, and AVI • Up to 500 MB
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Selected File Info */}
                            <div className="w-full text-left">
                                <div className="alert alert-info mb-6">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        className="stroke-current shrink-0 w-6 h-6"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <div className="flex-1">
                                        <div className="font-semibold">{selectedFile.name}</div>
                                        <div className="text-sm opacity-80">{formatFileSize(selectedFile.size)}</div>
                                    </div>
                                </div>

                                {/* Title Input */}
                                <div className="form-control w-full mb-4">
                                    <label htmlFor="video-title" className="label">
                                        <span className="label-text font-semibold text-base">Video Title</span>
                                    </label>
                                    <input
                                        id="video-title"
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter video title"
                                        className="input input-bordered w-full"
                                        disabled={uploadProgress.status !== 'idle'}
                                    />
                                </div>

                                {/* Description Input */}
                                <div className="form-control w-full mb-6">
                                    <label htmlFor="video-description" className="label">
                                        <span className="label-text font-semibold text-base">Description (Optional)</span>
                                    </label>
                                    <textarea
                                        id="video-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add a description for your video..."
                                        className="textarea textarea-bordered h-24 w-full"
                                        disabled={uploadProgress.status !== 'idle'}
                                    />
                                </div>

                                {/* Upload Progress */}
                                {uploadProgress.status !== 'idle' && (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                {uploadProgress.status === 'processing' && (
                                                    <span className="loading loading-spinner loading-sm text-primary"></span>
                                                )}
                                                <span className="text-sm font-medium">{uploadProgress.message}</span>
                                            </div>
                                            <span className="text-sm font-bold">{Math.round(uploadProgress.progress)}%</span>
                                        </div>
                                        <progress
                                            className={`progress w-full h-3 ${uploadProgress.status === 'processing' ? 'progress-secondary' : 'progress-primary'
                                                }`}
                                            value={uploadProgress.progress}
                                            max="100"
                                        />

                                        {/* Processing stage info */}
                                        {uploadProgress.status === 'processing' && (
                                            <div className="mt-4 space-y-3">
                                                <p className="text-xs text-base-content/60 mb-2">
                                                    Processing your video...
                                                </p>

                                                {/* Skeleton cards showing what's being generated */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="card bg-base-200 shadow-sm">
                                                        <div className="card-body p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="loading loading-dots loading-xs"></span>
                                                                <span className="text-xs font-semibold">Transcript</span>
                                                            </div>
                                                            <div className="skeleton h-2 w-3/4"></div>
                                                            <div className="skeleton h-2 w-1/2"></div>
                                                        </div>
                                                    </div>

                                                    <div className="card bg-base-200 shadow-sm">
                                                        <div className="card-body p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="loading loading-dots loading-xs"></span>
                                                                <span className="text-xs font-semibold">Key Moments</span>
                                                            </div>
                                                            <div className="skeleton h-2 w-2/3"></div>
                                                            <div className="skeleton h-2 w-1/2"></div>
                                                        </div>
                                                    </div>

                                                    <div className="card bg-base-200 shadow-sm">
                                                        <div className="card-body p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="loading loading-dots loading-xs"></span>
                                                                <span className="text-xs font-semibold">Questions</span>
                                                            </div>
                                                            <div className="skeleton h-2 w-3/4"></div>
                                                            <div className="skeleton h-2 w-1/2"></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Error Alert */}
                                {uploadProgress.status === 'error' && uploadProgress.error && (
                                    <div className="alert alert-error mb-6">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="stroke-current shrink-0 h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <span>{uploadProgress.error}</span>
                                    </div>
                                )}

                                {/* Success Alert */}
                                {uploadProgress.status === 'complete' && (
                                    <div className="alert alert-success mb-6">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="stroke-current shrink-0 h-6 w-6"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                        <span>{uploadProgress.message}</span>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-4 justify-end">
                                    <button
                                        onClick={handleCancel}
                                        className="btn btn-ghost"
                                        disabled={uploadProgress.status === 'uploading' || uploadProgress.status === 'processing'}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpload}
                                        className="btn btn-primary"
                                        disabled={
                                            !selectedFile ||
                                            uploadProgress.status === 'uploading' ||
                                            uploadProgress.status === 'processing' ||
                                            uploadProgress.status === 'complete'
                                        }
                                    >
                                        {uploadProgress.status === 'uploading' || uploadProgress.status === 'processing'
                                            ? 'Uploading...'
                                            : 'Upload Video'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
