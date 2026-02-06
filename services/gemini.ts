
import { GoogleGenAI, Type } from "@google/genai";
import { ConfigState } from "../types";

export class GeminiService {
  private static instance: GeminiService;
  
  private constructor() {}

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  private getClient() {
    return new GoogleGenAI({ apiKey: (process.env.API_KEY as string) });
  }

  async expandPrompt(basePrompt: string, style: string, count: number): Promise<string[]> {
    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Break down the following visual concept into ${count} distinct, highly detailed, and realistic visual scenes. 
      Style should be: ${style}.
      Base Prompt: ${basePrompt}.
      
      Return as a JSON array of strings, each string being a complete image generation prompt.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    try {
      return JSON.parse(response.text || '[]');
    } catch (e) {
      return [basePrompt];
    }
  }

  async generateImage(prompt: string, config: ConfigState): Promise<string> {
    const ai = this.getClient();
    const parts: any[] = [{ text: `${prompt} | Style: ${config.style} | high resolution, photorealistic, 8k` }];

    if (config.referenceImage && config.referenceMimeType) {
      parts.unshift({
        inlineData: {
          data: config.referenceImage.split(',')[1],
          mimeType: config.referenceMimeType
        }
      });
      parts[parts.length - 1].text += " Use the attached image as a style and composition reference.";
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  }

  async generateVideo(prompt: string, config: ConfigState, sourceImage?: string): Promise<string> {
    const ai = this.getClient();
    
    // We prefer the generated image as source, then the reference image, then text-only
    const imageToUse = sourceImage || config.referenceImage;
    const mimeToUse = sourceImage ? 'image/png' : (config.referenceMimeType || 'image/png');
    
    const videoParams: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: config.aspectRatio.replace(':', '/') as any
      }
    };

    if (imageToUse) {
      videoParams.image = {
        imageBytes: imageToUse.split(',')[1],
        mimeType: mimeToUse
      };
    }

    let operation = await ai.models.generateVideos(videoParams);

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no URI");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}
