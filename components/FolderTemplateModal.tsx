import React, { useState, useEffect } from 'react';
import { FolderTemplate, FolderStructureNode, ApiConfig } from '@/types';
import { XIcon, PlusIcon, TrashIcon, FolderIcon, ChevronRightIcon } from './Icons';
import { GoogleGenAI, Type } from "@google/genai";

interface FolderTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: FolderTemplate[];
    onSaveTemplate: (template: FolderTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    onApplyFolderTemplate: (template: FolderTemplate) => void;
    apiConfigs: ApiConfig[];
}

interface TreeNodeProps {
    node: FolderStructureNode;
    level: number;
    onAddChild: (parentId: string) => void;
    onDeleteNode: (nodeId: string) => void;
    onUpdateNode: (nodeId: string, name: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, onAddChild, onDeleteNode, onUpdateNode }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(node.name);

    const handleSaveEdit = () => {
        if (editName.trim()) {
            onUpdateNode(node.id, editName.trim());
            setIsEditing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setEditName(node.name);
            setIsEditing(false);
        }
    };

    return (
        <div style={{ paddingLeft: `${level * 20}px` }}>
            <div className="flex items-center group py-1">
                <ChevronRightIcon className="w-4 h-4 mr-1 text-gray-500" />
                <FolderIcon className="w-4 h-4 mr-2 text-yellow-500" />

                {isEditing ? (
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={handleKeyPress}
                        className="flex-1 bg-gray-700 text-white px-2 py-1 rounded text-sm"
                        autoFocus
                    />
                ) : (
                    <span
                        className="flex-1 cursor-pointer hover:text-emerald-400"
                        onClick={() => setIsEditing(true)}
                    >
                        {node.name}
                    </span>
                )}

                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
                    <button
                        onClick={() => onAddChild(node.id)}
                        className="text-gray-400 hover:text-emerald-400 p-1"
                        title="Thêm thư mục con"
                    >
                        <PlusIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDeleteNode(node.id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Xóa thư mục"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {node.children.map(child => (
                <TreeNode
                    key={child.id}
                    node={child}
                    level={level + 1}
                    onAddChild={onAddChild}
                    onDeleteNode={onDeleteNode}
                    onUpdateNode={onUpdateNode}
                />
            ))}
        </div>
    );
};

