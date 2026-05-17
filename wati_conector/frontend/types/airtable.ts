// ─── Airtable table names (Sales CRM) ───────────────────────────────────────

export const TABLES = {
    LEADS: 'Leads',
    CONTACTS: 'Contacts',
    OPPORTUNITIES: 'Opportunities',
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
    BECAME_SQL: 'Became SQL',
    KEY_ACCOUNT: 'Key Account',
    PRODUCTS_PRELIMINARY: 'Products Preliminary',
    BP1_LINKEDIN_SUMMARY: 'BP1 - Linkedin Summary',
    LEAD_SOURCE_URL: 'Lead Source URL',
    COMPANY_DESCRIPTION: 'Company Description',
    CLTV_TOTAL: 'CLTV TOTAL',
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
    DECISION_LEVEL: 'Decision Level',
    LINKEDIN: 'LinkedIn',
    LINKEDIN_SUMMARY: 'Linkedin Summary',
    IS_CLIENT: 'Is Client (from Account)',
    PARTNER_TYPE: 'Partner Type',
    SPONSOR_IN: 'Sponsor in',
    POWER_SPONSORS_IN: 'Power Sponsors in',
    COMPANY_DESCRIPTION: 'Company Description [aux]',
    ACCOUNT_NAME: 'Account Name [aux]',
    ACCOUNT_RECORD_ID: 'Account Record ID [aux]',
    CONTACT_RECORD_ID: 'Contact Record ID [aux]',
} as const;

// ─── Opportunity field constants ────────────────────────────────────────────

export const OPPORTUNITY_FIELDS = {
    OPPORTUNITY_CODE: 'Opportunity Code',
    OPPORTUNITY_ID: 'Opportunity ID [aux]',
    ACCOUNT: 'Account',
    ACCOUNT_NAME: 'Account Name [deprecate?]',
    PIPELINE_STAGE: 'Pipeline Stage',
    OPPORTUNITY_OWNER: 'Opportunity Owner',
    CONTACTS: 'Contacts',
    MAIN_CONTACT_EMAIL: 'Main Contact Email',
    PRIORITY: 'Priority',
    CLTV: 'CLTV',
    TARGET_CLOSE_DATE: 'Target close date',
    ACTUAL_CLOSE_DATE: 'Actual close date',
    PRODUCTS_PRELIMINARY: 'Products Preliminary',
    FINANCE_SCHEME: 'Finance Scheme Preliminary',
    INDUSTRY: 'Industry (from Account)',
    SITE: 'Site [aux]',
    SOLAR_CI: 'Solar CI (kWp)',
    TOTAL_INSTALL_POWER: 'Total Install Power (MW)',
    NOTES: 'Notes',
    LOST_REASONS: 'Lost Reasons',
    BUSINESS_UNIT: 'Business Unit',
    IS_BID: 'Is Bid',
    KEY_ACCOUNT: 'Key Account',
    INTERNAL_PROGRESS: 'Internal Progress',
    SHAREPOINT_REPOSITORY: 'Sharepoint Repository',
    SPONSORS: 'Sponsors',
    POWER_SPONSORS: 'Power Sponsors',
    LAST_DONE_ACTIVITY: 'Last Done Activity',
    LEAD_SOURCE: 'Lead Source',
    LEAD_SOURCE_TYPE: 'Lead Source Type',
    IS_CLIENT: 'Is Client',
    SITE_NAME_IDS: 'Site Name IDs',
    CLOSING_ESCENARIO: 'Closing Escenario',
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
