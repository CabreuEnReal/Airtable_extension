import { useState, useEffect } from 'react';
import type { Message } from '../../types/models';
import { formatTime } from '../../utils/formatters';
import { AttachmentPreview } from './AttachmentPreview';
import { resolveMediaUrl } from '../../adapters/messageAdapter';

interface MessageBubbleProps {
    message: Message;
    contactName?: string;
    onRetryMedia?: (messageId: string) => Promise<void>;
}

function StatusIcon({ status }: { status: string }) {
    if (status === 'read') return <span className="text-blue">✓✓</span>;
    if (status === 'delivered') return <span className="text-gray-400">✓✓</span>;
    if (status === 'sent') return <span className="text-gray-400">✓</span>;
    if (status === 'sending') return <span className="text-gray-300 animate-pulse">◌</span>;
    if (status === 'failed' || status === 'error') return <span className="text-red">!</span>;
    return null;
}

const TEMPLATE_REGEX = /^\[template:([^\]]+)\]\s*params=\[([^\]]*)\]$/;

function formatDisplayText(text: string): { display: string; isTemplate: boolean } {
    const match = text.match(TEMPLATE_REGEX);
    if (!match) return { display: text, isTemplate: false };
    const name = match[1];
    const rawParams = match[2].trim();
    const params = rawParams ? rawParams.split(',').map((p: string) => p.trim()).filter(Boolean) : [];
    const display = params.length > 0
        ? `📋 Plantilla "${name}" enviada con: ${params.join(', ')}`
        : `📋 Plantilla "${name}" enviada`;
    return { display, isTemplate: true };
}

