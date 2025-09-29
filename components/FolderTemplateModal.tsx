import React, { useState, useEffect } from 'react';
import { FolderTemplate, FolderStructureNode, EmptyFolderTree } from '../types';
import { XIcon, PlusIcon, TrashIcon, FolderIcon, ChevronRightIcon } from './Icons';

interface FolderTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: FolderTemplate[];
    emptyTrees: EmptyFolderTree[];
    onSaveTemplate: (template: FolderTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    onCreateEmptyTree: (templateId: string, name: string) => void;
    onDeleteEmptyTree: (id: string) => void;
    onActivateEmptyTree: (id: string) => void;
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
    emptyTrees,
    onSaveTemplate,
    onDeleteTemplate,
    onCreateEmptyTree,
    onDeleteEmptyTree,
    onActivateEmptyTree,
}) => {
    const [activeTab, setActiveTab] = useState<'templates' | 'trees'>('templates');
    const [editingTemplate, setEditingTemplate] = useState<FolderTemplate | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [templateDescription, setTemplateDescription] = useState('');
    const [templateStructure, setTemplateStructure] = useState<FolderStructureNode[]>([]);
    const [newTreeName, setNewTreeName] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Reset form when modal opens
            setTemplateName('');
            setTemplateDescription('');
            setTemplateStructure([]);
            setNewTreeName('');
            setEditingTemplate(null);
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

    const handleCreateEmptyTree = () => {
        if (!newTreeName.trim()) return;
        // For now, create from the first template or ask user to select
        const templateId = templates[0]?.id;
        if (templateId) {
            onCreateEmptyTree(templateId, newTreeName.trim());
            setNewTreeName('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[#282C34] rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Quản lý thư mục mẫu</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'templates'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Mẫu thư mục
                    </button>
                    <button
                        onClick={() => setActiveTab('trees')}
                        className={`px-4 py-2 text-sm font-medium ${
                            activeTab === 'trees'
                                ? 'text-emerald-400 border-b-2 border-emerald-400'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Cây thư mục trống
                    </button>
                </div>

                <div className="p-4 max-h-[calc(90vh-120px)] overflow-y-auto">
                    {activeTab === 'templates' ? (
                        <div className="space-y-4">
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
                                                    Chưa có cấu trúc thư mục. Nhấn "Tạo mẫu mới" để bắt đầu.
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
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => handleEditTemplate(template)}
                                                        className="text-gray-400 hover:text-emerald-400 px-2 py-1 text-sm"
                                                    >
                                                        Chỉnh sửa
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
                    ) : (
                        <div className="space-y-4">
                            {/* Create Empty Tree Form */}
                            <div className="bg-[#21252C] p-4 rounded-lg">
                                <h3 className="text-md font-semibold text-white mb-3">Tạo cây thư mục trống</h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={newTreeName}
                                        onChange={(e) => setNewTreeName(e.target.value)}
                                        className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm"
                                        placeholder="Tên cây thư mục..."
                                    />
                                    <button
                                        onClick={handleCreateEmptyTree}
                                        disabled={!newTreeName.trim() || templates.length === 0}
                                        className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm"
                                    >
                                        Tạo
                                    </button>
                                </div>
                                {templates.length === 0 && (
                                    <p className="text-yellow-400 text-sm mt-2">
                                        Cần tạo ít nhất một mẫu thư mục trước khi tạo cây trống.
                                    </p>
                                )}
                            </div>

                            {/* Existing Empty Trees */}
                            <div>
                                <h3 className="text-md font-semibold text-white mb-3">Cây thư mục trống hiện có</h3>
                                <div className="space-y-2">
                                    {emptyTrees.map(tree => (
                                        <div key={tree.id} className="bg-[#21252C] p-3 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2">
                                                        <h4 className="text-white font-medium">{tree.name}</h4>
                                                        {tree.isActive && (
                                                            <span className="bg-emerald-600 text-white px-2 py-1 rounded text-xs">
                                                                Đang hoạt động
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-400 text-sm">
                                                        Tạo từ mẫu: {templates.find(t => t.id === tree.templateId)?.name || 'Không tìm thấy'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {!tree.isActive && (
                                                        <button
                                                            onClick={() => onActivateEmptyTree(tree.id)}
                                                            className="text-gray-400 hover:text-emerald-400 px-2 py-1 text-sm"
                                                        >
                                                            Kích hoạt
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => onDeleteEmptyTree(tree.id)}
                                                        className="text-gray-400 hover:text-red-400 px-2 py-1 text-sm"
                                                    >
                                                        Xóa
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {emptyTrees.length === 0 && (
                                        <div className="text-gray-500 text-center py-4">
                                            Chưa có cây thư mục trống nào. Tạo cây đầu tiên của bạn.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FolderTemplateModal;
