import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getAirtableTemplates, createAirtableTemplate, updateAirtableTemplate, deleteAirtableTemplate } from '../../services/pythonApi';
import type { ApiAirtableTemplateOut } from '../../types/api';

// ─── Available variables that map to Airtable contact fields ────────────────
const AVAILABLE_VARIABLES = [
    { key: 'contact_name', label: 'Contact Name', icon: '👤' },
    { key: 'first_name', label: 'First Name', icon: '👤' },
    { key: 'empresa', label: 'Empresa', icon: '🏢' },
    { key: 'email', label: 'Email', icon: '📧' },
    { key: 'phone', label: 'Phone', icon: '📱' },
    { key: 'stage', label: 'Stage', icon: '📊' },
    { key: 'stage_status', label: 'Stage Status', icon: '🔄' },
    { key: 'business_unit', label: 'Business Unit', icon: '🏗️' },
    { key: 'request_date', label: 'Request Date', icon: '📅' },
    { key: 'tags', label: 'Tags', icon: '🏷️' },
    { key: 'job_title', label: 'Job Title', icon: '💼' },
    { key: 'fecha_actual', label: 'Fecha actual', icon: '📅' },
];

// Sample data for template preview
const SAMPLE_DATA: Record<string, string> = {
    contact_name: 'Carlos García',
    first_name: 'Carlos',
    empresa: 'MEGAWATTS SAPI DE CV',
    email: 'carlos@megawatts.com',
    phone: '+5215512345678',
    stage: 'Contactado',
    stage_status: 'Activo',
    business_unit: 'Solar',
    request_date: '13/03/2026',
    tags: 'VIP, Solar',
    job_title: 'Gerente de Proyectos',
    fecha_actual: new Date().toLocaleDateString('es-MX'),
};

const CATEGORIES = ['Ventas', 'Soporte', 'Follow-up', 'Onboarding', 'General'];

type ViewMode = 'list' | 'create' | 'edit';

interface EditingTemplate {
    id?: string;
    name: string;
    content: string;
    category: string;
}

const EMPTY_TEMPLATE: EditingTemplate = { name: '', content: '', category: 'General' };

