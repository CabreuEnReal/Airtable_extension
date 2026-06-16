import { useState, useEffect } from 'react';
import type { ActiveChannel, InteractionType } from '../../types/models';
import { Modal } from '../common/Modal';

interface AddNoteModalProps {
    open: boolean;
    onClose: () => void;
    /** Pre-selected channel = the view's currently active channel (Punto 9). */
    activeChannel: ActiveChannel;
    /** Channel/type catalog rows for the <select> (loaded from Airtable). */
    interactionTypes: InteractionType[];
    /** Name shown in the header (opportunity or contact). */
    targetName?: string;
    saving?: boolean;
    /** Persist the note; resolves after Airtable confirms. Sends the chosen type id. */
    onSave: (notes: string, typeId: string) => Promise<void> | void;
}

const FIELD =
    'w-full px-3 py-2 border-[1.5px] border-gray-100 rounded-lg text-body bg-surface-light outline-none focus:border-primary focus:bg-white';

/** Match a catalog row to the active channel by name (WhatsApp / Correo). */
function findTypeIdForChannel(types: InteractionType[], channel: ActiveChannel): string {
    const needle = channel === 'whatsapp' ? ['whatsapp', 'whats', 'wa'] : ['correo', 'email', 'mail'];
    const hit = types.find((t) => needle.some((n) => t.name.toLowerCase().includes(n)));
    return hit?.id ?? types[0]?.id ?? '';
}

export function AddNoteModal({ open, onClose, activeChannel, interactionTypes, targetName, saving, onSave }: AddNoteModalProps) {
    const [typeId, setTypeId] = useState('');
    const [notes, setNotes] = useState('');

    // Re-seed the type from the active channel each time the modal opens.
    useEffect(() => {
        if (open) {
            setTypeId(findTypeIdForChannel(interactionTypes, activeChannel));
            setNotes('');
        }
    }, [open, activeChannel, interactionTypes]);

    if (!open) return null;

    const handleSave = async () => {
        if (!notes.trim() || !typeId) return;
        await onSave(notes.trim(), typeId);
    };

    return (
        <Modal open={open} onClose={onClose} title={targetName ? `Nueva nota — ${targetName}` : 'Nueva nota'} width="max-w-lg">
            <div className="flex flex-col gap-3.5 px-5 py-4">
                {/* Channel / type */}
                <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Canal</span>
                    <select
                        className={`${FIELD} appearance-none cursor-pointer`}
                        value={typeId}
                        onChange={(e) => setTypeId(e.target.value)}
                    >
                        {interactionTypes.length === 0 ? (
                            <option value="">Sin tipos disponibles</option>
                        ) : (
                            interactionTypes.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                {/* Notes */}
                <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Nota</span>
                    <textarea
                        rows={5}
                        className={`${FIELD} resize-y`}
                        placeholder="Escribe la nota / resumen de la interacción..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        autoFocus
                    />
                </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-surface-light">
                <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border-[1.5px] border-gray-100 text-gray-500 text-body font-semibold hover:border-gray-300"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    disabled={!notes.trim() || !typeId || saving}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-body font-semibold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {saving ? 'Guardando...' : 'Guardar nota'}
                </button>
            </div>
        </Modal>
    );
}
