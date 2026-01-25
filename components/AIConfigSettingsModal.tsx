
import React from 'react';
import type { FolderTemplate, ApiConfig } from '@/types';
import { CogIcon, XIcon } from './Icons';

interface AIConfigSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    systemPrompt: string;
    onSystemPromptChange: (prompt: string) => void;
    planningPrompt: string;
    onPlanningPromptChange: (prompt: string) => void;
    customInstructions: string;
    onCustomInstructionsChange: (instructions: string) => void;
    batchSize: number;
    onBatchSizeChange: (size: number) => void;
    maxRetries: number;
    onMaxRetriesChange: (retries: number) => void;
    processingMode: 'single' | 'multi';
    onProcessingModeChange: (mode: 'single' | 'multi') => void;
    folderTemplates: FolderTemplate[];
    selectedTemplateId: string | null;
    onSelectedTemplateChange: (templateId: string | null) => void;
    onOpenFolderTemplateModal: () => void;
    onOpenInstructionPresetModal: () => void;
    onApplyFolderTemplate: (template: FolderTemplate) => void;
}

const AIConfigSettingsModal: React.FC<AIConfigSettingsModalProps> = (props) => {
    const {
        isOpen, onClose, systemPrompt, onSystemPromptChange, planningPrompt, onPlanningPromptChange,
        customInstructions, onCustomInstructionsChange, batchSize, onBatchSizeChange,
        maxRetries, onMaxRetriesChange, processingMode, onProcessingModeChange,
        folderTemplates, selectedTemplateId, onSelectedTemplateChange,
        onOpenFolderTemplateModal, onOpenInstructionPresetModal, onApplyFolderTemplate
    } = props;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 border border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <CogIcon className="w-6 h-6 mr-3 text-sky-400" />
                        <h2 className="text-xl font-bold text-white">Cấu hình & Chỉ dẫn AI</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Prompts Section */}
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="planning-prompt" className="block text-sm font-semibold text-gray-300 mb-2">
                                Chỉ dẫn lập kế hoạch (Planning Prompt):
                            </label>
                            <textarea
                                id="planning-prompt"
                                value={planningPrompt}
                                onChange={(e) => onPlanningPromptChange(e.target.value)}
                                rows={4}
                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                placeholder="Dùng để thiết kế sơ đồ thư mục ban đầu..."
                            />
                        </div>
                        <div>
                            <label htmlFor="system-prompt" className="block text-sm font-semibold text-gray-300 mb-2">
                                Chỉ dẫn phân loại (System Prompt):
                            </label>
                            <textarea
                                id="system-prompt"
                                value={systemPrompt}
                                onChange={(e) => onSystemPromptChange(e.target.value)}
                                rows={5}
                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                                placeholder="Dùng để phân loại từng bookmark..."
                            />
                        </div>
                    </div>

                    {/* Template Section */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <label htmlFor="modal-folder-template" className="text-sm font-semibold text-gray-300">
                                Mẫu thư mục cố định:
                            </label>
                            <button onClick={onOpenFolderTemplateModal} className="text-xs text-blue-400 hover:text-blue-300 underline">
                                Quản lý mẫu
                            </button>
                        </div>
                        <div className="flex space-x-2">
                            <select
                                id="modal-folder-template"
                                value={selectedTemplateId || ''}
                                onChange={(e) => onSelectedTemplateChange(e.target.value || null)}
                                className="flex-1 bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="">Không sử dụng mẫu</option>
                                {folderTemplates.map(template => (
                                    <option key={template.id} value={template.id}>{template.name}</option>
                                ))}
                            </select>
                            {selectedTemplateId && (
                                <button
                                    onClick={() => {
                                        const template = folderTemplates.find(t => t.id === selectedTemplateId);
                                        if (template) onApplyFolderTemplate(template);
                                    }}
                                    className="bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-4 py-2 rounded-md text-sm font-bold hover:bg-emerald-600/30 transition-all"
                                >
                                    Áp dụng
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label htmlFor="modal-ai-instructions" className="text-sm font-semibold text-gray-300">
                                Chỉ dẫn bổ sung (Tên thư mục, quy tắc đặc biệt):
                            </label>
                            <button onClick={onOpenInstructionPresetModal} className="text-xs text-blue-400 hover:text-blue-300 underline">
                                Quản lý Preset
                            </button>
                        </div>
                        <textarea
                            id="modal-ai-instructions"
                            value={customInstructions}
                            onChange={(e) => onCustomInstructionsChange(e.target.value)}
                            rows={3}
                            placeholder="Ví dụ: Chỉ sử dụng tiếng Anh cho tên thư mục. Giới hạn 2 cấp thư mục."
                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                        />
                    </div>

                    {/* Technical Stats */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="modal-batch-size" className="block text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                                Số lượng bookmark / batch
                            </label>
                            <input
                                type="number"
                                id="modal-batch-size"
                                value={batchSize}
                                onChange={(e) => onBatchSizeChange(parseInt(e.target.value, 10))}
                                min="1"
                                max="50"
                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="modal-max-retries" className="block text-xs text-gray-400 mb-1 uppercase font-bold tracking-wider">
                                Số lần thử lại tối đa
                            </label>
                            <input
                                type="number"
                                id="modal-max-retries"
                                value={maxRetries}
                                onChange={(e) => onMaxRetriesChange(parseInt(e.target.value, 10))}
                                min="0"
                                max="5"
                                className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Processing Mode */}
                    <div>
                        <label className="block text-xs text-gray-400 mb-2 uppercase font-bold tracking-wider">Chế độ xử lý</label>
                        <div className="flex space-x-2">
                            <button
                                type="button"
                                onClick={() => onProcessingModeChange('single')}
                                className={`flex-1 py-2 text-sm rounded-md transition-all font-bold ${
                                    processingMode === 'single'
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Đơn luồng
                            </button>
                            <button
                                type="button"
                                onClick={() => onProcessingModeChange('multi')}
                                className={`flex-1 py-2 text-sm rounded-md transition-all font-bold ${
                                    processingMode === 'multi'
                                        ? 'bg-emerald-600 text-white shadow-lg'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Đa luồng
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-sky-600 text-white font-bold py-2 px-8 rounded-lg hover:bg-sky-700 transition-all shadow-lg transform hover:scale-105"
                    >
                        HOÀN TẤT & LƯU
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIConfigSettingsModal;
