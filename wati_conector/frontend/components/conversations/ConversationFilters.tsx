import type { ConversationFilter } from '../../types/models';

interface ConversationFiltersProps {
    active: ConversationFilter;
    onChange: (filter: ConversationFilter) => void;
    counts: Record<ConversationFilter, number>;
}

const FILTERS: { key: ConversationFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'leads', label: 'Leads' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'open', label: 'Abiertos' },
    { key: 'unread', label: 'No leídos' },
];

export function ConversationFilters({ active, onChange, counts }: ConversationFiltersProps) {
    return (
        <div className="px-3 py-2 overflow-x-auto">
            <div className="flex gap-0.5 min-w-max">
                {FILTERS.map((f) => {
                    const isActive = f.key === active;
                    const count = counts[f.key] ?? 0;
                    return (
                        <button
                            key={f.key}
                            onClick={() => onChange(f.key)}
                            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-colors whitespace-nowrap
                                ${isActive
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-75 text-gray-500 hover:bg-gray-100'
                                }`}
                        >
                            {f.label}
                            {count > 0 && !isActive && (
                                <span className="ml-0.5 text-gray-400">({count})</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
