interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

const SIZE_MAP = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
};

export function Spinner({ size = 'md', label }: SpinnerProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div
                className={`${SIZE_MAP[size]} rounded-full border-gray-200 border-t-primary animate-spin`}
            />
            {label && <span className="text-label text-gray-400">{label}</span>}
        </div>
    );
}
