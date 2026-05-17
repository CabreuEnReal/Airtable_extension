import type { ReactNode } from 'react';

interface AppLayoutProps {
    conversations?: ReactNode;
    chat?: ReactNode;
    detail?: ReactNode;
    fullContent?: ReactNode;
}

export function AppLayout({ conversations, chat, detail, fullContent }: AppLayoutProps) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-surface-light">
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
