import type { Contact } from '../types/models';
import type { AirtableRecord } from '../types/airtable';
import { CONTACT_FIELDS } from '../types/airtable';

// ─── Airtable Record → Contact UI Model ────────────────────────────────────

export function adaptContact(raw: AirtableRecord): Contact {
    const f = raw.fields;
    const firstName = f[CONTACT_FIELDS.FIRST_NAME] ?? '';
    const lastName = f[CONTACT_FIELDS.LAST_NAME] ?? '';
    const contactName = f[CONTACT_FIELDS.CONTACT_NAME] ?? '';

    return {
        id: raw.id,
        displayName: contactName || `${firstName} ${lastName}`.trim() || 'Sin nombre',
        firstName,
        lastName,
        email: f[CONTACT_FIELDS.EMAIL] ?? '',
        phone: f[CONTACT_FIELDS.PHONE] ?? '',
        company: f[CONTACT_FIELDS.COMPANY] ?? '',
        leadCode: '', // Field no longer exists
        leadId: '',   // Field no longer exists
        leadSource: '', // Field no longer exists
        stage: parseSingleSelect(f[CONTACT_FIELDS.STAGE]),
        stageStatus: parseSingleSelect(f[CONTACT_FIELDS.STAGE_STATUS]),
        lastStageStatus: parseSingleSelect(f[CONTACT_FIELDS.LAST_STAGE_STATUS]),
        businessUnit: parseSingleSelect(f[CONTACT_FIELDS.BUSINESS_UNIT]),
        requestDate: f[CONTACT_FIELDS.REQUEST_DATE] ?? '',
        tags: parseMultiSelect(f[CONTACT_FIELDS.TAGS]),
    };
}

export function adaptContacts(records: AirtableRecord[]): Contact[] {
    return records.map(adaptContact);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseSingleSelect(val: unknown): string {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val !== null && 'name' in val) {
        return (val as { name: string }).name;
    }
    return String(val);
}

function parseMultiSelect(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item !== null && 'name' in item) {
                return (item as { name: string }).name;
            }
            return String(item);
        });
    }
    if (typeof val === 'string') return val.split(',').map((s) => s.trim());
    return [];
}
