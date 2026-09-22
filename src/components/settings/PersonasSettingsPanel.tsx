import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Shield,
  Terminal,
  Heart,
  UserCheck,
  Plus,
  Trash2,
  Volume2,
  Check,
  Sliders,
} from 'lucide-react';
import { personaManager, CompanionPersona, DEFAULT_PERSONAS } from '../../modules/PersonaManager';
import { stateManager, SpokenLanguage } from '../../modules/StateManager';

export const PersonasSettingsPanel: React.FC = () => {
  const [personas, setPersonas] = useState<CompanionPersona[]>(personaManager.getPersonas());
  const [activePersona, setActivePersona] = useState<CompanionPersona>(personaManager.getActivePersona());
  const [isCreating, setIsCreating] = useState(false);

  // New persona form state
  const [newName, setNewName] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newVoiceName, setNewVoiceName] = useState('Aoede');
  const [newLang, setNewLang] = useState<SpokenLanguage>('gu-IN');
  const [newTraits, setNewTraits] = useState('Empathetic, Sharp, Creative');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => {
    const unsub = personaManager.onPersonaChange((p) => {
      setActivePersona(p);
      setPersonas(personaManager.getPersonas());
    });
    return unsub;
  }, []);

  const handleSelectPersona = (id: string) => {
    const updated = personaManager.setActivePersona(id);
    setActivePersona(updated);
    stateManager.notify(`Active Companion Persona switched to: ${updated.name} (${updated.title})`, 'success');
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const traitsArray = newTraits
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const created = personaManager.saveCustomPersona({
      name: newName.trim(),
      title: newTitle.trim() || 'Custom AI Companion',
      avatarIcon: 'sparkles',
      color: '#ec4899',
      voice: {
        provider: 'gemini',
        voiceName: newVoiceName,
        pitch: 1.0,
        rate: 1.0,
      },
      primaryLanguage: newLang,
      systemInstructionSnippet:
        newPrompt.trim() || `You are ${newName.trim()}, a custom AI companion. Respond with care, precision, and authenticity.`,
      traits: traitsArray.length > 0 ? traitsArray : ['Custom', 'Adaptive'],
    });

    setPersonas(personaManager.getPersonas());
    personaManager.setActivePersona(created.id);
    setIsCreating(false);
    setNewName('');
    setNewTitle('');
    setNewPrompt('');
    stateManager.notify(`Custom companion "${created.name}" created and activated!`, 'success');
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom persona?')) {
      personaManager.deleteCustomPersona(id);
      setPersonas(personaManager.getPersonas());
      stateManager.notify('Custom persona removed', 'info');
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'terminal':
        return <Terminal className="w-5 h-5" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-100 flex items-center gap-2">
            Companion Identity & Personas
            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
              Voice-Native
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Switch between distinct AI companion profiles. Each persona modifies conversational demeanor, voice timbre, and foundational directives.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {isCreating ? 'Cancel' : 'New Persona'}
        </button>
      </div>

      {/* CREATE CUSTOM PERSONA FORM */}
      {isCreating && (
        <form onSubmit={handleSaveCustom} className="p-4 bg-neutral-950 border border-purple-500/30 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
              <Sliders className="w-4 h-4" /> Create Custom Companion Profile
            </h4>
            <span className="text-[11px] text-neutral-500">Persisted locally & dynamically applied</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Companion Name</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Maya, Nexus, Shanti"
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Title / Role</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Creative Muse, Socratic Tutor"
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Gemini Live Voice</label>
              <select
                value={newVoiceName}
                onChange={(e) => setNewVoiceName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              >
                <option value="Aoede">Aoede (Warm, youthful, playful - Default)</option>
                <option value="Kore">Kore (Calm, executive, articulate)</option>
                <option value="Fenrir">Fenrir (Authoritative, tactical, deep)</option>
                <option value="Puck">Puck (Energetic, brisk, witty)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Primary Spoken Language</label>
              <select
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as SpokenLanguage)}
                className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
              >
                <option value="gu-IN">ગુજરાતી (Standard Gujarati & Gujlish)</option>
                <option value="hi-IN">हिंदी (Hindi)</option>
                <option value="en-IN">English (Indian)</option>
                <option value="en-US">English (US)</option>
                <option value="auto">Auto-Detect</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Personality Traits (comma separated)</label>
            <input
              type="text"
              value={newTraits}
              onChange={(e) => setNewTraits(e.target.value)}
              placeholder="e.g. Playful, Thoughtful, Witty, Scientific"
              className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">System Instructions / Behavioral Directives</label>
            <textarea
              rows={3}
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              placeholder="Specify the companion's tone, quirks, speech mannerisms, or specific expertise..."
              className="w-full px-3 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors"
            >
              Save & Activate Persona
            </button>
          </div>
        </form>
      )}

      {/* PERSONAS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {personas.map((persona) => {
          const isActive = activePersona.id === persona.id;
          return (
            <div
              key={persona.id}
              onClick={() => handleSelectPersona(persona.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-purple-950/20 border-purple-500 shadow-lg shadow-purple-500/10'
                  : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2.5 rounded-xl border flex items-center justify-center"
                      style={{
                        backgroundColor: `${persona.color}15`,
                        borderColor: `${persona.color}35`,
                        color: persona.color,
                      }}
                    >
                      {getIcon(persona.avatarIcon)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                        {persona.name}
                        {isActive && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                        {persona.isCustom && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                            Custom
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-neutral-400">{persona.title}</p>
                    </div>
                  </div>

                  {persona.isCustom && (
                    <button
                      onClick={(e) => handleDeleteCustom(persona.id, e)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete custom persona"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-neutral-300 italic mb-3 line-clamp-2">
                  "{persona.systemInstructionSnippet}"
                </p>

                {/* Traits tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {persona.traits.map((trait, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer info: Voice and Language */}
              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Volume2 className="w-3.5 h-3.5 text-purple-400" /> {persona.voice.voiceName}
                </span>
                <span className="text-[11px] font-mono text-neutral-500">
                  {persona.primaryLanguage === 'gu-IN' ? 'ગુજરાતી' : persona.primaryLanguage}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
