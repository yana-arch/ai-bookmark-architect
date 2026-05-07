import type { Bookmark } from '../../types';

/**
 * Creates mock data for testing/initialization
 * @returns Array of mock bookmarks
 */
export const createMockData = (): Bookmark[] => {
    return [
    // Web Development
        { id: 'bm-1', title: 'React Docs - Trang chủ chính thức', url: 'https://react.dev/', parentId: null },
        { id: 'bm-2', title: 'Tailwind CSS - Tiện ích CSS hàng đầu', url: 'https://tailwindcss.com/', parentId: null },
        { id: 'bm-3', title: 'MDN Web Docs - Tài liệu cho Lập trình viên Web', url: 'https://developer.mozilla.org/', parentId: null },
        { id: 'bm-4', title: 'Vite.js - Công cụ build thế hệ mới', url: 'https://vitejs.dev/', parentId: null },
        { id: 'bm-5', title: 'Node.js - Môi trường chạy JavaScript', url: 'https://nodejs.org/', parentId: null },

        // AI & Machine Learning
        { id: 'bm-6', title: 'Google Gemini API - Hướng dẫn', url: 'https://ai.google.dev/docs', parentId: null },
        { id: 'bm-7', title: 'Hugging Face - Cộng đồng AI', url: 'https://huggingface.co/', parentId: null },
        { id: 'bm-8', title: 'TensorFlow - Nền tảng Machine Learning', url: 'https://www.tensorflow.org/', parentId: null },
        { id: 'bm-9', title: 'PyTorch - Nền tảng Deep Learning', url: 'https://pytorch.org/', parentId: null },
        { id: 'bm-10', title: 'Giới thiệu về Mạng nơ-ron tích chập (CNN)', url: 'https://en.wikipedia.org/wiki/Convolutional_neural_network', parentId: null },

        // Design & UX/UI
        { id: 'bm-11', title: 'Figma - Công cụ thiết kế giao diện', url: 'https://www.figma.com/', parentId: null },
        { id: 'bm-12', title: 'Dribbble - Nơi trưng bày của các nhà thiết kế', url: 'https://dribbble.com/', parentId: null },
        { id: 'bm-13', title: 'Nielsen Norman Group - Nghiên cứu UX', url: 'https://www.nngroup.com/', parentId: null },
    
        // Productivity & Tools
        { id: 'bm-14', title: 'Notion - Không gian làm việc tất cả trong một', url: 'https://www.notion.so/', parentId: null },
        { id: 'bm-15', title: 'GitHub - Nơi thế giới xây dựng phần mềm', url: 'https://github.com/', parentId: null },
    
        // DUPLICATE MOCK DATA
        { id: 'bm-16', title: 'React Docs (Bản sao)', url: 'https://react.dev/', parentId: null },
        { id: 'bm-17', title: 'Figma Mirror', url: 'https://www.figma.com/', parentId: null },
    ];
};
