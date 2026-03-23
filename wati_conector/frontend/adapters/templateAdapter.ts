import type { Template } from '../types/models';
import type { ApiTemplateOut } from '../types/api';

// ─── Unified API TemplateOut → Template UI Model ─────────────────────────────

export function adaptMetaTemplate(raw: ApiTemplateOut): Template {
    return {
        id: String(raw.id),
        name: raw.name ?? '',
        source: (raw.source === 'meta') ? 'meta' : 'airtable',
        content: raw.content ?? '',
        category: raw.category ?? '',
        isActive: raw.is_active ?? true,
        createdAt: raw.created_at ?? '',
        updatedAt: raw.updated_at ?? '',
        // Meta-specific fields
        language: (raw as any).language, // Backend returns language for Meta templates
        status: (raw as any).status,
        components: (raw as any).components,
        parameterCount: (raw as any).parameter_count,
    };
}

export function adaptMetaTemplates(raws: ApiTemplateOut[]): Template[] {
    return raws.map(adaptMetaTemplate);
}

// ─── Backward compat ───────────────────────────────────────────────────────

export function adaptAirtableTemplate(raw: ApiTemplateOut): Template {
    return adaptMetaTemplate(raw);
}

export function adaptAirtableTemplates(raws: ApiTemplateOut[]): Template[] {
    return raws.map(adaptAirtableTemplate);
}

// ─── Backward compat alias ──────────────────────────────────────────────────

export const adaptTemplates = adaptMetaTemplates;
