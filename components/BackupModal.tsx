import React, { useState, useEffect } from 'react';
import { postgresqlService } from '../src/services/postgresqlService';
import type { BackupMetadata, Bookmark, Folder } from '../types';
import * as db from '../db';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: Bookmark[];
  folders: Folder[];
  onRestoreSuccess?: () => void;
}

const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  folders,
  onRestoreSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkAuthAndLoadBackups();
    }
  }, [isOpen]);

  const checkAuthAndLoadBackups = async () => {
    try {
      await postgresqlService.initialize();
      const authenticated = postgresqlService.isSignedIn();
      setIsAuthenticated(authenticated);

      if (authenticated) {
        await loadBackups();
      }
    } catch (err) {
      console.error('Failed to check authentication:', err);
      setError('Failed to check PostgreSQL authentication');
    }
  };

  const loadBackups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const backupList = await postgresqlService.listBackups();
      setBackups(backupList);
    } catch (err: any) {
      setError(`Failed to load backups: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!backupName.trim()) {
      setError('Please enter a backup name');
      return;
    }

    setIsCreatingBackup(true);
    setError(null);
    setSuccess(null);

    try {
      const metadata = {
        name: backupName.trim(),
        description: backupDescription.trim() || `Backup created on ${new Date().toLocaleString()}`,
        timestamp: Date.now(),
        size: JSON.stringify({ bookmarks, folders }).length,
        bookmarkCount: bookmarks.length,
        folderCount: folders.length,
        type: 'manual' as const,
        status: 'pending' as const,
      };

      const backup = await postgresqlService.uploadBackup(
        { bookmarks, folders },
        metadata
      );

      setSuccess('Backup created successfully!');
      setBackupName('');
      setBackupDescription('');
      await loadBackups(); // Refresh the list
    } catch (err: any) {
      setError(`Failed to create backup: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backup: BackupMetadata) => {
    setRestoringBackup(backup.id);
    setError(null);
    setSuccess(null);

    try {
      const { data } = await postgresqlService.downloadBackup(backup.id);

      // Validate the backup data
      if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
        throw new Error('Invalid backup data: missing bookmarks');
      }

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to restore from "${backup.name}"?\n\n` +
        `This will replace your current bookmarks and folders.\n\n` +
        `Current data: ${bookmarks.length} bookmarks, ${folders.length} folders\n` +
        `Backup data: ${data.bookmarks.length} bookmarks, ${data.folders?.length || 0} folders`
      );

      if (!confirmed) {
        setRestoringBackup(null);
        return;
      }

      // Save the restored data
      await db.saveBookmarks(data.bookmarks);
      if (data.folders) {
        await db.saveFolders(data.folders);
      } else {
        await db.saveFolders([]); // Clear folders if none in backup
      }

      setSuccess('Backup restored successfully!');
      onRestoreSuccess?.();
    } catch (err: any) {
      setError(`Failed to restore backup: ${err?.message || 'Unknown error'}`);
    } finally {
      setRestoringBackup(null);
    }
  };

  const handleDeleteBackup = async (backup: BackupMetadata) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the backup "${backup.name}"?\n\n` +
      'This action cannot be undone.'
    );

    if (!confirmed) return;

    setError(null);
    setSuccess(null);

    try {
      await postgresqlService.deleteBackup(backup.id);
      setSuccess('Backup deleted successfully!');
      await loadBackups(); // Refresh the list
    } catch (err: any) {
      setError(`Failed to delete backup: ${err?.message || 'Unknown error'}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#282C34] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">PostgreSQL Backup</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {!isAuthenticated ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">PostgreSQL Not Connected</h3>
              <p className="text-gray-300 mb-4">
                Please sign in first to access backup functionality.
              </p>
            </div>
          ) : (
            <>
              {/* Status Messages */}
              {error && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-md">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              {/* Create Backup Section */}
              <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-3">Create New Backup</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Backup Name *
                    </label>
                    <input
                      type="text"
                      value={backupName}
                      onChange={(e) => setBackupName(e.target.value)}
                      placeholder="e.g., Weekly Backup"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={backupDescription}
                      onChange={(e) => setBackupDescription(e.target.value)}
                      placeholder="Brief description of this backup"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="text-sm text-gray-400">
                    Current data: {bookmarks.length} bookmarks, {folders.length} folders
                  </div>
                  <button
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup || !backupName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    {isCreatingBackup ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating Backup...</span>
                      </>
                    ) : (
                      <>
                        <span>📤 Create Backup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Backups List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-white">Existing Backups</h3>
                  <button
                    onClick={loadBackups}
                    disabled={isLoading}
                    className="text-sm bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white px-3 py-1 rounded-md transition-colors"
                  >
                    {isLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {backups.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📁</div>
                    <p>No backups found. Create your first backup above.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div key={backup.id} className="p-4 bg-gray-800/50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-white">{backup.name}</h4>
                            {backup.description && (
                              <p className="text-sm text-gray-300 mt-1">{backup.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              <span>📅 {formatDate(backup.timestamp)}</span>
                              <span>📊 {backup.bookmarkCount} bookmarks</span>
                              <span>📂 {backup.folderCount} folders</span>
                              <span>💾 {formatSize(backup.size)}</span>
                              <span className={`px-2 py-1 rounded text-xs ${
                                backup.type === 'auto' ? 'bg-blue-900/20 text-blue-400' : 'bg-green-900/20 text-green-400'
                              }`}>
                                {backup.type === 'auto' ? 'Auto' : 'Manual'}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => handleRestoreBackup(backup)}
                              disabled={restoringBackup === backup.id}
                              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
                            >
                              {restoringBackup === backup.id ? (
                                <>
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>Restoring...</span>
                                </>
                              ) : (
                                <span>Restore</span>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteBackup(backup)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupModal;
