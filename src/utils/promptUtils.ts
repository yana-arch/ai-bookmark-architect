import type { Folder, PromptModifiers } from '@/types';

/**
 * Recursive helper to get full tree context for AI prompts.
 * Limits depth to keep prompt size manageable.
 */
export const getFullTreeContext = (folders: any[], depth: number = 0, maxDepth: number = 4): any[] => {
    if (depth > maxDepth) return [];
    
    return folders.map(f => ({
        name: f.name,
        children: f.children && f.children.length > 0 ? getFullTreeContext(f.children, depth + 1, maxDepth) : []
    }));
};

/**
 * Builds the structural requirements block for AI prompts based on user modifiers.
 */
export const buildModifiersBlock = (modifiers?: PromptModifiers): string => {
    if (!modifiers) return '';
    const rules: string[] = [];
    
    if (modifiers.maxFolderDepth) {
        rules.push(`- Folder Depth Limit: Ensure the generated folder structure does NOT exceed ${modifiers.maxFolderDepth} levels of depth. Limit nesting strictly to ${modifiers.maxFolderDepth} levels.`);
    }
    if (modifiers.groupByDomain) {
        rules.push('- Group by Domain: Prioritize grouping bookmarks by their website/domain name first (e.g., "github.com", "youtube.com").');
    }
    if (modifiers.useEmojis) {
        rules.push('- Use Emojis: Prepend a relevant emoji to EVERY generated folder name (e.g., "🚀 Startup", "💻 Programming").');
    }
    if (modifiers.strictTechnical) {
        rules.push('- Strict Technical: Strictly use standard, professional technical terminology for categories. Avoid slang or vague terms.');
    }
    if (modifiers.groupByPurpose) {
        rules.push('- Group by Purpose: Categorize based on user intent (e.g., "Read Later", "Tools", "Documentation", "Tutorials").');
    }
    if (modifiers.shortFolderNames) {
        rules.push('- Short Folder Names: Keep folder names extremely concise (1-2 words maximum). Never use long phrases.');
    }
    if (modifiers.maintainContext) {
        rules.push('- Maintain Context: You are part of a multi-batch process. Strive for consistency with previous decisions.');
    }
    if (modifiers.includeHierarchy) {
        rules.push('- Use Existing Hierarchy: Strictly follow and reuse the provided "Current Folder Structure" where possible to ensure structural continuity.');
    }

    if (rules.length === 0) return '';
    return `\nSTRUCTURAL REQUIREMENTS:\n${rules.join('\n')}\n`;
};
