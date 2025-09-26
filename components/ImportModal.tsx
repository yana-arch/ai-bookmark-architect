
import React from 'react';
import { ImportIcon } from './Icons';

interface ImportModalProps {
    fileName: string;
    onImport: (mode: 'merge' | 'overwrite') => void;
    onCancel: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ fileName, onImport, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-[#282C34] rounded-xl shadow-2xl p-8 w-full max-w-md m-4 transform transition-all duration-300 scale-100">
                <div className="flex items-center mb-4">
                    <ImportIcon className="w-6 h-6 mr-3 text-sky-400" />
                    <h2 className="text-xl font-bold text-white">Nhập Bookmarks</h2>
                </div>
                <p className="text-gray-400 mb-2">Bạn đã chọn file: <span className="font-semibold text-gray-200">{fileName}</span></p>
                <p className="text-gray-400 mb-6">Chọn cách bạn muốn nhập các bookmark này.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => onImport('merge')}
                        className="w-full text-left p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
                    >
                        <h3 className="font-bold text-emerald-400 text-lg">Ghép (Merge)</h3>
                        <p className="text-sm text-gray-400 group-hover:text-gray-300">Thêm các bookmark mới vào danh sách hiện tại của bạn. Cấu trúc thư mục hiện tại sẽ được đặt lại.</p>
                    </button>
                    <button
                        onClick={() => onImport('overwrite')}
                        className="w-full text-left p-4 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors group"
                    >
                        <h3 className="font-bold text-yellow-500 text-lg">Ghi đè (Overwrite)</h3>
                        <p className="text-sm text-gray-400 group-hover:text-gray-300">Xóa tất cả các bookmark hiện tại và thay thế chúng bằng những bookmark từ file đã nhập.</p>
                    </button>
                </div>
                <div className="mt-8 text-right">
                    <button
                        onClick={onCancel}
                        className="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        Hủy
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportModal;
