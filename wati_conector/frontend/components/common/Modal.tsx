import type { ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    width?: string;
}

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }: ModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className={`relative ${width} w-full mx-4 bg-white rounded-xl shadow-modal animate-fade-in max-h-[85vh] flex flex-col`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-card-heading font-semibold text-gray-800">{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-75 text-gray-400 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
