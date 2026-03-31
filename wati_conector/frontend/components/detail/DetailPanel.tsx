import { useMemo } from 'react';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { IconButton } from '../common/IconButton';
import type { Contact, Message } from '../../types/models';
import { formatPhone } from '../../utils/formatters';

interface DetailPanelProps {
    contact: Contact | null;
    contacts?: Contact[];
    messages: Message[];
    onOpenNotes?: () => void;
    onOpenFiles?: () => void;
    onOpenDetail?: () => void;
    onClose?: () => void;
    onSelectContact?: (id: string) => void;
}

// ─── Reusable sub-components ────────────────────────────────────────────────

function InfoRow({ label, value, isLink, href }: { label: string; value: string; isLink?: boolean; href?: string }) {
    if (!value) return null;
    return (
        <div className="flex justify-between py-1.5">
            <span className="text-label text-gray-400">{label}</span>
            {isLink ? (
                <a href={href || `mailto:${value}`} target={href ? '_blank' : undefined} rel="noreferrer"
                   className="text-body text-blue font-medium truncate ml-2">{value}</a>
            ) : (
                <span className="text-body text-gray-800 font-medium truncate ml-2">{value}</span>
            )}
        </div>
    );
}

function TagList({ label, items }: { label: string; items?: string[] }) {
    if (!items || items.length === 0) return null;
    return (
        <div className="py-1.5">
            <span className="text-label text-gray-400 block mb-1">{label}</span>
            <div className="flex flex-wrap gap-1">
                {items.map((item, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{item}</span>
                ))}
            </div>
        </div>
    );
}

function FlagRow({ label, value }: { label: string; value?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex justify-between py-1.5">
            <span className="text-label text-gray-400">{label}</span>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Sí</span>
        </div>
    );
}

function SectionHeader({ title }: { title: string }) {
    return <h4 className="text-table-header text-gray-500 mb-2">{title}</h4>;
}

// ─── Linked Contact Card (for Opportunities) ───────────────────────────────

