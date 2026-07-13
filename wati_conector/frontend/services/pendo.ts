// ─── Pendo Analytics ─────────────────────────────────────────────────────────
// Airtable Blocks has no editable index.html, so the official Pendo snippet is
// ported here: stub the queue methods, then inject the agent <script> once.
// CSP note: the extension iframe must allow https://cdn.pendo.io — if the agent
// fails to load, a console warning fires and the queue stubs absorb all calls
// harmlessly (the extension is never blocked).

const PENDO_APP_ID = '6118c48f-7ebf-43dc-9b2d-689c68052b70';

let agentInjected = false;
let initialized = false;

function loadPendoAgent(): void {
    if (agentInjected || typeof window === 'undefined') return;
    agentInjected = true;

    const w = window as any;
    const pendo = (w.pendo = w.pendo || {});
    pendo._q = pendo._q || [];
    const methods = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track', 'trackAgent'];
    methods.forEach((m, i) => {
        pendo[m] =
            pendo[m] ||
            function (...args: unknown[]) {
                pendo._q[i === 0 ? 'unshift' : 'push']([m].concat(args as any[]));
            };
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://cdn.pendo.io/agent/static/${PENDO_APP_ID}/pendo.js`;
    script.onerror = () => {
        console.warn('[Pendo] agent failed to load — likely blocked by Airtable CSP. Analytics disabled.');
    };
    const first = document.getElementsByTagName('script')[0];
    if (first?.parentNode) {
        first.parentNode.insertBefore(script, first);
    } else {
        document.head.appendChild(script);
    }
}

export interface PendoIdentity {
    visitorId: string;   // team decision: visitor.id = user email
    visitorName?: string;
    accountId?: string;  // Teams table record id
    accountName?: string; // {Team SS} from People
}

/** Initialize Pendo once per session. No-op on repeat calls or empty visitorId. */
export function initializePendo(identity: PendoIdentity): void {
    if (initialized || !identity.visitorId) return;
    initialized = true;

    loadPendoAgent();

    const payload: Record<string, unknown> = {
        visitor: {
            id: identity.visitorId,
            full_name: identity.visitorName || undefined,
        },
    };
    if (identity.accountId) {
        payload.account = {
            id: identity.accountId,
            name: identity.accountName || undefined,
        };
    }
    (window as any).pendo.initialize(payload);
    console.log('[Pendo] initialized', { visitor: identity.visitorId, account: identity.accountId ?? '(none)' });
}

/** Signal an internal view change (tabs/routes). No-op before initialization. */
export function pendoPageLoad(): void {
    if (!initialized) return;
    const pendo = (window as any).pendo;
    if (pendo?.pageLoad) pendo.pageLoad();
}
