import { getInitials, getAvatarColor } from '../../utils/colors';

interface AvatarProps {
    name: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    avatarUrl?: string;
    online?: boolean;
}

const SIZE_CLASSES = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl',
};

export function Avatar({ name, size = 'md', avatarUrl, online }: AvatarProps) {
    const sizeClass = SIZE_CLASSES[size];

    return (
        <div className="relative inline-flex flex-shrink-0">
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt={name}
                    className={`${sizeClass} rounded-full object-cover`}
                />
            ) : (
                <div
                    className={`${sizeClass} rounded-full flex items-center justify-center font-semibold text-white`}
                    style={{ backgroundColor: getAvatarColor(name) }}
                >
                    {getInitials(name)}
                </div>
            )}
            {online !== undefined && (
                <span
                    className={`absolute bottom-0 right-0 block rounded-full ring-2 ring-white ${
                        online ? 'bg-green-whatsapp' : 'bg-gray-300'
                    } ${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`}
                />
            )}
        </div>
    );
}
