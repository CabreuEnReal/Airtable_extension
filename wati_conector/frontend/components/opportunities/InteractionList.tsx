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

function parseAiNoteField(aiNotes: string, field: string): string | null {
    const m = aiNotes.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : null;
}

function ResultadoBadge({ value }: { value: string }) {
    const cfg: Record<string, string> = {
        'Avanza': 'bg-green-100 text-green-700',
        'En Espera': 'bg-yellow-100 text-yellow-700',
        'Objeción': 'bg-orange-100 text-orange-700',
        'Sin respuesta': 'bg-gray-100 text-gray-500',
    };
    const cls = cfg[value] ?? 'bg-gray-100 text-gray-500';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
            {value}
        </span>
    );
}

function DirectionBadge({ value }: { value: string }) {
    const cls =
        value === 'Inbound'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-emerald-100 text-emerald-700';
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>
            {value}
        </span>
    );
}

function formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function InteractionDetailModal({ it, onClose }: { it: Interaction; onClose: () => void }) {
    const resultado = it.aiNotes ? parseAiNoteField(it.aiNotes, 'Resultado') : null;
    const direction = it.aiNotes ? parseAiNoteField(it.aiNotes, 'Direction') : null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <ChannelBadge channel={it.channel} />
                        {it.type.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                                {t}
                            </span>
                        ))}
                        {resultado && <ResultadoBadge value={resultado} />}
                        {direction && <DirectionBadge value={direction} />}
                        <span className="text-xs text-gray-400">{formatDate(it.dateExecuted)}</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 text-xl leading-none ml-2"
                    >
                        ×
                    </button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {it.aiNotes && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                    <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74L12 2z" />
                                </svg>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Análisis de Galea</span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{it.aiNotes}</p>
                        </div>
                    )}
                    {it.notes && (
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Nota</div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{it.notes}</p>
                        </div>
                    )}
                    {!it.aiNotes && !it.notes && (
                        <p className="text-sm text-gray-400 text-center py-6">Sin contenido disponible.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function InteractionCard({ it, onOpen }: { it: Interaction; onOpen: () => void }) {
    const preview = it.aiNotes
        ? it.aiNotes.split('\n').filter((l) => l.trim()).slice(1).join(' ') || it.aiNotes
        : it.notes || it.name || '—';
    const resultado = it.aiNotes ? parseAiNoteField(it.aiNotes, 'Resultado') : null;

    return (
        <button
            onClick={onOpen}
            className={`w-full text-left px-3.5 py-2.5 border-b border-gray-75 last:border-b-0 hover:bg-green-light3/40 transition-colors ${it.isOptimistic ? 'opacity-60' : ''}`}
        >
            <div className="flex items-center gap-2 mb-1">
                <ChannelBadge channel={it.channel} />
                {it.aiNotes && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-500">
                        Galea
                    </span>
                )}
                {resultado && <ResultadoBadge value={resultado} />}
                <span className="text-[11px] text-gray-400">{formatDate(it.dateExecuted)}</span>
                <svg className="ml-auto opacity-30" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </div>
            <p className="text-body text-gray-700 leading-relaxed line-clamp-2">{preview}</p>
        </button>
    );
}

export function InteractionList({
    items,
    maxHeightClass = 'max-h-[250px]',
    emptyIcon = '🕓',
    emptyTitle = 'Sin interacciones',
    emptyDescription,
}: InteractionListProps) {
    const [selected, setSelected] = useState<Interaction | null>(null);

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
        <>
            <div className={`${maxHeightClass} overflow-y-auto`}>
                {sorted.map((it) => (
                    <InteractionCard key={it.id} it={it} onOpen={() => setSelected(it)} />
                ))}
            </div>
            {selected && <InteractionDetailModal it={selected} onClose={() => setSelected(null)} />}
        </>
    );
}
