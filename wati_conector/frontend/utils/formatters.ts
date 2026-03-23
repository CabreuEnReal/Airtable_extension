// ─── Date / Time Formatters ─────────────────────────────────────────────────

export function formatTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === today.toDateString()) return 'Hoy';
        if (d.toDateString() === yesterday.toDateString()) return 'Ayer';
        return d.toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

export function formatRelativeTime(dateStr: string): string {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        const diffHr = Math.floor(diffMs / 3_600_000);
        const diffDay = Math.floor(diffMs / 86_400_000);

        if (diffMin < 1) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffHr < 24) return `Hace ${diffHr} hora${diffHr > 1 ? 's' : ''}`;
        if (diffDay === 1) return 'Ayer';
        if (diffDay < 7) return `Hace ${diffDay} días`;
        return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    } catch {
        return '';
    }
}

export function safeISODate(val: string | undefined): string {
    if (!val) return new Date().toISOString();
    try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return new Date().toISOString();
        return d.toISOString();
    } catch {
        return new Date().toISOString();
    }
}

// ─── Text Formatters ────────────────────────────────────────────────────────

export function truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 1) + '…';
}

export function formatPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/[\s\-()]/g, '');
    if (clean.startsWith('+52') && clean.length >= 12) {
        const country = clean.substring(0, 3);
        const area = clean.substring(3, 5);
        const first = clean.substring(5, 9);
        const last = clean.substring(9);
        return `${country} ${area} ${first} ${last}`;
    }
    return phone;
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
    return `${size} ${units[i]}`;
}
