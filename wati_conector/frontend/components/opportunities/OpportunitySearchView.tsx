import { useMemo, useState, useCallback } from 'react';
import type { Contact } from '../../types/models';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';

type FilterTab = 'todos' | 'activos' | 'propuesta' | 'cerrados';

interface OpportunitySearchViewProps {
    /** Opportunities already scoped to the current user (Owner filter applied upstream). */
    opportunities: Contact[];
    onSelectOpportunity: (id: string) => void;
    /** False while we still resolve the user's People identity. */
    identityResolved: boolean;
    /** True when the logged user has no matching People row (Blocker B / A lockout). */
    identityMissing: boolean;
    ownerName?: string;
}

const TABS: { id: FilterTab; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'activos', label: 'Activos' },
    { id: 'propuesta', label: 'Propuesta' },
    { id: 'cerrados', label: 'Cerrados' },
];

function stageMatchesTab(stage: string, tab: FilterTab): boolean {
    const s = stage.toLowerCase();
    const closed = s.includes('cerrad') || s.includes('closed') || s.includes('won') || s.includes('lost');
    switch (tab) {
        case 'todos': return true;
        case 'propuesta': return s.includes('propuesta') || s.includes('proposal');
        case 'cerrados': return closed;
        case 'activos': return !closed;
    }
}

function priorityTag(priority?: string): { label: string; cls: string } | null {
    if (!priority) return null;
    const p = priority.toLowerCase();
    if (p.includes('alta') || p.includes('high')) return { label: priority, cls: 'bg-red-light2 text-red' };
    if (p.includes('media') || p.includes('med')) return { label: priority, cls: 'bg-orange-light2 text-orange' };
    return { label: priority, cls: 'bg-gray-100 text-gray-500' };
}

export function OpportunitySearchView({
    opportunities,
    onSelectOpportunity,
    identityResolved,
    identityMissing,
    ownerName,
}: OpportunitySearchViewProps) {
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState<FilterTab>('todos');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return opportunities.filter((o) => {
            if (!stageMatchesTab(o.stage ?? '', tab)) return false;
            if (!q) return true;
            return (
                o.displayName.toLowerCase().includes(q) ||
                o.company.toLowerCase().includes(q)
            );
        });
    }, [opportunities, query, tab]);

    const handleSelect = useCallback(
        (id: string) => () => onSelectOpportunity(id),
        [onSelectOpportunity],
    );

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-surface-light">
            {/* ── Header: full-width search + filter tabs ── */}
            <div className="flex flex-col flex-shrink-0 bg-white border-b border-gray-100 px-5 pt-3 pb-3.5">
                <div className="relative w-full">
                    <svg
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        className="w-full pl-9 pr-3 py-2 border-[1.5px] border-gray-100 rounded-lg text-body bg-surface-light outline-none focus:border-primary focus:bg-white"
                        placeholder="Buscar empresa..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-0.5 pt-2.5 mt-2.5 border-t border-gray-75">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`px-3.5 py-1.5 text-sm rounded-lg transition-colors ${
                                tab === t.id
                                    ? 'bg-green-light3 text-primary font-semibold'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-700'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                    <div className="ml-auto flex gap-2">
                        <button title="Filtrar por etapa" className="px-2.5 py-1 border-[1.5px] border-gray-100 rounded-md text-xs bg-white text-gray-500 hover:border-primary hover:text-primary">
                            Stage
                        </button>
                        <button title="Filtrar por fecha" className="px-2.5 py-1 border-[1.5px] border-gray-100 rounded-md text-xs bg-white text-gray-500 hover:border-primary hover:text-primary">
                            Fecha
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Panel title ── */}
            <div className="px-[18px] py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 bg-surface-light border-b border-gray-100 flex-shrink-0">
                Oportunidades — {filtered.length}
            </div>

            {/* ── List ── */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                {!identityResolved ? (
                    <EmptyState icon="⏳" title="Cargando tu pipeline..." />
                ) : identityMissing ? (
                    <EmptyState
                        icon="🔒"
                        title="Sin acceso al pipeline"
                        description="No encontramos tu usuario en la tabla People. Contacta al administrador para vincular tu correo."
                    />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        icon="📭"
                        title="Sin oportunidades"
                        description={
                            ownerName
                                ? `No hay oportunidades asignadas a ${ownerName} con este filtro.`
                                : 'No hay oportunidades con este filtro.'
                        }
                    />
                ) : (
                    filtered.map((opp) => {
                        const pTag = priorityTag(opp.priority);
                        return (
                            <button
                                key={opp.id}
                                onClick={handleSelect(opp.id)}
                                className="text-left bg-white border border-gray-100 rounded-xl p-3.5 flex gap-3 items-start cursor-pointer transition-shadow hover:shadow-md hover:border-green-light1"
                            >
                                <Avatar name={opp.company || opp.displayName} size="md" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-body font-semibold text-gray-800 truncate">
                                        {opp.displayName}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1 truncate">
                                        {opp.company || '—'}
                                        {opp.stage ? ` · ${opp.stage}` : ''}
                                    </div>
                                    <div className="flex gap-1.5 flex-wrap mt-2">
                                        {pTag && (
                                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${pTag.cls}`}>
                                                {pTag.label}
                                            </span>
                                        )}
                                        {opp.keyAccount && (
                                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-light2 text-purple-dark1">
                                                Key Account
                                            </span>
                                        )}
                                        {opp.isClient && (
                                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-light2 text-green-dark1">
                                                Cliente
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
