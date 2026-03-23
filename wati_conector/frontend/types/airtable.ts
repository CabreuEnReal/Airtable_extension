// ─── Airtable table names ───────────────────────────────────────────────────

export const TABLES = {
    CONTACTS: 'Contacts Local',
} as const;

// ─── Airtable field name constants (Contacts only) ──────────────────────────

export const CONTACT_FIELDS = {
    CONTACT_NAME: 'Contact Name',
    FIRST_NAME: 'First Name',
    LAST_NAME: 'Last Name',
    EMAIL: 'Email',
    PHONE: 'Phone',
    COMPANY: 'Empresa',
    LEAD_CODE: 'Lead Code',
    LEAD_ID: 'Lead ID',
    LEAD_SOURCE: 'Lead Source',
    STAGE: 'Stage',
    STAGE_STATUS: 'Stage Status',
    LAST_STAGE_STATUS: 'Last Stage Status',
    BUSINESS_UNIT: 'Business Unit',
    REQUEST_DATE: 'Request Date',
    TAGS: 'Tags',
    JOB_TITLE: 'Job Title',
} as const;

// ─── Raw Airtable record shape (from REST API) ─────────────────────────────

export interface AirtableRecord {
    id: string;
    fields: Record<string, any>;
    createdTime?: string;
}

export interface AirtableListResponse {
    records: AirtableRecord[];
    offset?: string;
}
