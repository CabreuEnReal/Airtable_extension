interface EmptyStateProps {
    icon: string;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="text-4xl mb-3">{icon}</div>
            <div className="text-card-heading text-gray-800 mb-1">{title}</div>
            {description && (
                <div className="text-body text-gray-400 max-w-[280px]">{description}</div>
            )}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-4 px-4 py-2 bg-primary text-white text-body font-medium rounded-lg hover:bg-primary-dark transition-colors"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
