
import { GoogleGenAI, Type, Modality } from "@google/genai";

// API Key management - start with env var, can be updated at runtime
let currentApiKey = (typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')) || process.env.API_KEY || '';

export const setApiKey = (key: string) => {
  currentApiKey = key;
};

export const getApiKey = () => currentApiKey;

export const generateIllustration = async (theme: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: currentApiKey });
  const prompt = `A highly vibrant, cheerful, and detailed cartoon-style illustration for children showing: ${theme}. Use bright colors, clear lines, and friendly characters. Ensure there are many small interesting details for a child to describe (e.g., animals, toys, actions). High resolution, professional children's book style.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: { aspectRatio: "4:3" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

export const generatePresentationScript = async (imageUri: string, theme: string, level: string): Promise<{ intro: string, points: string[], conclusion: string }> => {
  const ai = new GoogleGenAI({ apiKey: currentApiKey });
  const base64Data = imageUri.split(',')[1];

  const levelPrompts: Record<string, string> = {
    'STARTER': `
      - Use only the most basic 50 common words (I, you, is, have, like, this, my, the, a, etc.)
      - Sentences: 3-5 words maximum
      - Only simple present tense (I am, I have, I like)
      - No complex grammar, no conjunctions
      - Example: "This is my dog. I like my dog. My dog is brown."
      - Total script: 30-50 words maximum`,
    'MOVER': `
      - Use 150 vocabulary words including basic verbs and adjectives
      - Sentences: 5-8 words
      - Present and simple past tense allowed
      - Simple connectors: and, but, because
      - Example: "Hello everyone. Today I want to talk about my pet. I have a cat. My cat is cute and fluffy."
      - Total script: 60-100 words maximum`,
    'FLYER': `
      - Use 250 vocabulary words including descriptive adjectives and action verbs
      - Sentences: 8-12 words
      - All basic tenses allowed (present, past, future)
      - Connectors: and, but, because, so, then, when
      - Example: "Good morning everyone. I am going to tell you about my favorite place. Last weekend, I went to the zoo with my family."
      - Total script: 100-150 words maximum`,
    'A1': `
      - Use basic 100 common vocabulary words
      - Sentences: 5-7 words
      - Present tense, basic adjectives
      - Simple connectors: and, but
      - Example: "Hello, my name is Anna. I have a pet dog. The dog is brown and fluffy."
      - Total script: 50-80 words maximum`,
    'A2': `
      - Use 200 vocabulary words including common verbs and adjectives
      - Sentences: 7-10 words
      - Past and present tense allowed
      - Connectors: and, but, because, then
      - Example: "Good morning everyone. Today I want to talk about my family. We went to the park yesterday."
      - Total script: 80-120 words maximum`,
    'B1': `
      - Use up to 400 vocabulary words including descriptive language
      - Sentences: 10-15 words with varied structures
      - All tenses allowed, relative clauses
      - Complex connectors: although, however, therefore
      - Example: "Hello everyone, I would like to present about my favorite holiday. Last summer, my family visited the beach, which was truly amazing."
      - Total script: 120-180 words maximum`,
    'B2': `
      - Use up to 600 vocabulary words including advanced vocabulary
      - Sentences: 12-20 words with complex structures
      - All tenses, passive voice, conditionals allowed
      - Advanced connectors: furthermore, nevertheless, consequently, whereas
      - Use descriptive language with metaphors and similes when appropriate
      - Example: "Good morning everyone. Today, I would like to share my thoughts on environmental protection, which has become increasingly important in our modern society."
      - Total script: 180-250 words maximum`
  };

  const levelInstructions = levelPrompts[level] || levelPrompts['STARTER'];

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/png', data: base64Data } },
        {
          text: `Based on this picture about "${theme}", create an English presentation script for a child learning English at ${level} level (CEFR).
                 
                 STRICT LANGUAGE REQUIREMENTS:
                 ${levelInstructions}
                 
                 The script must include:
                 1. An introduction starting with "Hello everyone, my name is [Name]..."
                 2. 4-6 descriptive sentences about what is happening in the picture.
                 3. A conclusion like "That is all. Thank you for listening."
                 
                 IMPORTANT: 
                 - Use ONLY vocabulary appropriate for ${level} level
                 - Keep sentences SHORT and SIMPLE for lower levels
                 - Focus on clarity over complexity
                 
                 Return the response in JSON format.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intro: { type: Type.STRING },
          points: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          conclusion: { type: Type.STRING }
        },
        required: ["intro", "points", "conclusion"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
  const ai = new GoogleGenAI({ apiKey: currentApiKey });
  // Prompt explicitly asks for slow, clear reading for children
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this script very clearly, slowly (0.8x speed), and expressively with a friendly US English accent for a child: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data generated");

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const decodedData = decodeBase64(base64Audio);
  return await decodeAudioData(decodedData, audioContext, 24000, 1);
};

export const analyzeSpeech = async (originalScript: string, transcript: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: currentApiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following English speech transcript against the target script. 
               Target: "${originalScript}"
               Transcript: "${transcript}"
               
               Provide feedback for a child. 
               1. A score from 0-100.
               2. CEFR Level (Pre-A1, A1, A2, B1).
               3. A list of 2-3 specific words the child mispronounced or missed.
               4. A short encouraging feedback message.
               
               Return JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          cefrLevel: { type: Type.STRING },
          mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
          feedback: { type: Type.STRING }
        },
        required: ["score", "cefrLevel", "mistakes", "feedback"]
      }
    }
  });

  return JSON.parse(response.text);
};

// Utilities
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
