import { 
  PanelLeftClose, 
  PanelRightClose, 
  Settings, 
  Wifi, 
  WifiOff,
  Layers,
  Zap
} from 'lucide-react';
import { usePlatformStore } from '../store';

export function Header() {
  const { 
    isConnected, 
    isProcessing, 
    currentIteration,
    currentStep,
    activePipeline,
    settings,
    toggleSidebar, 
    toggleRightPanel, 
    toggleSettings,
    sidebarCollapsed,
    rightPanelCollapsed
  } = usePlatformStore();

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
        >
          <PanelLeftClose className={`w-5 h-5 text-zinc-500 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">Bridge</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-1 text-sm text-zinc-500">
          <span>/</span>
          <span className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">Platform</span>
          <span>/</span>
          <span className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">Orchestration</span>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {activePipeline.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-full">
            <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {activePipeline.length} step{activePipeline.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 rounded-full">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {currentStep > 0 ? `Step ${currentStep}` : `Iter ${currentIteration}`}
            </span>
          </div>
        )}

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
          isConnected 
            ? 'bg-emerald-50 dark:bg-emerald-950/50' 
            : 'bg-zinc-100 dark:bg-zinc-800'
        }`}>
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span className={`text-xs font-medium ${
            isConnected 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-zinc-500'
          }`}>
            {isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
          <span className="text-xs text-zinc-500">Max:</span>
          <span className="text-xs font-medium">{settings.maxIterations}</span>
        </div>

        <button
          onClick={toggleSettings}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <Settings className="w-5 h-5 text-zinc-500" />
        </button>
        
        <button
          onClick={toggleRightPanel}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title={rightPanelCollapsed ? "Show panel" : "Hide panel"}
        >
          <PanelRightClose className={`w-5 h-5 text-zinc-500 transition-transform ${rightPanelCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </header>
  );
}
