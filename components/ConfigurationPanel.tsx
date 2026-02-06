
import React from 'react';
import { AspectRatio, AppStyle, ConfigState, GenerationMode } from '../types';

interface ConfigurationPanelProps {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, setConfig }) => {
  const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const styles = Object.values(AppStyle);
  const modes: { id: GenerationMode; label: string; icon: string }[] = [
    { id: 'photo', label: 'Photo', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'video', label: 'Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { id: 'both', label: 'Both', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
  ];

  return (
    <div className="glass p-5 rounded-3xl flex flex-col gap-5 w-full lg:w-72 flex-shrink-0 shadow-xl border border-white/10">
      <h2 className="text-lg font-bold tracking-tight text-white mb-1">Settings</h2>
      
      {/* Generation Mode */}
      <section>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Mode</label>
        <div className="flex gap-1.5 p-1 bg-slate-900/50 rounded-xl border border-white/5">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setConfig(prev => ({ ...prev, mode: m.id }))}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all ${
                config.mode === m.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={m.icon}></path>
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-tighter">{m.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Aspect Ratio - Select Menu */}
      <section>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Aspect Ratio</label>
        <div className="relative">
          <select
            value={config.aspectRatio}
            onChange={(e) => setConfig(prev => ({ ...prev, aspectRatio: e.target.value as AspectRatio }))}
            className="w-full bg-slate-900/80 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
          >
            {aspectRatios.map((ratio) => (
              <option key={ratio} value={ratio} className="bg-slate-900">{ratio}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </section>

      {/* Art Style - Select Menu */}
      <section>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">Art Style</label>
        <div className="relative">
          <select
            value={config.style}
            onChange={(e) => setConfig(prev => ({ ...prev, style: e.target.value as AppStyle }))}
            className="w-full bg-slate-900/80 border border-white/10 text-white text-sm rounded-xl px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all cursor-pointer"
          >
            {styles.map((style) => (
              <option key={style} value={style} className="bg-slate-900">{style}</option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </section>

      {/* Scene Count */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Scenes</label>
          <span className="text-blue-400 font-bold text-xs">{config.sceneCount}</span>
        </div>
        <div className="px-1">
          <input 
            type="range" 
            min="1" 
            max="5" 
            step="1" 
            value={config.sceneCount}
            onChange={(e) => setConfig(prev => ({ ...prev, sceneCount: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </section>
    </div>
  );
};

export default ConfigurationPanel;
