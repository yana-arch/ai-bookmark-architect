
import React, { useCallback } from 'react';
import type { Bookmark } from '../types';

interface FileDropzoneProps {
    onFileLoaded: (bookmarks: Bookmark[]) => void;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileLoaded }) => {
    
    const parseBookmarksHTML = (htmlString: string): Bookmark[] => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        
        return links.map((link, index) => ({
            id: `bm-${Date.now()}-${index}`,
            title: link.textContent || 'No Title',
            url: link.href,
            parentId: null
        }));
    };

    const handleFile = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (content) {
                const parsedBookmarks = parseBookmarksHTML(content);
                onFileLoaded(parsedBookmarks);
            }
        };
        reader.readAsText(file);
    }, [onFileLoaded]);

    const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleFile(event.dataTransfer.files[0]);
            event.dataTransfer.clearData();
        }
    }, [handleFile]);

    const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            handleFile(event.target.files[0]);
        }
    };

    return (
        <div 
            onDrop={onDrop} 
            onDragOver={onDragOver}
            className="flex-1 flex flex-col items-center justify-center m-4 border-2 border-dashed border-gray-600 rounded-lg text-center p-8"
        >
            <h2 className="text-2xl font-bold text-white mb-2">Bắt đầu tổ chức</h2>
            <p className="text-gray-400 mb-6">Kéo và thả file `bookmarks.html` của bạn vào đây hoặc nhấp để chọn.</p>
            <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".html"
                onChange={onFileChange} 
            />
            <label 
                htmlFor="file-upload"
                className="bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg cursor-pointer hover:bg-emerald-600 transition-colors"
            >
                Chọn File
            </label>
            <p className="text-xs text-gray-500 mt-4">Dữ liệu của bạn được xử lý hoàn toàn trên trình duyệt của bạn.</p>
        </div>
    );
};

export default FileDropzone;
