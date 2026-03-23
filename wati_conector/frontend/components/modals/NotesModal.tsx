import { useState } from 'react';
import { Modal } from '../common/Modal';

interface NotesModalProps {
    open: boolean;
    onClose: () => void;
    contactName: string;
}

export function NotesModal({ open, onClose, contactName }: NotesModalProps) {
    const [draft, setDraft] = useState('');

    return (
        <Modal open={open} onClose={onClose} title={`Notas de ${contactName}`} width="max-w-xl">
            {/* History */}
            <div className="px-5 py-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    🕐 HISTORIAL DE NOTAS
                </h4>
                <div className="text-center text-body text-gray-400 py-6">
                    No hay notas aún. Agrega la primera nota.
                </div>
            </div>

            {/* New note editor */}
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    📝 NUEVA NOTA
                </h4>
                {/* Toolbar */}
                <div className="flex gap-1 mb-2">
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm font-bold">B</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm italic">I</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm">≡</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-75 text-gray-500 text-sm">🔗</button>
                </div>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Agregar nueva nota"
                    rows={4}
                    className="w-full px-3 py-2 text-body border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-primary"
                />
                <div className="flex justify-end mt-2">
                    <button
                        disabled={!draft.trim()}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition-colors"
                    >
                        ➤
                    </button>
                </div>
            </div>
        </Modal>
    );
}
