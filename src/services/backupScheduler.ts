import type { Bookmark, Folder } from '@/types';
import * as db from '@/db';

// Simplified backup scheduler - scheduled backups disabled since we use key-based system
class BackupScheduler {
  async initialize(): Promise<void> {
    // No scheduled backups in key-based system
    console.log('Backup scheduler initialized - scheduled backups disabled (key-based system)');
  }

  // All scheduled backup methods are disabled
  getSchedules(): any[] {
    return [];
  }

  getNextRunTime(): undefined {
    return undefined;
  }

  destroy(): void {
    // Nothing to destroy
  }
}

export const backupScheduler = new BackupScheduler();
