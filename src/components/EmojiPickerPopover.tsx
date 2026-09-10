import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smile, 
  ThumbsUp, 
  Flame, 
  Cpu, 
  Flower2, 
  Coffee, 
  Search, 
  X 
} from 'lucide-react';

export interface EmojiPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEmoji: (emoji: string) => void;
  accentColor?: 'green' | 'blue';
  align?: 'left' | 'right';
  className?: string;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

interface EmojiItem {
  char: string;
  name: string;
  category: 'smileys' | 'gestures' | 'vibes' | 'tech' | 'nature' | 'food';
}

const EMOJI_DATABASE: EmojiItem[] = [
  // Smileys & Expressions
  { char: '😀', name: 'grinning face happy smile', category: 'smileys' },
  { char: '😃', name: 'smiley big eyes happy', category: 'smileys' },
  { char: '😄', name: 'smile grinning laughing', category: 'smileys' },
  { char: '😁', name: 'beam happy grin teeth', category: 'smileys' },
  { char: '😆', name: 'laugh closed eyes haha', category: 'smileys' },
  { char: '😅', name: 'sweat smile nervous relief', category: 'smileys' },
  { char: '😂', name: 'joy tears laugh funny rofl', category: 'smileys' },
  { char: '🤣', name: 'rofl rolling laughing funny', category: 'smileys' },
  { char: '🥹', name: 'pleading proud happy tears', category: 'smileys' },
  { char: '😊', name: 'blush smile happy warm', category: 'smileys' },
  { char: '😇', name: 'angel halo innocent pure', category: 'smileys' },
  { char: '🙂', name: 'slightly smiling calm', category: 'smileys' },
  { char: '🙃', name: 'upside down silly goofy', category: 'smileys' },
  { char: '😉', name: 'wink playful flirt sly', category: 'smileys' },
  { char: '😌', name: 'relieved calm peace zen', category: 'smileys' },
  { char: '😍', name: 'heart eyes love admire', category: 'smileys' },
  { char: '🥰', name: 'hearts loving cared adore', category: 'smileys' },
  { char: '😘', name: 'blow kiss love affection', category: 'smileys' },
  { char: '😋', name: 'yum delicious tongue tasty', category: 'smileys' },
  { char: '😛', name: 'tongue cheek silly playful', category: 'smileys' },
  { char: '😜', name: 'wink tongue crazy party', category: 'smileys' },
  { char: '🤪', name: 'zany goofy wild crazy', category: 'smileys' },
  { char: '🤔', name: 'thinking wonder ponder hmm', category: 'smileys' },
  { char: '🤫', name: 'shh quiet secret silent', category: 'smileys' },
  { char: '🤭', name: 'giggle hand cover mouth oops', category: 'smileys' },
  { char: '🤐', name: 'zipper mouth sealed secret', category: 'smileys' },
  { char: '🤨', name: 'raised eyebrow skeptical suspect', category: 'smileys' },
  { char: '😐', name: 'neutral blank meh', category: 'smileys' },
  { char: '😏', name: 'smirk cunning witty confident', category: 'smileys' },
  { char: '🙄', name: 'roll eyes whatever sarcasm', category: 'smileys' },
  { char: '😬', name: 'grimace awkward oof yikes', category: 'smileys' },
  { char: '😌', name: 'serene content peaceful', category: 'smileys' },
  { char: '😴', name: 'sleep zzz tired bedtime', category: 'smileys' },
  { char: '😷', name: 'mask medical sick safe', category: 'smileys' },
  { char: '🤠', name: 'cowboy cool wild hat', category: 'smileys' },
  { char: '🥳', name: 'party celebrate horn confetti', category: 'smileys' },
  { char: '😎', name: 'sunglasses cool stylish suave', category: 'smileys' },
  { char: '🤓', name: 'nerd geek glasses smart tech', category: 'smileys' },
  { char: '🧐', name: 'monocle inspect detective curious', category: 'smileys' },
  { char: '🥺', name: 'pleading puppy eyes please cute', category: 'smileys' },
  { char: '😱', name: 'scream shock surprise omfg', category: 'smileys' },
  { char: '🤯', name: 'mind blown explosive shock insane', category: 'smileys' },
  { char: '😡', name: 'rage angry mad furious', category: 'smileys' },
  { char: '😤', name: 'triumph huff determined proud', category: 'smileys' },

  // Gestures & Body
  { char: '👍', name: 'thumbs up like approve yes great', category: 'gestures' },
  { char: '👎', name: 'thumbs down dislike bad no', category: 'gestures' },
  { char: '👌', name: 'ok perfect chef kiss alright', category: 'gestures' },
  { char: '✌️', name: 'peace victory two chill', category: 'gestures' },
  { char: '🤞', name: 'fingers crossed luck hope pray', category: 'gestures' },
  { char: '🤟', name: 'love you hand gesture sign', category: 'gestures' },
  { char: '🤘', name: 'rock on metal concert hype', category: 'gestures' },
  { char: '🤙', name: 'call me shaka chill vibe', category: 'gestures' },
  { char: '👈', name: 'point left direction this', category: 'gestures' },
  { char: '👉', name: 'point right that look here', category: 'gestures' },
  { char: '👆', name: 'point up top above read', category: 'gestures' },
  { char: '👇', name: 'point down bottom see below', category: 'gestures' },
  { char: '☝️', name: 'index point up attention one', category: 'gestures' },
  { char: '👏', name: 'applause clapping clap brava great job', category: 'gestures' },
  { char: '🙌', name: 'raising hands celebrate praise hype', category: 'gestures' },
  { char: '👐', name: 'open hands warmth receive', category: 'gestures' },
  { char: '🤲', name: 'cupped hands hope offer prayer', category: 'gestures' },
  { char: '🤝', name: 'handshake deal agreement partnership', category: 'gestures' },
  { char: '🙏', name: 'folded hands pray thank you please namaste', category: 'gestures' },
  { char: '✍️', name: 'writing note pen memo code', category: 'gestures' },
  { char: '💪', name: 'bicep flex muscle strength strong', category: 'gestures' },
  { char: '🧠', name: 'brain intelligence memory think smart', category: 'gestures' },
  { char: '🦾', name: 'mechanical arm cyber robot cyborg', category: 'gestures' },
  { char: '👀', name: 'eyes glance look peek watch see', category: 'gestures' },
  { char: '👁️', name: 'eye vision see observer watch', category: 'gestures' },
  { char: '🗣️', name: 'speaking speech voice talk conversation', category: 'gestures' },
  { char: '🫂', name: 'hug people embracing care comfort', category: 'gestures' },
  { char: '🧑‍💻', name: 'coder programmer developer hacker typing', category: 'gestures' },
  { char: '👩‍🔬', name: 'scientist lab research chemist ai', category: 'gestures' },
  { char: '🥷', name: 'ninja stealth hidden covert', category: 'gestures' },

  // Vibes, Hearts & Fire
  { char: '🔥', name: 'fire flame lit hot hype burn', category: 'vibes' },
  { char: '✨', name: 'sparkles magic shiny new star clean', category: 'vibes' },
  { char: '⚡', name: 'zap lightning high voltage electric power fast', category: 'vibes' },
  { char: '💥', name: 'boom explosion impact collision pow', category: 'vibes' },
  { char: '🌟', name: 'glowing star bright shining victory', category: 'vibes' },
  { char: '💫', name: 'dizzy star trail spark shimmer', category: 'vibes' },
  { char: '💯', name: 'hundred percent perfect score keep it 100', category: 'vibes' },
  { char: '❤️', name: 'red heart love passion romance', category: 'vibes' },
  { char: '💚', name: 'green heart nature cyber matrix', category: 'vibes' },
  { char: '💙', name: 'blue heart trust peace cold cool', category: 'vibes' },
  { char: '💜', name: 'purple heart royalty luxury vibe', category: 'vibes' },
  { char: '🖤', name: 'black heart dark gothic sleek', category: 'vibes' },
  { char: '🤍', name: 'white heart pure peace clean', category: 'vibes' },
  { char: '💔', name: 'broken heart sad hurt pain', category: 'vibes' },
  { char: '💖', name: 'sparkling heart love shine delight', category: 'vibes' },
  { char: '💗', name: 'growing heart emotion pulse love', category: 'vibes' },
  { char: '💘', name: 'heart arrow cupid love hit', category: 'vibes' },
  { char: '💝', name: 'ribbon heart gift present token', category: 'vibes' },
  { char: '💬', name: 'speech bubble chat text message talk', category: 'vibes' },
  { char: '💭', name: 'thought bubble think dream idea', category: 'vibes' },
  { char: '🗯️', name: 'anger bubble shout roar loud', category: 'vibes' },
  { char: '🪄', name: 'magic wand wizard sorcery enchant', category: 'vibes' },
  { char: '💎', name: 'gem stone diamond precious luxury', category: 'vibes' },
  { char: '👑', name: 'crown royal king queen champion', category: 'vibes' },
  { char: '🏆', name: 'trophy win award victory cup champion', category: 'vibes' },
  { char: '🎯', name: 'bullseye target goal aim precision direct', category: 'vibes' },

  // Tech, AI & Cyber
  { char: '🤖', name: 'robot bot android ai assistant jarvis mery', category: 'tech' },
  { char: '💻', name: 'laptop computer code tech terminal', category: 'tech' },
  { char: '🖥️', name: 'desktop computer monitor pc screen display', category: 'tech' },
  { char: '📱', name: 'phone mobile smartphone cellular call', category: 'tech' },
  { char: '🛰️', name: 'satellite space orbit comms signal', category: 'tech' },
  { char: '🛸', name: 'ufo flying saucer alien futuristic sci-fi', category: 'tech' },
  { char: '🚀', name: 'rocket launch fast speed takeoff space', category: 'tech' },
  { char: '⚙️', name: 'gear settings config options machinery', category: 'tech' },
  { char: '🛡️', name: 'shield security defense firewall protect', category: 'tech' },
  { char: '⚔️', name: 'crossed swords fight attack duel battle', category: 'tech' },
  { char: '🔒', name: 'lock locked secure encrypted privacy', category: 'tech' },
  { char: '🔓', name: 'unlock unlocked access open permit', category: 'tech' },
  { char: '🔑', name: 'key password token credentials unlock', category: 'tech' },
  { char: '🗝️', name: 'old key secret backdoor antique access', category: 'tech' },
  { char: '🕹️', name: 'joystick arcade retro game gaming', category: 'tech' },
  { char: '🎮', name: 'video game controller play gaming console', category: 'tech' },
  { char: '🔋', name: 'battery power charged energy level', category: 'tech' },
  { char: '🔌', name: 'electric plug connect power wire cord', category: 'tech' },
  { char: '💡', name: 'lightbulb idea insight bright smart clever', category: 'tech' },
  { char: '📡', name: 'satellite antenna radar radio dish broadcast', category: 'tech' },
  { char: '🎙️', name: 'studio microphone voice podcast audio record', category: 'tech' },
  { char: '🎧', name: 'headphones listening music audio sound', category: 'tech' },
  { char: '🌐', name: 'globe network internet web worldwide online', category: 'tech' },
  { char: '🧬', name: 'dna genetics code biology sequence', category: 'tech' },
  { char: '🧪', name: 'test tube experiment lab science chemistry', category: 'tech' },
  { char: '🔬', name: 'microscope inspect science detailed zoom', category: 'tech' },

  // Nature & Animals
  { char: '🌸', name: 'cherry blossom flower spring bloom pink', category: 'nature' },
  { char: '🌹', name: 'rose red flower love flora', category: 'nature' },
  { char: '🌺', name: 'hibiscus flower tropical bloom island', category: 'nature' },
  { char: '🌻', name: 'sunflower bright yellow sunshine garden', category: 'nature' },
  { char: '🌼', name: 'blossom daisy yellow spring', category: 'nature' },
  { char: '🌷', name: 'tulip flower beauty elegant', category: 'nature' },
  { char: '🌱', name: 'seedling sprout plant grow fresh start', category: 'nature' },
  { char: '🌿', name: 'herb leaf plant green organic natural', category: 'nature' },
  { char: '🍀', name: 'four leaf clover luck lucky fortune', category: 'nature' },
  { char: '🍁', name: 'maple leaf autumn fall red orange', category: 'nature' },
  { char: '🍂', name: 'fallen leaf dry autumn seasonal', category: 'nature' },
  { char: '🐶', name: 'dog puppy pet cute canine loyal', category: 'nature' },
  { char: '🐱', name: 'cat kitten pet feline purr cute', category: 'nature' },
  { char: '🦊', name: 'fox clever wild animal orange', category: 'nature' },
  { char: '🐻', name: 'bear grizzly wild cozy fluffy', category: 'nature' },
  { char: '🐼', name: 'panda cute animal bamboo asian', category: 'nature' },
  { char: '🦁', name: 'lion king beast roar bravery', category: 'nature' },
  { char: '🐯', name: 'tiger fierce wild animal stripe predator', category: 'nature' },
  { char: '🦅', name: 'eagle bird falcon sharp vision freedom', category: 'nature' },
  { char: '🦉', name: 'owl wise night wisdom bird clever', category: 'nature' },
  { char: '🦋', name: 'butterfly beauty wings flutter metamorphous', category: 'nature' },
  { char: '🐝', name: 'honeybee bee buzz worker insect honey', category: 'nature' },
  { char: '🦄', name: 'unicorn magic fantasy legendary mythical', category: 'nature' },
  { char: '🐺', name: 'wolf pack wild leader alpha moon', category: 'nature' },
  { char: '🐉', name: 'dragon mythical beast power legend', category: 'nature' },
  { char: '🐬', name: 'dolphin ocean mammal smart playful sea', category: 'nature' },

  // Food, Drinks & Activities
  { char: '☕', name: 'coffee tea hot cup cafe morning caffeine', category: 'food' },
  { char: '🍵', name: 'tea green matcha drink warm soothing', category: 'food' },
  { char: '🧃', name: 'juice box beverage sweet fresh', category: 'food' },
  { char: '🥤', name: 'soda cup drink straw cola ice', category: 'food' },
  { char: '🧋', name: 'boba bubble tea tapioca drink sweet', category: 'food' },
  { char: '🍺', name: 'beer mug drink pub cheers lager', category: 'food' },
  { char: '🍻', name: 'clinking beers toast celebration party', category: 'food' },
  { char: '🥂', name: 'champagne glasses toast celebration win', category: 'food' },
  { char: '🍕', name: 'pizza cheese slice italian food yummy', category: 'food' },
  { char: '🍔', name: 'burger hamburger fast food meal', category: 'food' },
  { char: '🍟', name: 'french fries potato snack salty delicious', category: 'food' },
  { char: '🥪', name: 'sandwich bread deli lunch food', category: 'food' },
  { char: '🌮', name: 'taco mexican food spicy snack', category: 'food' },
  { char: '🍜', name: 'ramen noodles bowl soup delicious hot', category: 'food' },
  { char: '🍣', name: 'sushi japanese fish rice fresh roll', category: 'food' },
  { char: '🥟', name: 'dumpling momo gyoza dim sum steamed', category: 'food' },
  { char: '🍩', name: 'donut doughnut sweet glazed pastry bakery', category: 'food' },
  { char: '🍪', name: 'cookie chocolate chip baked sweet snack', category: 'food' },
  { char: '🎂', name: 'birthday cake celebration candles party', category: 'food' },
  { char: '🍫', name: 'chocolate bar sweet cacao treat dessert', category: 'food' },
  { char: '🍿', name: 'popcorn movie cinema snack butter', category: 'food' },
  { char: '🎨', name: 'art palette paint colors artist creative', category: 'food' },
  { char: '🎵', name: 'musical note sound melody song audio', category: 'food' },
  { char: '🎶', name: 'musical notes singing dance harmony tunes', category: 'food' },
  { char: '🎲', name: 'dice game roll chance luck random', category: 'food' },
  { char: '🧩', name: 'puzzle piece solve logic problem riddle', category: 'food' },
];

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '✨', '🙏', '🚀', '🤖', '💯', '👏'];