const FolderTemplateModal: React.FC<FolderTemplateModalProps> = ({
    isOpen,
    onClose,
    templates,
    onSaveTemplate,
    onDeleteTemplate,
    onApplyFolderTemplate,
    apiConfigs,
}) => {
    const [editingTemplate, setEditingTemplate] = useState<FolderTemplate | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateStructure, setTemplateStructure] = useState<FolderStructureNode[]>([]);
    const [aiGenerationInput, setAiGenerationInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setTemplateName('');
            setTemplateDescription('');
            setTemplateStructure([]);
            setEditingTemplate(null);
            setAiGenerationInput('');
            setImportFile(null);
        }
    }, [isOpen]);

    const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const createInitialStructure = (): FolderStructureNode[] => [
        {
            id: generateId(),
            name: 'Thư mục gốc',
            children: [],
            parentId: null,
        }
    ];

    const handleCreateTemplate = () => {
        const structure = templateStructure.length > 0 ? templateStructure : createInitialStructure();
        const newTemplate: FolderTemplate = {
            id: generateId(),
            name: templateName.trim() || 'Template mới',
            description: templateDescription.trim(),
            structure,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        onSaveTemplate(newTemplate);
        setTemplateName('');
        setTemplateDescription('');
        setTemplateStructure([]);
    };

    const handleEditTemplate = (template: FolderTemplate) => {
        setEditingTemplate(template);
        setTemplateName(template.name);
        setTemplateDescription(template.description);
        setTemplateStructure(template.structure);
    };

    const handleSaveEdit = () => {
        if (!editingTemplate) return;

        const updatedTemplate: FolderTemplate = {
            ...editingTemplate,
            name: templateName.trim() || editingTemplate.name,
            description: templateDescription.trim(),
            structure: templateStructure,
            updatedAt: Date.now(),
        };
        onSaveTemplate(updatedTemplate);
        setEditingTemplate(null);
        setTemplateName('');
        setTemplateDescription('');
        setTemplateStructure([]);
    };

    const handleAddNode = (parentId: string) => {
        const addNodeToStructure = (nodes: FolderStructureNode[]): FolderStructureNode[] => {
            return nodes.map(node => {
                if (node.id === parentId) {
                    return {
                        ...node,
                        children: [
                            ...node.children,
                            {
                                id: generateId(),
                                name: 'Thư mục mới',
                                children: [],
                                parentId: node.id,
                            }
                        ]
                    };
                }
                return {
                    ...node,
                    children: addNodeToStructure(node.children)
                };
            });
        };
        setTemplateStructure(addNodeToStructure(templateStructure));
    };

    const handleDeleteNode = (nodeId: string) => {
        const removeNodeFromStructure = (nodes: FolderStructureNode[]): FolderStructureNode[] => {
            return nodes
                .filter(node => node.id !== nodeId)
                .map(node => ({
                    ...node,
                    children: removeNodeFromStructure(node.children)
                }));
        };
        setTemplateStructure(removeNodeFromStructure(templateStructure));
    };

    const handleUpdateNode = (nodeId: string, name: string) => {
        const updateNodeInStructure = (nodes: FolderStructureNode[]): FolderStructureNode[] => {
            return nodes.map(node => {
                if (node.id === nodeId) {
                    return { ...node, name };
                }
                return {
                    ...node,
                    children: updateNodeInStructure(node.children)
                };
            });
        };
        setTemplateStructure(updateNodeInStructure(templateStructure));
    };

    const handleAIGenerateTemplate = async () => {
        if (!aiGenerationInput.trim()) {
            alert('Vui lòng nhập mô tả cấu trúc thư mục bạn muốn tạo.');
            return;
        }

        setIsGenerating(true);

        try {
            // Find active Gemini API key
            const activeKey = apiConfigs.find(config => config.status === 'active' && config.provider === 'gemini');

            if (!activeKey) {
                throw new Error('Không tìm thấy API key Gemini nào đang hoạt động. Vui lòng cấu hình API key trước.');
            }

            const ai = new GoogleGenAI({ apiKey: activeKey.apiKey });

            const systemPrompt = `Bạn là chuyên gia tổ chức cấu trúc thư mục tiếng Việt. 
Hãy tạo cấu trúc thư mục hợp lý từ mô tả của người dùng.
Output phải là JSON object với:
- folders: array của folder objects, mỗi object có: id (string), name (string tiếng Việt), children (array các folder con tương tự)

Hãy tạo cấu trúc thư mục hợp lý và phù hợp với mô tả.
`;

            const genAiResponse = await ai.models.generateContent({
                model: activeKey.model,
                contents: `Mô tả yêu cầu: "${aiGenerationInput}"

Trả về cấu trúc thư mục hợp lý theo định dạng JSON như sau:
{"folders": [{"id": "folder1", "name": "Tên thư mục", "children": [{"id": "child1", "name": "Tên con", "children": []}]}]}`,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json"
                }
            });

            const result = JSON.parse(genAiResponse.text.trim());

            if (result.folders && Array.isArray(result.folders)) {
                // Convert AI response to our structure format
                const convertNode = (node: any): FolderStructureNode => ({
                    id: node.id || generateId(),
                    name: node.name,
                    children: node.children ? node.children.map(convertNode) : [],
                    parentId: null // Will be set when inserting into hierarchy
                });

                const aiStructure = result.folders.map(convertNode);
                setTemplateStructure(aiStructure);
                setTemplateName(`Template từ AI: ${aiGenerationInput.slice(0, 30)}...`);
                setTemplateDescription(`Template được tạo bởi AI dựa trên: ${aiGenerationInput}`);
            } else {
                throw new Error('Định dạng phản hồi từ AI không hợp lệ.');
            }
        } catch (error: any) {
            alert(`Lỗi tạo template bằng AI: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportTemplate = (template: FolderTemplate) => {
        const exportData = JSON.stringify(template, null, 2);
        const blob = new Blob([exportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${template.name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setImportFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const importedTemplate = JSON.parse(content) as FolderTemplate;

                    if (!importedTemplate.name || !importedTemplate.structure) {
                        throw new Error('File không phải là template hợp lệ.');
                    }

                    // Save the imported template
                    const newTemplate: FolderTemplate = {
                        ...importedTemplate,
                        id: generateId(), // Generate new ID to avoid conflicts
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };

                    onSaveTemplate(newTemplate);
                    alert('Import template thành công!');
                    setImportFile(null);
                    event.target.value = ''; // Reset file input
                } catch (error: any) {
                    alert(`Lỗi import file: ${error.message}`);
                }
            };
            reader.readAsText(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#282C34] rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Quản lý thư mục mẫu</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                    <div className="space-y-6">
                        {/* AI Generation Section */}
                        <div className="bg-[#21252C] p-4 rounded-lg">
                            <h3 className="text-md font-semibold text-white mb-3">Tạo mẫu bằng AI</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">
                                        Mô tả cấu trúc thư mục bạn muốn tạo
                                    </label>
                                    <textarea
                                        value={aiGenerationInput}
                                        onChange={(e) => setAiGenerationInput(e.target.value)}
                                        className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm h-20 resize-none"
                                        placeholder="Ví dụ: Cấu trúc thư mục cho dự án phát triển web gồm frontend, backend, database, deployment..."
                                    />
                                </div>
                                <button
                                    onClick={handleAIGenerateTemplate}
                                    disabled={isGenerating || !aiGenerationInput.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white px-4 py-2 rounded text-sm flex items-center"
                                >
                                    {isGenerating ? 'Đang tạo...' : 'Tọa bằng AI'}
                                    {isGenerating && (
                                        <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Import/Export Section */}
                        <div className="bg-[#21252C] p-4 rounded-lg">
                            <h3 className="text-md font-semibold text-white mb-3">Mẫu nhập/xuất</h3>
                            <div className="flex items-center space-x-4">
                                <div className="flex-1">
                                    <label className="block text-sm text-gray-400 mb-1">Nhập mẫu từ file JSON</label>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={handleImportTemplate}
                                        className="text-gray-300 text-sm"
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-400">Export tất cả:</span>
                                    <button
                                        onClick={() => {
                                            const exportData = JSON.stringify(templates, null, 2);
                                            const blob = new Blob([exportData], { type: 'application/json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = 'all_templates.json';
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
                                    >
                                        Export All
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Template Form */}
                        <div className="bg-[#21252C] p-4 rounded-lg">
                            <h3 className="text-md font-semibold text-white mb-3">
                                {editingTemplate ? 'Chỉnh sửa mẫu' : 'Tạo mẫu mới'}
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Tên mẫu</label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm"
                                        placeholder="Nhập tên mẫu..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Mô tả</label>
                                    <textarea
                                        value={templateDescription}
                                        onChange={(e) => setTemplateDescription(e.target.value)}
                                        className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm h-20 resize-none"
                                        placeholder="Mô tả về mẫu thư mục này..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-2">Cấu trúc thư mục</label>
                                    <div className="bg-gray-800 p-3 rounded min-h-[200px]">
                                        {templateStructure.length > 0 ? (
                                            templateStructure.map(node => (
                                                <TreeNode
                                                    key={node.id}
                                                    node={node}
                                                    level={0}
                                                    onAddChild={handleAddNode}
                                                    onDeleteNode={handleDeleteNode}
                                                    onUpdateNode={handleUpdateNode}
                                                />
                                            ))
                                        ) : (
                                            <div className="text-gray-500 text-center py-8">
                                                Chưa có cấu trúc thư mục. Nhấn "Tạo mẫu mới" để bắt đầu, hoặc "Tạo bằng AI" để tạo tự động.
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    {editingTemplate ? (
                                        <>
                                            <button
                                                onClick={handleSaveEdit}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
                                            >
                                                Lưu chỉnh sửa
                                            </button>
                                            <button
                                                onClick={() => setEditingTemplate(null)}
                                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
                                            >
                                                Hủy
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={handleCreateTemplate}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm"
                                        >
                                            Tạo mẫu mới
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Existing Templates */}
                        <div>
                            <h3 className="text-md font-semibold text-white mb-3">Mẫu hiện có</h3>
                            <div className="space-y-2">
                                {templates.map(template => (
                                    <div key={template.id} className="bg-[#21252C] p-3 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-white font-medium">{template.name}</h4>
                                                <p className="text-gray-400 text-sm">{template.description}</p>
                                                <p className="text-gray-500 text-xs">
                                                    Tạo: {new Date(template.createdAt).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => onApplyFolderTemplate(template)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                                >
                                                    Áp dụng
                                                </button>
                                                <button
                                                    onClick={() => handleEditTemplate(template)}
                                                    className="text-gray-400 hover:text-emerald-400 px-2 py-1 text-sm"
                                                >
                                                    Chỉnh sửa
                                                </button>
                                                <button
                                                    onClick={() => handleExportTemplate(template)}
                                                    className="text-gray-400 hover:text-green-400 px-2 py-1 text-sm"
                                                >
                                                    Export
                                                </button>
                                                <button
                                                    onClick={() => onDeleteTemplate(template.id)}
                                                    className="text-gray-400 hover:text-red-400 px-2 py-1 text-sm"
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {templates.length === 0 && (
                                    <div className="text-gray-500 text-center py-4">
                                        Chưa có mẫu nào. Tạo mẫu đầu tiên của bạn.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FolderTemplateModal;
