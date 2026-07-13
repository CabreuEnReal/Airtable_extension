import { AIRTABLE_CONFIG } from '../constants/config';
import { TABLES, PEOPLE_FIELDS, LEAD_FIELDS, OPPORTUNITY_FIELDS, INTERACTION_FIELDS } from '../types/airtable';
import type { AirtableRecord, AirtableListResponse } from '../types/airtable';
import type { Contact, Lead, Interaction, InteractionType } from '../types/models';
import { adaptLeadsToContacts, adaptContacts, adaptOpportunitiesToContacts, adaptLeads, adaptInteractions, adaptInteraction } from '../adapters/contactAdapter';

// ─── Mutable baseId (detected from URL at runtime) ─────────────────────────

let baseId: string = AIRTABLE_CONFIG.BASE_ID as string;


export function detectBaseId(): string {
    if (typeof window !== 'undefined' && window.location) {
        const match = window.location.href.match(/airtable\.com\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
            baseId = match[1];
            return baseId;
        }
    }
    return baseId;
}

// ─── Low-level Fetch ────────────────────────────────────────────────────────

const WHATSAPP_VIEW = 'Whatsapp Data';

async function paginatedList(tableName: string, params: Record<string, string> = {}): Promise<AirtableRecord[]> {
    let allRecords: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
        const query: Record<string, string> = { ...params };
        if (offset) query.offset = offset;
        const qs = new URLSearchParams(query).toString();
        const url = `${AIRTABLE_CONFIG.API_URL}/${baseId}/${encodeURIComponent(tableName)}${qs ? '?' + qs : ''}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_CONFIG.TOKEN}` },
        });
        if (!res.ok) throw new Error(`Airtable ${tableName} ${res.status}`);
        const data: AirtableListResponse = await res.json();
        allRecords = allRecords.concat(data.records || []);
        offset = data.offset;
    } while (offset);
    return allRecords;
}

/** Try with view first; if 422 (view not found), retry without view */
async function paginatedListWithView(tableName: string, extraParams: Record<string, string> = {}): Promise<AirtableRecord[]> {
    try {
        return await paginatedList(tableName, { view: WHATSAPP_VIEW, ...extraParams });
    } catch (err: any) {
        if (err?.message?.includes('422')) {
            console.warn(`View "${WHATSAPP_VIEW}" not found for ${tableName}, loading without view`);
            return paginatedList(tableName, extraParams);
        }
        throw err;
    }
}

/** Fetch a single table safely — returns [] on error instead of throwing */
async function safeFetch(tableName: string, extraParams: Record<string, string> = {}): Promise<AirtableRecord[]> {
    try {
        return await paginatedListWithView(tableName, extraParams);
    } catch (err) {
        console.error(`Failed to load ${tableName}:`, err);
        return [];
    }
}

// ─── People lookup (Owner name resolution) ──────────────────────────────────

let peopleCache: Map<string, string> = new Map();

async function loadPeopleCache(): Promise<Map<string, string>> {
    if (peopleCache.size > 0) return peopleCache;
    const records = await paginatedList(TABLES.PEOPLE);
    const map = new Map<string, string>();
    for (const r of records) {
        map.set(r.id, r.fields[PEOPLE_FIELDS.FULL_NAME] ?? '');
    }
    peopleCache = map;
    return map;
}

// ─── Identity: resolve current user's People record id by email ─────────────
// Blocker B workaround — opportunity Owner links to a People record, NOT to the
// Airtable collaborator. We bridge via email: People.Email === currentUser.email.

let peopleByEmailCache: Map<string, string> | null = null;

/** Airtable Email field may be plain string, array (lookup), or object ({email|text|name}). */
function extractEmail(raw: unknown): string {
    if (raw == null) return '';
    if (Array.isArray(raw)) return extractEmail(raw[0]);
    if (typeof raw === 'object') {
        const o = raw as Record<string, unknown>;
        return String(o.email ?? o.text ?? o.name ?? '').trim().toLowerCase();
    }
    return String(raw).trim().toLowerCase();
}

