// ─── Airtable table names (Sales CRM) ───────────────────────────────────────

export const TABLES = {
    LEADS: 'Leads',
    CONTACTS: 'Contacts',
    ACCOUNTS: 'Accounts',
    INTERACTIONS: 'Interaction History',
    INTERACTION_TYPES: 'Interaction Types',
    PEOPLE: 'People',
} as const;

// ─── Lead field constants ───────────────────────────────────────────────────

export const LEAD_FIELDS = {
    LEAD_ID: 'Lead ID [aux]',
    LEAD_FIRST_NAME: 'Lead First Name',
    LEAD_LAST_NAME: 'Lead Last Name',
    LEAD_FULL_NAME: 'Lead Full Name',
    LEAD_PHONE: 'Lead Phone',
    LEAD_EMAIL: 'Lead Email',
    LEAD_CODE: 'Lead Code',
    LEAD_JOB_TITLE: 'Lead Job Title',
    COMPANY_NAME: 'Company Name',
    INDUSTRY: 'Industry',
    STAGE: 'Stage',
    OWNER: 'Owner',
    LEAD_SOURCE: 'Lead Source',
    REQUEST_DATE: 'Request Date',
    FIRST_CONTACT_DATE: 'First Contact Date',
    CALL_INSIGHTS: 'Call Insights',
    NOT_VIABLE_REASON: 'Not Viable Reason',
} as const;

// ─── Contact field constants ────────────────────────────────────────────────

export const CONTACT_FIELDS = {
    CONTACT_NAME: 'Contact Name',
    FIRST_NAME: 'First Name',
    LAST_NAME: 'Last Name',
    EMAIL: 'Email',
    PHONE: 'Phone',
    JOB_TITLE: 'Job Title',
    DEPARTMENT: 'Department',
    ACCOUNT: 'Account',
    ACCOUNT_OWNER: 'Account Owner',
    OPPORTUNITIES: 'Opportunities',
    CONTACT_TYPE: 'Contact Type',
    IS_MAIN_CONTACT: 'Is Main Contact',
    LINKEDIN: 'LinkedIn',
    ACCOUNT_NAME: 'Account Name [aux]',
    CONTACT_RECORD_ID: 'Contact Record ID [aux]',
} as const;

// ─── People field constants ─────────────────────────────────────────────────

export const PEOPLE_FIELDS = {
    FULL_NAME: 'Full Name',
    EMAIL: 'Email',
} as const;

// ─── Account field constants ────────────────────────────────────────────────

export const ACCOUNT_FIELDS = {
    ACCOUNT_NAME: 'Account Name',
    INDUSTRY: 'Industry',
    COMPANY_WEBSITE: 'Company Website',
    COMPANY_LINKEDIN: 'Company LinkedIn',
    HQ_STATE: 'HQ State',
    TOTAL_ACTIVE_DEALS: 'Total Active Deals Value',
    RECORD_ID: 'Record ID [aux]',
} as const;

// ─── Interaction field constants ────────────────────────────────────────────

export const INTERACTION_FIELDS = {
    NAME: 'Name',
    TYPE: 'Type',
    DATE_EXECUTED: 'Date Executed',
    NOTES: 'Notes',
    TEAM: 'Team',
    ACCOUNT: 'Account',
    CONTACT: 'Contact',
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
