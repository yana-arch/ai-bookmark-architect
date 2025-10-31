import React, { useState } from 'react';

interface KeyInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'upload' | 'import';
  onSubmit: (key: string) => Promise<void>;
  isLoading?: boolean;
}

const KeyInputModal: React.FC<KeyInputModalProps> = ({
  isOpen,
  onClose,
  mode,
  onSubmit,
  isLoading = false
}) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!key.trim()) {
      setError('Vui lòng nhập key');
      return;
    }

    if (key.length < 3) {
      setError('Key phải có ít nhất 3 ký tự');
      return;
    }

    try {
      setError(null);
      await onSubmit(key.trim());
      setKey('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleClose = () => {
    setKey('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const title = mode === 'upload' ? 'Upload dữ liệu' : 'Import dữ liệu';
  const description = mode === 'upload'
    ? 'Nhập một key duy nhất để lưu dữ liệu bookmark của bạn. Key này sẽ được sử dụng để import lại dữ liệu sau này.'
    : 'Nhập key để tải lại dữ liệu bookmark đã lưu trước đó.';
  const buttonText = mode === 'upload' ? 'Upload' : 'Import';
  const placeholder = mode === 'upload' ? 'Nhập key duy nhất...' : 'Nhập key của bạn...';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#282C34] rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              {description}
            </p>

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700 rounded-md">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Key *
              </label>
              <input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-md transition-colors"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isLoading || !key.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md transition-colors flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <span>{buttonText}</span>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Key phải là duy nhất và sẽ được sử dụng để xác định dữ liệu của bạn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyInputModal;
