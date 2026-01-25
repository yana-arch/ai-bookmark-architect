import React, { useState, useEffect } from 'react';
import { InstructionPreset } from '@/types';

interface InstructionPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: InstructionPreset) => void;
  onDelete: (id: string) => void;
  presets: InstructionPreset[];
  editingPreset?: InstructionPreset | null;
}

const InstructionPresetModal: React.FC<InstructionPresetModalProps> = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    presets,
    editingPreset
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState<InstructionPreset | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        folderStructure: [''],
        namingRules: [''],
        customInstructions: ''
    });


    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            folderStructure: [''],
            namingRules: [''],
            customInstructions: ''
        });
    };

    useEffect(() => {
        if (editingPreset) {
            setFormData({
                name: editingPreset.name,
                description: editingPreset.description,
                folderStructure: [...editingPreset.folderStructure],
                namingRules: [...editingPreset.namingRules],
                customInstructions: editingPreset.customInstructions
            });
            setIsCreating(true);
        } else {
            resetForm();
        }
    }, [editingPreset]);

    const handleSave = () => {
        if (!formData.name.trim()) {
            alert('Vui lòng nhập tên preset!');
            return;
        }

        const preset: InstructionPreset = {
            id: editingPreset?.id || `preset-${Date.now()}`,
            name: formData.name.trim(),
            description: formData.description.trim(),
            folderStructure: formData.folderStructure.filter(f => f.trim()),
            namingRules: formData.namingRules.filter(r => r.trim()),
            customInstructions: formData.customInstructions.trim(),
            createdAt: editingPreset?.createdAt || Date.now(),
            updatedAt: Date.now()
        };

        onSave(preset);
        setIsCreating(false);
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc chắn muốn xóa preset này?')) {
            onDelete(id);
        }
    };

    const addFolderStructure = () => {
        setFormData(prev => ({
            ...prev,
            folderStructure: [...prev.folderStructure, '']
        }));
    };

    const updateFolderStructure = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            folderStructure: prev.folderStructure.map((f, i) => i === index ? value : f)
        }));
    };

    const removeFolderStructure = (index: number) => {
        setFormData(prev => ({
            ...prev,
            folderStructure: prev.folderStructure.filter((_, i) => i !== index)
        }));
    };

    const addNamingRule = () => {
        setFormData(prev => ({
            ...prev,
            namingRules: [...prev.namingRules, '']
        }));
    };

    const updateNamingRule = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            namingRules: prev.namingRules.map((r, i) => i === index ? value : r)
        }));
    };

    const removeNamingRule = (index: number) => {
        setFormData(prev => ({
            ...prev,
            namingRules: prev.namingRules.filter((_, i) => i !== index)
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#282C34] rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">Quản lý Chỉ dẫn Bổ sung</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
            ×
                    </button>
                </div>

                <div className="flex h-[600px]">
                    {/* Preset List */}
                    <div className="w-1/3 border-r border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-white">Danh sách Preset</h3>
                            <button
                                onClick={() => {
                                    setIsCreating(true);
                                    setSelectedPreset(null);
                                    resetForm();
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded"
                            >
                + Tạo mới
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {presets.map(preset => (
                                <div
                                    key={preset.id}
                                    className={`p-3 rounded cursor-pointer border ${
                                        selectedPreset?.id === preset.id
                                            ? 'border-emerald-500 bg-emerald-500/10'
                                            : 'border-gray-600 hover:border-gray-500'
                                    }`}
                                    onClick={() => setSelectedPreset(preset)}
                                >
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-white font-medium">{preset.name}</h4>
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsCreating(true);
                                                    setSelectedPreset(preset);
                                                    setFormData({
                                                        name: preset.name,
                                                        description: preset.description,
                                                        folderStructure: [...preset.folderStructure],
                                                        namingRules: [...preset.namingRules],
                                                        customInstructions: preset.customInstructions
                                                    });
                                                }}
                                                className="text-blue-400 hover:text-blue-300 text-sm"
                                            >
                        ✏️
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(preset.id);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-sm"
                                            >
                        🗑️
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-1">{preset.description}</p>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {preset.folderStructure.length} thư mục • {preset.namingRules.length} quy tắc
                                    </div>
                                </div>
                            ))}

                            {presets.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                  Chưa có preset nào. Tạo preset đầu tiên!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {isCreating ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white font-medium mb-2">Tên Preset *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full p-2 bg-[#1E2127] border border-gray-600 rounded text-white"
                                        placeholder="Ví dụ: Phát triển Web, AI & ML,..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-white font-medium mb-2">Mô tả</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full p-2 bg-[#1E2127] border border-gray-600 rounded text-white h-20"
                                        placeholder="Mô tả ngắn gọn về preset này..."
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-white font-medium">Cấu trúc Thư mục</label>
                                        <button
                                            onClick={addFolderStructure}
                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                                        >
                      + Thêm
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.folderStructure.map((folder, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={folder}
                                                    onChange={(e) => updateFolderStructure(index, e.target.value)}
                                                    className="flex-1 p-2 bg-[#1E2127] border border-gray-600 rounded text-white"
                                                    placeholder="Ví dụ: Phát triển Web, Công cụ, Tài liệu..."
                                                />
                                                {formData.folderStructure.length > 1 && (
                                                    <button
                                                        onClick={() => removeFolderStructure(index)}
                                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                                                    >
                            ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-gray-400 text-sm mt-1">
                    Định nghĩa các thư mục chính mà AI nên sử dụng
                                    </p>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-white font-medium">Quy tắc Đặt tên</label>
                                        <button
                                            onClick={addNamingRule}
                                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                                        >
                      + Thêm
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {formData.namingRules.map((rule, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <input
                                                    type="text"
                                                    value={rule}
                                                    onChange={(e) => updateNamingRule(index, e.target.value)}
                                                    className="flex-1 p-2 bg-[#1E2127] border border-gray-600 rounded text-white"
                                                    placeholder="Ví dụ: Sử dụng tiếng Việt, Viết hoa chữ cái đầu..."
                                                />
                                                {formData.namingRules.length > 1 && (
                                                    <button
                                                        onClick={() => removeNamingRule(index)}
                                                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                                                    >
                            ×
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-gray-400 text-sm mt-1">
                    Quy tắc đặt tên thư mục và tag
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-white font-medium mb-2">Chỉ dẫn Bổ sung</label>
                                    <textarea
                                        value={formData.customInstructions}
                                        onChange={(e) => setFormData(prev => ({ ...prev, customInstructions: e.target.value }))}
                                        className="w-full p-2 bg-[#1E2127] border border-gray-600 rounded text-white h-32"
                                        placeholder="Chỉ dẫn cụ thể cho AI về cách phân loại bookmark..."
                                    />
                                </div>

                                <div className="flex space-x-2 pt-4">
                                    <button
                                        onClick={handleSave}
                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded"
                                    >
                                        {editingPreset ? 'Cập nhật' : 'Lưu'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            resetForm();
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
                                    >
                    Hủy
                                    </button>
                                </div>
                            </div>
                        ) : selectedPreset ? (
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white">{selectedPreset.name}</h3>
                                <p className="text-gray-300">{selectedPreset.description}</p>

                                <div>
                                    <h4 className="text-white font-medium mb-2">Cấu trúc Thư mục:</h4>
                                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                                        {selectedPreset.folderStructure.map((folder, index) => (
                                            <li key={index}>{folder}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="text-white font-medium mb-2">Quy tắc Đặt tên:</h4>
                                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                                        {selectedPreset.namingRules.map((rule, index) => (
                                            <li key={index}>{rule}</li>
                                        ))}
                                    </ul>
                                </div>

                                {selectedPreset.customInstructions && (
                                    <div>
                                        <h4 className="text-white font-medium mb-2">Chỉ dẫn Bổ sung:</h4>
                                        <p className="text-gray-300 bg-[#1E2127] p-3 rounded">
                                            {selectedPreset.customInstructions}
                                        </p>
                                    </div>
                                )}

                                <div className="text-sm text-gray-500">
                  Tạo: {new Date(selectedPreset.createdAt).toLocaleDateString('vi-VN')}
                                    {selectedPreset.updatedAt !== selectedPreset.createdAt &&
                    ` • Cập nhật: ${new Date(selectedPreset.updatedAt).toLocaleDateString('vi-VN')}`
                                    }
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-16">
                Chọn một preset để xem chi tiết hoặc tạo preset mới
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructionPresetModal;
