import { NAV_ITEMS } from '../../constants/config';

interface SidebarProps {
    activeNav: string;
    onNavChange: (id: string) => void;
    userName?: string;
    userRole?: string;
}

const ICONS: Record<string, string> = {
    'grid': '⊞',
    'users': '👥',
    'message-circle': '💬',
    'bar-chart': '📊',
    'target': '🎯',
    'file-text': '📄',
    'zap': '⚡',
};

export function Sidebar({ activeNav, onNavChange, userName }: SidebarProps) {
    return (
        <div className="w-sidebar flex flex-col items-center bg-primary h-full py-3 gap-1">
            {/* Brand icon */}
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-3 flex-shrink-0">
                <span className="text-white text-sm font-bold">☰</span>
            </div>

            {/* Navigation — icon-only */}
            <nav className="flex-1 flex flex-col items-center gap-1 w-full px-1.5">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.id === activeNav;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavChange(item.id)}
                            title={item.label}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition-colors flex-shrink-0
                                ${isActive
                                    ? 'bg-white/25 text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {ICONS[item.icon] ?? '•'}
                        </button>
                    );
                })}
            </nav>

            {/* User avatar at bottom */}
            {userName && (
                <div className="flex-shrink-0 mt-auto pt-2 border-t border-white/15 w-full flex justify-center">
                    <div
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                        title={userName}
                    >
                        <span className="text-white text-xs font-semibold">
                            {userName.substring(0, 2).toUpperCase()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
