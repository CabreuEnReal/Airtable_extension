// ─── Date / Time Formatters ─────────────────────────────────────────────────
export function formatTime(timestamp: string): string {
    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(new Date(timestamp));
}

export function formatDate(timestamp: string): string {
    const d = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const fmt = (date: Date) => date.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    if (fmt(d) === fmt(today)) return 'Hoy';
    if (fmt(d) === fmt(yesterday)) return 'Ayer';
    return fmt(d);
}

export function formatRelativeTime(timestamp: string): string {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffHr < 24) return `hace ${diffHr}h`;
    if (diffDay < 7) return `hace ${diffDay}d`;
    return d.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short'
    });
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
