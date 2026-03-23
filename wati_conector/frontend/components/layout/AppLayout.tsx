import type { ReactNode } from 'react';

interface AppLayoutProps {
    sidebar: ReactNode;
    conversations?: ReactNode;
    chat?: ReactNode;
    detail?: ReactNode;
    fullContent?: ReactNode;
}

export function AppLayout({ sidebar, conversations, chat, detail, fullContent }: AppLayoutProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-surface-light">
            {/* Sidebar */}
            {sidebar}

            {/* Main content area */}
            {fullContent ? (
                <div className="flex-1 overflow-hidden">{fullContent}</div>
            ) : (
                <div className="flex flex-1 overflow-hidden">
                    {conversations}
                    {chat}
                    {detail}
                </div>
            )}
        </div>
    );
}
