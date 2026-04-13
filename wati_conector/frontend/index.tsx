import {initializeBlock} from '@airtable/blocks/interface/ui';
import {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import './style.css';

// ─── Services & types ───────────────────────────────────────
import type { Contact, Message, Template, Notification as AppNotification } from './types/models';
import type { WhatsAppNumber, NumberStats, InboxStatus, MessageWithNumber } from './types/whatsapp';
import { POLLING } from './constants/config';
import { detectBaseId, getAllContacts } from './services/airtable';
// contactAdapter imports removed — contacts loaded from Airtable via getAllContacts
import { NumberSelector } from './components/whatsapp/NumberSelector';
import {
    getDynamicApiConfig,
    getApiMessages, 
    getApiTemplates, 
    createApiContact, 
    checkHealth, 
    sendApiMessage, 
    sendMetaTemplate, 
    getAirtableTemplates, 
    renderAirtableTemplate, 
    sendMediaMessage, 
    retryMediaDownload,
    markMessagesAsRead,
    // WhatsApp multi-number functions
    getWhatsAppNumbers,
    syncWhatsAppNumbers,
    getWhatsAppNumberStats,
    getInboxStatus,
    getInboxMessages,
    markInboxMessageAsRead,
    bulkMarkInboxAsRead,
    sendApiMessageFromNumber
} from './services/pythonApi';
import { adaptMessages, adaptMessagesWithNumber, nowMexicoISO } from './adapters/messageAdapter';
import { adaptMetaTemplates, adaptAirtableTemplates } from './adapters/templateAdapter';

// ─── Helpers ────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Layout & components
import { AppLayout } from './components/layout/AppLayout';
import { Sidebar } from './components/layout/Sidebar';
import { ConversationPanel } from './components/conversations/ConversationPanel';
import { ChatPanel } from './components/chat/ChatPanel';
import { DetailPanel } from './components/detail/DetailPanel';
import { NotesModal } from './components/modals/NotesModal';
import { Toast } from './components/common/Toast';
import { Spinner } from './components/common/Spinner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AutomationsPanel } from './components/automations/AutomationsPanel';

// ─── Phone normalisation (strip +, spaces, dashes) ─────────

function normalizePhone(raw: string): string {
    let phone = raw.replace(/[\s+\-()]/g, '');
    // Mexico mobile: 521XXXXXXXXXX → 52XXXXXXXXXX (strip the '1' after country code)
    if (phone.length === 13 && phone.startsWith('521')) {
        phone = '52' + phone.slice(3);
    }
    return phone;
}

/** Return multiple normalized variants of a phone to improve matching */
function phoneVariants(raw: string): string[] {
    const base = raw.replace(/[\s+\-()]/g, '');
    const variants = new Set<string>();
    variants.add(base);
    // With Mexico 1 stripped
    if (base.length === 13 && base.startsWith('521')) {
        variants.add('52' + base.slice(3));
    }
    // With Mexico 1 added
    if (base.length === 12 && base.startsWith('52')) {
        variants.add('521' + base.slice(2));
    }
    // Without country code (last 10 digits)
    if (base.length >= 10) {
        variants.add(base.slice(-10));
    }
    return [...variants];
}

// ─── Main App ──────────────────────────────────────────────

function SalesCRM() {
    useEffect(() => { detectBaseId(); }, []);

    // ─── State ──────────────────────────────────────────────
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(true);
    const [notification, setNotification] = useState<AppNotification | null>(null);
    const [activeNav, setActiveNav] = useState('chat');
    const [showDetail, setShowDetail] = useState(true);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [debugLogs, setDebugLogs] = useState<string[]>([]);
    const [debugMinimized, setDebugMinimized] = useState(false);
    const [lastContactsUpdate, setLastContactsUpdate] = useState<string | null>(null);
    
    // WhatsApp Multi-Number State
    const [availableNumbers, setAvailableNumbers] = useState<WhatsAppNumber[]>([]);
    const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<number | null>(null);
    const [inboxStats, setInboxStats] = useState<Record<number, NumberStats>>({});
    const [numbersLoading, setNumbersLoading] = useState(true);
    const [numbersSyncing, setNumbersSyncing] = useState(false);
    const [pendingDraft, setPendingDraft] = useState<string | null>(null);
    const [apiConfigLoaded, setApiConfigLoaded] = useState(false);

    // Ref-based cache of recently-sent messages (survives poll cycles, lost on page reload)
    const sentMessagesRef = useRef<Message[]>([]);

    /** Merge server messages with locally-cached sent messages.
     *  - Preserves Airtable contactIds from previous state
     *  - Appends sent messages from ref that the server hasn't returned yet
     *  - Cleans up ref entries once the server confirms them
     */
    const mergeWithSentCache = useCallback((serverMessages: Message[], prev: Message[]): Message[] => {
        // 1. Build lookup: id/metaMessageId → Airtable contactId from previous state
        const prevContactIds = new Map<string, string>();
        for (const m of prev) {
            if (m.contactId && m.contactId.startsWith('rec')) {
                prevContactIds.set(m.id, m.contactId);
                if (m.metaMessageId) prevContactIds.set(m.metaMessageId, m.contactId);
            }
        }

        // 2. Carry over Airtable contactIds to server messages
        const enriched = serverMessages.map((m: Message) => {
            const prevId = prevContactIds.get(m.id) || (m.metaMessageId ? prevContactIds.get(m.metaMessageId) : undefined);
            if (prevId) return { ...m, contactId: prevId };
            return m;
        });

        // 3. Determine which server IDs exist
        const serverIds = new Set(enriched.map((m: Message) => m.id));
        const serverMetaIds = new Set(enriched.map((m: Message) => m.metaMessageId).filter(Boolean));

        // 4. Append cached sent messages that the server hasn't returned yet
        const cached = sentMessagesRef.current.filter((m: Message) => {
            const foundById = serverIds.has(m.id);
            const foundByMeta = m.metaMessageId && serverMetaIds.has(m.metaMessageId);
            return !foundById && !foundByMeta;
        });

        // 5. Clean up ref: remove entries the server now includes
        sentMessagesRef.current = sentMessagesRef.current.filter((m: Message) => {
            const foundById = serverIds.has(m.id);
            const foundByMeta = m.metaMessageId && serverMetaIds.has(m.metaMessageId);
            return !foundById && !foundByMeta;
        });

        return [...enriched, ...cached];
    }, []);

    const addLog = useCallback((msg: string) => {
        setDebugLogs((prev) => [...prev.slice(-19), `${new Date().toLocaleTimeString()}: ${msg}`]);
    }, []);

    // ─── Initialize Dynamic API Configuration ──────────────────
    const initializeApiConfig = useCallback(async () => {
        try {
            const config = await getDynamicApiConfig();
            setApiConfigLoaded(true);
            addLog('✅ API config loaded');
            return config;
        } catch (error: any) {
            setApiConfigLoaded(false);
            addLog('⚠ API config unavailable — using fallback URL');
            return null;
        }
    }, [addLog]);

    const notify = useCallback((type: 'success' | 'error' | 'info', text: string) => {
        setNotification({ id: Date.now().toString(), type, text });
    }, []);

    // ─── Phone → Airtable Contact lookup ────────────────────
    const phoneToContact = useMemo(() => {
        const map = new Map<string, Contact>();
        for (const c of contacts) {
            if (c.phone) {
                // Index by all variants for robust matching
                for (const v of phoneVariants(c.phone)) {
                    map.set(v, c);
                }
            }
        }
        return map;
    }, [contacts]);

    // ─── Shallow comparison helper — only compares UI-relevant fields ─────────
    const numbersKey = (nums: WhatsAppNumber[]) =>
        nums.map(n => `${n.id}|${n.connection_status}|${n.is_active}|${n.display_name}|${n.phone_number}`).join(',');

    const statsKey = (s: Record<number, NumberStats>) =>
        Object.entries(s).map(([id, st]) => `${id}:${st.unread_count}|${st.total_messages_today}|${st.response_rate}`).join(',');

    // ─── Load WhatsApp Numbers (fast — reads from DB only) ─────────────────────
    const loadWhatsAppNumbers = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) setNumbersLoading(true);
            const numbers = await getWhatsAppNumbers();

            // Only update state if UI-relevant data actually changed
            setAvailableNumbers((prev: WhatsAppNumber[]) =>
                numbersKey(prev) === numbersKey(numbers) ? prev : numbers
            );
            
            // Auto-select first active number only when none is selected yet
            if (isInitial) {
                const activeNumber = numbers.find(n => n.is_active) || numbers[0];
                if (activeNumber) {
                    setSelectedPhoneNumber((prev: number | null) => prev ?? activeNumber.id);
                }
            }
            
            // Load stats for each number
            const statsPromises = numbers.map(async (number) => {
                try {
                    const stats = await getWhatsAppNumberStats(number.id);
                    return { [number.id]: stats };
                } catch (err) {
                    return { [number.id]: { unread_count: 0, total_messages_today: 0, response_rate: 0, last_activity: null } as NumberStats };
                }
            });
            
            const statsResults = await Promise.all(statsPromises);
            const newStats: Record<number, NumberStats> = statsResults.reduce((acc, stat) => ({ ...acc, ...stat }), {});
            setInboxStats((prev: Record<number, NumberStats>) =>
                statsKey(prev) === statsKey(newStats) ? prev : newStats
            );
            
            addLog(`Loaded ${numbers.length} WhatsApp numbers (fast DB read)`);
        } catch (err: any) {
            addLog(`⚠ Failed to load WhatsApp numbers: ${(err as Error).message}`);
        } finally {
            if (isInitial) setNumbersLoading(false);
        }
    }, [addLog]);

    // ─── Sync WhatsApp Numbers with Meta (manual refresh or startup) ──────────
    const handleSyncNumbers = useCallback(async () => {
        try {
            setNumbersSyncing(true);
            addLog('Syncing WhatsApp numbers with Meta...');
            const syncedNumbers = await syncWhatsAppNumbers();

            setAvailableNumbers((prev: WhatsAppNumber[]) =>
                numbersKey(prev) === numbersKey(syncedNumbers) ? prev : syncedNumbers
            );
            
            // Auto-select first active if none selected
            setSelectedPhoneNumber((prev: number | null) => {
                if (prev) return prev;
                const activeNumber = syncedNumbers.find(n => n.is_active) || syncedNumbers[0];
                return activeNumber ? activeNumber.id : null;
            });
            
            addLog(`Synced ${syncedNumbers.length} WhatsApp numbers from Meta`);
            notify('success', `${syncedNumbers.length} números sincronizados con Meta`);
        } catch (err: any) {
            addLog(`⚠ Sync failed: ${(err as Error).message}`);
            notify('error', `Error al sincronizar números: ${(err as Error).message}`);
        } finally {
            setNumbersSyncing(false);
        }
    }, [addLog, notify]);

    // ─── Check Inbox Status for Selected Number ───────────────────────────────
    const checkInboxStatus = useCallback(async (phoneId: number) => {
        try {
            const status = await getInboxStatus(phoneId);
            const currentStats = inboxStats[phoneId];
            const hasChanges = !currentStats || 
                              status.unread_count !== currentStats.unread_count ||
                              status.count !== currentStats.total_messages_today;
            
            if (hasChanges) {
                addLog(`Inbox ${phoneId} changed (${status.unread_count} unread), reloading...`);
                
                // Load fresh messages for this number (with merge to preserve sent msgs)
                const inboxMessages = await getInboxMessages(phoneId);
                const adaptedMessages = adaptMessagesWithNumber(inboxMessages);
                setMessages((prev: Message[]) => mergeWithSentCache(adaptedMessages, prev));
                
                // Update stats
                const freshStats = await getWhatsAppNumberStats(phoneId);
                setInboxStats((prev: Record<number, NumberStats>) => {
                    const updated = { ...prev, [phoneId]: freshStats };
                    return statsKey(prev) === statsKey(updated) ? prev : updated;
                });
                
                addLog(`Reloaded ${inboxMessages.length} messages for number ${phoneId}`);
            }
        } catch (err: any) {
            addLog(`⚠ Inbox status check failed for ${phoneId}: ${(err as Error).message}`);
        }
    }, [inboxStats, addLog]);

    // ─── Smart Polling: API Health Check ──────────────────────────────────────
    const checkApiHealth = useCallback(async () => {
        try {
            const isOnline = await checkHealth();
            setApiOnline((prev: boolean) => {
                if (prev !== isOnline) {
                    if (isOnline) {
                        addLog('✅ WhatsApp API online');
                        // API just came back — reload numbers + messages
                        loadWhatsAppNumbers(false);
                    } else {
                        addLog('⚠ WhatsApp API offline');
                    }
                }
                return isOnline;
            });
        } catch {
            setApiOnline(false);
            addLog('⚠ API health check failed');
        }
    }, [addLog, loadWhatsAppNumbers]);

    // ─── Smart Polling: Reload contacts from Airtable ───────────────────────────
    const checkContactsStatus = useCallback(async () => {
        try {
            const freshContacts = await getAllContacts();
            // Only update if count changed (simple heuristic to avoid unnecessary re-renders)
            setContacts((prev: Contact[]) => {
                if (prev.length === freshContacts.length) {
                    // Quick check: compare IDs to detect changes
                    const prevIds = prev.map((c: Contact) => c.id).sort().join(',');
                    const newIds = freshContacts.map((c: Contact) => c.id).sort().join(',');
                    if (prevIds === newIds) return prev;
                }
                addLog(`Contacts refreshed: ${freshContacts.length} total`);
                return freshContacts;
            });
        } catch (err: any) {
            addLog(`⚠ Contacts refresh failed: ${(err as Error).message}`);
        }
    }, [addLog]);

    // ─── Data Loading (initial load only — runs exactly ONCE) ─────────────────
    const loadInitialData = useCallback(async () => {
        const startTime = performance.now();
        
        try {
            // 1. Load contacts from Airtable FIRST (always reliable, shows all contacts)
            try {
                const airtableContacts = await getAllContacts();
                setContacts(airtableContacts);
                const leadCount = airtableContacts.filter((c: Contact) => c.contactType === 'lead').length;
                const contactCount = airtableContacts.filter((c: Contact) => c.contactType === 'contact').length;
                addLog(`Airtable: ${leadCount} leads + ${contactCount} contacts in ${(performance.now() - startTime).toFixed(0)}ms`);
            } catch (err: any) {
                addLog(`⚠ Airtable contacts failed: ${(err as Error).message}`);
            }
            
            // 2. Check if Python API is online
            const isOnline = await checkHealth();
            setApiOnline(isOnline);
            
            if (!isOnline) {
                addLog('⚠ WhatsApp API offline — showing Airtable contacts only');
                setLoading(false);
                return;
            }
            
            addLog('✅ WhatsApp API online');
            
            // 3. Sync WhatsApp numbers with Meta, then load
            try {
                await syncWhatsAppNumbers();
                addLog('Initial sync with Meta completed');
            } catch (syncErr) {
                addLog('⚠ Initial Meta sync failed, loading from DB...');
            }
            await loadWhatsAppNumbers(true); // isInitial=true → shows skeleton
            
            // 4. Load templates in parallel (non-blocking)
            Promise.allSettled([
                getApiTemplates(),
                getAirtableTemplates()
            ]).then(([metaResult, airtableResult]) => {
                // Log errors explicitly so they don't get swallowed
                if (metaResult.status === 'rejected') {
                    addLog(`⚠ Failed to load meta templates: ${metaResult.reason?.message || metaResult.reason}`);
                }
                if (airtableResult.status === 'rejected') {
                    addLog(`⚠ Failed to load airtable templates: ${airtableResult.reason?.message || airtableResult.reason}`);
                }

                const rawMetaAll = metaResult.status === 'fulfilled' ? metaResult.value : [];
                const rawAirtable = airtableResult.status === 'fulfilled' ? airtableResult.value : [];

                // /api/v1/templates may return ALL templates (meta+airtable).
                // Filter to only meta source so we don't duplicate airtable ones.
                const metaOnly = rawMetaAll.filter(t => t.source === 'meta');

                // Adapt both sets
                const adaptedMeta = adaptMetaTemplates(metaOnly);
                const adaptedAirtable = adaptAirtableTemplates(rawAirtable);

                // Deduplicate by id (in case /api/v1/templates also returned some airtable)
                const seenIds = new Set<string>();
                const allTemplates: Template[] = [];
                for (const t of [...adaptedMeta, ...adaptedAirtable]) {
                    if (!seenIds.has(t.id)) {
                        seenIds.add(t.id);
                        allTemplates.push(t);
                    }
                }

                setTemplates(allTemplates);
                addLog(`Loaded ${adaptedMeta.length} meta tpl, ${adaptedAirtable.length} airtable tpl (total: ${allTemplates.length})`);
            });
            
        } catch (err: any) {
            addLog(`ERROR loadInitialData: ${err.message}`);
            setApiOnline(false);
        } finally {
            setLoading(false);
        }
    }, [loadWhatsAppNumbers, addLog]); // NO selectedPhoneNumber — runs once

    // ─── Load + poll inbox messages for selected number ─────────────────────
    useEffect(() => {
        if (!apiOnline || selectedPhoneNumber === null) return;
        let cancelled = false;

        const pollInboxMessages = async () => {
            try {
                const inboxMessages = await getInboxMessages(selectedPhoneNumber);
                if (!cancelled) {
                    const adapted = adaptMessagesWithNumber(inboxMessages);
                    setMessages((prev: Message[]) => {
                        const merged = mergeWithSentCache(adapted, prev);
                        // Shallow compare to avoid unnecessary re-renders
                        const prevKey = prev.map((m: Message) => `${m.id}|${m.readStatus}|${m.status}`).join(',');
                        const newKey = merged.map((m: Message) => `${m.id}|${m.readStatus}|${m.status}`).join(',');
                        return prevKey === newKey ? prev : merged;
                    });
                }
            } catch (err: any) {
                if (!cancelled) {
                    addLog(`⚠ Inbox poll error: ${(err as Error).message}`);
                }
            }
        };

        // Initial load
        pollInboxMessages();
        addLog(`Started inbox polling for number ${selectedPhoneNumber}`);

        // Poll every 7s for near-realtime
        const interval = setInterval(pollInboxMessages, POLLING.INBOX_MESSAGES);

        return () => { cancelled = true; clearInterval(interval); };
    }, [selectedPhoneNumber, apiOnline, addLog]);

    // ─── Initial load + smart polling (stable deps — runs once) ─────────────
    useEffect(() => {
        let contactsInterval: ReturnType<typeof setInterval>;
        let messagesInterval: ReturnType<typeof setInterval>;
        let healthInterval: ReturnType<typeof setInterval>;
        let mounted = true;

        const initialize = async () => {
            await initializeApiConfig();
            if (!mounted) return;
            
            await loadInitialData();
            if (!mounted) return;
            
            // Polling: contacts every 30s, numbers every 30s, health every 15s
            contactsInterval = setInterval(checkContactsStatus, POLLING.CONTACTS);
            messagesInterval = setInterval(() => {
                // Refresh numbers from DB (fast, <10ms) without skeleton
                loadWhatsAppNumbers(false);
            }, POLLING.NUMBERS);
            healthInterval = setInterval(checkApiHealth, POLLING.API_HEALTH);
        };

        initialize();

        return () => {
            mounted = false;
            clearInterval(contactsInterval);
            clearInterval(messagesInterval);
            clearInterval(healthInterval);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — runs exactly once on mount

    // ─── Separate polling for inbox status (depends on selectedPhoneNumber) ──
    useEffect(() => {
        if (!apiOnline || !selectedPhoneNumber) return;

        const interval = setInterval(() => {
            checkInboxStatus(selectedPhoneNumber);
        }, POLLING.INBOX_STATUS);

        return () => clearInterval(interval);
    }, [apiOnline, selectedPhoneNumber, checkInboxStatus]);

    // ─── Match messages to Airtable contacts by phone ───────
    const messagesWithAirtableIds = useMemo(() => {
        return messages.map((m: Message) => {
            // For inbound: match on fromNumber (the contact's phone)
            // For outbound: match on toNumber (we sent TO the contact)
            // Try multiple phone fields to find the Airtable contact
            const phonesToTry = m.direction === 'outbound'
                ? [m.toNumber, m.contactPhone]
                : [m.fromNumber, m.contactPhone, m.toNumber];
            let matched: Contact | undefined;
            for (const p of phonesToTry) {
                if (!p) continue;
                for (const v of phoneVariants(p)) {
                    matched = phoneToContact.get(v);
                    if (matched) break;
                }
                if (matched) break;
            }
            return matched ? { ...m, contactId: matched.id } : m;
        });
    }, [messages, phoneToContact]);

    // ─── Derived state ──────────────────────────────────────
    const selectedContact = contacts.find((c) => c.id === selectedContactId) ?? null;
    const contactMessages = messagesWithAirtableIds.filter((m) => m.contactId === selectedContactId);

    // ─── Mark as read when selecting a conversation ──────────
    const handleSelectContact = useCallback(async (contactId: string | null) => {
        setSelectedContactId(contactId);
        if (!contactId || !apiOnline) return;

        // Find unread inbound messages for this contact
        const unreadMsgs = messagesWithAirtableIds.filter(
            (m: Message) => m.contactId === contactId && m.direction === 'inbound' && m.readStatus === 'unread'
        );
        if (unreadMsgs.length === 0) return;

        const ids = unreadMsgs.map((m: Message) => Number(m.id));
        try {
            // Use bulk inbox endpoint when a number is selected, otherwise general endpoint
            if (selectedPhoneNumber) {
                await bulkMarkInboxAsRead(selectedPhoneNumber, ids);
            } else {
                await markMessagesAsRead(ids);
            }
            // Update local state immediately
            setMessages((prev: Message[]) =>
                prev.map((m: Message) =>
                    ids.includes(Number(m.id)) ? { ...m, readStatus: 'read' as const } : m
                )
            );
            addLog(`Marked ${ids.length} messages as read for contact ${contactId}`);
        } catch (err: any) {
            addLog(`WARN markAsRead: ${(err as Error).message}`);
        }
    }, [apiOnline, messagesWithAirtableIds, selectedPhoneNumber, addLog]);

    // ─── Auto-mark as read when new inbound messages arrive on active chat ────
    useEffect(() => {
        if (!selectedContactId || !apiOnline || !selectedPhoneNumber) return;

        const unreadForActiveChat = messagesWithAirtableIds.filter(
            (m: Message) => m.contactId === selectedContactId && m.direction === 'inbound' && m.readStatus === 'unread'
        );
        if (unreadForActiveChat.length === 0) return;

        const ids = unreadForActiveChat.map((m: Message) => Number(m.id));

        // Fire-and-forget: mark them as read on the server + update local state
        (async () => {
            try {
                await bulkMarkInboxAsRead(selectedPhoneNumber, ids);
                setMessages((prev: Message[]) =>
                    prev.map((m: Message) =>
                        ids.includes(Number(m.id)) ? { ...m, readStatus: 'read' as const } : m
                    )
                );
                addLog(`Auto-marked ${ids.length} msgs read (active chat)`);
            } catch {
                // Silently fail — next poll will retry
            }
        })();
    }, [selectedContactId, apiOnline, selectedPhoneNumber, messagesWithAirtableIds, addLog]);

    // ─── Send Meta Template ─────────────────────────────────
    const handleSendMetaTemplate = useCallback(async (template: Template, parameters: string[]) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending Meta template "${template.name}" to ${selectedContact.phone}`);

        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text: parameters.length > 0
                ? `📋 Plantilla "${template.name}" enviada con: ${parameters.join(', ')}`
                : `📋 Plantilla "${template.name}" enviada`,
            direction: 'outbound',
            timestamp: nowMexicoISO(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [],
            isOptimistic: true,
        };
        setMessages((prev: Message[]) => [...prev, optimisticMsg]);

        try {
            const result = await sendMetaTemplate(
                template.name,
                normalizePhone(selectedContact.phone),
                parameters || [],
                template.language,
            );
            addLog(`Meta template sent OK: id=${result.id}, meta_id=${result.meta_message_id}`);

            const confirmedTemplateMsg: Message = {
                ...optimisticMsg,
                id: String(result.id),
                metaMessageId: result.meta_message_id,
                status: 'sent' as const,
                isOptimistic: false,
            };
            sentMessagesRef.current = [...sentMessagesRef.current, confirmedTemplateMsg];

            setMessages((prev: Message[]) =>
                prev.map((m: Message) => m.id === tempId ? confirmedTemplateMsg : m),
            );
            notify('success', `Plantilla "${template.name}" enviada a ${selectedContact.displayName}`);
        } catch (err: any) {
            addLog(`ERROR sendMetaTemplate: ${err.message}`);
            setMessages((prev: Message[]) =>
                prev.map((m: Message) => (m.id === tempId ? { ...m, status: 'failed' as const, isOptimistic: false } : m)),
            );
            notify('error', `Error al enviar plantilla: ${err.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Select Airtable Template (render client-side with contact data) ──────
    const handleSelectAirtableTemplate = useCallback((template: Template) => {
        if (!selectedContact) return;
        addLog(`Rendering Airtable template "${template.name}" for ${selectedContact.displayName}`);
        const content = template.content || template.name;
        const fieldMap: Record<string, string> = {
            contact_name: selectedContact.displayName,
            first_name: selectedContact.firstName,
            last_name: selectedContact.lastName,
            empresa: selectedContact.company,
            email: selectedContact.email,
            phone: selectedContact.phone,
            job_title: selectedContact.jobTitle,
            stage: selectedContact.stage,
            lead_code: selectedContact.leadCode,
            lead_source: selectedContact.leadSource,
            industry: selectedContact.industry,
            fecha_actual: new Date().toLocaleDateString('es-MX'),
        };
        const rendered = content.replace(/\{\{(\w+)\}\}/g, (match: string, key: string) => fieldMap[key] ?? match);
        setPendingDraft(rendered);
        notify('info', `Plantilla "${template.name}" cargada — edita y envía`);
    }, [selectedContact, apiOnline, addLog, notify]);

    // ─── Send Media Message ───────────────────────────────────────
    const handleSendMedia = useCallback(async (file: File) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending media to ${selectedContact.phone}: ${file.name} (${formatFileSize(file.size)})`);

        // Optimistic UI — add temp message instantly with local preview URL
        const tempId = `temp_${Date.now()}`;
        let localPreviewUrl = '';
        
        // Try objectURL first, fallback to base64 for Airtable environment
        try {
            localPreviewUrl = URL.createObjectURL(file);
        } catch (err) {
            // Fallback: read file as base64 for image preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Url = reader.result as string;
                    setMessages((prev) =>
                        prev.map((m) => (m.id === tempId ? {
                            ...m,
                            attachments: m.attachments.map(a => ({ ...a, url: base64Url }))
                        } : m))
                    );
                };
                reader.readAsDataURL(file);
            }
        }
        
        const optimisticMsg: Message = {
            id: tempId,
            text: '',
            direction: 'outbound',
            timestamp: nowMexicoISO(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [{
                id: tempId,
                name: file.name,
                url: localPreviewUrl,
                mimeType: file.type,
                size: file.size,
            }],
            isOptimistic: true,
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const result = await sendMediaMessage(
                normalizePhone(selectedContact.phone),
                file,
            );
            addLog(`Media sent OK: id=${result.id}, meta_id=${result.meta_message_id}`);
            
            // Build confirmed message and cache in ref
            const confirmedMediaMsg: Message = {
                ...optimisticMsg,
                id: String(result.id || result.meta_message_id),
                metaMessageId: result.meta_message_id,
                status: 'sent',
                isOptimistic: false,
                attachments: optimisticMsg.attachments.map(a => ({
                    ...a,
                    url: a.url || localPreviewUrl,
                })),
            };
            sentMessagesRef.current = [...sentMessagesRef.current, confirmedMediaMsg];

            // Update optimistic message with real data
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? confirmedMediaMsg : m))
            );
            notify('success', 'Archivo enviado correctamente');
        } catch (err) {
            const error = err as Error;
            addLog(`ERROR sendMedia: ${error.message}`);
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', isOptimistic: false } : m))
            );
            notify('error', `Error al enviar archivo: ${error.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Retry Media Download ────────────────────────────────
    const handleRetryMedia = useCallback(async (messageId: string) => {
        addLog(`Retrying media download for message ${messageId}`);
        try {
            const updated = await retryMediaDownload(Number(messageId));
            const [adaptedMsg] = adaptMessages([updated]);
            setMessages((prev: Message[]) =>
                prev.map((m: Message) => (m.id === messageId ? adaptedMsg : m))
            );
            if (adaptedMsg.mediaUnavailable) {
                notify('error', 'No se pudo descargar el archivo. Intenta de nuevo más tarde.');
            } else {
                notify('success', 'Archivo descargado correctamente');
            }
        } catch (err) {
            const error = err as Error;
            addLog(`ERROR retryMedia: ${error.message}`);
            notify('error', `Error al reintentar descarga: ${error.message}`);
        }
    }, [addLog, notify]);

    // ─── Send Message ───────────────────────────────────────
    const handleSend = useCallback(async (text: string) => {
        if (!selectedContact || sending || !apiOnline) return;
        setSending(true);
        addLog(`Sending to ${selectedContact.phone}: ${text.substring(0, 30)}...`);

        // Optimistic UI — add temp message instantly
        const tempId = `temp_${Date.now()}`;
        const optimisticMsg: Message = {
            id: tempId,
            text,
            direction: 'outbound',
            timestamp: nowMexicoISO(),
            status: 'sending',
            readStatus: 'read',
            contactId: selectedContact.id,
            contactPhone: selectedContact.phone,
            fromNumber: '',
            toNumber: normalizePhone(selectedContact.phone),
            metaMessageId: '',
            attachments: [],
            isOptimistic: true,
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        try {
            const result = await sendApiMessageFromNumber(
                normalizePhone(selectedContact.phone),
                text,
                selectedPhoneNumber ? String(selectedPhoneNumber) : undefined,
            );
            addLog(`Sent OK: id=${result.id}, meta_id=${result.meta_message_id}`);

            // Build confirmed message and cache it in ref
            const confirmedMsg: Message = {
                ...optimisticMsg,
                id: String(result.id),
                metaMessageId: result.meta_message_id,
                status: 'sent',
                isOptimistic: false,
            };
            sentMessagesRef.current = [...sentMessagesRef.current, confirmedMsg];

            // Replace optimistic with confirmed in state
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === tempId ? confirmedMsg : m
                ),
            );
            notify('success', `Mensaje enviado a ${selectedContact.displayName}`);
        } catch (err: any) {
            addLog(`ERROR send: ${err.message}`);
            // Mark optimistic as failed
            setMessages((prev) =>
                prev.map((m) => (m.id === tempId ? { ...m, status: 'failed', isOptimistic: false } : m)),
            );
            notify('error', `Error al enviar: ${err.message}`);
        } finally {
            setSending(false);
        }
    }, [selectedContact, sending, apiOnline, addLog, notify]);

    // ─── Loading state ──────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-surface-light">
                <Spinner size="lg" label="Cargando datos..." />
            </div>
        );
    }

    // ─── Render ─────────────────────────────────────────────
    return (
        <div className="h-screen w-full">
            {/* API offline banner */}
            {!apiOnline && (
                <div className="bg-orange text-white text-xs text-center py-1 px-2">
                    ⚠ API de WhatsApp no disponible — mostrando solo contactos de Airtable
                </div>
            )}

            <AppLayout
                sidebar={
                    <Sidebar
                        activeNav={activeNav}
                        onNavChange={setActiveNav}
                        userName="Carlos A."
                        userRole="Sales Admin"
                    />
                }
                fullContent={
                    activeNav === 'automations'
                        ? <AutomationsPanel onNotify={(type, text) => notify(type as any, text)} />
                        : undefined
                }
                conversations={
                    activeNav !== 'automations' ? (
                        <ConversationPanel
                            contacts={contacts}
                            messages={messagesWithAirtableIds}
                            selectedContactId={selectedContactId}
                            onSelectContact={handleSelectContact}
                            availableNumbers={availableNumbers}
                            selectedPhoneNumber={selectedPhoneNumber}
                            inboxStats={inboxStats}
                            onNumberSelect={setSelectedPhoneNumber}
                            onNumberSync={handleSyncNumbers}
                            numbersSyncing={numbersSyncing}
                            numbersLoading={numbersLoading}
                        />
                    ) : undefined
                }
                chat={
                    activeNav !== 'automations' ? (
                        <ChatPanel
                            contact={selectedContact}
                            messages={contactMessages}
                            templates={templates}
                            onSend={handleSend}
                            onSendMedia={handleSendMedia}
                            onSendMetaTemplate={handleSendMetaTemplate}
                            onSelectAirtableTemplate={handleSelectAirtableTemplate}
                            onRetryMedia={handleRetryMedia}
                            sending={sending}
                            onOpenDetail={() => setShowDetail(!showDetail)}
                            onOpenNotes={() => setShowNotesModal(true)}
                            pendingDraft={pendingDraft}
                            onPendingDraftConsumed={() => setPendingDraft(null)}
                        />
                    ) : undefined
                }
                detail={
                    activeNav !== 'automations' && showDetail && selectedContact ? (
                        <DetailPanel
                            contact={selectedContact}
                            contacts={contacts}
                            messages={contactMessages}
                            onOpenNotes={() => setShowNotesModal(true)}
                            onClose={() => setShowDetail(false)}
                            onSelectContact={(id) => handleSelectContact(id)}
                        />
                    ) : undefined
                }
            />

            {/* Notes Modal */}
            <NotesModal
                open={showNotesModal}
                onClose={() => setShowNotesModal(false)}
                contactName={selectedContact?.displayName ?? ''}
            />

            {/* Toast */}
            <Toast
                notification={notification}
                onDismiss={() => setNotification(null)}
            />

            {/* Debug log panel */}
            {debugLogs.length > 0 && (
                <div className={`fixed bottom-0 left-sidebar right-0 bg-gray-900/95 z-40 transition-all ${debugMinimized ? '' : 'max-h-28 overflow-y-auto p-2'}`}>
                    <div className={`flex justify-between items-center ${debugMinimized ? 'px-2 py-1' : 'mb-1'}`}>
                        <button onClick={() => setDebugMinimized(!debugMinimized)} className="text-xs text-gray-400 hover:text-white font-mono flex items-center gap-1">
                            <span>{debugMinimized ? '▲' : '▼'}</span> Debug Log ({debugLogs.length})
                        </button>
                        <div className="flex gap-2">
                            {!debugMinimized && <button onClick={() => setDebugLogs([])} className="text-xs text-gray-400 hover:text-white">Clear</button>}
                            <button onClick={() => { setDebugLogs([]); setDebugMinimized(false); }} className="text-xs text-gray-400 hover:text-white">✕</button>
                        </div>
                    </div>
                    {!debugMinimized && debugLogs.map((log: string, i: number) => (
                        <div key={i} className={`text-xs font-mono ${log.includes('ERROR') ? 'text-red' : 'text-green-light1'}`}>{log}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <ErrorBoundary><SalesCRM /></ErrorBoundary>});
