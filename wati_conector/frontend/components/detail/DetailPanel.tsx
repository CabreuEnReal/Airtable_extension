import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { IconButton } from '../common/IconButton';
import type { Contact, Message } from '../../types/models';
import { formatPhone } from '../../utils/formatters';

interface DetailPanelProps {
    contact: Contact | null;
    messages: Message[];
    onOpenNotes?: () => void;
    onOpenFiles?: () => void;
    onOpenDetail?: () => void;
    onClose?: () => void;
}

function InfoRow({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
    if (!value) return null;
    return (
        <div className="flex justify-between py-1.5">
            <span className="text-label text-gray-400">{label}</span>
            {isLink ? (
                <a href={`mailto:${value}`} className="text-body text-blue font-medium truncate ml-2">{value}</a>
            ) : (
                <span className="text-body text-gray-800 font-medium truncate ml-2">{value}</span>
            )}
        </div>
    );
}

export function DetailPanel({
    contact,
    messages,
    onOpenNotes,
    onOpenFiles,
    onOpenDetail,
    onClose,
}: DetailPanelProps) {
    if (!contact) return null;

    const unreadCount = messages.filter(
        (m) => m.direction === 'inbound' && m.readStatus === 'unread'
    ).length;

    return (
        <div className="w-detail flex flex-col border-l border-gray-100 bg-white overflow-y-auto">
            {/* Close button */}
            {onClose && (
                <div className="flex justify-end px-3 pt-3">
                    <IconButton icon="✕" label="Cerrar" size="sm" onClick={onClose} />
                </div>
            )}

            {/* Avatar & Name */}
            <div className="flex flex-col items-center px-4 pt-2 pb-4">
                <Avatar name={contact.displayName} size="xl" />
                <h3 className="text-card-heading font-semibold text-gray-800 mt-3 text-center">{contact.displayName}</h3>
                {contact.company && (
                    <span className="text-label text-gray-500 mt-0.5">{contact.company}</span>
                )}
                {contact.leadCode && (
                    <span className="text-label text-gray-400 mt-0.5">{contact.leadCode}</span>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 px-4 pb-4">
                <IconButton icon="📱" label="WhatsApp" variant="outline" />
                <IconButton icon="✉️" label="Email" variant="outline" />
                {onOpenFiles && <IconButton icon="📁" label="Archivos" variant="outline" onClick={onOpenFiles} />}
            </div>

            {/* Contact Info */}
            <div className="px-4 py-3 border-t border-gray-100">
                <h4 className="text-table-header text-gray-500 mb-2">INFORMACIÓN DE CONTACTO</h4>
                <InfoRow label="Teléfono" value={formatPhone(contact.phone)} />
                <InfoRow label="Email" value={contact.email} isLink />
                <InfoRow label="Cargo" value={contact.jobTitle} />
                <InfoRow label="Industria" value={contact.industry} />
            </div>

            {/* Sales Attributes */}
            <div className="px-4 py-3 border-t border-gray-100">
                <h4 className="text-table-header text-gray-500 mb-2">SALES</h4>
                <div className="flex justify-between py-1.5">
                    <span className="text-label text-gray-400">Stage</span>
                    {contact.stage && <Badge text={contact.stage} variant="stage" />}
                </div>
                <InfoRow label="Empresa" value={contact.company} />
                <InfoRow label="Lead Source" value={contact.leadSource} />
                {contact.contactType === 'lead' && (
                    <div className="flex justify-between py-1.5">
                        <span className="text-label text-gray-400">Tipo</span>
                        <Badge text="Lead" variant="tag" />
                    </div>
                )}
            </div>

            {/* Notes Preview */}
            <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-table-header text-gray-500">NOTAS</h4>
                    <span className="text-label text-gray-400">{0}</span>
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
