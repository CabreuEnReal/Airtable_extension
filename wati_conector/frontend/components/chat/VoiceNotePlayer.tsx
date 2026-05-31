import { useState, useRef, useEffect, useCallback } from 'react';
import { useMediaBlobUrl } from '../../utils/useMediaBlobUrl';

interface VoiceNotePlayerProps {
    url: string;
    isVoice?: boolean;
}

function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceNotePlayer({ url, isVoice = false }: VoiceNotePlayerProps) {
    const { blobUrl, loading: blobLoading, error: blobError } = useMediaBlobUrl(url);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const animFrameRef = useRef<number>(0);

    // Update time via requestAnimationFrame for smooth progress
    const updateProgress = useCallback(() => {
        const audio = audioRef.current;
        if (audio && playing) {
            setCurrentTime(audio.currentTime);
            animFrameRef.current = requestAnimationFrame(updateProgress);
        }
    }, [playing]);

    useEffect(() => {
        if (playing) {
            animFrameRef.current = requestAnimationFrame(updateProgress);
        }
        return () => {
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [playing, updateProgress]);

    // Audio event handlers
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onLoadedMetadata = () => {
            setDuration(audio.duration);
            setLoading(false);
        };
        const onCanPlay = () => setLoading(false);
        const onEnded = () => {
            setPlaying(false);
            setCurrentTime(0);
            audio.currentTime = 0;
        };
        const onError = () => {
            setError(true);
            setLoading(false);
        };
        const onWaiting = () => setLoading(true);
        const onPlaying = () => setLoading(false);

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);
        audio.addEventListener('waiting', onWaiting);
        audio.addEventListener('playing', onPlaying);

        return () => {
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('waiting', onWaiting);
            audio.removeEventListener('playing', onPlaying);
        };
    }, []);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio || error) return;

        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            audio.play().then(() => {
                setPlaying(true);
            }).catch(() => {
                setError(true);
            });
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        const audio = audioRef.current;
        if (!audio) return;
        const newTime = parseFloat(e.target.value);
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const handleSliderClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (error || blobError) {
        return (
            <div
                className="mt-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
                <span className="text-xs text-gray-500">No se pudo cargar el audio</span>
            </div>
        );
    }

    return (
        <div
            className="mt-2 flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/5 min-w-[220px]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Hidden audio element */}
            <audio ref={audioRef} src={blobUrl ?? undefined} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlay}
                disabled={loading && !playing}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-[#00811A] text-white hover:bg-[#006615] active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 shadow-sm"
            >
                {loading && !playing ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : playing ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                )}
            </button>

            {/* Progress section */}
            <div className="flex-1 flex flex-col gap-1 min-w-0">
                {/* Waveform / Progress bar */}
                <div className="relative w-full h-6 flex items-center" onClick={handleSliderClick}>
                    {/* Background track */}
                    <div className="absolute inset-x-0 h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#00811A] rounded-full transition-[width] duration-100"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {/* Range input overlay */}
                    <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        onClick={handleSliderClick}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        style={{ zIndex: 2 }}
                    />
                    {/* Thumb indicator */}
                    {duration > 0 && (
                        <div
                            className="absolute w-3 h-3 bg-[#00811A] rounded-full shadow-sm pointer-events-none transition-[left] duration-100"
                            style={{ left: `calc(${progress}% - 6px)` }}
                        />
                    )}
                </div>

                {/* Time display */}
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-medium text-gray-500 tabular-nums">
                        {formatTime(currentTime)}
                    </span>
                    <div className="flex items-center gap-1.5">
                        {isVoice && (
                            <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                            </svg>
                        )}
                        <span className="text-[10px] font-medium text-gray-500 tabular-nums">
                            {duration > 0 ? formatTime(duration) : '--:--'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
