import React, { useState } from 'react';
import type { FolderTemplate, ApiConfig, SmartClassifyRule } from '@/types';
import { CogIcon, XIcon, AILogoIcon } from '../ui/Icons';
import { generateSystemPrompt, generatePlanningPrompt, getActiveApiConfig } from '../../src/services/promptGenerator';

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
    smartClassifyRules: SmartClassifyRule[];
    onSaveSmartRule: (rule: SmartClassifyRule) => void;
    onDeleteSmartRule: (id: string) => void;
    apiConfigs: ApiConfig[];
}

const AIConfigSettingsModal: React.FC<AIConfigSettingsModalProps> = (props) => {
    const {
        isOpen, onClose, systemPrompt, onSystemPromptChange, planningPrompt, onPlanningPromptChange,
        customInstructions, onCustomInstructionsChange, batchSize, onBatchSizeChange,
        maxRetries, onMaxRetriesChange, processingMode, onProcessingModeChange,
        folderTemplates, selectedTemplateId, onSelectedTemplateChange,
        onOpenFolderTemplateModal, onOpenInstructionPresetModal, onApplyFolderTemplate,
        smartClassifyRules, onSaveSmartRule, onDeleteSmartRule, apiConfigs
    } = props;

    const [activeTab, setActiveTab] = React.useState<'prompts' | 'resources' | 'config'>('prompts');
    const [newRule, setNewRule] = React.useState<{ pattern: string, path: string, type: 'tag' | 'link' }>({ pattern: '', path: '', type: 'tag' });
    
    // AI Prompt Gen State
    const [isGeneratingSystemPrompt, setIsGeneratingSystemPrompt] = useState(false);
    const [systemPromptIntent, setSystemPromptIntent] = useState('');
    
    const [isGeneratingPlanningPrompt, setIsGeneratingPlanningPrompt] = useState(false);
    const [planningPromptIntent, setPlanningPromptIntent] = useState('');

    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleGeneratePrompt = async (type: 'system' | 'planning') => {
        const intent = type === 'system' ? systemPromptIntent : planningPromptIntent;
        if (!intent.trim()) return;

        const activeConfig = getActiveApiConfig(apiConfigs);
        if (!activeConfig) {
            alert('Vui lòng kích hoạt một API Key trong phần Cấu hình API trước.');
            return;
        }

        setIsAiLoading(true);
        try {
            let generated = '';
            if (type === 'system') {
                generated = await generateSystemPrompt(intent, activeConfig);
                onSystemPromptChange(generated);
                setIsGeneratingSystemPrompt(false);
                setSystemPromptIntent('');
            } else {
                generated = await generatePlanningPrompt(intent, activeConfig);
                onPlanningPromptChange(generated);
                setIsGeneratingPlanningPrompt(false);
                setPlanningPromptIntent('');
            }
        } catch (error) {
            alert('Lỗi khi tạo prompt: ' + (error as any).message);
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAddRule = () => {
        if (!newRule.pattern || !newRule.path) return;
        const rule: SmartClassifyRule = {
            id: `rule-${Date.now()}`,
            name: `Rule for ${newRule.pattern}`,
            type: newRule.type,
            pattern: newRule.pattern,
            targetPath: newRule.path.split('/').map(s => s.trim()),
            enabled: true,
            createdAt: Date.now()
        };
        onSaveSmartRule(rule);
        setNewRule({ pattern: '', path: '', type: 'tag' });
    };

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

                {/* Tabs */}
                <div className="flex border-b border-gray-700 mb-6">
                    <button 
                        onClick={() => setActiveTab('prompts')}
                        className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'prompts' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        AI PROMPTS
                    </button>
                    <button 
                        onClick={() => setActiveTab('resources')}
                        className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'resources' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        QUY TẮC & MẪU
                    </button>
                    <button 
                        onClick={() => setActiveTab('config')}
                        className={`px-4 py-2 text-sm font-bold transition-colors ${activeTab === 'config' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        CẤU HÌNH XỬ LÝ
                    </button>
                </div>

                <div className="space-y-6">
                    {activeTab === 'prompts' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Planning Prompt */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="planning-prompt" className="block text-sm font-semibold text-gray-300">
                                        Chỉ dẫn lập kế hoạch (Planning Prompt):
                                    </label>
                                    <button
                                        onClick={() => setIsGeneratingPlanningPrompt(!isGeneratingPlanningPrompt)}
                                        className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30 text-xs rounded transition-colors"
                                        title="Dùng AI để viết prompt"
                                    >
                                        <AILogoIcon className="w-3 h-3" />
                                        <span>Viết bằng AI</span>
                                    </button>
                                </div>

                                {isGeneratingPlanningPrompt && (
                                    <div className="mb-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-purple-200 text-xs mb-1">
                                            Mô tả cách bạn muốn AI lên kế hoạch cấu trúc thư mục:
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={planningPromptIntent}
                                                onChange={(e) => setPlanningPromptIntent(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt('planning')}
                                                placeholder="Ví dụ: Cấu trúc theo chủ đề, ưu tiên độ sâu tối đa 2 cấp..."
                                                className="flex-1 p-2 bg-[#1E2127] border border-gray-600 rounded text-gray-200 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleGeneratePrompt('planning')}
                                                disabled={isAiLoading || !planningPromptIntent.trim()}
                                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded font-medium min-w-[60px]"
                                            >
                                                {isAiLoading ? <span className="animate-pulse">...</span> : 'Tạo'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    id="planning-prompt"
                                    value={planningPrompt}
                                    onChange={(e) => onPlanningPromptChange(e.target.value)}
                                    rows={4}
                                    className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                    placeholder="Dùng để thiết kế sơ đồ thư mục ban đầu..."
                                />
                            </div>

                            {/* System Prompt */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="system-prompt" className="block text-sm font-semibold text-gray-300">
                                        Chỉ dẫn phân loại (System Prompt):
                                    </label>
                                    <button
                                        onClick={() => setIsGeneratingSystemPrompt(!isGeneratingSystemPrompt)}
                                        className="flex items-center space-x-1 px-2 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30 text-xs rounded transition-colors"
                                        title="Dùng AI để viết prompt"
                                    >
                                        <AILogoIcon className="w-3 h-3" />
                                        <span>Viết bằng AI</span>
                                    </button>
                                </div>

                                {isGeneratingSystemPrompt && (
                                    <div className="mb-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-purple-200 text-xs mb-1">
                                            Mô tả cách bạn muốn AI phân loại từng bookmark:
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={systemPromptIntent}
                                                onChange={(e) => setSystemPromptIntent(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt('system')}
                                                placeholder="Ví dụ: Phân loại theo công nghệ, framework, ưu tiên tiếng Việt..."
                                                className="flex-1 p-2 bg-[#1E2127] border border-gray-600 rounded text-gray-200 text-sm focus:border-purple-500 focus:outline-none placeholder-gray-500"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleGeneratePrompt('system')}
                                                disabled={isAiLoading || !systemPromptIntent.trim()}
                                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded font-medium min-w-[60px]"
                                            >
                                                {isAiLoading ? <span className="animate-pulse">...</span> : 'Tạo'}
                                            </button>
                                        </div>
                                    </div>
                                )}

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
                    )}

                    {activeTab === 'resources' && (
                        <div className="space-y-6 animate-fadeIn">
                            {/* Template Section */}
                            <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="modal-folder-template" className="text-sm font-semibold text-gray-300">
                                        Mẫu cấu trúc tham khảo:
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
                                            Nạp vào Prompt
                                        </button>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 italic">Lưu ý: Mẫu sẽ được nạp vào "Chỉ dẫn phân loại" để AI tham khảo, không tạo thư mục rỗng ngay lập tức.</p>
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

                             {/* Smart Classify Rules Logic */}
                             <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Smart Classify Rules (Không dùng AI)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Kiểu so khớp</label>
                                        <select 
                                            value={newRule.type}
                                            onChange={(e) => setNewRule({...newRule, type: e.target.value as 'tag' | 'link'})}
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300"
                                        >
                                            <option value="tag">Theo Tag</option>
                                            <option value="link">Theo Link (URL)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold">Từ khóa / Pattern</label>
                                        <input 
                                            type="text"
                                            value={newRule.pattern}
                                            onChange={(e) => setNewRule({...newRule, pattern: e.target.value})}
                                            placeholder={newRule.type === 'tag' ? "Ví dụ: Github" : "Ví dụ: youtube.com"}
                                            className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold">Thư mục đích (Dùng / cho thư mục con)</label>
                                    <input 
                                        type="text"
                                        value={newRule.path}
                                        onChange={(e) => setNewRule({...newRule, path: e.target.value})}
                                        placeholder="Ví dụ: Công việc/Repository"
                                        className="w-full bg-gray-900/70 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-300"
                                    />
                                </div>
                                <button 
                                    onClick={handleAddRule}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md transition-colors text-sm"
                                >
                                    THÊM QUY TẮC
                                </button>
                                
                                <div className="mt-4 space-y-2">
                                    <h4 className="text-[10px] text-gray-400 uppercase font-bold mb-2">Quy tắc đã lưu</h4>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                        {smartClassifyRules && smartClassifyRules.length > 0 ? smartClassifyRules.map(rule => (
                                            <div key={rule.id} className="flex items-center justify-between bg-gray-900/50 p-2 rounded border border-gray-700/50">
                                                <div className="min-w-0 flex-1 flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${rule.type === 'tag' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                                        {rule.type}
                                                    </span>
                                                    <span className="text-xs text-gray-200 truncate">{rule.pattern}</span>
                                                    <span className="text-[10px] text-gray-500">➡️ {rule.targetPath.join(' / ')}</span>
                                                </div>
                                                <button 
                                                    onClick={() => onDeleteSmartRule(rule.id)}
                                                    className="text-gray-500 hover:text-red-400 p-1"
                                                >
                                                    <XIcon className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="text-center py-4 text-gray-600 text-xs italic">Chưa có quy tắc nào.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'config' && (
                        <div className="space-y-6 animate-fadeIn">
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
                    )}
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
