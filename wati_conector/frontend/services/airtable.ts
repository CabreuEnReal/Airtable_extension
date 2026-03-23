import { AIRTABLE_CONFIG } from '../constants/config';
import { TABLES } from '../types/airtable';
import type { AirtableRecord, AirtableListResponse } from '../types/airtable';
import type { Contact } from '../types/models';
import { adaptContacts } from '../adapters/contactAdapter';

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

// ─── Contacts (from Airtable) ───────────────────────────────────────────────

export async function getContacts(): Promise<Contact[]> {
    const records = await paginatedList(TABLES.CONTACTS);
    return adaptContacts(records);
}
