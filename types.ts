// Fix: Define and export all necessary types and enums. All database logic has been moved to db.ts.
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
}

export interface Folder {
  id: string;
  name: string;
  children: (Folder | Bookmark)[];
  parentId: string | null;
}

export type CategorizedBookmark = Bookmark & {
  path: string[];
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