import type { AISummaryData } from '../../types/api';

interface UrgencyStyle {
    badge: string;
    dot: string;
    label: string;
    nextStep: string;
    nextStepLabel: string;
}

const URGENCY: Record<string, UrgencyStyle> = {
    Alta: {
        badge:        'bg-red-50 border-red-400',
        dot:          'bg-red-500',
        label:        'text-red-700 font-semibold',
        nextStep:     'bg-green-50 border-green-300',
        nextStepLabel:'text-green-700',
    },
    Media: {
        badge:        'bg-amber-50 border-amber-400',
        dot:          'bg-amber-500',
        label:        'text-amber-700 font-semibold',
        nextStep:     'bg-green-50 border-green-300',
        nextStepLabel:'text-green-700',
    },
    Baja: {
        badge:        'bg-green-50 border-green-400',
        dot:          'bg-green-500',
        label:        'text-green-700 font-semibold',
        nextStep:     'bg-green-50 border-green-300',
        nextStepLabel:'text-green-700',
    },
};

const FALLBACK: UrgencyStyle = {
    badge:        'bg-gray-50 border-gray-300',
    dot:          'bg-gray-400',
    label:        'text-gray-600 font-semibold',
    nextStep:     'bg-gray-50 border-gray-200',
    nextStepLabel:'text-gray-600',
};

export function AISummaryCard({ data }: { data: AISummaryData }) {
    const u = URGENCY[data.urgencia] ?? FALLBACK;

    return (
        <div className="flex flex-col gap-3 px-4 py-4 max-w-[480px] mx-auto mt-4">

            {/* Header */}
            <div className="flex items-center gap-2">
                <span className="text-xl leading-none">🤖</span>
                <span className="text-sm font-bold text-gray-800">Resumen de conversación</span>
                <span className="ml-auto text-[10px] font-semibold bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 uppercase tracking-wide shrink-0">
                    {data.categoria}
                </span>
            </div>

            {/* Urgency badge */}
            <div className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 ${u.badge}`}>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${u.dot}`} />
                <span className={`text-xs uppercase tracking-wide ${u.label}`}>
                    Urgencia {data.urgencia}
                </span>
            </div>

            {/* Summary */}
            <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                    Resumen
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                    {data.resumen}
                </p>
            </div>

            {/* Next step — CTA */}
            <div className={`rounded-xl border p-4 ${u.nextStep}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${u.nextStepLabel}`}>
                    ▶ Siguiente paso
                </p>
                <p className="text-sm text-gray-800 font-medium leading-snug">
                    {data.siguiente_paso}
                </p>
            </div>

        </div>
    );
}
