import type { Contact, Lead, Interaction } from '../types/models';
import type { AirtableRecord } from '../types/airtable';
import type { ApiContactOut } from '../types/api';
import { LEAD_FIELDS, CONTACT_FIELDS, OPPORTUNITY_FIELDS, INTERACTION_FIELDS } from '../types/airtable';

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
        stage: safeString(f[LEAD_FIELDS.STAGE]),
        leadCode: f[LEAD_FIELDS.LEAD_CODE] ?? '',
        leadSource: f[LEAD_FIELDS.LEAD_SOURCE] ?? '',
        industry: f[LEAD_FIELDS.INDUSTRY] ?? '',
        ownerId: parseLinkedRecord(f[LEAD_FIELDS.OWNER]),
        ownerName: '',
        contactType: 'lead',
        // Contextual metadata
        keyAccount: !!f[LEAD_FIELDS.KEY_ACCOUNT],
        becameSQL: !!f[LEAD_FIELDS.BECAME_SQL],
        products: parseMultiSelect(f[LEAD_FIELDS.PRODUCTS_PRELIMINARY]),
        callInsights: safeString(f[LEAD_FIELDS.CALL_INSIGHTS]),
        linkedInSummary: safeString(f[LEAD_FIELDS.BP1_LINKEDIN_SUMMARY]),
        companyDescription: safeString(f[LEAD_FIELDS.COMPANY_DESCRIPTION]),
        cltvTotal: typeof f[LEAD_FIELDS.CLTV_TOTAL] === 'number' ? f[LEAD_FIELDS.CLTV_TOTAL] : undefined,
    };
}

// ─── Contact Record → Contact UI Model (secondary) ─────────────────────────

export function adaptCrmContact(raw: AirtableRecord): Contact {
    const f = raw.fields;
    const firstName = f[CONTACT_FIELDS.FIRST_NAME] ?? '';
    const lastName = f[CONTACT_FIELDS.LAST_NAME] ?? '';
    const contactName = f[CONTACT_FIELDS.CONTACT_NAME] ?? '';
    const accountName = parseArrayField(f[CONTACT_FIELDS.ACCOUNT_NAME]);

    // Use Airtable's Contact Type if available, otherwise default to 'contact'
    const rawContactType = f[CONTACT_FIELDS.CONTACT_TYPE];
    const airtableCT = typeof rawContactType === 'object' && rawContactType?.name
        ? rawContactType.name
        : (typeof rawContactType === 'string' ? rawContactType : '');

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
        // Contextual metadata
        isMainContact: !!f[CONTACT_FIELDS.IS_MAIN_CONTACT],
        decisionLevel: typeof f[CONTACT_FIELDS.DECISION_LEVEL] === 'number' ? f[CONTACT_FIELDS.DECISION_LEVEL] : undefined,
        isClient: parseBooleanLookup(f[CONTACT_FIELDS.IS_CLIENT]),
        linkedIn: f[CONTACT_FIELDS.LINKEDIN] ?? '',
        linkedInSummary: safeString(f[CONTACT_FIELDS.LINKEDIN_SUMMARY]),
        partnerType: parseArrayField(f[CONTACT_FIELDS.PARTNER_TYPE]),
        airtableContactType: airtableCT,
        sponsorIn: parseLinkedRecords(f[CONTACT_FIELDS.SPONSOR_IN]),
        powerSponsorIn: parseLinkedRecords(f[CONTACT_FIELDS.POWER_SPONSORS_IN]),
        companyDescription: safeString(f[CONTACT_FIELDS.COMPANY_DESCRIPTION]),
    };
}

// ─── Opportunity Record → Contact UI Model ──────────────────────────────────

