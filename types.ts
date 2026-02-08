
export interface Theme {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export interface PresentationData {
  imageUri: string;
  script: string;
  points: string[];
  intro: string;
  conclusion: string;
}

export interface PracticeResult {
  score: number;
  cefrLevel: string;
  feedback: string;
  transcript: string;
  mistakes: string[];
}

export enum EnglishLevel {
  STARTER = 'STARTER',
  MOVER = 'MOVER',
  FLYER = 'FLYER',
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2'
}

export const LEVEL_CONFIG: Record<EnglishLevel, { label: string; description: string; vocab: number; sentenceLength: string }> = {
  [EnglishLevel.STARTER]: {
    label: 'Starter',
    description: 'Cambridge YLE - Very basic',
    vocab: 50,
    sentenceLength: '3-5 words per sentence'
  },
  [EnglishLevel.MOVER]: {
    label: 'Mover',
    description: 'Cambridge YLE - Elementary',
    vocab: 150,
    sentenceLength: '5-8 words per sentence'
  },
  [EnglishLevel.FLYER]: {
    label: 'Flyer',
    description: 'Cambridge YLE - Pre-intermediate',
    vocab: 250,
    sentenceLength: '8-12 words per sentence'
  },
  [EnglishLevel.A1]: {
    label: 'A1',
    description: 'CEFR - Elementary',
    vocab: 100,
    sentenceLength: '5-7 words per sentence'
  },
  [EnglishLevel.A2]: {
    label: 'A2',
    description: 'CEFR - Pre-Intermediate',
    vocab: 200,
    sentenceLength: '7-10 words per sentence'
  },
  [EnglishLevel.B1]: {
    label: 'B1',
    description: 'CEFR - Intermediate',
    vocab: 400,
    sentenceLength: '10-15 words per sentence'
  },
  [EnglishLevel.B2]: {
    label: 'B2',
    description: 'CEFR - Upper-Intermediate',
    vocab: 600,
    sentenceLength: '12-20 words, complex structures'
  }
};

export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING_IMAGE = 'GENERATING_IMAGE',
  GENERATING_SCRIPT = 'GENERATING_SCRIPT',
  READY = 'READY',
  PRACTICING = 'PRACTICING',
  SCORING = 'SCORING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}
