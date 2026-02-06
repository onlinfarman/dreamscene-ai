
import React, { useState, useEffect, useRef } from 'react';
import { ConfigState, AppStyle, GenerationResult } from './types';
import { GeminiService } from './services/gemini';
import { HistoryDB } from './services/db';
import ConfigurationPanel from './components/ConfigurationPanel';
import ResultCard from './components/ResultCard';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [config, setConfig] = useState<ConfigState>({
    aspectRatio: '16:9',
    style: AppStyle.REALISTIC,
    sceneCount: 1,
    mode: 'photo' // Default mode set to 'photo'
  });
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [isExpanding, setIsExpanding] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const db = HistoryDB.getInstance();

  useEffect(() => {
    const init = async () => {
      // @ts-ignore
      const selected = await window.aistudio?.hasSelectedApiKey();
      setHasApiKey(!!selected);

      // Load History
      try {
        const savedHistory = await db.getAll();
        setHistory(savedHistory);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    init();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
    setHasApiKey(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ 
          ...prev, 
          referenceImage: reader.result as string,
          referenceMimeType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeReference = () => {
    setConfig(prev => ({ ...prev, referenceImage: undefined, referenceMimeType: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateAndSaveResult = async (updatedResult: GenerationResult) => {
    setResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
    setHistory(prev => {
      const exists = prev.find(p => p.id === updatedResult.id);
      if (exists) {
        return prev.map(p => p.id === updatedResult.id ? updatedResult : p);
      } else {
        return [updatedResult, ...prev];
      }
    });
    const toSave = { ...updatedResult, videoUrl: undefined };
    await db.save(toSave);
  };

  const generateAll = async () => {
    if (!prompt.trim()) return;
    
    setIsExpanding(true);
    setResults([]);
    setActiveTab('current');

    try {
      const gemini = GeminiService.getInstance();
      const scenePrompts = await gemini.expandPrompt(prompt, config.style, config.sceneCount);
      
      const initialResults = scenePrompts.map((p, idx) => ({
        id: `${Date.now()}-${idx}`,
        scenePrompt: p,
        isGeneratingImage: config.mode === 'photo' || config.mode === 'both',
        isGeneratingVideo: config.mode === 'video',
        usedReference: !!config.referenceImage
      }));
      
      setResults(initialResults);
      setIsExpanding(false);

      scenePrompts.forEach(async (p, idx) => {
        const resultId = initialResults[idx].id;
        try {
          let imageUrl;
          let videoUrl;

          if (config.mode === 'photo' || config.mode === 'both') {
            imageUrl = await gemini.generateImage(p, config);
            const midResult = { ...initialResults[idx], imageUrl, isGeneratingImage: false };
            await updateAndSaveResult(midResult);
            
            if (config.mode === 'both') {
              setResults(prev => prev.map(r => r.id === resultId ? { ...r, isGeneratingVideo: true } : r));
              videoUrl = await gemini.generateVideo(p, config, imageUrl);
              const finalResult = { ...midResult, videoUrl, isGeneratingVideo: false };
              await updateAndSaveResult(finalResult);
            }
          } 
          else if (config.mode === 'video') {
            videoUrl = await gemini.generateVideo(p, config);
            const finalResult = { ...initialResults[idx], videoUrl, isGeneratingVideo: false };
            await updateAndSaveResult(finalResult);
          }

        } catch (error: any) {
          console.error("Scene generation error:", error);
          if (error.message?.includes('Requested entity was not found')) {
            handleSelectKey();
          }
          setResults(prev => prev.map(r => r.id === resultId ? { ...r, isGeneratingImage: false, isGeneratingVideo: false, error: 'Generation failed' } : r));
        }
      });

    } catch (e) {
      console.error(e);
      setIsExpanding(false);
    }
  };

  const generateVideoForScene = async (id: string) => {
    const target = results.find(r => r.id === id) || history.find(r => r.id === id);
    if (!target) return;

    const updateFn = (prev: GenerationResult[]) => prev.map(r => r.id === id ? { ...r, isGeneratingVideo: true } : r);
    setResults(updateFn);
    setHistory(updateFn);

    try {
      const gemini = GeminiService.getInstance();
      const videoUrl = await gemini.generateVideo(target.scenePrompt, config, target.imageUrl);
      const updated = { ...target, videoUrl, isGeneratingVideo: false };
      await updateAndSaveResult(updated);
    } catch (err: any) {
      if (err.message.includes('Requested entity was not found')) {
        handleSelectKey();
      }
      const errFn = (prev: GenerationResult[]) => prev.map(r => r.id === id ? { ...r, isGeneratingVideo: false, error: 'Video failed' } : r);
      setResults(errFn);
      setHistory(errFn);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    await db.delete(id);
    setHistory(prev => prev.filter(r => r.id !== id));
    setResults(prev => prev.filter(r => r.id !== id));
  };

  const clearHistory = async () => {
    if (confirm("Are you sure you want to clear all history?")) {
      await db.clear();
      setHistory([]);
    }
  };

  const downloadMedia = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAll = () => {
    const list = activeTab === 'current' ? results : history;
    list.forEach((r, i) => {
      if (r.imageUrl) downloadMedia(r.imageUrl, `scene-${i}-image.png`);
      if (r.videoUrl) downloadMedia(r.videoUrl, `scene-${i}-video.mp4`);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <nav className="h-16 border-b border-white/5 flex items-center px-6 glass sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">DreamScene AI</h1>
        </div>
        
        {!hasApiKey && (
          <button 
            onClick={handleSelectKey}
            className="ml-auto px-4 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-xs font-bold hover:bg-yellow-500 hover:text-black transition-all"
          >
            Setup Video Key
          </button>
        )}
      </nav>

      {/* Hero Section: Prompt & Reference Image at the TOP */}
      <section className="w-full bg-slate-900/30 border-b border-white/5 pt-8 pb-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-6 items-center">
          <div className="w-full relative">
            <div className="glass p-2 rounded-[2.5rem] shadow-2xl flex items-center gap-2 border border-white/10">
              <div className="flex-1 px-6 py-4">
                <input 
                  type="text" 
                  placeholder="Explain your vision... (e.g., 'A cyberpunk city during rain')" 
                  className="w-full bg-transparent border-none outline-none text-xl text-white placeholder:text-slate-600 font-medium"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && generateAll()}
                />
              </div>
              <button 
                onClick={generateAll}
                disabled={isExpanding || !prompt.trim()}
                className={`p-6 rounded-full shadow-lg transition-all ${
                  isExpanding || !prompt.trim() 
                    ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105 active:scale-95 shadow-blue-500/20'
                }`}
              >
                {isExpanding ? (
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                )}
              </button>
            </div>
          </div>

          {/* Reference Image Section directly below prompt */}
          <div className="w-full flex justify-center">
            {config.referenceImage ? (
              <div className="flex items-center gap-5 p-4 bg-blue-600/10 rounded-2xl border border-blue-500/30 animate-in fade-in slide-in-from-top-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/20 shadow-lg">
                  <img src={config.referenceImage} className="w-full h-full object-cover" alt="Reference" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-blue-400">Reference Image Attached</span>
                  <p className="text-xs text-slate-400">Guiding style and composition</p>
                  <button 
                    onClick={removeReference}
                    className="text-[11px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider mt-2 text-left transition-colors"
                  >
                    Remove Attachment
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 px-8 py-3.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-blue-500/40 transition-all text-slate-400 hover:text-blue-400 group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-600 group-hover:text-blue-400 border border-white/5 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold uppercase tracking-wider">Add Reference Image</span>
                  <span className="text-[10px] text-slate-500 group-hover:text-slate-400">Upload to guide style or structure</span>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace below Hero */}
      <main className="flex-1 flex flex-col lg:flex-row p-6 lg:p-10 gap-10 max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          <ConfigurationPanel config={config} setConfig={setConfig} />
          
          <div className="glass p-6 rounded-3xl flex flex-col gap-5 border border-white/5 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Workspace Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Mode</span>
                <span className="text-blue-400 uppercase font-black text-[10px] bg-blue-500/10 px-2 py-1 rounded">{config.mode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Scenes</span>
                <span className="text-slate-200 font-bold">{config.sceneCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Style Profile</span>
                <span className="text-slate-200 font-medium">{config.style}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-2">
              {(results.length > 0 || history.length > 0) && (
                <button 
                  onClick={downloadAll}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Download {activeTab === 'current' ? 'Results' : 'History'}
                </button>
              )}
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="w-full py-2.5 text-[10px] text-red-400/50 hover:text-red-400 uppercase font-black tracking-widest transition-all rounded-xl hover:bg-red-500/5"
                >
                  Empty History
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Results / History Container */}
        <div className="flex-1 flex flex-col gap-8">
          <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl w-fit border border-white/5 shadow-inner">
            <button 
              onClick={() => setActiveTab('current')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'current' ? 'bg-slate-800 text-white shadow-lg border border-white/5' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Current Work
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all ${activeTab === 'history' ? 'bg-slate-800 text-white shadow-lg border border-white/5' : 'text-slate-500 hover:text-slate-300'}`}
            >
              History ({history.length})
            </button>
          </div>

          <div className="flex-1">
            {(activeTab === 'current' ? results : history).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in zoom-in-95 duration-500">
                {(activeTab === 'current' ? results : history).map((res) => (
                  <ResultCard 
                    key={res.id} 
                    result={res} 
                    onGenerateVideo={generateVideoForScene}
                    onDelete={deleteHistoryItem}
                    onDownloadImage={(id) => {
                      const item = history.find(r => r.id === id) || results.find(r => r.id === id);
                      if (item?.imageUrl) downloadMedia(item.imageUrl, `dreamscene-${id}.png`);
                    }}
                    onDownloadVideo={(id) => {
                      const item = history.find(r => r.id === id) || results.find(r => r.id === id);
                      if (item?.videoUrl) downloadMedia(item.videoUrl, `dreamscene-${id}.mp4`);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[450px] flex flex-col items-center justify-center text-center px-6 glass rounded-[3rem] border-dashed border-2 border-white/5">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mb-8 border border-white/10 text-slate-700 shadow-2xl">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                  {activeTab === 'current' ? 'Your canvas is blank' : 'History is empty'}
                </h3>
                <p className="text-slate-500 max-w-sm leading-relaxed">
                  {activeTab === 'current' 
                    ? "Enter your imagination in the prompt box at the top to start generating cinematic scenes." 
                    : "Every creation is persistent. Start generating to build your portfolio."}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="p-10 border-t border-white/5 text-center text-xs text-slate-600 flex flex-col items-center gap-3">
        <p className="font-medium tracking-widest uppercase">DreamScene AI • 2024</p>
        <p className="opacity-60">Harnessing Gemini 2.5 Image & Veo 3.1 Video Engine</p>
      </footer>
    </div>
  );
};

export default App;
