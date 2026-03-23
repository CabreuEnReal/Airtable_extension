import { ProgressBar } from '../common/ProgressBar';
import type { Attachment } from '../../types/models';
import { formatFileSize, getFileType } from '../../utils/fileUtils';

interface UploadingMessageProps {
    attachment: Attachment;
    progress: number;
    onCancel?: () => void;
}

export function UploadingMessage({ attachment, progress, onCancel }: UploadingMessageProps) {
    const mediaType = getFileType({ 
        name: attachment.name, 
        type: attachment.mimeType 
    } as File);

    return (
        <div className="flex justify-start mb-4">
            <div className="max-w-xs lg:max-w-md">
                <div className="bg-gray-100 rounded-lg p-3 shadow-sm">
                    {/* File info */}
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="text-2xl">
                            {mediaType === 'image' && '🖼️'}
                            {mediaType === 'document' && '📄'}
                            {mediaType === 'video' && '🎥'}
                            {mediaType === 'audio' && '🎵'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">
                                {attachment.name}
                            </div>
                            <div className="text-xs text-gray-500">
                                {formatFileSize(attachment.size)} • {progress.toFixed(0)}%
                            </div>
                        </div>
                        {onCancel && (
                            <button
                                onClick={onCancel}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title="Cancelar"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Progress bar */}
                    <ProgressBar 
                        progress={progress} 
                        size="sm" 
                        color="primary"
                        className="mb-1"
                    />

                    {/* Status text */}
                    <div className="text-xs text-gray-500 text-center">
                        {progress < 100 ? 'Subiendo archivo...' : 'Procesando...'}
                    </div>
                </div>
            </div>
        </div>
    );
}
