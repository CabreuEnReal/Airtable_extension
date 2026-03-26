import { AIRTABLE_CONFIG } from '../constants/config';
import { TABLES, PEOPLE_FIELDS, LEAD_FIELDS } from '../types/airtable';
import type { AirtableRecord, AirtableListResponse } from '../types/airtable';
import type { Contact, Lead, Interaction } from '../types/models';
import { adaptLeadsToContacts, adaptContacts, adaptLeads, adaptInteractions } from '../adapters/contactAdapter';

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
        if (!res.ok) throw new Error(`Airtable ${res.status}`);
        const data: AirtableListResponse = await res.json();
        allRecords = allRecords.concat(data.records || []);
        offset = data.offset;
    } while (offset);
    return allRecords;
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

// ─── All contacts (Leads + CRM Contacts merged, owner names resolved) ───────

export async function getAllContacts(): Promise<Contact[]> {
    const [leadRecords, contactRecords, people] = await Promise.all([
        paginatedList(TABLES.LEADS, { filterByFormula: `{${LEAD_FIELDS.STAGE}} != 'No viable'` }),
        paginatedList(TABLES.CONTACTS),
        loadPeopleCache(),
    ]);

    const leads = adaptLeadsToContacts(leadRecords);
    const contacts = adaptContacts(contactRecords);

    // Resolve owner names
    const allContacts = [...leads, ...contacts];
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
