import type { ParsedMessage } from '../types/models';

// Spanish (Gmail/Outlook in ES locale):
// "El vie, 6 sept 2024 a la(s) 5:50 p.m., Carlos Abreu (carlosa@energiareal.mx) escribió:"
const ES_SEP_RE = /El .{1,60}? a la\(s\) .{1,30}?,\s+(.{1,100}?)\s+\(([^)]+@[^)\s]+)\)\s+escribió:/g;

// English Outlook inline header:
// "From: Name <email>\r\nSent: ...\r\nTo: ..."
const EN_SEP_RE = /From:\s*(.+?)[\r\n]+Sent:\s*.+?[\r\n]+To:\s*.+?[\r\n]+/gs;

function cleanContent(text: string): string {
    return text
        .split('\n')
        .filter(line => !line.trimStart().startsWith('>'))
        .join('\n')
        .replace(/\n--\s*\n[\s\S]*$/, '')
        .trim();
}

function fromSpanish(m: RegExpMatchArray): { name: string; email: string } {
    return { name: m[1].trim(), email: m[2].trim() };
}

function fromOutlook(m: RegExpMatchArray): { name: string; email: string } {
    const raw = m[1].trim();
    const angle = raw.match(/^(.*?)\s*<([^>]+)>$/);
    if (angle) return { name: angle[1].trim(), email: angle[2].trim() };
    const emailOnly = raw.match(/([^\s@]+@[^\s@.]+\.[^\s@]+)/);
    return { name: raw, email: emailOnly?.[1] ?? '' };
}

function splitByMatches(
    body: string,
    matches: RegExpMatchArray[],
    defaultFrom: { name: string; email: string },
    defaultDate: string,
    getFrom: (m: RegExpMatchArray) => { name: string; email: string }
): ParsedMessage[] {
    const results: ParsedMessage[] = [];
    let cursor = 0;

    matches.forEach((match, idx) => {
        const chunk = body.slice(cursor, match.index).trim();
        const from = idx === 0 ? defaultFrom : getFrom(matches[idx - 1]);
        if (chunk) {
            results.push({ id: `parsed_${idx}`, content: cleanContent(chunk), from, date: defaultDate, isOriginal: false });
        }
        cursor = (match.index ?? 0) + match[0].length;
    });

    const tail = body.slice(cursor).trim();
    if (tail) {
        results.push({
            id: `parsed_${matches.length}`,
            content: cleanContent(tail),
            from: getFrom(matches[matches.length - 1]),
            date: defaultDate,
            isOriginal: false,
        });
    }

    const sorted = results.reverse(); // oldest first
    if (sorted.length > 0) sorted[0] = { ...sorted[0], isOriginal: true };
    return sorted;
}

export function parseEmailThread(
    rawBody: string,
    defaultFrom: { name: string; email: string },
    defaultDate: string
): ParsedMessage[] {
    if (!rawBody?.trim()) {
        return [{ id: 'parsed_0', content: '', from: defaultFrom, date: defaultDate, isOriginal: true }];
    }

    const esMatches = [...rawBody.matchAll(ES_SEP_RE)];
    if (esMatches.length > 0) {
        return splitByMatches(rawBody, esMatches, defaultFrom, defaultDate, fromSpanish);
    }

    const enMatches = [...rawBody.matchAll(EN_SEP_RE)];
    if (enMatches.length > 0) {
        return splitByMatches(rawBody, enMatches, defaultFrom, defaultDate, fromOutlook);
    }

    return [{ id: 'parsed_0', content: cleanContent(rawBody), from: defaultFrom, date: defaultDate, isOriginal: true }];
}
