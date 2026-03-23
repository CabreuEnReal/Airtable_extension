// ─── General Helpers ────────────────────────────────────────────────────────

export function cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s+\-()]/g, '');
}

export function generateTempId(): string {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function deduplicate<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    return items.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    const result: Record<string, T[]> = {};
    for (const item of items) {
        const key = keyFn(item);
        if (!result[key]) result[key] = [];
        result[key].push(item);
    }
    return result;
}

export function sortByDate<T>(items: T[], dateFn: (item: T) => string, asc = true): T[] {
    return [...items].sort((a, b) => {
        const da = safeParse(dateFn(a));
        const db = safeParse(dateFn(b));
        return asc ? da - db : db - da;
    });
}

function safeParse(dateStr: string): number {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    return isNaN(t) ? 0 : t;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    }) as T;
}
