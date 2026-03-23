import type { ConversationFilter } from '../../types/models';

interface ConversationFiltersProps {
    active: ConversationFilter;
    onChange: (filter: ConversationFilter) => void;
    counts: Record<ConversationFilter, number>;
}

const FILTERS: { key: ConversationFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'open', label: 'Abiertos' },
    { key: 'unread', label: 'No leídos' },
    { key: 'pending', label: 'Pendientes' },
];

export function ConversationFilters({ active, onChange, counts }: ConversationFiltersProps) {
    return (
        <div className="flex gap-1.5 px-3 py-2">
            {FILTERS.map((f) => {
                const isActive = f.key === active;
                const count = counts[f.key] ?? 0;
                return (
                    <button
                        key={f.key}
                        onClick={() => onChange(f.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap
                            ${isActive
                                ? 'bg-primary text-white'
                                : 'bg-gray-75 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        {f.label}
                        {count > 0 && !isActive && (
                            <span className="ml-1 text-gray-400">({count})</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
