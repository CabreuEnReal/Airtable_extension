interface IconButtonProps {
    icon: string;
    label?: string;
    onClick?: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    variant?: 'ghost' | 'outline' | 'primary';
}

const VARIANT_CLASSES = {
    ghost: 'hover:bg-gray-75 text-gray-500',
    outline: 'border border-gray-200 hover:bg-gray-50 text-gray-600',
    primary: 'bg-primary text-white hover:bg-primary-dark',
};

const SIZE_CLASSES = {
    sm: 'w-8 h-8 text-base',
    md: 'w-9 h-9 text-lg',
};

export function IconButton({
    icon,
    label,
    onClick,
    disabled = false,
    size = 'md',
    variant = 'ghost',
}: IconButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`inline-flex items-center justify-center rounded-lg transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]}`}
        >
            <span>{icon}</span>
        </button>
    );
}
