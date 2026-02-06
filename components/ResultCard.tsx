
import React from 'react';
import { GenerationResult } from '../types';

interface ResultCardProps {
  result: GenerationResult;
  onGenerateVideo: (id: string) => void;
  onDownloadImage: (id: string) => void;
  onDownloadVideo: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, onGenerateVideo, onDownloadImage, onDownloadVideo, onDelete }) => {
  return (
    <div className="glass rounded-2xl overflow-hidden flex flex-col group transition-all hover:ring-2 hover:ring-blue-500/50 relative">
      {/* Delete Button */}
      {onDelete && (
        <button 
          onClick={() => onDelete(result.id)}
          className="absolute top-2 left-2 z-10 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete from History"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      )}

      {/* Media Container */}
      <div className="relative aspect-video bg-slate-900 flex items-center justify-center">
        {result.isGeneratingImage ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-400">Painting scene...</span>
          </div>
        ) : result.imageUrl ? (
          <img src={result.imageUrl} alt={result.scenePrompt} className="w-full h-full object-cover" />
        ) : (
          <div className="text-slate-500 text-xs italic">Awaiting generation...</div>
        )}

        {/* Overlay for actions */}
        {!result.isGeneratingImage && result.imageUrl && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onDownloadImage(result.id)}
              className="p-2 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm"
              title="Download Image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            </button>
          </div>
        )}
      </div>

      {/* Video Section */}
      <div className="p-4 flex flex-col gap-3">
        <p className="text-sm text-slate-300 line-clamp-2 min-h-[2.5rem]">{result.scenePrompt}</p>
        
        <div className="pt-2 border-t border-white/5">
          {result.isGeneratingVideo ? (
            <div className="flex items-center gap-3 bg-blue-900/20 p-3 rounded-xl">
              <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="flex-1">
                <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Veo AI at work</div>
                <div className="text-xs text-slate-300">Generating video motion...</div>
              </div>
            </div>
          ) : result.videoUrl ? (
            <div className="space-y-2">
              <video 
                src={result.videoUrl} 
                className="w-full rounded-lg border border-white/10" 
                controls 
              />
              <button 
                onClick={() => onDownloadVideo(result.id)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Download Video
              </button>
            </div>
          ) : (
            <button 
              disabled={!result.imageUrl || result.isGeneratingImage}
              onClick={() => onGenerateVideo(result.id)}
              className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                !result.imageUrl || result.isGeneratingImage
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              Animate Scene
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
