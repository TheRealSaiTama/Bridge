import { useEffect } from 'react';
import { useBridgeStore } from './store';
import { ChatInterface } from './components/ChatInterface';
import { Header } from './components/Header';
import { BackgroundEffects } from './components/BackgroundEffects';

function App() {
  const { connect } = useBridgeStore();

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <BackgroundEffects />
      <Header />
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}

export default App;
