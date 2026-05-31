import { useState, useEffect } from 'react';
import { PYTHON_API } from '../constants/config';

interface BlobUrlState {
    blobUrl: string | null;
    loading: boolean;
    error: boolean;
}

function isProxyMediaUrl(url: string): boolean {
    return url.includes('/api/v1/media/');
}

export function useMediaBlobUrl(url: string): BlobUrlState {
    const [state, setState] = useState<BlobUrlState>(() => ({
        blobUrl: isProxyMediaUrl(url) ? null : (url || null),
        loading: !!url && isProxyMediaUrl(url),
        error: false,
    }));

    useEffect(() => {
        if (!url) {
            setState({ blobUrl: null, loading: false, error: false });
            return;
        }

        if (!isProxyMediaUrl(url)) {
            setState({ blobUrl: url, loading: false, error: false });
            return;
        }

        let createdBlobUrl: string | null = null;
        let cancelled = false;
        setState({ blobUrl: null, loading: true, error: false });

        const headers: Record<string, string> = {
            'X-API-Key': PYTHON_API.API_KEY,
        };
        if (url.includes('ngrok-free.dev')) {
            headers['ngrok-skip-browser-warning'] = 'true';
        }

        fetch(url, { headers })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                if (cancelled) return;
                createdBlobUrl = URL.createObjectURL(blob);
                setState({ blobUrl: createdBlobUrl, loading: false, error: false });
            })
            .catch(() => {
                if (!cancelled) setState({ blobUrl: null, loading: false, error: true });
            });

        return () => {
            cancelled = true;
            if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
        };
    }, [url]);

    return state;
}
