// ─── Text Emoticon → Unicode Emoji Converter ─────────────────────────────────
// Converts common text emoticons (like :-D, :), ;P) to their Unicode emoji equivalents.
// WhatsApp sends proper Unicode emojis, but some systems or users may type text emoticons.

const EMOTICON_MAP: [RegExp, string][] = [
    // Smileys - most specific patterns first
    [/:-?\)\)/g, '😁'],      // :)) or :-))
    [/:-?D/g, '😀'],         // :D or :-D
    [/:-?\)/g, '🙂'],        // :) or :-)
    [/;-?\)/g, '😉'],        // ;) or ;-)
    [/:-?\(/g, '😞'],        // :( or :-(
    [/:-?P/gi, '😛'],        // :P or :-P
    [/:-?O/gi, '😮'],        // :O or :-O
    [/:-?\//g, '😕'],        // :/ or :-/
    [/:-?\\/g, '😕'],        // :\ or :-\
    [/:-?\|/g, '😐'],        // :| or :-|
    [/:-?\*/g, '😘'],        // :* or :-*
    [/:-?S/gi, '😖'],        // :S or :-S
    [/:-?X/gi, '😶'],        // :X or :-X
    [/>:-?\(/g, '😠'],       // >:( or >:-(
    [/B-?\)/g, '😎'],        // B) or B-)
    [/T[_-]T/g, '😭'],      // T_T or T-T
    [/O[_.]O/gi, '😳'],     // O_O or O.O
    [/\^[_-]?\^/g, '😊'],   // ^^ or ^_^ or ^-^
    [/<3/g, '❤️'],           // <3
    [/<\/3/g, '💔'],         // </3
    [/XD/gi, '😆'],          // XD
    [/xD/g, '😆'],           // xD
];

/**
 * Converts text emoticons in a string to Unicode emojis.
 * Only converts standalone emoticons (not inside URLs or code).
 */
export function convertEmoticonsToEmoji(text: string): string {
    if (!text) return text;
    let result = text;
    for (const [pattern, emoji] of EMOTICON_MAP) {
        result = result.replace(pattern, emoji);
    }
    return result;
}

/**
 * Checks if a string consists entirely of emoji characters (for larger emoji display).
 * Returns true if the string is 1-3 emojis with optional whitespace.
 */
export function isOnlyEmoji(text: string): boolean {
    if (!text) return false;
    // Remove whitespace
    const trimmed = text.trim();
    if (trimmed.length === 0 || trimmed.length > 20) return false;
    // Match emoji-only strings (Unicode emoji ranges)
    const emojiRegex = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Emoji_Component}|\u200D|\uFE0F|\s)+$/u;
    return emojiRegex.test(trimmed);
}
