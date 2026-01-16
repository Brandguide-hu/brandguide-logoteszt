"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface TransparentVideoProps {
    src: string;
    maxSize?: number;
    className?: string;
    threshold?: number; // 0-255, pixels darker than this become transparent
}

export function TransparentVideo({
    src,
    maxSize = 300,
    className = "",
    threshold = 30, // Default threshold for black
}: TransparentVideoProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [dimensions, setDimensions] = useState({ width: maxSize, height: maxSize });
    const dimensionsRef = useRef(dimensions);

    // Keep ref in sync with state
    useEffect(() => {
        dimensionsRef.current = dimensions;
    }, [dimensions]);

    useEffect(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        let animationId: number;
        let isRunning = true;

        const processFrame = () => {
            if (!isRunning) return;

            if (video.readyState >= 2 && !video.paused && !video.ended) {
                const { width, height } = dimensionsRef.current;

                // Draw video frame to canvas (use video's native size)
                ctx.drawImage(video, 0, 0, width, height);

                // Get image data
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // Process each pixel - make dark pixels transparent
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];

                    // Calculate luminance
                    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

                    // If pixel is dark (below threshold), make it transparent
                    if (luminance < threshold) {
                        data[i + 3] = 0; // Set alpha to 0
                    } else {
                        // Keep original alpha for bright pixels
                        data[i + 3] = 255;
                    }
                }

                // Put processed image back
                ctx.putImageData(imageData, 0, 0);
            }

            animationId = requestAnimationFrame(processFrame);
        };

        const handleLoadedMetadata = () => {
            // Get video's native dimensions
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            if (videoWidth === 0 || videoHeight === 0) return;

            // Calculate scaled dimensions maintaining aspect ratio
            const aspectRatio = videoWidth / videoHeight;
            let width, height;

            if (aspectRatio >= 1) {
                // Wider than tall
                width = maxSize;
                height = maxSize / aspectRatio;
            } else {
                // Taller than wide
                height = maxSize;
                width = maxSize * aspectRatio;
            }

            const newWidth = Math.round(width);
            const newHeight = Math.round(height);

            // Only update if dimensions actually changed
            setDimensions(prev => {
                if (prev.width === newWidth && prev.height === newHeight) {
                    return prev;
                }
                return { width: newWidth, height: newHeight };
            });
        };

        const handleCanPlay = () => {
            setIsReady(true);
            video.play().catch(() => {
                // Autoplay might be blocked
            });
        };

        const handlePlay = () => {
            processFrame();
        };

        video.addEventListener("loadedmetadata", handleLoadedMetadata);
        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("play", handlePlay);

        // If video is already ready
        if (video.readyState >= 1) {
            handleLoadedMetadata();
        }
        if (video.readyState >= 2) {
            setIsReady(true);
            processFrame();
        }

        return () => {
            isRunning = false;
            video.removeEventListener("loadedmetadata", handleLoadedMetadata);
            video.removeEventListener("canplay", handleCanPlay);
            video.removeEventListener("play", handlePlay);
            cancelAnimationFrame(animationId);
        };
    }, [maxSize, threshold]);

    return (
        <div className={className} style={{ width: dimensions.width, height: dimensions.height, position: "relative" }}>
            <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            >
                <source src={src} type="video/webm" />
                <source src={src.replace(".webm", ".mov")} type="video/quicktime" />
                <source src={src.replace(".webm", ".mp4")} type="video/mp4" />
            </video>
            <canvas
                ref={canvasRef}
                width={dimensions.width}
                height={dimensions.height}
                style={{ width: "100%", height: "100%", display: isReady ? "block" : "none" }}
            />
        </div>
    );
}
