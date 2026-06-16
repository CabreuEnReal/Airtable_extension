import { useState, useMemo } from 'react';
import type { Interaction, ActiveChannel } from '../../types/models';
import { EmptyState } from '../common/EmptyState';

interface InteractionListProps {
    items: Interaction[];
    maxHeightClass?: string;
    emptyIcon?: string;
    emptyTitle?: string;
    emptyDescription?: string;
}

function ChannelBadge({ channel }: { channel?: ActiveChannel }) {
    if (!channel) return null;
    const cfg =
        channel === 'whatsapp'
            ? { label: 'WhatsApp', cls: 'bg-green-light2 text-green-dark1' }
            : { label: 'Correo', cls: 'bg-orange-light2 text-orange' };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function InteractionCard({ it }: { it: Interaction }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={`px-3.5 py-2.5 border-b border-gray-75 last:border-b-0 ${it.isOptimistic ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-2 mb-1">
                <ChannelBadge channel={it.channel} />
                <span className="text-[11px] text-gray-400">{formatDate(it.dateExecuted)}</span>
                <button
                    onClick={() => setOpen((o) => !o)}
                    title={open ? 'Contraer' : 'Expandir'}
                    className="ml-auto w-5 h-5 flex items-center justify-center rounded text-gray-300 hover:text-primary hover:bg-green-light3"
                >
                    <svg
                        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
            </div>
            <p className={`text-body text-gray-700 leading-relaxed ${open ? '' : 'line-clamp-2'}`}>
                {it.notes || it.name || '—'}
            </p>
        </div>
    );
}

export function InteractionList({
    items,
    maxHeightClass = 'max-h-[250px]',
    emptyIcon = '🕓',
    emptyTitle = 'Sin interacciones',
    emptyDescription,
}: InteractionListProps) {
    // Newest first. Optimistic entries (no real date yet) bubble to the top.
    const sorted = useMemo(() => {
        return [...items].sort((a, b) => {
            if (a.isOptimistic && !b.isOptimistic) return -1;
            if (!a.isOptimistic && b.isOptimistic) return 1;
            return (b.dateExecuted || '').localeCompare(a.dateExecuted || '');
        });
    }, [items]);

    if (sorted.length === 0) {
        return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <div className={`${maxHeightClass} overflow-y-auto`}>
            {sorted.map((it) => (
                <InteractionCard key={it.id} it={it} />
            ))}
        </div>
    );
}
