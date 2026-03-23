import { useState } from 'react';
import type { Attachment } from '../../types/models';
import { getDocumentIcon, formatFileSize } from '../../utils/fileUtils';
import { FILE_UPLOAD } from '../../constants/config';
import { getMediaType, isImage, isDocument } from '../../types/models';
import { PYTHON_API } from '../../constants/config';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface AttachmentPreviewProps {
    attachment: Attachment;
    maxWidth?: number;
    onPreview?: () => void;
}

export function AttachmentPreview({ attachment, maxWidth = 300, onPreview }: AttachmentPreviewProps) {
    const [imageError, setImageError] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const mediaType = getMediaType(attachment.mimeType);

    // Get the correct URL - backend now returns complete URLs
    const getCorrectUrl = () => {
        if (!attachment.url) return '';
        
        // If it's already a complete URL, use it directly
        if (attachment.url.startsWith('http')) {
            console.log('AttachmentPreview using complete URL directly:', {
                url: attachment.url,
                attachmentName: attachment.name
            });
            return attachment.url;
        }
        
        // Fallback for relative URLs (shouldn't happen with new backend)
        const baseUrl = (PYTHON_API as any).BASE_URL || PYTHON_API.BASE_URL;
        const finalUrl = `${baseUrl}${attachment.url}`;
        
        console.log('AttachmentPreview fallback - relative URL found:', {
            originalUrl: attachment.url,
            baseUrl,
            finalUrl,
            attachmentName: attachment.name
        });
        
        return finalUrl;
    };

    const handleDownload = async (e?: React.MouseEvent) => {
        if (downloading) return;
        
        e?.stopPropagation();
        setDownloading(true);
        
        try {
            const url = getCorrectUrl();
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download failed:', error);
            // Fallback: open in new tab
            window.open(getCorrectUrl(), '_blank');
        } finally {
            setDownloading(false);
        }
    };

    // ─── Image Preview ───────────────────────────────────────
    if (isImage(attachment.mimeType) && !imageError) {
        // If no URL available, show image placeholder
        if (!attachment.url) {
            return (
                <div 
                    className="mt-2 rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={onPreview}
                    style={{ maxWidth: `${maxWidth}px`, height: '150px' }}
                >
                    <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🖼️</div>
                            <div className="text-xs">{attachment.name}</div>
                        </div>
                    </div>
                    <div className="px-2 py-1 bg-gray-50 text-xs text-gray-600">
                        {attachment.name} • {formatFileSize(attachment.size)}
                    </div>
                </div>
            );
        }

        return (
            <div className="mt-2 rounded-lg overflow-hidden bg-gray-100">
                <img
                    src={getCorrectUrl()}
                    alt={attachment.name}
                    className="max-w-full h-auto cursor-pointer"
                    style={{ maxWidth: `${maxWidth}px` }}
                    onClick={onPreview}
                    onError={() => setImageError(true)}
                    loading="lazy"
                />
                <div className="px-2 py-1 bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
                    <span>{attachment.name} • {formatFileSize(attachment.size)}</span>
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="text-primary hover:text-primary/80 disabled:opacity-50 text-xs"
                        title="Descargar"
                    >
                        {downloading ? '⬇' : '⬇'}
                    </button>
                </div>
            </div>
        );
    }

    // ─── Document Preview ─────────────────────────────────────
    if (isDocument(attachment.mimeType)) {
        return (
            <div 
                className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={(e) => {
                    if (e.target === e.currentTarget || !e.currentTarget.closest('button')) {
                        onPreview?.();
                    }
                }}
            >
                <div className="flex-shrink-0">
                    {getDocumentIcon(attachment.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                        {attachment.name}
                    </div>
                    <div className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="flex-shrink-0 text-primary hover:text-primary/80 disabled:opacity-50"
                        title="Descargar"
                    >
                        {downloading ? (
                            <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                    </button>
                    <div className="flex-shrink-0 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Audio / Voice Note Preview (inline player) ─────────────
    if (mediaType === 'audio') {
        return (
            <VoiceNotePlayer url={getCorrectUrl()} isVoice={attachment.isVoice} />
        );
    }

    // ─── Video Preview ───────────────────────────────────────────
    if (mediaType === 'video') {
        return (
            <div 
                className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={(e) => {
                    if (e.target === e.currentTarget || !e.currentTarget.closest('button')) {
                        onPreview?.();
                    }
                }}
            >
                <div className="flex-shrink-0">
                    <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                        {attachment.name}
                    </div>
                    <div className="text-xs text-gray-500">
                        {formatFileSize(attachment.size)}
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="flex-shrink-0 text-primary hover:text-primary/80 disabled:opacity-50"
                    title="Descargar"
                >
                    {downloading ? (
                        <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    )}
                </button>
            </div>
        );
    }

    // ─── Fallback for unknown types ───────────────────────────────
    return (
        <div 
            className="mt-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={(e) => {
                if (e.target === e.currentTarget || !e.currentTarget.closest('button')) {
                    onPreview?.();
                }
            }}
        >
            <div className="flex-shrink-0 text-gray-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">
                    {attachment.name}
                </div>
                <div className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                </div>
            </div>
            <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-shrink-0 text-primary hover:text-primary/80 disabled:opacity-50"
                title="Descargar"
            >
                {downloading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                )}
            </button>
        </div>
    );
}
