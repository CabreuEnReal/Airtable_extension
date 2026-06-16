import type { ReactNode } from 'react';

interface AppLayoutProps {
    /** Breadcrumb company segment (e.g. "PROSUM"). */
    company?: string;
    /** Breadcrumb opportunity segment (selected opportunity name). */
    oppName?: string;
    /** Breadcrumb active leaf — contact name (only in opp-detail-b). */
    contactName?: string;
    /** `<` back button — goes one level up (B→A, A→search). */
    onBack: () => void;
    /** Click "Seguimiento" / company → Module 1 search. */
    onCrumbSearch?: () => void;
    /** Click opportunity crumb → Module 2-A (only relevant in B). */
    onCrumbOpp?: () => void;
    children: ReactNode;
}

export function AppLayout({
    company,
    oppName,
    contactName,
    onBack,
    onCrumbSearch,
    onCrumbOpp,
    children,
}: AppLayoutProps) {
    const goSearch = onCrumbSearch ?? onBack;
    const oppIsLeaf = !contactName;

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-surface-light">
            {/* ── Breadcrumb header ── */}
            <header className="flex items-center gap-2 flex-shrink-0 px-5 py-2.5 bg-white border-b border-gray-100 text-body text-gray-400">
                <button
                    onClick={onBack}
                    title="Regresar"
                    className="flex items-center gap-1 mr-2 px-2.5 py-1 rounded-md border border-gray-100 bg-white text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <button onClick={goSearch} className="hover:text-primary transition-colors">
                    Seguimiento
                </button>
                {company && (
                    <>
                        <span className="text-gray-200">/</span>
                        <button onClick={goSearch} className="hover:text-primary transition-colors truncate max-w-[160px]">
                            {company}
                        </button>
                    </>
                )}
                {oppName && (
                    <>
                        <span className="text-gray-200">/</span>
                        {oppIsLeaf ? (
                            <span className="text-gray-700 font-semibold truncate max-w-[280px]">{oppName}</span>
                        ) : (
                            <button
                                onClick={onCrumbOpp}
                                className="hover:text-primary transition-colors truncate max-w-[220px]"
                            >
                                {oppName}
                            </button>
                        )}
                    </>
                )}
                {contactName && (
                    <>
                        <span className="text-gray-200">/</span>
                        <span className="text-gray-700 font-semibold truncate max-w-[220px]">{contactName}</span>
                    </>
                )}
            </header>

            {/* ── View body (columns) ── */}
            <div className="flex flex-1 overflow-hidden">{children}</div>
        </div>
    );
}