interface AutomationsPanelProps {
    onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function AutomationsPanel({ onNotify }: AutomationsPanelProps) {
    const [templates, setTemplates] = useState<ApiAirtableTemplateOut[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState<ViewMode>('list');
    const [editing, setEditing] = useState<EditingTemplate>(EMPTY_TEMPLATE);
    const [search, setSearch] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // ─── Load templates ──────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        try {
            const data = await getAirtableTemplates();
            setTemplates(data);
        } catch (err: any) {
            onNotify('error', `Error cargando plantillas: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [onNotify]);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    // ─── Filter templates ────────────────────────────────────
    const filtered = useMemo(() => {
        if (!search) return templates;
        const q = search.toLowerCase();
        return templates.filter(
            (t) => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || t.category.toLowerCase().includes(q),
        );
    }, [templates, search]);

    // ─── Group by category ───────────────────────────────────
    const grouped = useMemo(() => {
        const map = new Map<string, ApiAirtableTemplateOut[]>();
        for (const t of filtered) {
            const cat = t.category || 'General';
            if (!map.has(cat)) map.set(cat, []);
            map.get(cat)!.push(t);
        }
        return map;
    }, [filtered]);

    // ─── Insert variable at cursor ───────────────────────────
    const insertVariable = useCallback((varKey: string) => {
        const tag = `{{${varKey}}}`;
        const textarea = contentRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const before = editing.content.substring(0, start);
            const after = editing.content.substring(end);
            const newContent = before + tag + after;
            setEditing((prev) => ({ ...prev, content: newContent }));
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + tag.length;
            }, 0);
        } else {
            setEditing((prev) => ({ ...prev, content: prev.content + tag }));
        }
    }, [editing.content]);

    // ─── Preview with actual data instead of variables ──────────────
    const previewHtml = useMemo(() => {
        if (!editing.content) return '';
        return editing.content.replace(
            /\{\{(\w+)\}\}/g,
            '<span class="inline-block bg-primary-light text-primary px-1 rounded font-mono text-label">' +
            (SAMPLE_DATA[RegExp.$1] || `{{${RegExp.$1}}}`) +
            '</span>',
        );
    }, [editing.content]);

    // ─── Save template ───────────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!editing.name.trim() || !editing.content.trim()) {
            onNotify('error', 'Nombre y contenido son requeridos');
            return;
        }
        setSaving(true);
        try {
            if (editing.id) {
                await updateAirtableTemplate(editing.id, {
                    name: editing.name,
                    content: editing.content,
                    category: editing.category,
                });
                onNotify('success', `Plantilla "${editing.name}" actualizada`);
            } else {
                await createAirtableTemplate({
                    name: editing.name,
                    content: editing.content,
                    category: editing.category,
                    is_active: true,
                });
                onNotify('success', `Plantilla "${editing.name}" creada`);
            }
            await loadTemplates();
            setView('list');
            setEditing(EMPTY_TEMPLATE);
        } catch (err: any) {
            onNotify('error', `Error guardando: ${err.message}`);
        } finally {
            setSaving(false);
        }
    }, [editing, loadTemplates, onNotify]);

    // ─── Delete template ─────────────────────────────────────
    const handleDelete = useCallback(async (id: string) => {
        try {
            await deleteAirtableTemplate(id);
            onNotify('success', 'Plantilla eliminada');
            setDeleteConfirmId(null);
            await loadTemplates();
        } catch (err: any) {
            onNotify('error', `Error eliminando: ${err.message}`);
        }
    }, [loadTemplates, onNotify]);

    // ─── Open edit ───────────────────────────────────────────
    const openEdit = (t: ApiAirtableTemplateOut) => {
        setEditing({ id: t.id, name: t.name, content: t.content, category: t.category });
        setView('edit');
    };

    const openCreate = () => {
        setEditing(EMPTY_TEMPLATE);
        setView('create');
    };

    // ─── RENDER: Create/Edit Form ────────────────────────────
    if (view === 'create' || view === 'edit') {
        return (
            <div className="h-full flex flex-col bg-white">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setView('list'); setEditing(EMPTY_TEMPLATE); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-75 text-gray-500 transition-colors"
                        >
                            ←
                        </button>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {view === 'create' ? 'Nueva plantilla' : 'Editar plantilla'}
                            </h2>
                            <p className="text-label text-gray-400">
                                Crea respuestas rápidas con variables de Airtable
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !editing.name.trim() || !editing.content.trim()}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {saving ? 'Guardando...' : view === 'create' ? 'Crear plantilla' : 'Guardar cambios'}
                    </button>
                </div>

                {/* Form body */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 py-6 flex flex-col gap-5">
                        {/* Name + Category row */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
                                <input
                                    type="text"
                                    value={editing.name}
                                    onChange={(e) => setEditing((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="Ej: Seguimiento de venta"
                                    className="w-full px-3 py-2.5 text-body border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
                                <select
                                    value={editing.category}
                                    onChange={(e) => setEditing((prev) => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2.5 text-body border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Variables chips */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Variables disponibles</label>
                            <p className="text-label text-gray-400 mb-2">Haz clic para insertar en el mensaje</p>
                            <div className="flex flex-wrap gap-2">
                                {AVAILABLE_VARIABLES.map((v) => (
                                    <button
                                        key={v.key}
                                        onClick={() => insertVariable(v.key)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-primary-light hover:border-primary hover:text-primary transition-colors"
                                    >
                                        <span>{v.icon}</span>
                                        <span className="font-mono text-label">{`{{${v.key}}}`}</span>
                                        <span className="text-label text-gray-400">{v.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Content textarea */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mensaje</label>
                            <textarea
                                ref={contentRef}
                                value={editing.content}
                                onChange={(e) => setEditing((prev) => ({ ...prev, content: e.target.value }))}
                                placeholder="Hola {{nombre}}, soy tu asesor de {{empresa}}. Me gustaría darte seguimiento sobre tu proceso en etapa {{stage}}..."
                                rows={6}
                                className="w-full px-3 py-2.5 text-body border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors resize-y font-mono"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-label text-gray-400">
                                    {editing.content.length} caracteres
                                </span>
                                <span className="text-label text-gray-400">
                                    {(editing.content.match(/\{\{\w+\}\}/g) || []).length} variables
                                </span>
                            </div>
                        </div>

                        {/* Live preview */}
                        {editing.content && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vista previa</label>
                                <div className="bg-green-bubble rounded-xl rounded-tr-sm px-4 py-3 max-w-md shadow-xs">
                                    <div
                                        className="text-body text-gray-800 whitespace-pre-wrap"
                                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                                    />
                                    <div className="text-right mt-1">
                                        <span className="text-label text-gray-400">12:00 PM ✓✓</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── RENDER: Template List ───────────────────────────────
    return (
        <div className="h-full flex flex-col bg-surface-light">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <span>⚡</span> Respuestas Rápidas
                        </h1>
                        <p className="text-body text-gray-400 mt-0.5">
                            Plantillas con datos de Airtable para responder en segundos
                        </p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-xs"
                    >
                        <span>+</span> Nueva plantilla
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar plantilla por nombre, contenido o categoría..."
                        className="w-full pl-9 pr-4 py-2.5 text-body border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-primary focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="animate-spin text-2xl mb-2">◌</div>
                            <span className="text-body text-gray-400">Cargando plantillas...</span>
                        </div>
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mb-4">
                            <span className="text-3xl">⚡</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-1">Sin plantillas aún</h3>
                        <p className="text-body text-gray-400 mb-4 text-center max-w-sm">
                            Crea tu primera plantilla para responder a tus contactos en segundos con datos de Airtable
                        </p>
                        <button
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                            <span>+</span> Crear primera plantilla
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-body text-gray-400">
                        Sin resultados para "{search}"
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {Array.from(grouped.entries()).map(([category, items]: [string, ApiAirtableTemplateOut[]]) => (
                            <div key={category}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-semibold text-gray-600">{category}</span>
                                    <span className="text-label bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">{items.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {items.map((t) => (
                                        <TemplateCard
                                            key={t.id}
                                            template={t}
                                            onEdit={() => openEdit(t)}
                                            onDelete={() => setDeleteConfirmId(t.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats footer */}
            {!loading && templates.length > 0 && (
                <div className="bg-white border-t border-gray-100 px-6 py-2.5 flex items-center gap-4">
                    <span className="text-label text-gray-400">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
                    <span className="text-label text-gray-300">|</span>
                    <span className="text-label text-gray-400">{grouped.size} categoría{grouped.size !== 1 ? 's' : ''}</span>
                </div>
            )}

            {/* Delete confirm overlay */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-modal p-6 max-w-sm w-full mx-4 animate-fade-in">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">Eliminar plantilla</h3>
                        <p className="text-body text-gray-500 mb-4">
                            ¿Seguro que quieres eliminar esta plantilla? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-75 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="px-4 py-2 text-sm bg-red text-white rounded-lg hover:opacity-90 transition-colors"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Template Card Component ─────────────────────────────────────────────────

function TemplateCard({
    template,
    onEdit,
    onDelete,
}: {
    template: ApiAirtableTemplateOut;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const varCount = template.variables?.length ?? 0;

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-xs hover:shadow-sm transition-shadow overflow-hidden group">
            {/* Card body */}
            <div className="px-4 py-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-800 truncate">{template.name}</h4>
                        <span className="text-label text-gray-400">{template.category}</span>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button
                            onClick={onEdit}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-75 text-gray-400 text-sm transition-colors"
                            title="Editar"
                        >
                            ✏️
                        </button>
                        <button
                            onClick={onDelete}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-light2 text-gray-400 hover:text-red text-sm transition-colors"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                </div>

                {/* Content preview as chat bubble */}
                <div className="bg-green-bubble rounded-lg rounded-tr-sm px-3 py-2 text-label text-gray-700 line-clamp-3 whitespace-pre-wrap">
                    {template.content.replace(/\{\{(\w+)\}\}/g, (match, key) => SAMPLE_DATA[key] || match)}
                </div>

                {/* Variable chips */}
                {varCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {template.variables.map((v) => (
                            <span
                                key={v}
                                className="text-label bg-primary-light text-primary px-1.5 py-0.5 rounded font-mono"
                            >
                                {`{{${v}}}`}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
