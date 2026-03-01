import { useState } from "react";
import { Profile } from "@/lib/types";
import { Plus, Trash2, User, Dumbbell } from "lucide-react";

const EMOJIS = ["💪", "🏋️", "🔥", "⚡", "🦾", "🐺", "🦁", "🎯", "🏆", "💎"];

interface ProfileSelectorProps {
  profiles: Profile[];
  onSelect: (profile: Profile) => void;
  onSave: (profile: Profile) => void;
  onDelete: (id: string) => void;
}

const ProfileSelector = ({ profiles, onSelect, onSave, onDelete }: ProfileSelectorProps) => {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("💪");

  const handleCreate = () => {
    if (!name.trim()) return;
    const profile: Profile = {
      id: crypto.randomUUID(),
      name: name.trim(),
      emoji,
      createdAt: new Date().toISOString(),
    };
    onSave(profile);
    setName("");
    setEmoji("💪");
    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3">
            <Dumbbell size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Iron Stack</h1>
          <p className="text-sm text-muted-foreground mt-1">Select your profile</p>
        </div>

        <div className="space-y-3 mb-6">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex items-center gap-2">
              <button
                onClick={() => onSelect(profile)}
                className="flex-1 flex items-center gap-3 p-4 bg-card rounded-xl border border-border active:scale-[0.98] transition-transform"
              >
                <span className="text-2xl">{profile.emoji}</span>
                <span className="text-lg font-bold text-foreground">{profile.name}</span>
              </button>
              <button
                onClick={() => onDelete(profile.id)}
                className="p-3 rounded-xl bg-card border border-border text-muted-foreground active:text-destructive"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        {creating ? (
          <div className="bg-card rounded-xl p-5 border border-border space-y-4">
            <input
              type="text"
              placeholder="Profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              className="w-full px-4 py-3.5 rounded-lg bg-input text-foreground placeholder:text-muted-foreground text-base font-medium border-0 outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                    emoji === e ? "bg-primary scale-110 ring-2 ring-primary" : "bg-muted"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm active:scale-[0.98] transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim()}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform glow-emerald"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base active:scale-[0.98] transition-transform glow-emerald flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            New Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileSelector;
