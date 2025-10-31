import { supabase } from './supabaseClient';

class SupabaseApiClient {
  // Create backup with key (no user authentication required)
  async createBackup(key: string, data: { bookmarks: any[]; folders: any[] }, metadata: any): Promise<any> {
    // Check if key already exists
    const { data: existing, error: checkError } = await supabase
      .from('backups')
      .select('id')
      .eq('name', key) // Using name field to store the key
      .single();

    if (existing) {
      throw new Error('Key already exists. Please choose a different key.');
    }

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check key existence: ${checkError.message}`);
    }

    // Create backup record
    const { data: backup, error } = await supabase
      .from('backups')
      .insert({
        user_id: 'anonymous', // Use a fixed value since we don't have authentication
        name: key, // Store the key in the name field
        description: metadata.description || null,
        data: data,
        size_bytes: metadata.size || 0,
        bookmark_count: metadata.bookmarkCount || 0,
        folder_count: metadata.folderCount || 0,
        type: metadata.type || 'manual',
        status: 'completed'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }

    return { success: true, id: backup.id, key };
  }

  async getBackup(key: string): Promise<any> {
    const { data: backup, error } = await supabase
      .from('backups')
      .select('*')
      .eq('name', key) // Key is stored in name field
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Backup not found');
      }
      throw new Error(`Failed to get backup: ${error.message}`);
    }

    return {
      id: backup.id,
      key: backup.name,
      data: backup.data,
      metadata: {
        name: backup.name,
        description: backup.description,
        size: backup.size_bytes,
        bookmarkCount: backup.bookmark_count,
        folderCount: backup.folder_count,
        type: backup.type,
        status: backup.status
      },
      createdAt: new Date(backup.created_at).getTime()
    };
  }

  async listBackups(): Promise<any[]> {
    const { data: backups, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }

    return backups.map(backup => ({
      key: backup.name,
      metadata: {
        name: backup.name,
        description: backup.description,
        size: backup.size_bytes,
        bookmarkCount: backup.bookmark_count,
        folderCount: backup.folder_count,
        type: backup.type,
        status: backup.status
      },
      createdAt: new Date(backup.created_at).getTime()
    }));
  }

  async deleteBackup(key: string): Promise<void> {
    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('name', key);

    if (error) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  async checkKeyExists(key: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('backups')
      .select('id')
      .eq('name', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // Key doesn't exist
      }
      throw new Error(`Failed to check key existence: ${error.message}`);
    }

    return !!data;
  }
}

export const apiClient = new SupabaseApiClient();
