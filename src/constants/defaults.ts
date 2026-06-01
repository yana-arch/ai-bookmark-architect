import type { FolderTemplate, AIProfile } from '@/types';

export const DEFAULT_TEMPLATES: FolderTemplate[] = [
    {
        id: 'template-web-dev',
        name: 'Phát triển Web',
        description: 'Cấu trúc thư mục cho các bookmark liên quan đến phát triển web',
        structure: [
            {
                id: 'web-frontend',
                name: 'Frontend',
                children: [
                    { id: 'web-react', name: 'React', children: [], parentId: 'web-frontend' },
                    { id: 'web-vue', name: 'Vue.js', children: [], parentId: 'web-frontend' },
                    { id: 'web-angular', name: 'Angular', children: [], parentId: 'web-frontend' },
                    { id: 'web-html-css', name: 'HTML/CSS', children: [], parentId: 'web-frontend' },
                ],
                parentId: null,
            },
            {
                id: 'web-backend',
                name: 'Backend',
                children: [
                    { id: 'web-nodejs', name: 'Node.js', children: [], parentId: 'web-backend' },
                    { id: 'web-python', name: 'Python', children: [], parentId: 'web-backend' },
                    { id: 'web-php', name: 'PHP', children: [], parentId: 'web-backend' },
                    { id: 'web-database', name: 'Database', children: [], parentId: 'web-backend' },
                ],
                parentId: null,
            },
            {
                id: 'web-tools',
                name: 'Công cụ & Tiện ích',
                children: [
                    { id: 'web-build-tools', name: 'Build Tools', children: [], parentId: 'web-tools' },
                    { id: 'web-editors', name: 'Editors', children: [], parentId: 'web-tools' },
                    { id: 'web-version-control', name: 'Version Control', children: [], parentId: 'web-tools' },
                ],
                parentId: null,
            },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true,
        customPrompt: 'Act as a specialized Web Development Architect. Focus on grouping technical documentation and frameworks into the provided structure.',
        tagDrivenPrompt: "Focus on technical tags like 'react', 'nodejs', 'api', 'frontend', 'backend'. Group these tags logically into the Web Development taxonomy."
    },
    {
        id: 'template-ai-ml',
        name: 'AI & Machine Learning',
        description: 'Cấu trúc thư mục cho các bookmark liên quan đến AI và Machine Learning',
        structure: [
            {
                id: 'ai-fundamentals',
                name: 'Kiến thức cơ bản',
                children: [
                    { id: 'ai-math', name: 'Toán học', children: [], parentId: 'ai-fundamentals' },
                    { id: 'ai-algorithms', name: 'Thuật toán', children: [], parentId: 'ai-fundamentals' },
                    { id: 'ai-concepts', name: 'Khái niệm cơ bản', children: [], parentId: 'ai-fundamentals' },
                ],
                parentId: null,
            },
            {
                id: 'ai-frameworks',
                name: 'Frameworks & Libraries',
                children: [
                    { id: 'ai-tensorflow', name: 'TensorFlow', children: [], parentId: 'ai-frameworks' },
                    { id: 'ai-pytorch', name: 'PyTorch', children: [], parentId: 'ai-frameworks' },
                    { id: 'ai-keras', name: 'Keras', children: [], parentId: 'ai-frameworks' },
                    { id: 'ai-scikit-learn', name: 'Scikit-learn', children: [], parentId: 'ai-frameworks' },
                ],
                parentId: null,
            },
            {
                id: 'ai-applications',
                name: 'Ứng dụng',
                children: [
                    { id: 'ai-nlp', name: 'Xử lý ngôn ngữ tự nhiên', children: [], parentId: 'ai-applications' },
                    { id: 'ai-computer-vision', name: 'Computer Vision', children: [], parentId: 'ai-applications' },
                    { id: 'ai-robotics', name: 'Robotics', children: [], parentId: 'ai-applications' },
                ],
                parentId: null,
            },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true,
        customPrompt: 'Act as an AI Research Librarian. Categorize highly technical papers and tools into the ML hierarchy.',
        tagDrivenPrompt: "Extract specific AI tags like 'LLM', 'neural-networks', 'transformers'. Map them to the AI/ML folder structure."
    },
    {
        id: 'template-general',
        name: 'Tổng hợp',
        description: 'Cấu trúc thư mục tổng hợp cho nhiều loại bookmark khác nhau',
        structure: [
            {
                id: 'general-tech',
                name: 'Công nghệ',
                children: [
                    { id: 'general-programming', name: 'Lập trình', children: [], parentId: 'general-tech' },
                    { id: 'general-ai', name: 'Trí tuệ nhân tạo', children: [], parentId: 'general-tech' },
                    { id: 'general-web', name: 'Web', children: [], parentId: 'general-tech' },
                ],
                parentId: null,
            },
            {
                id: 'general-learning',
                name: 'Học tập',
                children: [
                    { id: 'general-tutorials', name: 'Hướng dẫn', children: [], parentId: 'general-learning' },
                    { id: 'general-courses', name: 'Khóa học', children: [], parentId: 'general-learning' },
                    { id: 'general-documentation', name: 'Tài liệu', children: [], parentId: 'general-learning' },
                ],
                parentId: null,
            },
            {
                id: 'general-tools',
                name: 'Công cụ',
                children: [
                    { id: 'general-development', name: 'Phát triển', children: [], parentId: 'general-tools' },
                    { id: 'general-design', name: 'Thiết kế', children: [], parentId: 'general-tools' },
                    { id: 'general-productivity', name: 'Năng suất', children: [], parentId: 'general-tools' },
                ],
                parentId: null,
            },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isDefault: true,
        customPrompt: 'General organizer mode. Balance the categorization across Tech, Learning and Tools.',
        tagDrivenPrompt: 'Identify broad tags and distribute them across the three main pillars: Tech, Learning, and Tools.'
    },
];

export const DEFAULT_PROFILES: AIProfile[] = [
    {
        id: 'profile-default',
        name: 'Cơ bản (Khuyên dùng)',
        isDefault: true,
        systemInstruction: 'You are an intelligent bookmark organizer. Categorize bookmarks into a clean, hierarchical folder structure in VIETNAMESE.',
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'profile-creative',
        name: 'Sáng tạo (Thư mục mới)',
        isDefault: true,
        systemInstruction: 'You are an intelligent bookmark organizer. You are encouraged to create new and creative folder categories based on the content of the bookmarks.',
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        presencePenalty: 0.1,
        frequencyPenalty: 0.1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
    {
        id: 'profile-strict',
        name: 'Nghiêm ngặt (Gộp nhóm)',
        isDefault: true,
        systemInstruction: 'You are a strict taxonomy organizer. Do NOT create new folders unless absolutely necessary. Consolidate bookmarks into the most suitable existing folders.',
        temperature: 0.0,
        topK: 1,
        topP: 0.1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }
];
