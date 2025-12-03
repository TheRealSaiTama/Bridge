import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Trash2,
  Plus,
  Sparkles,
  Zap,
  Brain,
  Code,
  Settings2,
  Layers,
  Sun,
  Moon,
  Monitor,
  Flag
} from 'lucide-react';
import { usePlatformStore } from '../store';
import { PipelineStep, DiscoveredAgent } from '../types';

const iconMap: Record<string, React.ComponentType<any>> = {
  Sparkles,
  Zap,
  Brain,
  Code,
};

const roleColors: Record<string, string> = {
  generator: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  critic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  refiner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  analyzer: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
};

function PipelineStepCard({ 
  step, 
  index, 
  agent,
  onRemove, 
  onUpdate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: { 
  step: PipelineStep;
  index: number;
  agent?: DiscoveredAgent;
  onRemove: () => void;
  onUpdate: (updates: Partial<PipelineStep>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = agent?.icon ? iconMap[agent.icon] : Sparkles;
  const detectedFlags = agent?.detectedFlags || {};
  const flagKeys = Object.keys(detectedFlags);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <div className="flex flex-col gap-0.5">
          <button 
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3 rotate-180" />
          </button>
          <button 
            onClick={onMoveDown}
            disabled={isLast}
            className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
        
        <div className="w-6 h-6 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-xs font-medium">
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-zinc-500" />
            <span className="font-medium text-sm truncate">
              {agent?.name || step.agentId}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[step.role]}`}>
              {step.role}
            </span>
          </div>
          {agent?.version && (
            <span className="text-xs text-zinc-400">v{agent.version}</span>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >
          <Settings2 className="w-4 h-4 text-zinc-400" />
        </button>
        
        <button
          onClick={onRemove}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-700 space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Role</label>
            <select
              value={step.role}
              onChange={(e) => onUpdate({ role: e.target.value as any })}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
            >
              <option value="generator">Generator</option>
              <option value="critic">Critic</option>
              <option value="refiner">Refiner</option>
              <option value="analyzer">Analyzer</option>
            </select>
          </div>

          {flagKeys.length > 0 && (
            <div>
              <div className="flex items-center gap-1 text-xs text-zinc-500 mb-2">
                <Flag className="w-3 h-3" />
                <span>Detected Flags ({flagKeys.length})</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {flagKeys.slice(0, 10).map(flag => (
                  <div 
                    key={flag} 
                    className="text-xs bg-zinc-50 dark:bg-zinc-900 rounded px-2 py-1"
                  >
                    <code className="text-indigo-600 dark:text-indigo-400">{flag}</code>
                    {detectedFlags[flag] && (
                      <span className="text-zinc-400 ml-2 truncate block">
                        {detectedFlags[flag].substring(0, 50)}
                      </span>
                    )}
                  </div>
                ))}
                {flagKeys.length > 10 && (
                  <div className="text-xs text-zinc-400 text-center py-1">
                    +{flagKeys.length - 10} more flags
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingsPanel() {
  const { settings, updateSettings, setTheme, isDarkMode } = usePlatformStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-zinc-500 mb-2">Theme</label>
        <div className="flex gap-2">
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                settings.theme === value
                  ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between text-sm mb-2">
          <span>Max Iterations</span>
          <span className="text-zinc-500">{settings.maxIterations}</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={settings.maxIterations}
          onChange={(e) => updateSettings({ maxIterations: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      <div>
        <label className="flex items-center justify-between text-sm mb-2">
          <span>Context Window</span>
          <span className="text-zinc-500">{settings.contextWindow} msgs</span>
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={settings.contextWindow}
          onChange={(e) => updateSettings({ contextWindow: parseInt(e.target.value) })}
          className="w-full accent-indigo-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Skip Critique</span>
        <button
          onClick={() => updateSettings({ skipCritique: !settings.skipCritique })}
          className={`w-10 h-6 rounded-full transition-colors ${
            settings.skipCritique 
              ? 'bg-indigo-500' 
              : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${
            settings.skipCritique ? 'translate-x-4' : ''
          }`} />
        </button>
      </div>
    </div>
  );
}

export function RightPanel() {
  const { 
    activePipeline, 
    discoveredAgents,
    availableAgents,
    removePipelineStep, 
    updatePipelineStep,
    reorderPipeline,
    clearPipeline,
    addPipelineStep,
  } = usePlatformStore();

  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <aside className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <button
            onClick={() => setPipelineOpen(!pipelineOpen)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {pipelineOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Layers className="w-4 h-4 text-indigo-500" />
            Pipeline
            {activePipeline.length > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs rounded-full">
                {activePipeline.length}
              </span>
            )}
          </button>

          {pipelineOpen && (
            <div className="px-4 pb-4 space-y-3">
              {activePipeline.length === 0 ? (
                <div className="text-center py-6 text-sm text-zinc-400">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No steps</p>
                  <p className="text-xs mt-1">Add agents from sidebar</p>
                </div>
              ) : (
                <>
                  {activePipeline.map((step, index) => (
                    <PipelineStepCard
                      key={step.id}
                      step={step}
                      index={index}
                      agent={discoveredAgents.find(a => a.id === step.agentId)}
                      onRemove={() => removePipelineStep(step.id)}
                      onUpdate={(updates) => updatePipelineStep(step.id, updates)}
                      onMoveUp={() => index > 0 && reorderPipeline(index, index - 1)}
                      onMoveDown={() => index < activePipeline.length - 1 && reorderPipeline(index, index + 1)}
                      isFirst={index === 0}
                      isLast={index === activePipeline.length - 1}
                    />
                  ))}
                  
                  <button
                    onClick={clearPipeline}
                    className="w-full px-3 py-2 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                </>
              )}

              <div className="relative">
                <button
                  onClick={() => setQuickAddOpen(!quickAddOpen)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Step
                </button>

                {quickAddOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-lg z-10 overflow-hidden">
                    {availableAgents.map(agent => {
                      const Icon = iconMap[agent.icon] || Sparkles;
                      return (
                        <button
                          key={agent.id}
                          onClick={() => {
                            addPipelineStep(agent.id, agent.defaultRoles[0] || 'generator');
                            setQuickAddOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700"
                        >
                          <Icon className="w-4 h-4 text-zinc-500" />
                          <span>{agent.name}</span>
                          {agent.version && (
                            <span className="text-xs text-zinc-400 ml-auto">v{agent.version}</span>
                          )}
                        </button>
                      );
                    })}
                    {availableAgents.length === 0 && (
                      <div className="px-3 py-2 text-sm text-zinc-400">No agents available</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            {settingsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Settings2 className="w-4 h-4 text-zinc-500" />
            Settings
          </button>

          {settingsOpen && (
            <div className="px-4 pb-4">
              <SettingsPanel />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
