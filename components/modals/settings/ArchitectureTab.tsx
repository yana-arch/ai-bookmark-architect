import React from 'react';
import { ArchitectureStyle } from '@/types';
import { ARCHITECTURE_STYLES } from '@/src/architectureStyles';
import { ChipIcon } from '../../ui/Icons';

interface ArchitectureTabProps {
    selectedStyle: ArchitectureStyle;
    onStyleChange: (styleId: ArchitectureStyle) => void;
}

export const ArchitectureTab: React.FC<ArchitectureTabProps> = ({ selectedStyle, onStyleChange }) => {
    return (
        <div className="space-y-8 animate-slideIn pb-10">
            <header className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <ChipIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight uppercase">Architecture Style</h2>
                    <p className="text-xs text-gray-500 font-mono">DEFINE GLOBAL TAXONOMY ENGINE BEHAVIOR</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ARCHITECTURE_STYLES.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => onStyleChange(style.id)}
                        className={`relative flex flex-col items-start text-left p-6 rounded-2xl border transition-all duration-300 group overflow-hidden ${
                            selectedStyle === style.id
                                ? 'bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/20'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                        }`}
                    >
                        <div className="flex justify-between w-full mb-4">
                            <h3 className={`font-bold tracking-wider text-sm transition-colors ${
                                selectedStyle === style.id ? 'text-blue-400' : 'text-gray-200'
                            }`}>
                                {style.name}
                            </h3>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                selectedStyle === style.id 
                                    ? 'border-blue-500 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' 
                                    : 'border-white/20'
                            }`}>
                                {selectedStyle === style.id && (
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                )}
                            </div>
                        </div>
                        
                        <p className="text-xs text-gray-400 leading-relaxed mb-4 group-hover:text-gray-300 transition-colors">
                            {style.longDescription}
                        </p>

                        <div className="mt-auto pt-4 flex items-center space-x-2">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                Logic: {style.id === 'taxonomist' ? 'Hierarchical' : style.id === 'librarian' ? 'Search-first' : 'PARA Pillar'}
                            </span>
                        </div>

                        {/* Glossy overlay effect */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none transition-opacity duration-500 ${
                            selectedStyle === style.id ? 'opacity-100' : 'opacity-0'
                        }`}></div>
                    </button>
                ))}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-8">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Prompt Engine Impact</h4>
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-[11px] text-emerald-400/80 leading-relaxed overflow-x-auto">
                    {ARCHITECTURE_STYLES.find(s => s.id === selectedStyle)?.promptAddition}
                </div>
            </div>
        </div>
    );
};
