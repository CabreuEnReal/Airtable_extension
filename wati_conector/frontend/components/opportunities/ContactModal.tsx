import type { ReactNode } from 'react';
import type { Contact, ActiveChannel } from '../../types/models';
import { Modal } from '../common/Modal';
import { Avatar } from '../common/Avatar';

interface ContactModalProps {
    open: boolean;
    onClose: () => void;
    contact: Contact | null;
    /** Jump to the conversation on a channel (mutates global state, then closes). */
    onStartConversation: (channel: ActiveChannel) => void;
}

function DataField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="px-3.5 py-2.5 bg-white">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-300 mb-1">{label}</div>
            <div className="text-body text-gray-700 font-medium break-words">{children || '—'}</div>
        </div>
    );
}

function InfluenceStars({ level }: { level: number }) {
    return (
        <span className="inline-flex items-center gap-0.5 align-middle">
            {[1, 2, 3, 4, 5].map((i) => {
                const filled = i <= level;
                return (
                    <svg
                        key={i}
                        width="14" height="14" viewBox="0 0 24 24"
                        fill={filled ? '#f59e0b' : 'none'}
                        stroke={filled ? '#f59e0b' : '#d1d5db'}
                        strokeWidth="2"
                    >
                        <path d="M12 2l2.09 6.26L20.18 9l-5.09 3.74L17.18 19 12 15.27 6.82 19l2.09-6.26L3.82 9l6.09-.74L12 2z" />
                    </svg>
                );
            })}
        </span>
    );
}

export function ContactModal({ open, onClose, contact, onStartConversation }: ContactModalProps) {
    if (!open || !contact) return null;

    const influence = typeof contact.decisionLevel === 'number' ? contact.decisionLevel : 3;
    const roleText =
        contact.linkedInSummary ||
        contact.callInsights ||
        'Rol y contexto del contacto dentro de la cuenta. Información de influencia y nivel de decisión se sincronizará desde Airtable.';

    return (
        <Modal open={open} onClose={onClose} title="Detalle de contacto" width="max-w-xl">
            {/* Profile header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <Avatar name={contact.displayName} size="xl" avatarUrl={contact.avatarUrl} />
                <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-gray-800 truncate">{contact.displayName}</div>
                    <div className="text-body text-gray-400 truncate">{contact.company || '—'}</div>
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-light2 text-green-dark1">
                        Contacto
                    </span>
                </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2.5 px-5 py-3.5 border-b border-gray-100">
                <button
                    onClick={() => onStartConversation('whatsapp')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-whatsapp text-white text-body font-semibold hover:opacity-90 transition-opacity"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.605z" />
                    </svg>
                    WhatsApp
                </button>
                <button
                    onClick={() => onStartConversation('correo')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-body font-semibold hover:bg-primary-dark transition-colors"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                    Correo
                </button>
            </div>

            {/* Data grid */}
            <div className="grid grid-cols-2 gap-px bg-gray-75">
                <DataField label="Teléfono">{contact.phone}</DataField>
                <DataField label="Email">{contact.email}</DataField>
                <DataField label="Cargo">{contact.jobTitle}</DataField>
                <DataField label="Departamento">{contact.department}</DataField>
                <DataField label="LinkedIn">
                    {contact.linkedIn ? (
                        <a href={contact.linkedIn} target="_blank" rel="noreferrer" className="text-primary cursor-pointer">
                            Ver perfil
                        </a>
                    ) : '—'}
                </DataField>
                <DataField label="Empresa">{contact.company}</DataField>
            </div>

            {/* Role & context */}
            <div className="px-5 py-4 bg-surface-light">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-300 mb-2">Rol y contexto</div>
                <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-body font-semibold text-gray-600">Influencia:</span>
                    <InfluenceStars level={influence} />
                </div>
                <p className="text-body leading-relaxed text-gray-600">{roleText}</p>
            </div>
        </Modal>
    );
}
