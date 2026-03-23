import { FILE_UPLOAD } from '../constants/config';

function getMaxSizeForType(mimeType: string): number {
    if (FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(mimeType as any)) return FILE_UPLOAD.MAX_IMAGE_SIZE;
    if (FILE_UPLOAD.ALLOWED_VIDEO_TYPES.includes(mimeType as any)) return FILE_UPLOAD.MAX_VIDEO_SIZE;
    if (FILE_UPLOAD.ALLOWED_AUDIO_TYPES.includes(mimeType as any)) return FILE_UPLOAD.MAX_AUDIO_SIZE;
    return FILE_UPLOAD.MAX_DOCUMENT_SIZE;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type first
    const allAllowedTypes = [
        ...FILE_UPLOAD.ALLOWED_IMAGE_TYPES,
        ...FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES,
        ...FILE_UPLOAD.ALLOWED_VIDEO_TYPES,
        ...FILE_UPLOAD.ALLOWED_AUDIO_TYPES,
    ];

    if (!allAllowedTypes.includes(file.type as any)) {
        return {
            valid: false,
            error: 'Tipo de archivo no permitido'
        };
    }

    // Check file size per type (WhatsApp limits)
    const maxSize = getMaxSizeForType(file.type);
    if (file.size > maxSize) {
        return {
            valid: false,
            error: `El archivo es demasiado grande. Máximo ${formatFileSize(maxSize)} para este tipo`
        };
    }

    return { valid: true };
}

export function getFileType(file: File): 'image' | 'document' | 'video' | 'audio' {
    if (FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
        return 'image';
    }
    if (FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.type as any)) {
        return 'document';
    }
    if (FILE_UPLOAD.ALLOWED_VIDEO_TYPES.includes(file.type as any)) {
        return 'video';
    }
    if (FILE_UPLOAD.ALLOWED_AUDIO_TYPES.includes(file.type as any)) {
        return 'audio';
    }
    return 'document'; // fallback
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
}

export function getDocumentIcon(filename: string): string {
    const ext = getFileExtension(filename).toLowerCase();
    
    switch (ext) {
        case 'pdf':
            return '📄';
        case 'doc':
        case 'docx':
            return '📝';
        case 'xls':
        case 'xlsx':
            return '📊';
        case 'ppt':
        case 'pptx':
            return '📈';
        case 'txt':
            return '📃';
        case 'csv':
            return '📋';
        default:
            return '📄';
    }
}

export function createFileUrl(filename: string, mimeType: string): string {
    // Create a blob URL for preview purposes
    const blob = new Blob([], { type: mimeType });
    return URL.createObjectURL(blob);
}

export function isImageFile(file: File): boolean {
    return FILE_UPLOAD.ALLOWED_IMAGE_TYPES.includes(file.type as any);
}

export function isVideoFile(file: File): boolean {
    return FILE_UPLOAD.ALLOWED_VIDEO_TYPES.includes(file.type as any);
}

export function isAudioFile(file: File): boolean {
    return FILE_UPLOAD.ALLOWED_AUDIO_TYPES.includes(file.type as any);
}

export function isDocumentFile(file: File): boolean {
    return FILE_UPLOAD.ALLOWED_DOCUMENT_TYPES.includes(file.type as any);
}
