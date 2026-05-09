import React from 'react';
import { CopyIcon, LinkIcon, ShieldCheckIcon } from '../../ui/Icons';
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
        <div className="space-y-10 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <ShieldCheckIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">System Health Scan</h2>
                    <p className="text-xs text-gray-500 font-mono">DETECT & REMEDIATE DATABASE INCONSISTENCIES</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-[#121418]/60 border border-white/5 p-10 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                        <CopyIcon className="w-32 h-32 text-orange-400" />
                    </div>
                    <div className="p-5 bg-orange-500/20 text-orange-400 rounded-3xl mb-6 shadow-inner border border-orange-500/10">
                        <CopyIcon className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-black text-white uppercase tracking-wider mb-2">Duplicate Detector</h4>
                    <p className="text-[11px] text-gray-500 mb-8 font-medium max-w-[200px]">Identified {duplicateStats.count} redundant records within your primary vault.</p>
                    <button 
                        onClick={onCleanDuplicates}
                        disabled={duplicateStats.count === 0}
                        className="w-full py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-20 disabled:grayscale text-white text-[10px] font-black rounded-2xl transition-all shadow-xl shadow-orange-500/10 uppercase tracking-[0.2em] active:scale-[0.97]"
                    >
                        Purge Duplicates
                    </button>
                </div>

                <div className="bg-[#121418]/60 border border-white/5 p-10 rounded-[2.5rem] flex flex-col items-center text-center relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                        <LinkIcon className="w-32 h-32 text-red-500" />
                    </div>
                    <div className="p-5 bg-red-500/20 text-red-400 rounded-3xl mb-6 shadow-inner border border-red-500/10">
                        <LinkIcon className="w-10 h-10" />
                    </div>
                    <h4 className="text-lg font-black text-white uppercase tracking-wider mb-2">Link Validation</h4>
                    <p className="text-[11px] text-gray-500 mb-8 font-medium max-w-[200px]">
                        {brokenLinkCheckState === 'idle' ? 'Scan bookmark registry for dead or unreachable endpoints.' : `Diagnostic Progress: ${brokenLinkCheckProgress}%`}
                    </p>
                    <button 
                        onClick={onStartBrokenLinkCheck}
                        className="w-full py-4 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black rounded-2xl transition-all shadow-xl shadow-red-500/10 uppercase tracking-[0.2em] active:scale-[0.97]"
                    >
                        {brokenLinkCheckState === 'checking' ? 'Running Diagnostics...' : 'Initialize Scan'}
                    </button>

                    {brokenLinkCheckState === 'checking' && (
                        <div className="absolute bottom-0 left-0 h-1 bg-red-500 transition-all duration-500" style={{ width: `${brokenLinkCheckProgress}%` }}></div>
                    )}
                </div>
            </div>
        </div>
    );
};
