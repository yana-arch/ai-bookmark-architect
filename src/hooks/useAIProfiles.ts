import React, { useState, useCallback } from 'react';
import type { AIProfile, Notification } from '@/types';
import * as db from '../db/local';

export const useAIProfiles = (
    aiProfiles: AIProfile[],
    setAiProfiles: React.Dispatch<React.SetStateAction<AIProfile[]>>,
    setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
) => {
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);

    const handleSaveProfile = useCallback(async (profile: AIProfile) => {
        try {
            await db.saveAIProfile(profile);
            setAiProfiles(prev => {
                const existing = prev.findIndex(p => p.id === profile.id);
                if (existing >= 0) {
                    const newProfiles = [...prev];
                    newProfiles[existing] = profile;
                    return newProfiles;
                }
                return [...prev, profile];
            });
            setNotifications(prev => [...prev, {
                id: Date.now().toString(),
                type: 'success',
                message: `Đã lưu cấu hình AI: ${profile.name}`
            }]);
        } catch (error: any) {
            setNotifications(prev => [...prev, {
                id: Date.now().toString(),
                type: 'error',
                message: `Lỗi khi lưu cấu hình AI: ${error.message}`
            }]);
        }
    }, [setAiProfiles, setNotifications]);

    const handleDeleteProfile = useCallback(async (id: string) => {
        try {
            await db.deleteAIProfile(id);
            setAiProfiles(prev => prev.filter(p => p.id !== id));
            if (activeProfileId === id) {
                setActiveProfileId(null);
            }
            setNotifications(prev => [...prev, {
                id: Date.now().toString(),
                type: 'success',
                message: `Đã xóa cấu hình AI`
            }]);
        } catch (error: any) {
            setNotifications(prev => [...prev, {
                id: Date.now().toString(),
                type: 'error',
                message: `Lỗi khi xóa cấu hình AI: ${error.message}`
            }]);
        }
    }, [activeProfileId, setAiProfiles, setNotifications]);

    const activeProfile = aiProfiles.find(p => p.id === activeProfileId) || aiProfiles.find(p => p.isDefault) || null;

    return {
        activeProfile,
        activeProfileId,
        setActiveProfileId,
        handleSaveProfile,
        handleDeleteProfile
    };
};
