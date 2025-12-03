import { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Sparkles, 
  Zap, 
  Brain, 
  Code,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { usePlatformStore } from '../store';
import { DiscoveredAgent } from '../types';

const iconMap: Record<string, React.ComponentType<any>> = {
  Sparkles,
  Zap,
  Brain,
  Code,
};

const colorMap: Record<string, string> = {
  indigo: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50',
  amber: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
  purple: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50',
  emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
};

function AgentCard({ agent }: { agent: DiscoveredAgent }) {
  const { addPipelineStep } = usePlatformStore();
  const Icon = iconMap[agent.icon] || Sparkles;
  const colorClass = colorMap[agent.color] || colorMap.indigo;

  return (
    <div 
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        agent.isAvailable 
          ? 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm' 
          : 'border-zinc-100 dark:border-zinc-800 opacity-50'
      }`}
      onClick={() => agent.isAvailable && addPipelineStep(agent.id, agent.defaultRoles[0] || 'generator')}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{agent.name}</span>
            {agent.isAvailable ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-zinc-500 truncate mt-0.5">{agent.description}</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { 
    sessions, 
    activeSessionId, 
    setActiveSession, 
    createSession, 
    deleteSession,
    discoveredAgents,
    connect
  } = usePlatformStore();

  const [sessionsOpen, setSessionsOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);

  const handleCreateSession = async () => {
    const session = await createSession();
    connect(session.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSession(sessionId);
    connect(sessionId);
  };

  return (
    <aside className="h-full flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      <div className="flex-1 overflow-y-auto">
        <div className="p-3">
          <button
            onClick={() => setSessionsOpen(!sessionsOpen)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {sessionsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Sessions
          </button>
          
          {sessionsOpen && (
            <div className="mt-2 space-y-1">
              <button
                onClick={handleCreateSession}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
              
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    activeSessionId === session.id
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{session.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setAgentsOpen(!agentsOpen)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {agentsOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            Agent Library
          </button>
          
          {agentsOpen && (
            <div className="mt-2 space-y-2">
              {discoveredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
              
              {discoveredAgents.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-4">
                  No agents discovered
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="text-xs text-zinc-400 text-center">
          {discoveredAgents.filter(a => a.isAvailable).length} / {discoveredAgents.length} agents available
        </div>
      </div>
    </aside>
  );
}

