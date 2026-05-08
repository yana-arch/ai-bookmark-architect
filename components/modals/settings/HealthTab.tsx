import React from 'react';
import { CopyIcon, LinkIcon } from '../../ui/Icons';
import type { DuplicateStats } from '@/types';

interface HealthTabProps {
    duplicateStats: DuplicateStats;
    onCleanDuplicates: () => void;
    brokenLinkCheckState: 'idle' | 'checking' | 'completed' | 'error';
    brokenLinkCheckProgress: number;
    onStartBrokenLinkCheck: () => void;
}

export const HealthTab: React.FC<HealthTabProps> = ({
    duplicateStats, onCleanDuplicates, brokenLinkCheckState, brokenLinkCheckProgress, onStartBrokenLinkCheck
}) => {
    return (
        <div className="space-y-8 animate-slideIn">
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="p-4 bg-orange-500/20 text-orange-400 rounded-2xl mb-4">
                        <CopyIcon className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-white mb-1">Duplicate Detector</h4>
                    <p className="text-xs text-gray-500 mb-6">Found {duplicateStats.count} duplicate bookmarks in your library.</p>
                    <button 
                        onClick={onCleanDuplicates}
                        disabled={duplicateStats.count === 0}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all"
                    >
                        Clean Duplicates
                    </button>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center text-center">
                    <div className="p-4 bg-red-500/20 text-red-400 rounded-2xl mb-4">
                        <LinkIcon className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-white mb-1">Broken Link Scan</h4>
                    <p className="text-xs text-gray-500 mb-6">
                        {brokenLinkCheckState === 'idle' ? 'Check if your bookmarks are still alive.' : `Progress: ${brokenLinkCheckProgress}%`}
                    </p>
                    <button 
                        onClick={onStartBrokenLinkCheck}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl transition-all"
                    >
                        {brokenLinkCheckState === 'checking' ? 'Scanning...' : 'Start Scan'}
                    </button>
                </div>
            </div>
        </div>
    );
};
