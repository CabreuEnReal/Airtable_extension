import { useState, useEffect } from 'react';
import type { Contact } from '../../types/models';
import { Modal } from '../common/Modal';

interface NewEmailModalProps {
    open: boolean;
    onClose: () => void;
    /** Contacts of the active opportunity — the ONLY allowed recipients. */
    contacts: Contact[];
    /** Logged-in user's email (dynamic sender). */
    fromEmail: string;
    /** True while the Airtable write is in flight. */
    saving?: boolean;
    /** Called on send; resolves after Airtable confirms. */
    onSend?: (payload: { to: string; subject: string; message: string }) => Promise<void> | void;
}

const FIELD =
    'w-full px-3 py-2 border-[1.5px] border-gray-100 rounded-lg text-body bg-surface-light outline-none focus:border-primary focus:bg-white';

export function NewEmailModal({ open, onClose, contacts, fromEmail, saving, onSend }: NewEmailModalProps) {
    const recipients = contacts.filter((c) => c.email);
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    // Preselect first recipient when modal opens / list changes
    useEffect(() => {
        if (open) setTo(recipients[0]?.email ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const handleSend = async () => {
        if (!to || saving) return;
        await onSend?.({ to, subject, message });
        // onSend closes the modal on success; only reset local state here
        setSubject('');
        setMessage('');
    };

    return (
        <Modal open={open} onClose={onClose} title="Nuevo correo" width="max-w-lg">
            <div className="flex flex-col gap-3.5 px-5 py-4">
                {/* Para */}
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Para</span>
                    <select className={FIELD} value={to} onChange={(e) => setTo(e.target.value)}>
                        {recipients.length === 0 ? (
                            <option value="">Sin contactos con correo</option>
                        ) : (
                            recipients.map((c) => (
                                <option key={c.id} value={c.email}>
                                    {c.displayName} — {c.email}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                {/* Asunto */}
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Asunto</span>
                    <input
                        type="text"
                        className={FIELD}
                        placeholder="Asunto del correo"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </label>

                {/* Mensaje */}
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Mensaje</span>
                    <textarea
                        rows={5}
                        className={`${FIELD} resize-y`}
                        placeholder="Escribe tu mensaje..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />
                </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 bg-surface-light">
                <span className="text-xs text-gray-400 truncate">
                    De: <span className="font-semibold text-gray-600">{fromEmail || '—'}</span>
                </span>
                <button
                    onClick={handleSend}
                    disabled={!to || saving}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-body font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {saving ? 'Registrando...' : 'Enviar correo'}
                </button>
            </div>
        </Modal>
    );
}
