import { supabase } from './supabaseClient';
import type { BackupMetadata, Bookmark, Folder } from '../../types';

class PostgreSQLService {
  private isAuthenticated = false;
  private currentUser: any = null;

  async initialize(): Promise<void> {
    // Check if user is already authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.isAuthenticated = true;
      this.currentUser = session.user;
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      this.isAuthenticated = !!session?.user;
      this.currentUser = session?.user || null;
    });
  }

  async signIn(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  isSignedIn(): boolean {
    return this.isAuthenticated;
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async uploadBackup(
    data: { bookmarks: Bookmark[]; folders: Folder[] },
    metadata: Omit<BackupMetadata, 'id'>,
    onProgress?: (progress: number) => void
  ): Promise<BackupMetadata> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    onProgress?.(10);

    // Prepare backup data
    const backupData = {
      metadata: {
        ...metadata,
        user_id: this.currentUser.id
      },
      data
    };

    const jsonString = JSON.stringify(backupData);
    const sizeBytes = new Blob([jsonString]).size;

    onProgress?.(30);

    // Insert backup into database
    const { data: backup, error } = await supabase
      .from('backups')
      .insert({
        user_id: this.currentUser.id,
        name: metadata.name,
        description: metadata.description,
        data: backupData,
        size_bytes: sizeBytes,
        bookmark_count: metadata.bookmarkCount,
        folder_count: metadata.folderCount,
        type: metadata.type,
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    onProgress?.(100);

    const backupMetadata: BackupMetadata = {
      id: backup.id,
      name: backup.name,
      description: backup.description,
      timestamp: new Date(backup.created_at).getTime(),
      size: backup.size_bytes,
      bookmarkCount: backup.bookmark_count,
      folderCount: backup.folder_count,
      type: backup.type,
      status: backup.status
    };

    return backupMetadata;
  }

  async downloadBackup(backupId: string, onProgress?: (progress: number) => void): Promise<{ metadata: BackupMetadata; data: { bookmarks: Bookmark[]; folders: Folder[] } }> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    onProgress?.(10);

    // Fetch backup from database
    const { data: backup, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .eq('user_id', this.currentUser.id)
      .single();

    if (error || !backup) {
      throw new Error(`Download failed: ${error?.message || 'Backup not found'}`);
    }

    onProgress?.(50);

    const backupData = backup.data;
    const metadata: BackupMetadata = {
      id: backup.id,
      name: backup.name,
      description: backup.description,
      timestamp: new Date(backup.created_at).getTime(),
      size: backup.size_bytes,
      bookmarkCount: backup.bookmark_count,
      folderCount: backup.folder_count,
      type: backup.type,
      status: backup.status
    };

    onProgress?.(100);

    return {
      metadata,
      data: backupData.data
    };
  }

  async listBackups(): Promise<BackupMetadata[]> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const { data: backups, error } = await supabase
      .from('backups')
      .select('*')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }

    return backups.map(backup => ({
      id: backup.id,
      name: backup.name,
      description: backup.description,
      timestamp: new Date(backup.created_at).getTime(),
      size: backup.size_bytes,
      bookmarkCount: backup.bookmark_count,
      folderCount: backup.folder_count,
      type: backup.type,
      status: backup.status
    }));
  }

  async deleteBackup(backupId: string): Promise<void> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', backupId)
      .eq('user_id', this.currentUser.id);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  async getBackupMetadata(backupId: string): Promise<BackupMetadata | null> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const { data: backup, error } = await supabase
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .eq('user_id', this.currentUser.id)
      .single();

    if (error || !backup) {
      return null;
    }

    return {
      id: backup.id,
      name: backup.name,
      description: backup.description,
      timestamp: new Date(backup.created_at).getTime(),
      size: backup.size_bytes,
      bookmarkCount: backup.bookmark_count,
      folderCount: backup.folder_count,
      type: backup.type,
      status: backup.status
    };
  }

  // Schedule management methods
  async createBackupSchedule(schedule: {
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
  }): Promise<string> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const nextRun = this.calculateNextRun(schedule.frequency);

    const { data: newSchedule, error } = await supabase
      .from('backup_schedules')
      .insert({
        user_id: this.currentUser.id,
        name: schedule.name,
        frequency: schedule.frequency,
        enabled: schedule.enabled,
        next_run: nextRun.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create schedule: ${error.message}`);
    }

    return newSchedule.id;
  }

  async getBackupSchedules(): Promise<Array<{
    id: string;
    name: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    enabled: boolean;
    lastRun?: number;
    nextRun?: number;
  }>> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const { data: schedules, error } = await supabase
      .from('backup_schedules')
      .select('*')
      .eq('user_id', this.currentUser.id);

    if (error) {
      throw new Error(`Failed to get schedules: ${error.message}`);
    }

    return schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      frequency: schedule.frequency,
      enabled: schedule.enabled,
      lastRun: schedule.last_run ? new Date(schedule.last_run).getTime() : undefined,
      nextRun: schedule.next_run ? new Date(schedule.next_run).getTime() : undefined
    }));
  }

  async updateBackupSchedule(
    scheduleId: string,
    updates: Partial<{
      name: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      enabled: boolean;
      lastRun?: number;
    }>
  ): Promise<void> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const updateData: any = { ...updates };
    if (updates.lastRun) {
      updateData.last_run = new Date(updates.lastRun).toISOString();
    }
    if (updates.frequency) {
      updateData.next_run = this.calculateNextRun(updates.frequency).toISOString();
    }

    const { error } = await supabase
      .from('backup_schedules')
      .update(updateData)
      .eq('id', scheduleId)
      .eq('user_id', this.currentUser.id);

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`);
    }
  }

  async deleteBackupSchedule(scheduleId: string): Promise<void> {
    if (!this.isAuthenticated || !this.currentUser) {
      throw new Error('Not authenticated');
    }

    const { error } = await supabase
      .from('backup_schedules')
      .delete()
      .eq('id', scheduleId)
      .eq('user_id', this.currentUser.id);

    if (error) {
      throw new Error(`Failed to delete schedule: ${error.message}`);
    }
  }

  private calculateNextRun(frequency: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    switch (frequency) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

export const postgresqlService = new PostgreSQLService();
