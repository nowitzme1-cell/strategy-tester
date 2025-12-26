
import React, { useState, useEffect } from 'react';
import { UserProfile } from './types';
import StrategyTester from './components/StrategyTester';
import { verifyWebhook } from './services/n8nService';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>(() => 
    localStorage.getItem('n8n_webhook') || 'https://primary-production-4f1b.up.railway.app/webhook/trading-agent'
  );
  const [tempUrl, setTempUrl] = useState(webhookUrl);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'verifying' | 'success' | 'error' | 'cors_issue' | 'mixed_content'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    
    if (name && email) {
      const newUser = {
        id: `UID-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        name,
        email,
      };
      setUser(newUser);
      localStorage.setItem('quantleap_user', JSON.stringify(newUser));
    }
  };

  const forceSave = () => {
    try {
      new URL(tempUrl);
      localStorage.setItem('n8n_webhook', tempUrl);
      setWebhookUrl(tempUrl);
      setConnectionStatus('success');
      setStatusMessage('Linked (Manual Override)');
      setShowConfig(false);
    } catch (e) {
      setStatusMessage('Invalid URL - Cannot link.');
      setConnectionStatus('error');
    }
  };

  const handleSync = async () => {
    setConnectionStatus('verifying');
    setStatusMessage('Attempting handshake...');
    
    const result = await verifyWebhook(tempUrl);
    
    if (result.success) {
      setConnectionStatus('success');
      setStatusMessage('Stable Connection');
      localStorage.setItem('n8n_webhook', tempUrl);
      setWebhookUrl(tempUrl);
      setTimeout(() => setShowConfig(false), 1500); // Close panel on success
    } else {
      if (result.isMixedContent) setConnectionStatus('mixed_content');
      else if (result.isCorsError) setConnectionStatus('cors_issue');
      else setConnectionStatus('error');
      
      setStatusMessage(result.message);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('quantleap_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('quantleap_user');
      }
    }
    // Auto-verify on load if URL exists
    if (webhookUrl) {
      handleSync();
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 selection:bg-blue-500/30">
        <div className="w-full max-w-sm">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-black text-white tracking-tighter mb-2">QUANTLEAP</h1>
            <p className="text-slate-600 text-[10px] uppercase font-bold tracking-[0.3em]">AI Tactical Engine</p>
          </div>
          <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2rem] shadow-2xl">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest ml-1">Identity</label>
                <input name="name" required placeholder="Enter Full Name" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-blue-600 transition-all placeholder:text-slate-700" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-600 font-black uppercase tracking-widest ml-1">Contact</label>
                <input name="email" required type="email" placeholder="Enter Email Address" className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-blue-600 transition-all placeholder:text-slate-700" />
              </div>
              <button type="submit" className="w-full bg-white text-slate-950 font-black py-4 rounded-xl hover:bg-slate-200 transition-all text-xs uppercase tracking-widest mt-4">Access Terminal</button>
            </form>
          </div>
          <p className="text-center mt-8 text-[10px] text-slate-700 font-medium">SECURED CONNECTION ACTIVE</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-blue-500/30">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-600'}`}></div>
            <span className="font-black text-lg tracking-tighter text-white">QUANTLEAP</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
              <div className={`w-1 h-1 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500' : 'bg-slate-600'}`}></div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">
                {connectionStatus === 'success' ? 'Active Terminal' : 'Connection Lost'}
              </span>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-500 transition-colors">Disconnect</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <aside className="md:col-span-3 space-y-6">
            {/* Operator Card */}
            <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest block mb-1">Operator</label>
                  <p className="text-xs text-white font-bold truncate">{user.name}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                  {user.name.charAt(0)}
                </div>
              </div>
              <div>
                <label className="text-[9px] text-slate-700 font-black uppercase tracking-widest block mb-1">Session ID</label>
                <p className="text-[10px] font-mono text-slate-500 tracking-tighter">{user.id}</p>
              </div>
            </div>

            {/* Connection Health Sidebar Item (Replaces the big box) */}
            <div className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[9px] text-blue-500 font-black uppercase tracking-widest block">Connection Health</label>
                <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-[9px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-500 transition-colors"
                >
                  {showConfig ? 'Close' : 'Modify'}
                </button>
              </div>

              {!showConfig ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">
                      {new URL(webhookUrl).hostname}
                    </span>
                  </div>
                  <div className={`text-[9px] font-black px-2 py-1 rounded border ${
                    connectionStatus === 'success' ? 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10' : 'text-rose-500 bg-rose-500/5 border-rose-500/10'
                  }`}>
                    {connectionStatus === 'success' ? 'SECURE_LINK_ACTIVE' : 'OFFLINE_TERMINAL'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-1">
                    <input 
                      type="text" 
                      value={tempUrl}
                      onChange={(e) => {
                        setTempUrl(e.target.value);
                        if (connectionStatus !== 'idle') setConnectionStatus('idle');
                      }}
                      placeholder="Enter Webhook URL"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[10px] text-slate-400 font-mono focus:border-blue-600 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <button 
                      onClick={handleSync}
                      disabled={connectionStatus === 'verifying' || !tempUrl}
                      className="w-full py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-500 disabled:bg-slate-800 transition-all"
                    >
                      {connectionStatus === 'verifying' ? 'Handshaking...' : 'Update & Sync'}
                    </button>
                    <button 
                      onClick={forceSave}
                      className="w-full py-1.5 text-[8px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400"
                    >
                      Force Link Anyway
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* System Status Indicators */}
            <div className="px-5 py-3 border-l-2 border-slate-800 space-y-2">
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Latency</span>
                  <span className="text-[9px] font-mono text-emerald-500">{connectionStatus === 'success' ? '14ms' : '--'}</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Protocol</span>
                  <span className="text-[9px] font-mono text-blue-500">WSS/REST</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-600 uppercase">Engine</span>
                  <span className="text-[9px] font-mono text-slate-500">v2.5-PRIME</span>
               </div>
            </div>
          </aside>

          <div className="md:col-span-9">
            <StrategyTester user={user} webhookUrl={webhookUrl} />
          </div>
        </div>
      </main>

      {/* Persistent Bottom Status Bar */}
      <footer className="fixed bottom-0 w-full border-t border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-2 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                System Status: {connectionStatus === 'success' ? 'Operational' : 'Awaiting Connection'}
              </span>
            </div>
            <div className="h-3 w-[1px] bg-slate-800"></div>
            <span className="text-[9px] font-mono text-slate-700 truncate max-w-md">
              Endpoint: {webhookUrl}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-bold text-slate-700 uppercase">
             <span>Market: Open</span>
             <span>UTC: {new Date().toISOString().slice(11,16)}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
