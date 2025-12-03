import { useEffect } from 'react';
import { usePlatformStore } from './store';
import { Sidebar } from './components/Sidebar';
import { MainChat } from './components/MainChat';
import { RightPanel } from './components/RightPanel';
import { Header } from './components/Header';

function App() {
  const { 
    connect, 
    fetchAgents, 
    fetchSessions,
    sidebarCollapsed, 
    rightPanelCollapsed,
    activeSessionId,
    isDarkMode
  } = usePlatformStore();

  useEffect(() => {
    fetchAgents();
    fetchSessions();
    connect(activeSessionId || undefined);
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <div className={`transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0' : 'w-64'} overflow-hidden flex-shrink-0`}>
          <Sidebar />
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden border-x border-zinc-200 dark:border-zinc-800">
          <MainChat />
        </div>
        
        <div className={`transition-all duration-300 ease-in-out ${rightPanelCollapsed ? 'w-0' : 'w-80'} overflow-hidden flex-shrink-0`}>
          <RightPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
