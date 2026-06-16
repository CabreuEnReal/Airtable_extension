import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Contact, ActiveChannel, Interaction } from '../../types/models';
import { Avatar } from '../common/Avatar';
import { EmptyState } from '../common/EmptyState';
import { InteractionList } from './InteractionList';

interface OpportunityDetailViewAProps {
    /** Opportunities of the selected company, owner-scoped. */
    companyOpportunities: Contact[];
    selectedOpportunity: Contact;
    onSelectOpportunity: (id: string) => void;
    /** Contacts already resolved for THIS opportunity (strict per-deal filter). */
    linkedContacts: Contact[];
    activeChannel: ActiveChannel;
    onChannelChange: (c: ActiveChannel) => void;
    /** Expand GALEA summary to modal (wired in a later module). */
    onExpandSummary?: () => void;
    /** Open contact detail modal (Module 3). */
    onViewContact?: (id: string) => void;
    /** Navigate to the 3-column conversation view (Module 2-B). */
    onOpenConversation?: (id: string) => void;
    /** Open the new-email composer modal (Module 4). */
    onNewEmail?: () => void;
    /** Add interaction (Module 10). */
    onAddInteraction?: () => void;
    /** Interaction history for this opportunity (Notas + Historial dataset). */
    interactions?: Interaction[];
}

// ─── Collapsible section primitive (Tailwind max-height transition) ──────────

interface CollapsibleSectionProps {
    label: ReactNode;
    title?: string;
    defaultOpen?: boolean;
    headerRight?: ReactNode;
    children: ReactNode;
}

function CollapsibleSection({ label, title, defaultOpen = true, headerRight, children }: CollapsibleSectionProps) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-3">
            <div
                className="flex items-center justify-between px-4 py-2.5 border-b border-gray-75 cursor-pointer select-none"
                title={title}
                onClick={() => setOpen((o) => !o)}
            >
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    {label}
                </span>
                <div className="flex items-center gap-1.5">
                    {headerRight}
                    <svg
                        className={`text-gray-300 transition-transform duration-300 ${open ? '' : '-rotate-90'}`}
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </div>
            </div>
            <div
                className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                {children}
            </div>
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCltv(cltv?: number): string {
    if (typeof cltv !== 'number') return '—';
    return `$${cltv.toLocaleString('es-MX')} MXN`;
}

function DataCell({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="bg-white px-3.5 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-300 mb-1">{label}</div>
            <div className="text-body text-gray-700 font-medium">{children}</div>
        </div>
    );
}

function SectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
    return (
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-surface-light border-y border-gray-75">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">{title}</span>
            {action}
        </div>
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function OpportunityDetailViewA({
    companyOpportunities,
    selectedOpportunity: opp,
    onSelectOpportunity,
    linkedContacts,
    activeChannel,
    onChannelChange,
    onExpandSummary,
    onViewContact,
    onOpenConversation,
    onNewEmail,
    onAddInteraction,
    interactions = [],
}: OpportunityDetailViewAProps) {
    const summaryText = opp.companyDescription || opp.linkedInSummary || '';

    const handleSelect = useCallback((id: string) => () => onSelectOpportunity(id), [onSelectOpportunity]);

    const priorityHigh = (opp.priority ?? '').toLowerCase().includes('alta') || (opp.priority ?? '').toLowerCase().includes('high');

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* ── LEFT: opportunity list (fixed 380px) ── */}
            <div className="w-[380px] flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-white">
                <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 bg-surface-light border-b border-gray-100 flex-shrink-0">
                    Oportunidades — {companyOpportunities.length}
                </div>
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
                    {companyOpportunities.map((o) => {
                        const selected = o.id === opp.id;
                        return (
                            <button
                                key={o.id}
                                onClick={handleSelect(o.id)}
                                className={`text-left flex gap-3 items-start rounded-xl p-3.5 border transition-colors ${
                                    selected
                                        ? 'border-primary bg-green-light3'
                                        : 'border-gray-100 bg-white hover:border-green-light1 hover:shadow-sm'
                                }`}
                            >
                                <Avatar name={o.company || o.displayName} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-body font-semibold text-gray-800 truncate">{o.displayName}</div>
                                    <div className="text-xs text-gray-400 mt-1 truncate">{o.stage || '—'}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── RIGHT: opportunity detail (fluid) ── */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-surface-light">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <Avatar name={opp.company || opp.displayName} size="md" />
                    <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold text-gray-800 truncate">{opp.displayName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{opp.company} · {opp.stage || 'Sin etapa'}</div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                        {priorityHigh && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-red-light2 text-red">
                                {opp.priority}
                            </span>
                        )}
                        {opp.keyAccount && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-light2 text-purple-dark1">
                                Key Account
                            </span>
                        )}
                    </div>
                </div>

                {/* GALEA summary */}
                <CollapsibleSection
                    label={
                        <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                                <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74L12 2z" />
                            </svg>
                            Resumen de GALEA
                        </>
                    }
                    headerRight={
                        <div
                            title="Expandir resumen"
                            onClick={(e) => { e.stopPropagation(); onExpandSummary?.(); }}
                            className="w-5 h-5 flex items-center justify-center rounded border-[1.5px] border-gray-100 text-gray-400 hover:border-primary hover:text-primary hover:bg-green-light3 cursor-pointer"
                        >
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="15 3 21 3 21 9" />
                                <polyline points="9 21 3 21 3 15" />
                                <line x1="21" y1="3" x2="14" y2="10" />
                                <line x1="3" y1="21" x2="10" y2="14" />
                            </svg>
                        </div>
                    }
                >
                    <div className="px-4 py-3.5 text-body leading-relaxed text-gray-700">
                        {summaryText || <span className="text-gray-400">Sin resumen generado aún.</span>}
                    </div>
                </CollapsibleSection>

                {/* Opportunity data */}
                <CollapsibleSection label="Datos de la oportunidad" title="Contexto del lead">
                    <div className="grid grid-cols-2 gap-px bg-gray-75">
                        <DataCell label="Industria">{opp.industry || '—'}</DataCell>
                        <DataCell label="Stage">{opp.stage || '—'}</DataCell>
                        <DataCell label="Prioridad">
                            {opp.priority ? (
                                <span className="flex items-center gap-1.5">
                                    {priorityHigh && (
                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="#dc2626"><circle cx="4" cy="4" r="4" /></svg>
                                    )}
                                    {opp.priority}
                                </span>
                            ) : '—'}
                        </DataCell>
                        <DataCell label="Owner">{opp.ownerName || '—'}</DataCell>
                        <DataCell label="MW">{opp.totalInstallPower || '—'}</DataCell>
                        <DataCell label="CLTV">{formatCltv(opp.cltv)}</DataCell>
                        <DataCell label="Progreso">{opp.internalProgress || '—'}</DataCell>
                        <DataCell label="Productos">{opp.products?.length ? opp.products.join(', ') : '—'}</DataCell>
                        <DataCell label="Esquema">{opp.financeScheme?.length ? opp.financeScheme.join(', ') : '—'}</DataCell>
                        <DataCell label="Sharepoint">
                            {opp.sharepointUrl ? (
                                <a href={opp.sharepointUrl} target="_blank" rel="noreferrer" className="text-primary cursor-pointer">Ver carpeta</a>
                            ) : '—'}
                        </DataCell>
                    </div>
                </CollapsibleSection>

                {/* Channel pills */}
                <div className="flex gap-1.5 py-2.5">
                    {(['whatsapp', 'correo'] as ActiveChannel[]).map((ch) => {
                        const active = activeChannel === ch;
                        return (
                            <button
                                key={ch}
                                onClick={() => onChannelChange(ch)}
                                className={`px-3.5 py-1.5 rounded-md text-sm font-semibold border-[1.5px] transition-colors ${
                                    active
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-500 border-gray-100 hover:border-primary hover:text-primary'
                                }`}
                            >
                                {ch === 'whatsapp' ? 'WhatsApp' : 'Correo'}
                            </button>
                        );
                    })}
                </div>

                {/* Channel-dependent list */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-3">
                    {activeChannel === 'whatsapp' ? (
                        <>
                            <SectionTitle
                                title="Contactos"
                                action={<span className="text-[11px] font-semibold text-primary cursor-pointer hover:opacity-70">+ Agregar</span>}
                            />
                            <div className="max-h-[200px] overflow-y-auto">
                                {linkedContacts.length === 0 ? (
                                    <EmptyState icon="👤" title="Sin contactos vinculados" />
                                ) : (
                                    linkedContacts.map((c) => (
                                        <div
                                            key={c.id}
                                            onClick={() => onOpenConversation?.(c.id)}
                                            title="Abrir conversación"
                                            className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-75 last:border-b-0 hover:bg-green-light3/40 cursor-pointer"
                                        >
                                            <Avatar name={c.displayName} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-body font-semibold text-gray-800 truncate">{c.displayName}</div>
                                                <div className="text-xs text-gray-400 truncate">{c.jobTitle || c.email || '—'}</div>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onViewContact?.(c.id); }}
                                                title="Ver contacto"
                                                className="flex-shrink-0 px-2.5 py-1 rounded-md border border-gray-100 bg-white text-xs font-semibold text-primary hover:bg-green-light3 hover:border-primary"
                                            >
                                                Ver
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <SectionTitle
                                title="Correos"
                                action={
                                    <button
                                        onClick={onNewEmail}
                                        className="px-2.5 py-1 rounded-md border-[1.5px] border-primary text-primary text-[11px] font-semibold hover:bg-green-light3"
                                    >
                                        + Nuevo
                                    </button>
                                }
                            />
                            <div className="max-h-[220px] overflow-y-auto">
                                <EmptyState icon="✉️" title="Sin correos" description="Los correos se cargarán al integrar el módulo de correo." />
                            </div>
                        </>
                    )}
                </div>

                {/* Interaction history */}
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mb-3">
                    <SectionTitle
                        title="Historial de interacciones"
                        action={
                            <button
                                onClick={onAddInteraction}
                                className="px-2.5 py-1 rounded-md bg-primary text-white text-[11px] font-semibold hover:bg-primary-dark"
                            >
                                + Agregar
                            </button>
                        }
                    />
                    <InteractionList
                        items={interactions}
                        maxHeightClass="max-h-[250px]"
                        emptyIcon="🕓"
                        emptyTitle="Sin interacciones"
                        emptyDescription="Aún no hay interacciones registradas."
                    />
                </div>
            </div>
        </div>
    );
}
