import type { Contact, Lead, Interaction } from '../types/models';
import type { AirtableRecord } from '../types/airtable';
import { LEAD_FIELDS, CONTACT_FIELDS, INTERACTION_FIELDS } from '../types/airtable';

// ─── Lead Record → Contact UI Model (primary for conversations) ─────────────

export function adaptLeadToContact(raw: AirtableRecord): Contact {
    const f = raw.fields;
    const firstName = f[LEAD_FIELDS.LEAD_FIRST_NAME] ?? '';
    const lastName = f[LEAD_FIELDS.LEAD_LAST_NAME] ?? '';
    const fullName = f[LEAD_FIELDS.LEAD_FULL_NAME] ?? '';

    return {
        id: raw.id,
        displayName: fullName || `${firstName} ${lastName}`.trim() || 'Sin nombre',
        firstName,
        lastName,
        email: f[LEAD_FIELDS.LEAD_EMAIL] ?? '',
        phone: f[LEAD_FIELDS.LEAD_PHONE] ?? '',
        company: f[LEAD_FIELDS.COMPANY_NAME] ?? '',
        jobTitle: f[LEAD_FIELDS.LEAD_JOB_TITLE] ?? '',
        department: '',
        stage: f[LEAD_FIELDS.STAGE] ?? '',
        leadCode: f[LEAD_FIELDS.LEAD_CODE] ?? '',
        leadSource: f[LEAD_FIELDS.LEAD_SOURCE] ?? '',
        industry: f[LEAD_FIELDS.INDUSTRY] ?? '',
        ownerId: parseLinkedRecord(f[LEAD_FIELDS.OWNER]),
        ownerName: '',
        contactType: 'lead',
    };
}

// ─── Contact Record → Contact UI Model (secondary) ─────────────────────────

export function adaptCrmContact(raw: AirtableRecord): Contact {
    const f = raw.fields;
    const firstName = f[CONTACT_FIELDS.FIRST_NAME] ?? '';
    const lastName = f[CONTACT_FIELDS.LAST_NAME] ?? '';
    const contactName = f[CONTACT_FIELDS.CONTACT_NAME] ?? '';
    const accountName = parseArrayField(f[CONTACT_FIELDS.ACCOUNT_NAME]);

    return {
        id: raw.id,
        displayName: contactName || `${firstName} ${lastName}`.trim() || 'Sin nombre',
        firstName,
        lastName,
        email: f[CONTACT_FIELDS.EMAIL] ?? '',
        phone: f[CONTACT_FIELDS.PHONE] ?? '',
        company: accountName,
        jobTitle: f[CONTACT_FIELDS.JOB_TITLE] ?? '',
        department: f[CONTACT_FIELDS.DEPARTMENT] ?? '',
        stage: '',
        leadCode: '',
        leadSource: '',
        industry: '',
        ownerId: parseLinkedRecord(f[CONTACT_FIELDS.ACCOUNT_OWNER]),
        ownerName: '',
        contactType: 'contact',
    };
}

// ─── Lead Record → Lead Model ───────────────────────────────────────────────

export function adaptLead(raw: AirtableRecord): Lead {
    const f = raw.fields;
    return {
        id: raw.id,
        leadId: f[LEAD_FIELDS.LEAD_ID] ?? 0,
        firstName: f[LEAD_FIELDS.LEAD_FIRST_NAME] ?? '',
        lastName: f[LEAD_FIELDS.LEAD_LAST_NAME] ?? '',
        fullName: f[LEAD_FIELDS.LEAD_FULL_NAME] ?? '',
        phone: f[LEAD_FIELDS.LEAD_PHONE] ?? '',
        email: f[LEAD_FIELDS.LEAD_EMAIL] ?? '',
        leadCode: f[LEAD_FIELDS.LEAD_CODE] ?? '',
        jobTitle: f[LEAD_FIELDS.LEAD_JOB_TITLE] ?? '',
        companyName: f[LEAD_FIELDS.COMPANY_NAME] ?? '',
        industry: f[LEAD_FIELDS.INDUSTRY] ?? '',
        stage: f[LEAD_FIELDS.STAGE] ?? '',
        ownerId: parseLinkedRecord(f[LEAD_FIELDS.OWNER]),
        leadSource: f[LEAD_FIELDS.LEAD_SOURCE] ?? '',
        requestDate: f[LEAD_FIELDS.REQUEST_DATE] ?? '',
        firstContactDate: f[LEAD_FIELDS.FIRST_CONTACT_DATE] ?? '',
        callInsights: f[LEAD_FIELDS.CALL_INSIGHTS] ?? '',
        notViableReason: parseMultiSelect(f[LEAD_FIELDS.NOT_VIABLE_REASON]),
    };
}

// ─── Interaction Record → Interaction Model ─────────────────────────────────

export function adaptInteraction(raw: AirtableRecord): Interaction {
    const f = raw.fields;
    return {
        id: raw.id,
        name: f[INTERACTION_FIELDS.NAME] ?? '',
        type: parseMultiSelect(f[INTERACTION_FIELDS.TYPE]),
        dateExecuted: f[INTERACTION_FIELDS.DATE_EXECUTED] ?? '',
        notes: f[INTERACTION_FIELDS.NOTES] ?? '',
        team: parseMultiSelect(f[INTERACTION_FIELDS.TEAM]),
        accountId: parseLinkedRecord(f[INTERACTION_FIELDS.ACCOUNT]),
        contactId: parseLinkedRecord(f[INTERACTION_FIELDS.CONTACT]),
    };
}

// ─── Batch adapters ─────────────────────────────────────────────────────────

export function adaptLeadsToContacts(records: AirtableRecord[]): Contact[] {
    return records.map(adaptLeadToContact);
}

export function adaptContacts(records: AirtableRecord[]): Contact[] {
    return records.map(adaptCrmContact);
}

export function adaptLeads(records: AirtableRecord[]): Lead[] {
    return records.map(adaptLead);
}

export function adaptInteractions(records: AirtableRecord[]): Interaction[] {
    return records.map(adaptInteraction);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseLinkedRecord(val: unknown): string {
    if (!val) return '';
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === 'string') return val;
    return '';
}

function parseArrayField(val: unknown): string {
    if (!val) return '';
    if (Array.isArray(val) && val.length > 0) return String(val[0]);
    if (typeof val === 'string') return val;
    return '';
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
