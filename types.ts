
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export enum AppStyle {
  REALISTIC = 'Realistic',
  CINEMATIC = 'Cinematic',
  PHOTOGRAPHIC = 'Photographic',
  FANTASY = 'Fantasy',
  CYBERPUNK = 'Cyberpunk',
  ANIME = 'Anime',
  MINIMALIST = 'Minimalist'
}

export type GenerationMode = 'photo' | 'video' | 'both';

export interface GenerationResult {
  id: string;
  scenePrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  isGeneratingImage: boolean;
  isGeneratingVideo: boolean;
  error?: string;
  usedReference?: boolean;
}

export interface ConfigState {
  aspectRatio: AspectRatio;
  style: AppStyle;
  sceneCount: number;
  mode: GenerationMode;
  referenceImage?: string; // base64
  referenceMimeType?: string;
}
