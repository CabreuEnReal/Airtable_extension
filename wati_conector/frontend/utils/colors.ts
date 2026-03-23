// ─── Avatar Colors ──────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
    '#048A0E', '#1976D2', '#F57C00', '#7B1FA2',
    '#C62828', '#00838F', '#4527A0', '#AD1457',
    '#388E3C', '#EF6C00', '#5E35B1', '#0277BD',
];

export function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

// ─── Badge / Tag Colors ─────────────────────────────────────────────────────

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
    'PLAYBOOK': { bg: '#FFECE3', text: '#AA2D00' },
    'FINALIZADO': { bg: '#F2F4F8', text: '#41454D' },
    'CHANNEL PARTNERS': { bg: '#E6FCE8', text: '#006400' },
    'PROSUM': { bg: '#F1F5FF', text: '#0D52AC' },
};

const DEFAULT_TAG_COLOR = { bg: '#F2F4F8', text: '#61666F' };

export function getTagColor(tag: string): { bg: string; text: string } {
    const upper = tag.toUpperCase();
    return TAG_COLORS[upper] ?? DEFAULT_TAG_COLOR;
}

// ─── Stage Badge Colors ─────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
    'PLAYBOOK': { bg: '#FFECE3', text: '#AA2D00' },
    'DISCOVERY': { bg: '#F1F5FF', text: '#0D52AC' },
    'PROPOSAL': { bg: '#FCF3FF', text: '#6231AE' },
    'NEGOTIATION': { bg: '#FFF2FA', text: '#B10F41' },
    'CLOSED WON': { bg: '#E6FCE8', text: '#006400' },
    'CLOSED LOST': { bg: '#F2F4F8', text: '#61666F' },
};

const DEFAULT_STAGE_COLOR = { bg: '#F2F4F8', text: '#61666F' };

export function getStageColor(stage: string): { bg: string; text: string } {
    const upper = stage.toUpperCase();
    return STAGE_COLORS[upper] ?? DEFAULT_STAGE_COLOR;
}