const CATEGORY_TABS = [
  { id: 'all', label: 'All', icon: Smile },
  { id: 'smileys', label: 'Faces', icon: Smile },
  { id: 'gestures', label: 'Hands', icon: ThumbsUp },
  { id: 'vibes', label: 'Vibes', icon: Flame },
  { id: 'tech', label: 'Tech/AI', icon: Cpu },
  { id: 'nature', label: 'Nature', icon: Flower2 },
  { id: 'food', label: 'Food/Obj', icon: Coffee },
] as const;

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({
  isOpen,
  onClose,
  onSelectEmoji,
  accentColor = 'green',
  align = 'right',
  className = '',
  triggerRef,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
    } else {
      setSearchQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Click outside to close (checking triggerRef to avoid double-toggle bug)
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (triggerRef?.current && triggerRef.current.contains(target)) {
        return; // Handled by trigger button onClick
      }
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  // Filter emojis based on category and search query
  const filteredEmojis = useMemo(() => {
    let list = EMOJI_DATABASE;
    if (activeCategory !== 'all') {
      list = list.filter((item) => item.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.name.includes(q) || item.char === q);
    }
    return list;
  }, [activeCategory, searchQuery]);

  // Color accents
  const isGreen = accentColor === 'green';
  const borderAccent = isGreen
    ? 'border-[#00ff66]/30 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(0,255,102,0.18)]'
    : 'border-[#00A3FF]/30 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(0,163,255,0.22)]';
  const tabActiveBg = isGreen
    ? 'bg-[#00ff66]/15 text-[#00ff66] border-[#00ff66]/40 shadow-[0_0_10px_rgba(0,255,102,0.2)]'
    : 'bg-[#00A3FF]/15 text-[#00A3FF] border-[#00A3FF]/40 shadow-[0_0_10px_rgba(0,163,255,0.25)]';
  const hoverBtnBg = isGreen
    ? 'hover:bg-[#00ff66]/20 hover:scale-115 active:scale-95'
    : 'hover:bg-[#00A3FF]/20 hover:scale-115 active:scale-95';
  const searchFocus = isGreen
    ? 'focus:border-[#00ff66]/60 focus:ring-1 focus:ring-[#00ff66]/30'
    : 'focus:border-[#00A3FF]/60 focus:ring-1 focus:ring-[#00A3FF]/30';

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={popoverRef}
        id="emoji-picker-popover"
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.96 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className={`absolute bottom-[calc(100%+8px)] ${
          align === 'right' ? 'right-0' : 'left-0'
        } z-[70] w-[310px] sm:w-[340px] max-w-[calc(100vw-24px)] max-h-[min(390px,calc(100vh-150px))] flex flex-col rounded-2xl bg-[#090D14]/95 backdrop-blur-2xl border ${borderAccent} p-3 text-white select-none ${className}`}
        role="dialog"
        aria-label="Emoji Picker"
      >
        {/* Header: Title + Search + Close */}
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/[0.08] shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              id="emoji-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emoji (smile, robot, heart...)"
              className={`w-full bg-white/[0.04] border border-white/[0.1] rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder:text-white/35 outline-none transition-all ${searchFocus}`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            id="btn-close-emoji-picker"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer shrink-0"
            title="Close emoji box (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Reactions Bar */}
        <div className="mb-2 shrink-0">
          <div className="text-[10px] text-white/40 uppercase font-mono tracking-wider mb-1 px-1 flex items-center justify-between">
            <span>Quick Reactions</span>
            <span className="text-[9px] text-white/30">1-click</span>
          </div>
          <div className="flex items-center justify-between gap-1 px-1 py-1 rounded-xl bg-white/[0.02] border border-white/[0.05]">
            {QUICK_REACTIONS.map((emoji, idx) => (
              <button
                key={`quick-${emoji}-${idx}`}
                id={`quick-emoji-${idx}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectEmoji(emoji)}
                className={`w-7 h-7 flex items-center justify-center text-lg rounded-lg transition-transform cursor-pointer ${hoverBtnBg}`}
                title={`Insert ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 mb-2 shrink-0">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                id={`emoji-cat-tab-${tab.id}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setActiveCategory(tab.id);
                  setSearchQuery('');
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? tabActiveBg
                    : 'bg-transparent text-white/40 border-transparent hover:text-white/80 hover:bg-white/[0.04]'
                }`}
                title={tab.label}
              >
                <Icon className="w-3 h-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Emoji Grid Container */}
        <div
          id="emoji-grid-scroll-area"
          className="flex-1 min-h-[120px] max-h-[190px] overflow-y-auto pr-1 grid grid-cols-7 sm:grid-cols-8 gap-1 content-start select-none custom-scrollbar"
        >
          {filteredEmojis.length > 0 ? (
            filteredEmojis.map((item, idx) => (
              <button
                key={`emoji-${item.char}-${idx}`}
                id={`btn-emoji-item-${idx}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSelectEmoji(item.char)}
                className={`w-9 h-9 flex items-center justify-center text-xl rounded-xl transition-all cursor-pointer ${hoverBtnBg}`}
                title={item.name}
              >
                {item.char}
              </button>
            ))
          ) : (
            <div className="col-span-full h-full flex flex-col items-center justify-center py-6 text-center text-white/35">
              <Smile className="w-6 h-6 mb-1 opacity-40" />
              <span className="text-xs">No emojis found</span>
              <span className="text-[10px] text-white/25 mt-0.5">Try a different search word</span>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="mt-2 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/35 font-mono px-1 shrink-0">
          <span>Click to insert</span>
          <span>{filteredEmojis.length} emojis</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