export function MessageBubble({ message, contactName, onRetryMedia }: MessageBubbleProps) {
    const [retrying, setRetrying] = useState(false);
    const [previewModal, setPreviewModal] = useState<{ url: string; name: string; type: string } | null>(null);
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const isOut = message.direction === 'outbound';
    const { display, isTemplate } = formatDisplayText(message.text || '');

    // Load PDF as blob when preview modal opens (iframe can't send custom headers)
    useEffect(() => {
        if (!previewModal || previewModal.type !== 'application/pdf') {
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
                setPdfBlobUrl(null);
            }
            return;
        }
        let cancelled = false;
        setPdfLoading(true);
        fetch(previewModal.url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch PDF');
                return res.blob();
            })
            .then(blob => {
                if (cancelled) return;
                const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                setPdfBlobUrl(url);
            })
            .catch(() => {
                if (!cancelled) setPdfBlobUrl(null);
            })
            .finally(() => {
                if (!cancelled) setPdfLoading(false);
            });
        return () => { cancelled = true; };
    }, [previewModal?.url, previewModal?.type]);

    const handleDownload = async (url: string, filename: string, buttonElement?: HTMLButtonElement) => {
        try {
            // Show loading state
            if (buttonElement) {
                buttonElement.disabled = true;
                buttonElement.textContent = '⬇ Descargando...';
            }

            // Fetch the file with ngrok headers
            const response = await fetch(url, {
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            if (!response.ok) throw new Error('Failed to download file');
            
            // Get blob and create download link
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Decode filename (remove %20 etc.)
            const decodedFilename = decodeURIComponent(filename);
            
            // Create temporary link and trigger download
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = decodedFilename;
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            // Restore button
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = '⬇ Descargar';
            }
        } catch (error) {
            console.error('Download failed:', error);
            
            // Restore button and show error
            if (buttonElement) {
                buttonElement.disabled = false;
                buttonElement.textContent = '⬇ Error';
                setTimeout(() => {
                    buttonElement.textContent = '⬇ Descargar';
                }, 2000);
            }
            
            // Fallback: open in new tab
            window.open(url, '_blank');
        }
    };

    const handleRetry = async () => {
        if (!onRetryMedia || retrying) return;
        setRetrying(true);
        try {
            await onRetryMedia(message.id);
        } finally {
            setRetrying(false);
        }
    };

    return (
        <>
        <div className={`flex mb-2 ${isOut ? 'justify-end' : 'justify-start'} ${message.isOptimistic ? 'opacity-70' : ''}`}>
            <div
                className={`max-w-[75%] px-3 py-2 shadow-xs ${
                    isOut
                        ? 'bg-green-bubble rounded-tl-xl rounded-tr-sm rounded-bl-xl rounded-br-xl'
                        : 'bg-white rounded-tl-sm rounded-tr-xl rounded-bl-xl rounded-br-xl'
                }`}
            >
                {!isOut && (
                    <div className="text-xs font-semibold text-primary mb-0.5">
                        {contactName || 'Contacto'}
                    </div>
                )}

                {/* Media unavailable — retry button */}
                {message.mediaUnavailable && (
                    <div className="flex items-center gap-2 p-2 mb-1 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                        <span className="text-yellow-600">⚠️</span>
                        <span className="flex-1 text-yellow-800">Archivo no disponible</span>
                        {onRetryMedia && (
                            <button
                                onClick={handleRetry}
                                disabled={retrying}
                                className="px-2 py-1 text-xs font-medium text-white bg-yellow-500 rounded hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                            >
                                {retrying ? 'Reintentando...' : 'Reintentar'}
                            </button>
                        )}
                    </div>
                )}

                {display && (
                    <div className={`text-body break-words whitespace-pre-wrap ${isTemplate ? 'text-gray-600 italic' : 'text-gray-800'}`}>{display}</div>
                )}
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="mt-1">
                        {message.attachments.map((attachment) => (
                            <AttachmentPreview
                                key={attachment.id}
                                attachment={attachment}
                                maxWidth={isOut ? 250 : 300}
                                onPreview={() => setPreviewModal({
                                    url: resolveMediaUrl(attachment.url),
                                    name: attachment.name,
                                    type: attachment.mimeType
                                })}
                            />
                        ))}
                    </div>
                )}

                {/* Workaround: Show media placeholder for outbound messages with no text and no attachments (probably media not saved in DB) */}
                {isOut && !message.text && message.attachments.length === 0 && (
                    <div className="mt-1">
                        <AttachmentPreview
                            attachment={{
                                id: `placeholder_${message.id}`,
                                name: 'Archivo multimedia',
                                url: '',
                                mimeType: 'image/jpeg', // Assume image for placeholder
                                size: 0
                            }}
                            maxWidth={250}
                            onPreview={() => setPreviewModal({
                                url: '',
                                name: 'Archivo multimedia',
                                type: 'image/jpeg'
                            })}
                        />
                    </div>
                )}
                
                <div className="flex justify-end items-center mt-0.5 gap-1">
                    <span className="text-label text-gray-400">{formatTime(message.timestamp)}</span>
                    {isOut && <StatusIcon status={message.status} />}
                </div>
            </div>
        </div>

        {/* Preview Modal */}
        {previewModal && (
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                onClick={() => setPreviewModal(null)}
            >
                <div 
                    className={`bg-white rounded-lg overflow-hidden ${previewModal.type === 'application/pdf' ? 'w-[90vw] h-[90vh] max-w-5xl' : 'max-w-4xl max-h-[90vh]'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-3 border-b">
                        <h3 className="text-sm font-semibold truncate flex-1 mr-2">{decodeURIComponent(previewModal.name)}</h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={(e) => handleDownload(previewModal.url, previewModal.name, e.currentTarget)}
                                className="px-3 py-1.5 bg-primary text-white text-xs rounded hover:bg-primary/90 transition-colors"
                                title="Descargar"
                            >
                                ⬇ Descargar
                            </button>
                            <button
                                onClick={() => setPreviewModal(null)}
                                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full text-xl leading-none transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    <div className={`overflow-auto ${previewModal.type === 'application/pdf' ? 'h-[calc(90vh-52px)]' : 'p-4 max-h-[70vh]'}`}>
                        {previewModal.type.startsWith('image/') ? (
                            <img 
                                src={previewModal.url} 
                                alt={previewModal.name}
                                className="max-w-full h-auto mx-auto"
                            />
                        ) : previewModal.type === 'application/pdf' ? (
                            pdfBlobUrl ? (
                                <iframe
                                    src={pdfBlobUrl}
                                    title={decodeURIComponent(previewModal.name)}
                                    className="w-full h-full border-0"
                                />
                            ) : pdfLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="animate-spin text-4xl mb-3">⏳</div>
                                        <p className="text-gray-500">Cargando PDF...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center">
                                        <div className="text-4xl mb-3">📄</div>
                                        <p className="text-gray-500 mb-3">No se pudo cargar el PDF</p>
                                        <button
                                            onClick={() => handleDownload(previewModal.url, previewModal.name)}
                                            className="px-4 py-2 bg-primary text-white text-sm rounded hover:bg-primary/90"
                                        >
                                            ⬇ Descargar archivo
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : previewModal.type.startsWith('video/') ? (
                            <video 
                                src={previewModal.url} 
                                controls
                                className="max-w-full h-auto mx-auto"
                            />
                        ) : previewModal.type.startsWith('audio/') ? (
                            <audio 
                                src={previewModal.url} 
                                controls
                                className="w-full"
                            />
                        ) : (
                            <div className="text-center py-8">
                                <div className="text-6xl mb-4">📄</div>
                                <p className="text-gray-600 mb-4">Documento: {previewModal.name}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
