import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';

interface Option {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, options, value, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative flex flex-col space-y-1.5 ${className}`} ref={containerRef}>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-between w-full bg-[#121418] border transition-all duration-300 px-4 py-3 rounded-xl group ${
                    isOpen ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-white/10 hover:border-white/20'
                }`}
            >
                <div className="flex items-center space-x-3">
                    {selectedOption?.icon}
                    <span className="text-sm text-gray-200 font-medium">{selectedOption?.label}</span>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-purple-400' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1d23] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-slideUp">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5">
                        {options.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    onChange(option.id);
                                    setIsOpen(false);
                                }}
                                className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
                                    value === option.id
                                        ? 'bg-blue-600 text-white font-bold'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                            >
                                {option.icon}
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
