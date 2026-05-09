import { useState, useCallback, useEffect } from 'react';
import { FolderTemplate, TemplateSettings, ApiConfig, ArchitectureStyle } from '../types';
import { DEFAULT_SYSTEM_PROMPT } from '../src/constants';
import { ARCHITECTURE_STYLES } from '../src/architectureStyles';
import * as db from '../db';

export const useTemplateManagement = (
    folderTemplates: FolderTemplate[],
    setFolderTemplates: (templates: FolderTemplate[] | ((prev: FolderTemplate[]) => FolderTemplate[])) => void,
    setSystemPrompt: (prompt: string) => void,
    setNotifications: (callback: (prev: any[]) => any[]) => void,
    tagDrivenMode: boolean
) => {
    const [isFolderTemplateModalOpen, setIsFolderTemplateModalOpen] = useState(false);
    const [templateSettings, setTemplateSettings] = useState<TemplateSettings>({
        folderCreationMode: 'hybrid',
        selectedTemplateId: null,
        allowAiFolderCreation: true,
        strictMode: false,
    });
    const [selectedArchitectureStyle, setSelectedArchitectureStyle] = useState<ArchitectureStyle>('taxonomist');

    const generateSystemPrompt = useCallback((styleId: ArchitectureStyle, templateId: string | null) => {
        let prompt = DEFAULT_SYSTEM_PROMPT;
        
        // Add Architecture Style
        const style = ARCHITECTURE_STYLES.find(s => s.id === styleId);
        if (style) {
            prompt += `\n\n${style.promptAddition}`;
        }
        
        // Add Template if selected
        if (templateId) {
            const template = folderTemplates.find(t => t.id === templateId);
            if (template) {
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

                const customEnginePrompt = tagDrivenMode 
                    ? (template.tagDrivenPrompt || '') 
                    : (template.customPrompt || '');

                prompt += `\n\n**TEMPLATE MODE ACTIVATED - STRICT TEMPLATE FOLLOWING:** You MUST use the selected template "${template.name}" as your ONLY categorization framework. The template has created empty folders that you MUST fill with bookmarks.

${customEnginePrompt ? `**TEMPLATE ENGINE GUIDANCE:** ${customEnginePrompt}\n` : ''}

**AVAILABLE TEMPLATE FOLDERS (You may ONLY use these - NO NEW FOLDERS ALLOWED):**
${folderGuide}

**STRICT RULES - FOLLOW EXACTLY:**
1. NEVER create new folders - ONLY use the folders listed above.
2. For each bookmark, find the SINGLE BEST MATCHING folder from the template structure.
3. Analyze the bookmark's content and map it directly to the most appropriate template category.
4. If no perfect match exists, choose the closest related category from the template.
5. Template purpose: ${template.description}`;
            }
        }
        
        setSystemPrompt(prompt);
    }, [folderTemplates, setSystemPrompt, tagDrivenMode]);

    // Update prompt when tagDrivenMode changes
    useEffect(() => {
        generateSystemPrompt(selectedArchitectureStyle, templateSettings.selectedTemplateId);
    }, [tagDrivenMode, generateSystemPrompt, selectedArchitectureStyle, templateSettings.selectedTemplateId]);

    const handleArchitectureStyleChange = useCallback((styleId: ArchitectureStyle) => {
        setSelectedArchitectureStyle(styleId);
        generateSystemPrompt(styleId, templateSettings.selectedTemplateId);
        setNotifications(prev => [...prev, { id: 'style-applied', message: `Đã đổi phong cách kiến trúc sang "${styleId}".`, type: 'info' }]);
    }, [generateSystemPrompt, templateSettings.selectedTemplateId, setNotifications]);

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

        generateSystemPrompt(selectedArchitectureStyle, template.id);
        setNotifications(prev => [...prev, { id: 'template-applied', message: `Đã áp dụng mẫu "${template.name}" làm chỉ dẫn cho AI.`, type: 'info' }]);
    }, [generateSystemPrompt, selectedArchitectureStyle, setNotifications]);

    const handleTemplateSettingsChange = useCallback((newSettings: Partial<TemplateSettings>) => {
        setTemplateSettings(prev => {
            const updated = { ...prev, ...newSettings };
            // If template selection changed, regenerate prompt
            if (newSettings.selectedTemplateId !== undefined) {
                generateSystemPrompt(selectedArchitectureStyle, updated.selectedTemplateId);
            }
            return updated;
        });
    }, [generateSystemPrompt, selectedArchitectureStyle]);

    return {
        isFolderTemplateModalOpen,
        setIsFolderTemplateModalOpen,
        templateSettings,
        setTemplateSettings,
        selectedArchitectureStyle,
        handleArchitectureStyleChange,
        handleSaveFolderTemplate,
        handleDeleteFolderTemplate,
        handleApplyFolderTemplate,
        handleTemplateSettingsChange
    };
};
