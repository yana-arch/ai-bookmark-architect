import React, { useState, useRef, useEffect } from 'react';
import { AILogoIcon, UploadIcon, ImportIcon, ChartIcon, UserIcon, LogOutIcon, ChevronDownIcon, CogIcon } from '@/src/components/ui/Icons';
import { useAuth } from '@/src/hooks/useAuth';

interface HeaderProps {
    onOpenBackup: () => void;
    onOpenData: () => void;
    onOpenAnalytics: () => void;
    onOpenSettings: () => void;
    onOpenAuth: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenBackup, onOpenData, onOpenAnalytics, onOpenSettings, onOpenAuth }) => {
    const { user, isAuthenticated, signOut } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const userInitial = user?.email?.[0].toUpperCase() || 'U';
    const userAvatar = user?.user_metadata?.avatar_url;

    return (
        <header className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0 bg-[#282C34]/50 backdrop-blur-md">
            <div className="flex items-center">
                <h1 className="text-lg font-bold text-white flex items-center">
                    <AILogoIcon className="w-6 h-6 mr-3 text-emerald-400" />
                    <span className="hidden sm:inline">AI Bookmark Architect</span>
                    <span className="sm:hidden">Architect</span>
                </h1>
            </div>

            <div className="flex items-center space-x-3">
                <div className="hidden md:flex items-center space-x-2 mr-2 border-r border-gray-700/50 pr-4">
                    <button
                        onClick={onOpenBackup}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="Cloud Sync"
                    >
                        <UploadIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onOpenData}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="Import/Export"
                    >
                        <ImportIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onOpenAnalytics}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="Analytics"
                    >
                        <ChartIcon className="w-5 h-5" />
                    </button>
                </div>

                {isAuthenticated ? (
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center space-x-2 p-1 pl-2 pr-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        >
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                                {userAvatar ? (
                                    <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-bold text-emerald-400">{userInitial}</span>
                                )}
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-[#21252b] border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-slideDown">
                                <div className="px-4 py-3 border-b border-white/5 mb-1">
                                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Signed in as</p>
                                    <p className="text-sm text-white truncate font-medium">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => { onOpenSettings(); setIsMenuOpen(false); }}
                                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <CogIcon className="w-4 h-4 mr-3" />
                                    System Settings
                                </button>
                                <button
                                    onClick={() => { onOpenBackup(); setIsMenuOpen(false); }}
                                    className="w-full flex items-center px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <UploadIcon className="w-4 h-4 mr-3" />
                                    Cloud Sync Status
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button
                                    onClick={() => { signOut(); setIsMenuOpen(false); }}
                                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOutIcon className="w-4 h-4 mr-3" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        onClick={onOpenAuth}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                        <UserIcon className="w-4 h-4" />
                        <span>Sign In</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;