export async function resolvePeopleIdByEmail(email: string): Promise<string | null> {
    const target = (email ?? '').trim().toLowerCase();
    console.log('[Identity] resolvePeopleIdByEmail — session email:', JSON.stringify(email), '→ normalized:', target);
    if (!target) {
        console.warn('[Identity] empty session email — aborting resolve');
        return null;
    }

    if (!peopleByEmailCache) {
        const records = await paginatedList(TABLES.PEOPLE);
        console.log(`[Identity] People table read complete — ${records.length} records`);
        peopleByEmailCache = new Map();
        const extracted: string[] = [];
        for (const r of records) {
            const e = extractEmail(r.fields[PEOPLE_FIELDS.EMAIL]);
            extracted.push(e || `(empty:${r.id})`);
            if (e) peopleByEmailCache.set(e, r.id);
        }
        console.log('[Identity] People emails extracted (field "' + PEOPLE_FIELDS.EMAIL + '"):', extracted);
        console.log('[Identity] cache keys:', [...peopleByEmailCache.keys()]);
    }

    const match = peopleByEmailCache.get(target) ?? null;
    if (match) {
        console.log(`[Identity] ✅ MATCH: ${target} → People ${match}`);
    } else {
        console.warn(`[Identity] ❌ NO MATCH for ${target}. Available keys:`, [...peopleByEmailCache.keys()]);
    }
    return match;
}

// ─── All contacts (Leads + CRM Contacts merged, owner names resolved) ───────

export async function getAllContacts(): Promise<Contact[]> {
    // Each table is fetched independently — one failure won't block the others
    // Always exclude Closed Lost at API level; client-side toggle controls search visibility
    console.log('🔍 Loading contacts from all tables...');
    
    const [leadRecords, contactRecords, opportunityRecords, people] = await Promise.all([
        safeFetch(TABLES.LEADS, { filterByFormula: `{${LEAD_FIELDS.STAGE}} != 'No viable'` }),
        safeFetch(TABLES.CONTACTS),
        // Load all Opportunities without view to get ALL records
        paginatedList(TABLES.OPPORTUNITIES),
        loadPeopleCache().catch(() => new Map<string, string>()),
    ]);
    
    console.log(`🔍 Loaded: ${leadRecords.length} leads, ${contactRecords.length} contacts, ${opportunityRecords.length} opportunities`);

    const leads = adaptLeadsToContacts(leadRecords);
    const contacts = adaptContacts(contactRecords);
    const opportunities = adaptOpportunitiesToContacts(opportunityRecords);

    // Resolve owner names
    const allContacts = [...leads, ...contacts, ...opportunities];
    for (const c of allContacts) {
        if (c.ownerId && people.has(c.ownerId)) {
            c.ownerName = people.get(c.ownerId) ?? '';
        }
    }

    return allContacts;
}

// ─── Leads → Contact model (filtered, no "No viable") ──────────────────────

export async function getLeadsAsContacts(): Promise<Contact[]> {
    const records = await paginatedList(TABLES.LEADS, {
        filterByFormula: `{${LEAD_FIELDS.STAGE}} != 'No viable'`,
    });
    return adaptLeadsToContacts(records);
}

// ─── Leads (raw model) ─────────────────────────────────────────────────────

export async function getLeads(): Promise<Lead[]> {
    const records = await paginatedList(TABLES.LEADS);
    return adaptLeads(records);
}

// ─── CRM Contacts ───────────────────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
    const records = await paginatedList(TABLES.CONTACTS);
    return adaptContacts(records);
}

// ─── Interactions ───────────────────────────────────────────────────────────

export async function getInteractions(): Promise<Interaction[]> {
    const records = await paginatedList(TABLES.INTERACTIONS);
    return adaptInteractions(records);
}

// ─── Interaction type / channel catalog (for the note modal <select>) ────────

/**
 * Extract a display label from an unknown record's primary field.
 * Tries common Spanish/English primary-field names, then falls back to
 * the first non-empty string value in the record.
 */
