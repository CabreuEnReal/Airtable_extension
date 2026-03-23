import { useEffect } from 'react';
import type { Notification } from '../../types/models';

interface ToastProps {
    notification: Notification | null;
    onDismiss: () => void;
    duration?: number;
}

const TYPE_CLASSES = {
    success: 'bg-primary text-white',
    error: 'bg-red text-white',
    info: 'bg-gray-800 text-white',
};

export function Toast({ notification, onDismiss, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (!notification) return;
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [notification, onDismiss, duration]);

    if (!notification) return null;

    return (
        <div
            className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg shadow-md text-body z-50
                animate-slide-up ${TYPE_CLASSES[notification.type] ?? TYPE_CLASSES.info}`}
        >
            {notification.text}
        </div>
    );
}
