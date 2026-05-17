import { useState, useMemo } from 'react';

interface EmojiPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

interface EmojiCategory {
    id: string;
    icon: string;
    label: string;
    emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
    {
        id: 'smileys',
        icon: '😀',
        label: 'Caritas',
        emojis: [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
            '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
            '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
            '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
            '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
            '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯',
            '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁',
            '☹️', '😮', '😯', '😲', '😳', '🥺', '🥹', '😦', '😧', '😨',
            '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
            '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️',
            '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖',
        ],
    },
    {
        id: 'gestures',
        icon: '👋',
        label: 'Manos',
        emojis: [
            '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌',
            '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉',
            '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛',
            '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
            '🤳', '💪', '🦾', '🦿',
        ],
    },
    {
        id: 'people',
        icon: '👤',
        label: 'Personas',
        emojis: [
            '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱',
            '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲',
            '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '🧕', '👮‍♀️', '👮',
            '👷‍♀️', '👷', '💂‍♀️', '💂', '🕵️‍♀️', '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🌾', '👨‍🌾',
            '👩‍💻', '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔧', '👨‍🔧', '👩‍🎓', '👨‍🎓',
        ],
    },
    {
        id: 'hearts',
        icon: '❤️',
        label: 'Corazones',
        emojis: [
            '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
            '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
            '💟', '♥️', '💋', '💌', '💐', '🌹', '🥀', '🌺', '🌸', '🌷',
        ],
    },
    {
        id: 'animals',
        icon: '🐶',
        label: 'Animales',
        emojis: [
            '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
            '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
            '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗',
            '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰',
            '🐢', '🐍', '🦎', '🦂', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠',
            '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍',
        ],
    },
    {
        id: 'food',
        icon: '🍔',
        label: 'Comida',
        emojis: [
            '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐',
            '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑',
            '🫛', '🥦', '🥬', '🌽', '🌶️', '🫑', '🥒', '🥕', '🧄', '🧅',
            '🥔', '🍠', '🫘', '🥐', '🥖', '🍞', '🥨', '🧀', '🥚', '🍳',
            '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟',
            '🍕', '🫓', '🥪', '🌮', '🌯', '🫔', '🥗', '🍝', '🍜', '🍲',
            '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥',
            '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰',
            '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🧃', '☕', '🍵', '🍶',
            '🍺', '🍻', '🥂', '🍷', '🍸', '🍹', '🧉', '🍾',
        ],
    },
    {
        id: 'travel',
        icon: '🚗',
        label: 'Viajes',
        emojis: [
            '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
            '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛺', '🚁',
            '✈️', '🛩️', '🚀', '🛸', '🚢', '⛵', '🏠', '🏡', '🏢', '🏣',
            '🏥', '🏦', '🏨', '🏩', '🏪', '🏫', '🏬', '🏭', '🏯', '🏰',
            '⛪', '🕌', '🛕', '🕍', '🗼', '🗽', '⛲', '🌁', '🌉', '🎡',
        ],
    },
    {
        id: 'objects',
        icon: '💡',
        label: 'Objetos',
        emojis: [
            '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '💾', '💿', '📷',
            '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📺', '📻', '🎙️',
            '⏱️', '⏰', '🕰️', '💡', '🔦', '🕯️', '💰', '💵', '💴', '💶',
            '💷', '💳', '💎', '⚖️', '🔧', '🔨', '🛠️', '⛏️', '🔩', '⚙️',
            '🔑', '🗝️', '🔒', '🔓', '📦', '📫', '📪', '📬', '📭', '📮',
            '✏️', '✒️', '🖊️', '🖋️', '📝', '📁', '📂', '📅', '📆', '📌',
            '📎', '🖇️', '📏', '📐', '✂️', '🗑️', '📌', '🔔', '🔕',
        ],
    },
    {
        id: 'symbols',
        icon: '✅',
        label: 'Simbolos',
        emojis: [
            '✅', '❌', '⭕', '❗', '❓', '‼️', '⁉️', '💯', '🔴', '🟠',
            '🟡', '🟢', '🔵', '🟣', '🟤', '⚫', '⚪', '🔶', '🔷', '🔸',
            '🔹', '▪️', '▫️', '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨',
            '🟩', '🟦', '🟪', '🟫', '💢', '💥', '💫', '💦', '💨', '🕳️',
            '🔊', '🔇', '📣', '📢', '🔔', '🔕', '🎵', '🎶', '🏳️', '🏴',
            '🚩', '⚠️', '♻️', '🔰', '⭐', '🌟', '💫', '✨', '🎉', '🎊',
            '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎯', '🔥', '💥',
        ],
    },
];

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [search, setSearch] = useState('');
    const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
        try {
            const stored = localStorage.getItem('recent_emojis');
            return stored ? JSON.parse(stored) : [];
        } catch {
            return [];
        }
    });

    const currentCategory = useMemo(() => {
        if (search) {
            // Simple search: show all emojis (can't search by name without a lib, but this filters categories)
            const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
            return allEmojis;
        }
        return EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.emojis || [];
    }, [activeCategory, search]);

    const handleSelect = (emoji: string) => {
        onSelect(emoji);
        // Update recent emojis
        const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 16);
        setRecentEmojis(updated);
        try {
            localStorage.setItem('recent_emojis', JSON.stringify(updated));
        } catch { /* ignore */ }
    };

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-xl z-50 w-80 overflow-hidden">
            {/* Search */}
            <div className="px-3 py-2 border-b border-gray-100">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar emoji..."
                    className="w-full px-3 py-1.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#00811A]/30 focus:bg-white transition-colors"
                    autoFocus
                />
            </div>

            {/* Category tabs */}
            {!search && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 overflow-x-auto">
                    {recentEmojis.length > 0 && (
                        <button
                            onClick={() => setActiveCategory('recent')}
                            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
                                activeCategory === 'recent' ? 'bg-[#00811A]/10' : 'hover:bg-gray-100'
                            }`}
                            title="Recientes"
                        >
                            🕐
                        </button>
                    )}
                    {EMOJI_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-base transition-colors ${
                                activeCategory === cat.id ? 'bg-[#00811A]/10' : 'hover:bg-gray-100'
                            }`}
                            title={cat.label}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji grid */}
            <div className="h-56 overflow-y-auto px-2 py-2">
                {!search && activeCategory === 'recent' && recentEmojis.length > 0 && (
                    <>
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">Recientes</div>
                        <div className="grid grid-cols-8 gap-0.5">
                            {recentEmojis.map((emoji, i) => (
                                <button
                                    key={`recent-${i}`}
                                    onClick={() => handleSelect(emoji)}
                                    className="w-8 h-8 flex items-center justify-center hover:bg-[#00811A]/10 rounded-lg text-xl transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </>
                )}
                {activeCategory !== 'recent' && (
                    <div className="grid grid-cols-8 gap-0.5">
                        {currentCategory.map((emoji, i) => (
                            <button
                                key={`${emoji}-${i}`}
                                onClick={() => handleSelect(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#00811A]/10 rounded-lg text-xl transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">
                    {EMOJI_CATEGORIES.find(c => c.id === activeCategory)?.label || (search ? 'Todos' : 'Recientes')}
                </span>
                <button
                    onClick={onClose}
                    className="text-[10px] text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
}