function LinkedContactCard({
    contact,
    role,
    onStartWhatsApp,
}: {
    contact: Contact;
    role: string;
    onStartWhatsApp?: (id: string) => void;
}) {
    const roleColors: Record<string, string> = {
        'Main Contact': 'bg-blue-100 text-blue-700',
        'Power Sponsor': 'bg-purple-100 text-purple-700',
        'Sponsor': 'bg-orange-100 text-orange-700',
        'Participante': 'bg-gray-100 text-gray-600',
    };

    return (
        <div className="border border-gray-200 rounded-lg p-3 mb-2">
            <div className="flex items-center gap-2 mb-1">
                <Avatar name={contact.displayName} size="sm" />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{contact.displayName}</div>
                    {contact.jobTitle && <div className="text-xs text-gray-400 truncate">{contact.jobTitle}</div>}
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${roleColors[role] || roleColors['Participante']}`}>
                    {role}
                </span>
            </div>
            {contact.phone && (
                <div className="text-xs text-gray-500 mt-1">📱 {formatPhone(contact.phone)}</div>
            )}
            {contact.email && (
                <div className="text-xs text-gray-500">✉️ {contact.email}</div>
            )}
            {contact.decisionLevel && (
                <div className="text-xs text-gray-400 mt-0.5">Nivel decisión: {'⭐'.repeat(contact.decisionLevel)}</div>
            )}
            {/* Start WhatsApp CTA */}
            {contact.phone && onStartWhatsApp && (
                <button
                    onClick={() => onStartWhatsApp(contact.id)}
                    className="mt-2 w-full py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    📱 Abrir conversación WhatsApp
                </button>
            )}
            {!contact.phone && (
                <div className="mt-2 py-1 text-xs text-center text-orange-500 bg-orange-50 rounded">
                    ⚠ Sin teléfono
                </div>
            )}
        </div>
    );
}

// ─── Main DetailPanel ───────────────────────────────────────────────────────

export function DetailPanel({
    contact,
    contacts = [],
    messages,
    onOpenNotes,
    onOpenFiles,
    onOpenDetail,
    onClose,
    onSelectContact,
}: DetailPanelProps) {
    if (!contact) return null;

    // ─── Resolve linked contacts for Opportunities ──────────────
    const linkedContacts = useMemo(() => {
        if (contact.contactType !== 'opportunity' || contacts.length === 0) return [];

        const mainIds = new Set(contact.linkedContactIds || []);
        const sponsorIds = new Set(contact.sponsorIds || []);
        const powerSponsorIds = new Set(contact.powerSponsorIds || []);
        const allIds = new Set([...mainIds, ...sponsorIds, ...powerSponsorIds]);
        if (allIds.size === 0) return [];

        // Resolve to full Contact objects
        const resolved: { contact: Contact; role: string; priority: number }[] = [];
        for (const c of contacts) {
            if (!allIds.has(c.id)) continue;
            // Determine highest-priority role
            let role = 'Participante';
            let priority = 4;
            if (c.isMainContact) { role = 'Main Contact'; priority = 1; }
            if (powerSponsorIds.has(c.id)) { role = 'Power Sponsor'; priority = 2; }
            else if (sponsorIds.has(c.id)) { role = 'Sponsor'; priority = 3; }
            // Main Contact overrides if flagged
            if (c.isMainContact && priority > 1) { role = 'Main Contact'; priority = 1; }
            resolved.push({ contact: c, role, priority });
        }

        return resolved.sort((a, b) => a.priority - b.priority);
    }, [contact, contacts]);

    const isLead = contact.contactType === 'lead';
    const isContact = contact.contactType === 'contact';
    const isOpportunity = contact.contactType === 'opportunity';

    const typeBadge = isLead ? 'Lead' : isContact ? 'Contacto' : 'Oportunidad';
    const typeBadgeColor = isLead ? 'bg-blue-100 text-blue-700' : isContact ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';

    return (
        <div className="w-detail flex flex-col border-l border-gray-100 bg-white overflow-y-auto">
            {/* Close button */}
            {onClose && (
                <div className="flex justify-end px-3 pt-3">
                    <IconButton icon="✕" label="Cerrar" size="sm" onClick={onClose} />
                </div>
            )}

            {/* Avatar & Name */}
            <div className="flex flex-col items-center px-4 pt-2 pb-3">
                <Avatar name={contact.displayName} size="xl" />
                <h3 className="text-card-heading font-semibold text-gray-800 mt-3 text-center">{contact.displayName}</h3>
                {contact.company && (
                    <span className="text-label text-gray-500 mt-0.5">{contact.company}</span>
                )}
                <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadgeColor}`}>{typeBadge}</span>
                    {contact.keyAccount && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">⭐ Key Account</span>
                    )}
                    {contact.isClient && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Cliente</span>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {contact.phone && (
                <div className="flex justify-center gap-3 px-4 pb-3">
                    <IconButton icon="📱" label="WhatsApp" variant="outline" />
                    <IconButton icon="✉️" label="Email" variant="outline" />
                </div>
            )}

            {/* Contact Info */}
            <div className="px-4 py-3 border-t border-gray-100">
                <SectionHeader title="INFORMACIÓN DE CONTACTO" />
                <InfoRow label="Teléfono" value={formatPhone(contact.phone)} />
                <InfoRow label="Email" value={contact.email} isLink />
                <InfoRow label="Cargo" value={contact.jobTitle} />
                {contact.industry && <InfoRow label="Industria" value={contact.industry} />}
                {contact.department && <InfoRow label="Departamento" value={contact.department} />}
                {contact.linkedIn && (
                    <InfoRow label="LinkedIn" value="Ver perfil" isLink href={contact.linkedIn} />
                )}
            </div>

            {/* ─── LEAD-SPECIFIC CONTEXT ──────────────────────────── */}
            {isLead && (
                <>
                    <div className="px-4 py-3 border-t border-gray-100">
                        <SectionHeader title="CONTEXTO DEL LEAD" />
                        <div className="flex justify-between py-1.5">
                            <span className="text-label text-gray-400">Stage</span>
                            {contact.stage && <Badge text={contact.stage} variant="stage" />}
                        </div>
                        <InfoRow label="Empresa" value={contact.company} />
                        <InfoRow label="Lead Source" value={contact.leadSource} />
                        <FlagRow label="Became SQL" value={contact.becameSQL} />
                        <FlagRow label="Key Account" value={contact.keyAccount} />
                        <TagList label="Productos de interés" items={contact.products} />
                        {contact.cltvTotal != null && (
                            <InfoRow label="CLTV Total" value={`$${contact.cltvTotal.toLocaleString()}`} />
                        )}
                    </div>
                    {/* Seller Prep */}
                    {(contact.callInsights || contact.linkedInSummary || contact.companyDescription) && (
                        <div className="px-4 py-3 border-t border-gray-100">
                            <SectionHeader title="PREPARACIÓN PARA CONTACTO" />
                            {contact.callInsights && (
                                <div className="py-1.5">
                                    <span className="text-label text-gray-400 block mb-1">Call Insights</span>
                                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 leading-relaxed">{contact.callInsights}</p>
                                </div>
                            )}
                            {contact.linkedInSummary && (
                                <div className="py-1.5">
                                    <span className="text-label text-gray-400 block mb-1">LinkedIn Summary</span>
                                    <p className="text-xs text-gray-600 bg-blue-50 rounded p-2 leading-relaxed">{contact.linkedInSummary}</p>
                                </div>
                            )}
                            {contact.companyDescription && (
                                <div className="py-1.5">
                                    <span className="text-label text-gray-400 block mb-1">Descripción empresa</span>
                                    <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 leading-relaxed">{contact.companyDescription}</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ─── CONTACT-SPECIFIC CONTEXT ───────────────────────── */}
            {isContact && (
                <div className="px-4 py-3 border-t border-gray-100">
                    <SectionHeader title="ROL Y CONTEXTO" />
                    {contact.airtableContactType && (
                        <InfoRow label="Tipo de contacto" value={contact.airtableContactType} />
                    )}
                    {contact.decisionLevel && (
                        <div className="flex justify-between py-1.5">
                            <span className="text-label text-gray-400">Nivel de decisión</span>
                            <span className="text-body text-yellow-600">{'⭐'.repeat(contact.decisionLevel)}</span>
                        </div>
                    )}
                    <FlagRow label="Contacto principal" value={contact.isMainContact} />
                    <FlagRow label="Es cliente" value={contact.isClient} />
                    {contact.partnerType && <InfoRow label="Tipo de partner" value={contact.partnerType} />}
                    {contact.ownerName && <InfoRow label="Account Owner" value={contact.ownerName} />}
                    {/* LinkedIn prep */}
                    {contact.linkedInSummary && (
                        <div className="py-1.5">
                            <span className="text-label text-gray-400 block mb-1">LinkedIn Summary</span>
                            <p className="text-xs text-gray-600 bg-blue-50 rounded p-2 leading-relaxed">{contact.linkedInSummary}</p>
                        </div>
                    )}
                    {contact.companyDescription && (
                        <div className="py-1.5">
                            <span className="text-label text-gray-400 block mb-1">Descripción empresa</span>
                            <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 leading-relaxed">{contact.companyDescription}</p>
                        </div>
                    )}
                </div>
            )}

            {/* ─── OPPORTUNITY-SPECIFIC CONTEXT ───────────────────── */}
            {isOpportunity && (
                <>
                    <div className="px-4 py-3 border-t border-gray-100">
                        <SectionHeader title="CONTEXTO DEL DEAL" />
                        <div className="flex justify-between py-1.5">
                            <span className="text-label text-gray-400">Pipeline Stage</span>
                            {contact.stage && <Badge text={contact.stage} variant="stage" />}
                        </div>
                        {contact.priority && <InfoRow label="Prioridad" value={contact.priority} />}
                        {contact.ownerName && <InfoRow label="Opportunity Owner" value={contact.ownerName} />}
                        {contact.totalInstallPower && <InfoRow label="Potencia total (MW)" value={contact.totalInstallPower} />}
                        {contact.cltv != null && (
                            <InfoRow label="CLTV" value={`$${contact.cltv.toLocaleString()}`} />
                        )}
                        {contact.internalProgress && <InfoRow label="Progreso interno" value={contact.internalProgress} />}
                        {contact.lastDoneActivity && <InfoRow label="Última actividad" value={contact.lastDoneActivity} />}
                        <TagList label="Productos" items={contact.products} />
                        <TagList label="Esquema financiero" items={contact.financeScheme} />
                        <TagList label="Sitios" items={contact.siteNames} />
                        {contact.sharepointUrl && (
                            <InfoRow label="Sharepoint" value="Abrir repositorio" isLink href={contact.sharepointUrl} />
                        )}
                    </div>

                    {/* Linked Contacts */}
                    <div className="px-4 py-3 border-t border-gray-100">
                        <SectionHeader title={`CONTACTOS VINCULADOS (${linkedContacts.length})`} />
                        {linkedContacts.length === 0 && (
                            <p className="text-xs text-gray-400">Sin contactos vinculados a esta oportunidad</p>
                        )}
                        {linkedContacts.map(({ contact: lc, role }) => (
                            <LinkedContactCard
                                key={lc.id}
                                contact={lc}
                                role={role}
                                onStartWhatsApp={onSelectContact}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Notes Preview */}
            <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <SectionHeader title="NOTAS" />
                </div>
                {onOpenNotes && (
                    <button
                        onClick={onOpenNotes}
                        className="w-full py-2 text-body text-primary font-medium border border-dashed border-gray-200 rounded-lg hover:bg-green-light3 transition-colors"
                    >
                        + Agregar nota
                    </button>
                )}
            </div>
        </div>
    );
}
