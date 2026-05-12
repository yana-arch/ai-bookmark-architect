import { ArchitectureStyleConfig } from '@/types';

export const ARCHITECTURE_STYLES: ArchitectureStyleConfig[] = [
    {
        id: 'taxonomist',
        name: 'THE TAXONOMIST',
        description: 'Deep Branching (Folder-centric).',
        longDescription: 'Prioritizes hierarchical logic depth (e.g. Linux / Distros / Ubuntu). Best for users who love nested categorization.',
        promptAddition: `**ARCHITECTURE STYLE: THE TAXONOMIST**
- Prioritize creating a deep, hierarchical folder structure.
- Focus on logical nesting (e.g., Technology > Programming > JavaScript > React).
- Folders should be specific and granular.`
    },
    {
        id: 'librarian',
        name: 'THE LIBRARIAN',
        description: 'Flat & Tagged (Tag-centric).',
        longDescription: 'Priority is single root folders with high-density tags. Optimized for search and quick access without deep nesting.',
        promptAddition: `**ARCHITECTURE STYLE: THE LIBRARIAN**
- Prioritize a flatter folder structure with fewer levels of nesting (max 1-2 levels).
- Rely heavily on high-quality, descriptive tags for organization.
- Categorize bookmarks into broad, high-level folders.`
    },
    {
        id: 'para',
        name: 'THE P.A.R.A SPECIALIST',
        description: 'Productivity-focused method by Tiago Forte.',
        longDescription: 'Strictly: Projects, Areas, Resources, Archives. Best for active information management and productivity.',
        promptAddition: `**ARCHITECTURE STYLE: THE P.A.R.A SPECIALIST**
- Organize bookmarks strictly into four top-level folders:
  1. **Projects**: Active work with a deadline.
  2. **Areas**: Long-term responsibilities (e.g., Finance, Health).
  3. **Resources**: Topics of interest or reference material.
  4. **Archives**: Completed or inactive items.
- You MUST map every bookmark into one of these four pillars as the root of its path.`
    }
];