function extractRecordName(fields: Record<string, any>): string {
    for (const key of ['Name', 'Nombre', 'Tipo', 'Canal', 'Tipo de Interaccion', 'Type']) {
        if (typeof fields[key] === 'string' && fields[key].trim()) return fields[key].trim();
    }
    for (const v of Object.values(fields)) {
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

/**
 * Discovers which table is linked by the "Type LR" field in "Interaction History"
 * using the Airtable Metadata API — no Blocks SDK scope limits.
 *
 * GET /v0/meta/bases/{baseId}/tables  → full schema (all tables + field options)
 * Finds linkedTableId from Type LR field options, resolves its name, then fetches
 * its records via the regular REST paginated list.
 *
 * Falls back to INTERACTION_TYPE_CHANNELS constant if metadata lookup fails.
 */
export async function getInteractionTypes(): Promise<InteractionType[]> {
    let linkedTableName: string = TABLES.INTERACTION_TYPE_CHANNELS; // fallback

    try {
        // ── 1. Fetch full base schema from Metadata API ───────────────────────
        const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
        const res = await fetch(metaUrl, {
            headers: { Authorization: `Bearer ${AIRTABLE_CONFIG.TOKEN}` },
        });
        if (!res.ok) throw new Error(`Metadata API ${res.status}: ${await res.text().catch(() => '')}`);

        const schema: { tables: Array<{ id: string; name: string; fields: Array<{ id: string; name: string; options?: any }> }> }
            = await res.json();

        // ── 2. Find the Interaction History table ─────────────────────────────
        const interactionsTable = schema.tables.find((t) => t.name === TABLES.INTERACTIONS);
        if (!interactionsTable) {
            throw new Error(`Table "${TABLES.INTERACTIONS}" not found. Available: ${schema.tables.map((t) => t.name).join(', ')}`);
        }

        // ── 3. Find "Type LR" field and extract linkedTableId ─────────────────
        const typeLRField = interactionsTable.fields.find((f) => f.name === INTERACTION_FIELDS.TYPE_LR);
        if (!typeLRField) {
            throw new Error(`Field "${INTERACTION_FIELDS.TYPE_LR}" not found. Available: ${interactionsTable.fields.map((f) => f.name).join(', ')}`);
        }

        const linkedTableId = typeLRField.options?.linkedTableId as string | undefined;
        if (!linkedTableId) throw new Error('"Type LR" has no linkedTableId — verify field is a Linked Record type');

        // ── 4. Resolve linked table name ──────────────────────────────────────
        const linkedTable = schema.tables.find((t) => t.id === linkedTableId);
        if (!linkedTable) throw new Error(`linkedTableId "${linkedTableId}" not found in schema`);

        linkedTableName = linkedTable.name;

    } catch (error: any) {
        console.error('[InteractionTypes] Failed to resolve linked table:', error?.message ?? error);
        // Continues with fallback constant
    }

    // ── 5. Fetch records from the resolved (or fallback) table ────────────────
    const records = await paginatedList(linkedTableName);
    return records
        .map((r) => ({ id: r.id, name: extractRecordName(r.fields) }))
        .filter((t) => t.name);
}

// ─── Generic single-record fetch ────────────────────────────────────────────

async function getRecord(tableName: string, recordId: string): Promise<AirtableRecord> {
    const url = `${AIRTABLE_CONFIG.API_URL}/${baseId}/${encodeURIComponent(tableName)}/${recordId}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_CONFIG.TOKEN}` },
    });
    if (!res.ok) throw new Error(`Airtable GET ${tableName}/${recordId} ${res.status}`);
    return res.json();
}

/**
 * Return the raw cellphone string from a People record.
 * Tries `Cellphone` first; falls back to `Cellphone (formatted)`.
 * Returns empty string if neither field is present.
 */
