import { useState, useCallback } from 'react';
import { uploadFile } from '../services/pythonApi';
import type { ApiUploadResponse } from '../types/api';

interface UseFileUploadReturn {
    upload: (file: File) => Promise<ApiUploadResponse>;
    isUploading: boolean;
    error: string | null;
    reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setIsUploading(false);
        setError(null);
    }, []);

    const upload = useCallback(async (file: File): Promise<ApiUploadResponse> => {
        setIsUploading(true);
        setError(null);
        try {
            const result = await uploadFile(file);
            setIsUploading(false);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMessage);
            setIsUploading(false);
            throw err;
        }
    }, []);

    return { upload, isUploading, error, reset };
}