export function adaptOpportunityToContact(raw: AirtableRecord): Contact {
    const f = raw.fields;
    const opCode = f[OPPORTUNITY_FIELDS.OPPORTUNITY_CODE] ?? '';
    const accountName = parseArrayField(f[OPPORTUNITY_FIELDS.ACCOUNT_NAME]);
    const site = f[OPPORTUNITY_FIELDS.SITE] ?? '';
    const mainEmail = parseArrayField(f[OPPORTUNITY_FIELDS.MAIN_CONTACT_EMAIL]);
    const industry = parseArrayField(f[OPPORTUNITY_FIELDS.INDUSTRY]);

    // Display: "OP-123 — AccountName" or just the code
    const displayName = accountName
        ? `${opCode} — ${accountName}`
        : opCode || 'Sin código';

    return {
        id: raw.id,
        displayName,
        firstName: opCode,
        lastName: accountName,
        email: mainEmail,
        phone: '', // Opportunities don't have direct phone; linked via Contacts
        company: accountName,
        jobTitle: site,
        department: safeString(f[OPPORTUNITY_FIELDS.BUSINESS_UNIT]),
        stage: safeString(f[OPPORTUNITY_FIELDS.PIPELINE_STAGE]),
        leadCode: opCode,
        leadSource: '',
        industry,
        ownerId: parseLinkedRecord(f[OPPORTUNITY_FIELDS.OPPORTUNITY_OWNER]),
        ownerName: '',
        contactType: 'opportunity',
        // Contextual metadata
        keyAccount: parseBooleanLookup(f[OPPORTUNITY_FIELDS.KEY_ACCOUNT]),
        isClient: parseBooleanLookup(f[OPPORTUNITY_FIELDS.IS_CLIENT]),
        products: parseMultiSelect(f[OPPORTUNITY_FIELDS.PRODUCTS_PRELIMINARY]),
        financeScheme: parseMultiSelect(f[OPPORTUNITY_FIELDS.FINANCE_SCHEME]),
        totalInstallPower: safeString(f[OPPORTUNITY_FIELDS.TOTAL_INSTALL_POWER]),
        internalProgress: safeString(f[OPPORTUNITY_FIELDS.INTERNAL_PROGRESS]),
        sharepointUrl: safeString(f[OPPORTUNITY_FIELDS.SHAREPOINT_REPOSITORY]),
        priority: safeString(f[OPPORTUNITY_FIELDS.PRIORITY]),
        cltv: typeof f[OPPORTUNITY_FIELDS.CLTV] === 'number' ? f[OPPORTUNITY_FIELDS.CLTV] : undefined,
        lastDoneActivity: safeString(f[OPPORTUNITY_FIELDS.LAST_DONE_ACTIVITY]),
        siteNames: parseMultiSelect(f[OPPORTUNITY_FIELDS.SITE]),
        linkedContactIds: parseLinkedRecords(f[OPPORTUNITY_FIELDS.CONTACTS]),
        sponsorIds: parseLinkedRecords(f[OPPORTUNITY_FIELDS.SPONSORS]),
        powerSponsorIds: parseLinkedRecords(f[OPPORTUNITY_FIELDS.POWER_SPONSORS]),
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

export function adaptOpportunitiesToContacts(records: AirtableRecord[]): Contact[] {
    return records.map(adaptOpportunityToContact);
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

/** Safely convert any Airtable value to string. Handles:
 *  - plain strings
 *  - single select objects {id, name, color}
 *  - AI text objects {state, errorType, value, isStale}
 *  - numbers, booleans
 *  - null/undefined → ''
 */
function safeString(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    // Lookup / rollup fields return arrays — join their elements
    if (Array.isArray(val)) {
        return val.map((item) => safeString(item)).filter(Boolean).join(', ');
    }
    if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        // AI text field: {state, value, ...}
        if ('value' in obj && 'state' in obj) return String(obj.value ?? '');
        // Single select: {id, name, color}
        if ('name' in obj) return String(obj.name ?? '');
        // Rich text or other keyed objects
        if ('text' in obj) return String(obj.text ?? '');
    }
    return String(val);
}

function parseLinkedRecords(val: unknown): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === 'string') return [val];
    return [];
}

function parseBooleanLookup(val: unknown): boolean {
    if (typeof val === 'boolean') return val;
    if (Array.isArray(val) && val.length > 0) return !!val[0];
    return false;
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

// ─── API Contact → Contact UI Model ───────────────────────────────────────

export function adaptApiContact(apiContact: ApiContactOut): Contact {
    const nameParts = apiContact.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Determine contact type based on source field
    const contactType = apiContact.source === 'lead' ? 'lead' : 'contact';
    
    return {
        id: apiContact.airtable_record_id, // Use airtable_record_id as UI id
        displayName: apiContact.name || 'Sin nombre',
        firstName,
        lastName,
        email: apiContact.email || '',
        phone: apiContact.phone_number || '',
        company: '',
        jobTitle: '',
        department: '',
        stage: apiContact.stage || '',
        leadCode: '',
        leadSource: apiContact.source || '',
        industry: '',
        ownerId: '',
        ownerName: apiContact.owner_name || '',
        contactType,
    };
}

export function adaptApiContacts(apiContacts: ApiContactOut[]): Contact[] {
    return apiContacts.map(adaptApiContact);
}