export async function getPeopleCellphone(peopleId: string): Promise<string> {
    const rec = await getRecord(TABLES.PEOPLE, peopleId);
    const rawCellphone = rec.fields[PEOPLE_FIELDS.CELLPHONE];
    const rawFormatted = rec.fields[PEOPLE_FIELDS.CELLPHONE_FORMATTED];
    console.log(`[WA Match] People ${peopleId} → Cellphone: ${JSON.stringify(rawCellphone)}, Cellphone (formatted): ${JSON.stringify(rawFormatted)}`);
    const result = String(rawCellphone ?? rawFormatted ?? '').trim();
    console.log(`[WA Match] Returning phone: "${result}"`);
    return result;
}

/**
 * Resolve the current user's team from their People record (for Pendo).
 * `Team LR` → linked Teams record id; `Team SS` → team name (multipleSelects).
 */
export async function getPeopleTeam(peopleId: string): Promise<{ teamRecordId: string | null; teamSS: string | null }> {
    const rec = await getRecord(TABLES.PEOPLE, peopleId);
    const teamLinks = rec.fields[PEOPLE_FIELDS.TEAM_LR];
    const teamSSRaw = rec.fields[PEOPLE_FIELDS.TEAM_SS];
    return {
        teamRecordId: Array.isArray(teamLinks) && teamLinks[0] ? String(teamLinks[0]) : null,
        teamSS: Array.isArray(teamSSRaw) ? (teamSSRaw[0] ?? null) : (teamSSRaw ? String(teamSSRaw) : null),
    };
}

// ─── Generic create (POST a single record) ──────────────────────────────────

async function createRecord(tableName: string, fields: Record<string, unknown>): Promise<AirtableRecord> {
    const url = `${AIRTABLE_CONFIG.API_URL}/${baseId}/${encodeURIComponent(tableName)}`;
    const body = { fields, typecast: true };
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${AIRTABLE_CONFIG.TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Airtable create ${tableName} ${res.status}: ${txt}`);
    }
    return res.json();
}

export interface NewInteractionInput {
    /** Manual note text → Notes. */
    notes: string;
    /** Single type record id — use typeIds for multiple. */
    typeId?: string;
    /** Multiple type record ids (takes precedence over typeId). */
    typeIds?: string[];
    /** Opportunities record id (recXXXX) → Opportunity link. */
    opportunityId?: string;
    /** Contacts record id (recXXXX) → Contacts link. */
    contactId?: string;
    /** Current user email → "Team Participants" collaborator field (typecast resolves by email). */
    participantEmail?: string;
    /** Galea AI note → AI Notes (reserved). */
    aiNotes?: string;
}

/**
 * Create an Interaction History record.
 * STRICT schema:
 *  - NEVER writes "Name" (computed formula/autonumber).
 *  - NEVER writes "Type" (computed lookup). Channel goes to "Type LR" (linked record).
 */
/** Create a new Interaction Type record and return its record id. */
export async function createInteractionType(name: string): Promise<string> {
    const rec = await createRecord('tblseDeqVk1hMo6TW', { Name: name });
    return rec.id;
}

export async function createInteraction(input: NewInteractionInput): Promise<Interaction> {
    const resolvedTypeIds = input.typeIds && input.typeIds.length > 0
        ? input.typeIds
        : input.typeId ? [input.typeId] : [];
    const fields: Record<string, unknown> = {
        [INTERACTION_FIELDS.NOTES]: input.notes,
        [INTERACTION_FIELDS.TYPE_LR]: resolvedTypeIds,
        // ISO 8601 UTC — Airtable displays in the field's configured timezone (America/Mexico_City)
        [INTERACTION_FIELDS.DATE_EXECUTED]: new Date().toISOString(),
    };
    if (input.opportunityId) fields[INTERACTION_FIELDS.OPPORTUNITY] = [input.opportunityId];
    if (input.contactId) fields[INTERACTION_FIELDS.CONTACTS] = [input.contactId];
    if (input.participantEmail) fields[INTERACTION_FIELDS.PARTICIPANTS] = [{ email: input.participantEmail }];
    if (input.aiNotes) fields[INTERACTION_FIELDS.AI_NOTES] = input.aiNotes;

    const rec = await createRecord(TABLES.INTERACTIONS, fields);
    return adaptInteraction(rec);
}
