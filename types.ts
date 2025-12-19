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

export interface FolderTemplate {
  id: string;
  name: string;
  description: string;
  structure: FolderStructureNode[];
  createdAt: number;
  updatedAt: number;
  isDefault?: boolean;
}

export interface FolderStructureNode {
  id: string;
  name: string;
  children: FolderStructureNode[];
  parentId: string | null;
}

export type FolderCreationMode = 'ai_generated' | 'template_based' | 'hybrid';

export interface TemplateSettings {
  folderCreationMode: FolderCreationMode;
  selectedTemplateId: string | null;
  allowAiFolderCreation: boolean;
  strictMode: boolean; // If true, AI cannot create new folders, must use existing ones
}

export interface UserCorrection {
  id: string;
  originalBookmarkUrl: string;
  originalPath: string[];
  correctedPath: string[];
  timestamp: number;
  reason?: string; // Optional: why the user corrected it
}

export interface EmptyFolderTree {
  id: string;
  name: string;
  structure: FolderStructureNode[];
  createdAt: number;
  updatedAt: number;
}

// Phase 2: Enhanced Features Types
export interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: number;
  size: number;
  bookmarkCount: number;
  folderCount: number;
  driveFileId?: string;
  type: 'manual' | 'auto';
  status: 'pending' | 'completed' | 'failed';
}

export interface SyncStatus {
  lastSync: number;
  status: 'idle' | 'syncing' | 'error';
  errorMessage?: string;
  pendingChanges: number;
}

export interface AnalyticsData {
  totalBookmarks: number;
  totalFolders: number;
  avgBookmarksPerFolder: number;
  topDomains: Array<{ domain: string; count: number }>;
  folderDistribution: Array<{ folder: string; count: number }>;
  tagUsage: Array<{ tag: string; count: number }>;
  aiPerformance: {
    totalRequests: number;
    successRate: number;
    avgTokensPerRequest: number;
    accuracyScore: number;
  };
  usageStats: {
    totalSessions: number;
    avgSessionDuration: number;
    mostUsedFeatures: string[];
    importCount: number;
    exportCount: number;
  };
  growthTrends: Array<{ date: string; bookmarks: number; folders: number }>;
}

export interface ExtensionMessage {
  type: 'AUTH_REQUEST' | 'BOOKMARK_DATA' | 'SYNC_REQUEST' | 'STATUS_UPDATE';
  payload?: any;
  requestId?: string;
}

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

export interface DbConnection {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: number;
  connectionString: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  provider: 'supabase' | 'postgresql' | 'neon';
}
