import { useState, useMemo } from 'react';
import type { Template } from '../../types/models';

interface TemplateSelectorProps {
    templates: Template[];
    onSelectMeta: (template: Template, parameters: string[]) => void;
    onSelectAirtable: (template: Template) => void;
    onClose: () => void;
}

export function TemplateSelector({ templates, onSelectMeta, onSelectAirtable, onClose }: TemplateSelectorProps) {
    const [search, setSearch] = useState('');
    const [metaParamTemplate, setMetaParamTemplate] = useState<Template | null>(null);
    const [paramValues, setParamValues] = useState<string[]>([]);

    const metaTemplates = useMemo(() => {
        const list = templates.filter((t) => t.source === 'meta');
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter((t) => t.name.toLowerCase().includes(q) || (t.category || '').toLowerCase().includes(q));
    }, [templates, search]);

    const airtableTemplates = useMemo(() => {
        const list = templates.filter((t) => t.source === 'airtable');
        if (!search) return list;
        const q = search.toLowerCase();
        return list.filter((t) => t.name.toLowerCase().includes(q) || (t.content || '').toLowerCase().includes(q));
    }, [templates, search]);

    const handleMetaClick = (t: Template) => {
        const count = t.parameterCount ?? 0;
        if (count > 0) {
            setMetaParamTemplate(t);
            setParamValues(new Array(count).fill(''));
        } else {
            onSelectMeta(t, []);
        }
    };

    const handleMetaSend = () => {
        if (!metaParamTemplate) return;
        onSelectMeta(metaParamTemplate, paramValues);
        setMetaParamTemplate(null);
        setParamValues([]);
    };

    // Meta parameter input view
    if (metaParamTemplate) {
        const count = metaParamTemplate.parameterCount ?? 0;
        return (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-modal max-h-[420px] flex flex-col overflow-hidden animate-slide-up z-30">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMetaParamTemplate(null)} className="text-gray-400 hover:text-gray-600 text-sm">←</button>
                        <h3 className="text-sm font-semibold text-gray-800">{metaParamTemplate.name}</h3>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-75 text-gray-400 text-sm">✕</button>
                </div>
                <div className="px-4 py-3 flex flex-col gap-2 overflow-y-auto">
                    <div className="text-label text-gray-400 mb-1">
                        Esta plantilla requiere {count} parámetro{count > 1 ? 's' : ''}:
                    </div>
                    {paramValues.map((val, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-label text-gray-500 w-12 shrink-0">{`{{${i + 1}}}`}</span>
                            <input
                                type="text"
                                value={val}
                                onChange={(e) => {
                                    const next = [...paramValues];
                                    next[i] = e.target.value;
                                    setParamValues(next);
                                }}
                                placeholder={`Valor para {{${i + 1}}}`}
                                className="flex-1 px-3 py-1.5 text-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:bg-white"
                                autoFocus={i === 0}
                            />
                        </div>
                    ))}
                    <button
                        onClick={handleMetaSend}
                        disabled={paramValues.some((v) => !v.trim())}
                        className="mt-2 w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        Enviar plantilla
                    </button>
                </div>
            </div>
        );
    }

    const noResults = metaTemplates.length === 0 && airtableTemplates.length === 0;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-modal max-h-[360px] flex flex-col overflow-hidden animate-slide-up z-30">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Plantillas</h3>
                <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-75 text-gray-400 text-sm"
                >
                    ✕
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar plantilla..."
                    className="w-full px-3 py-1.5 text-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:bg-white"
                    autoFocus
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {/* Meta templates group */}
                {metaTemplates.length > 0 && (
                    <div>
                        <div className="px-4 py-1.5 text-label text-gray-400 font-semibold bg-gray-50 uppercase flex items-center gap-1.5">
                            <span>📱</span> INICIAR CONVERSACIÓN (Meta)
                        </div>
                        {metaTemplates.map((t) => (
                            <MetaTemplateRow key={t.id} template={t} onClick={() => handleMetaClick(t)} />
                        ))}
                    </div>
                )}

                {/* Airtable templates group */}
                {airtableTemplates.length > 0 && (
                    <div>
                        <div className="px-4 py-1.5 text-label text-gray-400 font-semibold bg-gray-50 uppercase flex items-center gap-1.5">
                            <span>⚡</span> RESPUESTAS RÁPIDAS (Airtable)
                        </div>
                        {airtableTemplates.map((t) => (
                            <AirtableTemplateRow key={t.id} template={t} onClick={() => onSelectAirtable(t)} />
                        ))}
                    </div>
                )}

                {noResults && (
                    <div className="px-4 py-6 text-center text-body text-gray-400">
                        {search ? 'Sin resultados' : 'No hay plantillas disponibles'}
                    </div>
                )}
            </div>
        </div>
    );
}

function MetaTemplateRow({ template, onClick }: { template: Template; onClick: () => void }) {
    const params = template.parameterCount ?? 0;
    return (
        <button
            onClick={onClick}
            className="w-full flex flex-col px-4 py-2.5 text-left hover:bg-gray-25 transition-colors border-b border-gray-100 last:border-0"
        >
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{template.name}</span>
                <span className="text-label text-primary font-mono">{template.language}</span>
                {params > 0 && (
                    <span className="text-label bg-primary-light text-primary px-1.5 py-0.5 rounded">{params} var</span>
                )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-label text-gray-400">{template.category}</span>
                {template.status && (
                    <span className={`text-label ${template.status === 'APPROVED' ? 'text-green-dark1' : 'text-gray-400'}`}>
                        • {template.status}
                    </span>
                )}
            </div>
        </button>
    );
}

function AirtableTemplateRow({ template, onClick }: { template: Template; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex flex-col px-4 py-2.5 text-left hover:bg-gray-25 transition-colors border-b border-gray-100 last:border-0"
        >
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{template.name}</span>
                {template.category && (
                    <span className="text-label text-gray-400">{template.category}</span>
                )}
            </div>
            {template.content && (
                <span className="text-label text-gray-500 mt-0.5 line-clamp-2 italic">{template.content}</span>
            )}
            {template.variables && template.variables.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                    {template.variables.map((v) => (
                        <span key={v} className="text-label bg-gray-75 text-gray-500 px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                    ))}
                </div>
            )}
        </button>
    );
}
