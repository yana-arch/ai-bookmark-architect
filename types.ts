export enum AppState {
  EMPTY = 'EMPTY',
  LOADED = 'LOADED',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  STRUCTURED = 'STRUCTURED',
  ERROR = 'ERROR',
}

export enum BrokenLinkCheckState {
  IDLE = 'IDLE',
  CHECKING = 'CHECKING',
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  parentId: string | null;
  path?: string[];
  tags?: string[];
}

export interface Folder {
  id:string;
  name: string;
  children: (Folder | Bookmark)[];
  parentId: string | null;
  bookmarkCount?: number;
}

export type CategorizedBookmark = Bookmark & {
  path: string[];
  tags: string[];
};

export type ApiKeyStatus = 'active' | 'inactive' | 'error';

export interface InstructionPreset {
  id: string;
  name: string;
  description: string;
  folderStructure: string[]; // Predefined folder names
  namingRules: string[]; // Rules for naming conventions
  customInstructions: string; // Additional instructions
  createdAt: number;
  updatedAt: number;
}

export interface ApiConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'openrouter';
  apiKey: string;
  model: string;
  status: ApiKeyStatus;
}

export interface DetailedLog {
  id: string;
  timestamp: string;
  type: 'info' | 'request' | 'response' | 'error';
  title: string;
  content: string | object;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface DuplicateStats {
  count: number;
  byHost: { [host: string]: number };
}
