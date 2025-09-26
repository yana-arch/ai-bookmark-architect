export enum AppState {
  EMPTY = 'EMPTY',
  LOADED = 'LOADED',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  STRUCTURED = 'STRUCTURED',
  ERROR = 'ERROR',
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
}