import { useState, useCallback } from 'react';
import { FolderTemplate, TemplateSettings, ApiConfig } from '../types';
import { DEFAULT_SYSTEM_PROMPT } from '../src/constants';
import * as db from '../db';

export const useTemplateManagement = (
    folderTemplates: FolderTemplate[],
    setFolderTemplates: (templates: FolderTemplate[] | ((prev: FolderTemplate[]) => FolderTemplate[])) => void,
    setSystemPrompt: (prompt: string) => void,
    setNotifications: (callback: (prev: any[]) => any[]) => void
) => {
    const [isFolderTemplateModalOpen, setIsFolderTemplateModalOpen] = useState(false);
    const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
        folderCreationMode: 'hybrid',
        selectedTemplateId: null,
        allowAiFolderCreation: true,
        strictMode: false,
    });

    const handleSaveFolderTemplate = useCallback(async (template: FolderTemplate) => {
        await db.saveFolderTemplate(template);
        setFolderTemplates(prev => {
            const existingIndex = prev.findIndex(t => t.id === template.id);
            if (existingIndex > -1) {
                const newTemplates = [...prev];
                newTemplates[existingIndex] = template;
                return newTemplates;
            }
            return [...prev, template];
        });
    }, [setFolderTemplates]);

    const handleDeleteFolderTemplate = useCallback(async (id: string) => {
        await db.deleteFolderTemplate(id);
        setFolderTemplates(prev => prev.filter(t => t.id !== id));
    }, [setFolderTemplates]);

    const handleApplyFolderTemplate = useCallback(async (template: FolderTemplate) => {
        setTemplateSettings(prev => ({
            ...prev,
            selectedTemplateId: template.id,
            folderCreationMode: 'template_based'
        }));

        // Update system prompt to use template structure as the FILLED categorization guide
        const flattenTemplateFolders = (node: any, path: string[] = []): string[] => {
            let folders: string[] = [];
            const currentPath = [...path, node.name];
            folders.push(currentPath.join(' -> '));

            if (node.children && node.children.length > 0) {
                node.children.forEach((child: any) => {
                    folders = folders.concat(flattenTemplateFolders(child, currentPath));
                });
            }
            return folders;
        };

        const availableFolders = template.structure.flatMap(node => flattenTemplateFolders(node));
        const folderGuide = availableFolders.map((folder, index) => `${index + 1}. ${folder}`).join('\n');

        const newSystemPrompt = `${DEFAULT_SYSTEM_PROMPT}\n\n**TEMPLATE MODE ACTIVATED - STRICT TEMPLATE FOLLOWING:** You MUST use the selected template "${template.name}" as your ONLY categorization framework. The template has created empty folders that you MUST fill with bookmarks.

**AVAILABLE TEMPLATE FOLDERS (You may ONLY use these - NO NEW FOLDERS ALLOWED):**
${folderGuide}

**STRICT RULES - FOLLOW EXACTLY:**
1. NEVER create new folders - ONLY use the folders listed above.
2. For each bookmark, find the SINGLE BEST MATCHING folder from the template structure.
3. Analyze the bookmark's content and map it directly to the most appropriate template category.
4. If no perfect match exists, choose the closest related category from the template.
5. Template purpose: ${template.description}

**CATEGORIZATION EXAMPLES:**
- React tutorials/docs → Frontend -> React
- Node.js guides → Backend -> Node.js
- Git repositories → Công cụ & Tiện ích -> Version Control
- Python backend code → Backend -> Python`;

        setSystemPrompt(newSystemPrompt);
        setNotifications(prev => [...prev, { id: 'template-applied', message: `Đã áp dụng mẫu "${template.name}" làm chỉ dẫn cho AI.`, type: 'info' }]);
    }, [setSystemPrompt, setNotifications]);

    const handleTemplateSettingsChange = useCallback((newSettings: Partial<TemplateSettings>) => {
        setTemplateSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    return {
        isFolderTemplateModalOpen,
        setIsFolderTemplateModalOpen,
        templateSettings,
        setTemplateSettings,
        handleSaveFolderTemplate,
        handleDeleteFolderTemplate,
        handleApplyFolderTemplate,
        handleTemplateSettingsChange
    };
};
