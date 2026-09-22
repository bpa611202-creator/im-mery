import React, { useState, useEffect } from 'react';
import { X, Sparkles, Search, Check, Shield, Code, Video, BookOpen, Layers } from 'lucide-react';
import { skillManager } from '../modules/skills/SkillManager';
import { CompanionSkill } from '../modules/skills/skillsData';

interface SkillStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillStoreModal: React.FC<SkillStoreModalProps> = ({ isOpen, onClose }) => {
  const [skills, setSkills] = useState<CompanionSkill[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSkills(skillManager.getAllSkills());
    const unsub = skillManager.subscribe(() => {
      setSkills(skillManager.getAllSkills());
    });
    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSkills = skills
    .filter((s) => activeCategory === 'all' || s.category === activeCategory)
    .filter(
      (s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'creator':
        return <Video className="w-4 h-4 text-pink-400" />;
      case 'coding':
        return <Code className="w-4 h-4 text-emerald-400" />;
      case 'security':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'productivity':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      default:
        return <Layers className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div
      id="skill-store-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="skill-store-modal"
        className="flex flex-col w-full max-w-4xl max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden text-neutral-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                Mery Skill Store
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  Local Extensions
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Install and toggle specialized companion intelligence modules for specific creative and engineering workflows.
              </p>
            </div>
          </div>
          <button
            id="btn-close-skill-store"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'creator', 'coding', 'security', 'productivity'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-colors uppercase tracking-wider ${
                  activeCategory === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search skills or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Skill Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                skill.enabled
                  ? 'bg-neutral-950/90 border-purple-500/40 shadow-sm'
                  : 'bg-neutral-950/40 border-neutral-800/80 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      {getCategoryIcon(skill.category)}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                        {skill.name}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                          v{skill.version}
                        </span>
                      </h3>
                      <span className="text-[11px] text-purple-400">{skill.author}</span>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <button
                    onClick={() => skillManager.toggleSkill(skill.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      skill.enabled
                        ? 'bg-purple-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {skill.enabled ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Installed
                      </>
                    ) : (
                      'Enable'
                    )}
                  </button>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed mt-2 mb-3">{skill.description}</p>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                <div className="flex gap-1 flex-wrap">
                  {skill.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="text-neutral-500 font-mono">
                  {skill.unlockedTools.length} tools
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
