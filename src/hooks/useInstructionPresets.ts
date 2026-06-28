import { useState, useCallback } from 'react';
import { InstructionPreset } from '@/types';
import { settingsRepo } from '@/src/db/repositories/settings';

export const useInstructionPresets = (
    instructionPresets: InstructionPreset[],
    setInstructionPresets: (presets: InstructionPreset[] | ((prev: InstructionPreset[]) => InstructionPreset[])) => void,
    setCustomInstructions: (instructions: string) => void
) => {
    const [isInstructionPresetModalOpen, setIsInstructionPresetModalOpen] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

    const handleSaveInstructionPreset = useCallback(async (preset: InstructionPreset) => {
        await settingsRepo.savePreset(preset);
        setInstructionPresets(prev => {
            const existingIndex = prev.findIndex(p => p.id === preset.id);
            if (existingIndex > -1) {
                const newPresets = [...prev];
                newPresets[existingIndex] = preset;
                return newPresets;
            }
            return [...prev, preset];
        });
    }, [setInstructionPresets]);

    const handleDeleteInstructionPreset = useCallback(async (id: string) => {
        await settingsRepo.deletePreset(id);
        setInstructionPresets(prev => prev.filter(p => p.id !== id));
        if (selectedPresetId === id) {
            setSelectedPresetId(null);
        }
    }, [selectedPresetId, setInstructionPresets]);

    const handleSelectPreset = useCallback((presetId: string | null) => {
        setSelectedPresetId(presetId);
        if (presetId) {
            const preset = instructionPresets.find(p => p.id === presetId);
            if (preset) {
                // Apply preset to current settings
                setCustomInstructions(preset.customInstructions);
            }
        }
    }, [instructionPresets, setCustomInstructions]);

    return {
        isInstructionPresetModalOpen,
        setIsInstructionPresetModalOpen,
        selectedPresetId,
        setSelectedPresetId,
        handleSaveInstructionPreset,
        handleDeleteInstructionPreset,
        handleSelectPreset
    };
};
