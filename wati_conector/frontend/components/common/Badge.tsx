import { getStageColor, getTagColor } from '../../utils/colors';

interface BadgeProps {
    text: string;
    variant?: 'stage' | 'tag' | 'status' | 'count';
    color?: { bg: string; text: string };
}

export function Badge({ text, variant = 'tag', color }: BadgeProps) {
    if (!text) return null;

    const colors = color
        ? color
        : variant === 'stage'
        ? getStageColor(text)
        : variant === 'tag'
        ? getTagColor(text)
        : variant === 'count'
        ? { bg: '#048A0E', text: '#FFFFFF' }
        : { bg: '#F2F4F8', text: '#61666F' };

    return (
        <span
            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: colors.bg, color: colors.text }}
        >
            {text}
        </span>
    );
}

interface CountBadgeProps {
    count: number;
    max?: number;
}

export function CountBadge({ count, max = 99 }: CountBadgeProps) {
    if (count <= 0) return null;
    return (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-xs font-semibold">
            {count > max ? `${max}+` : count}
        </span>
    );
}
