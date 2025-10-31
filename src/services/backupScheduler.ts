import { postgresqlService } from './postgresqlService';
import type { Bookmark, Folder } from '@/types';
import * as db from '@/db';

export interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  createdAt: number;
}

class BackupScheduler {
  private schedules: BackupSchedule[] = [];
  private intervalId: number | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute

  async initialize(): Promise<void> {
    await this.loadSchedules();
    this.startScheduler();
  }

  async loadSchedules(): Promise<void> {
    // Load schedules from IndexedDB (we'll need to add this to db.ts)
    // For now, create default schedules
    this.schedules = [
      {
        id: 'daily-backup',
        name: 'Daily Backup',
        frequency: 'daily',
        enabled: false,
        createdAt: Date.now(),
      },
      {
        id: 'weekly-backup',
        name: 'Weekly Backup',
        frequency: 'weekly',
        enabled: false,
        createdAt: Date.now(),
      },
      {
        id: 'monthly-backup',
        name: 'Monthly Backup',
        frequency: 'monthly',
        enabled: false,
        createdAt: Date.now(),
      },
    ];

    // Calculate next run times
    this.updateNextRunTimes();
  }

  private updateNextRunTimes(): void {
    const now = Date.now();

    this.schedules.forEach(schedule => {
      if (!schedule.enabled) {
        schedule.nextRun = undefined;
        return;
      }

      const lastRun = schedule.lastRun || now;
      let nextRun: number;

      switch (schedule.frequency) {
        case 'daily':
          nextRun = lastRun + (24 * 60 * 60 * 1000); // 24 hours
          break;
        case 'weekly':
          nextRun = lastRun + (7 * 24 * 60 * 60 * 1000); // 7 days
          break;
        case 'monthly':
          nextRun = lastRun + (30 * 24 * 60 * 60 * 1000); // 30 days (approximate)
          break;
        default:
          nextRun = lastRun + (24 * 60 * 60 * 1000);
      }

      schedule.nextRun = nextRun;
    });
  }

  private startScheduler(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = window.setInterval(() => {
      this.checkAndRunBackups();
    }, this.CHECK_INTERVAL);
  }

  private async checkAndRunBackups(): Promise<void> {
    const now = Date.now();

    for (const schedule of this.schedules) {
      if (!schedule.enabled || !schedule.nextRun) continue;

      if (now >= schedule.nextRun) {
        try {
          await this.runScheduledBackup(schedule);
          schedule.lastRun = now;
          this.updateNextRunTimes();
        } catch (error) {
          console.error(`Failed to run scheduled backup ${schedule.name}:`, error);
        }
      }
    }
  }

  private async runScheduledBackup(schedule: BackupSchedule): Promise<void> {
    // Check if PostgreSQL service is authenticated
    if (!postgresqlService.isSignedIn()) {
      console.warn('PostgreSQL service not authenticated, skipping scheduled backup');
      return;
    }

    // Get current data
    const bookmarks = await db.getBookmarks();
    const folders = await db.getFolders();

    if (!bookmarks || bookmarks.length === 0) {
      console.warn('No bookmarks to backup, skipping scheduled backup');
      return;
    }

    // Create backup
    const metadata = {
      name: `${schedule.name} - ${new Date().toLocaleDateString()}`,
      description: `Automated ${schedule.frequency} backup created on ${new Date().toLocaleString()}`,
      timestamp: Date.now(),
      size: JSON.stringify({ bookmarks, folders }).length,
      bookmarkCount: bookmarks.length,
      folderCount: folders?.length || 0,
      type: 'auto' as const,
      status: 'pending' as const,
    };

    await postgresqlService.uploadBackup(
      { bookmarks, folders: (folders || []).filter(item => 'children' in item) as Folder[] },
      metadata
    );

    console.log(`Scheduled backup "${schedule.name}" completed successfully`);
  }

  async enableSchedule(scheduleId: string, enabled: boolean): Promise<void> {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    if (schedule) {
      schedule.enabled = enabled;
      if (enabled && !schedule.lastRun) {
        schedule.lastRun = Date.now();
      }
      this.updateNextRunTimes();
    }
  }

  getSchedules(): BackupSchedule[] {
    return [...this.schedules];
  }

  getNextRunTime(scheduleId: string): number | undefined {
    const schedule = this.schedules.find(s => s.id === scheduleId);
    return schedule?.nextRun;
  }

  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const backupScheduler = new BackupScheduler();
