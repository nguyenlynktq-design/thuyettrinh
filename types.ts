
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
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1'
}

export const LEVEL_CONFIG: Record<EnglishLevel, { label: string; description: string; vocab: number; sentenceLength: string }> = {
  [EnglishLevel.STARTER]: {
    label: 'Starter',
    description: 'Beginner - Very basic words',
    vocab: 50,
    sentenceLength: '3-5 words per sentence, simple present tense only'
  },
  [EnglishLevel.A1]: {
    label: 'A1',
    description: 'Elementary - Basic phrases',
    vocab: 100,
    sentenceLength: '5-7 words per sentence, present tense'
  },
  [EnglishLevel.A2]: {
    label: 'A2',
    description: 'Pre-Intermediate - Simple sentences',
    vocab: 200,
    sentenceLength: '7-10 words per sentence, past and present tense'
  },
  [EnglishLevel.B1]: {
    label: 'B1',
    description: 'Intermediate - Complex ideas',
    vocab: 400,
    sentenceLength: '10-15 words per sentence, various tenses, conjunctions'
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
