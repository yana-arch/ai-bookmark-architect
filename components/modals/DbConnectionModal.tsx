import React, { useState, useEffect } from "react";
import type { DbConnection } from "../types";
import {
  saveDbConnection,
  getDbConnections,
  deleteDbConnection,
  testDbConnection,
  parseDbConnectionString,
  exportToCloud,
  importFromCloud,
} from "../db";

interface DbConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshBookmarks?: () => void;
}

const DbConnectionModal: React.FC<DbConnectionModalProps> = ({
  isOpen,
  onClose,
  onRefreshBookmarks,
}) => {
  const [connections, setConnections] = useState<DbConnection[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(
    null
  );
  const [exporting, setExporting] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);

  // New connection form
  const [newConnection, setNewConnection] = useState({
    name: "",
    connectionString: "",
  });

  useEffect(() => {
    if (isOpen) {
      loadConnections();
    }
  }, [isOpen]);

  const loadConnections = async () => {
    try {
      const conns = await getDbConnections();
      setConnections(conns);
    } catch (error) {
      console.error("Failed to load connections:", error);
    }
  };

  const handleAddConnection = async () => {
    if (!newConnection.name.trim() || !newConnection.connectionString.trim()) {
      alert("Vui lòng điền đầy đủ tên và connection string.");
      return;
    }

    try {
      let parsedConnection;
      try {
        parsedConnection = parseDbConnectionString(
          newConnection.connectionString
        );
      } catch (error) {
        alert(`Connection string không hợp lệ: ${error}`);
        return;
      }

      const connection: DbConnection = {
        id: `conn_${Date.now()}`,
        name: newConnection.name.trim(),
        ...parsedConnection,
        isActive: false,
        createdAt: Date.now(),
      };

      await saveDbConnection(connection);
      await loadConnections();
      setNewConnection({ name: "", connectionString: "" });
      setShowNewForm(false);
    } catch (error: any) {
      alert(`Lỗi khi thêm kết nối: ${error.message}`);
    }
  };

  const handleTestConnection = async (connection: DbConnection) => {
    setTestingConnection(connection.id);
    try {
      const result = await testDbConnection(connection);
      alert(result.message + (result.latency ? ` (${result.latency}ms)` : ""));
    } catch (error: any) {
      alert(`Lỗi khi test kết nối: ${error.message}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa kết nối này?")) {
      try {
        await deleteDbConnection(connectionId);
        await loadConnections();
      } catch (error: any) {
        alert(`Lỗi khi xóa kết nối: ${error.message}`);
      }
    }
  };

  const handleExport = async (connection: DbConnection) => {
    setExporting(connection.id);
    try {
      const result = await exportToCloud(connection);
      alert(result.message);
      if (result.success) {
        connection.isActive = true;
        await saveDbConnection(connection);
        await loadConnections();
      }
    } catch (error: any) {
      alert(`Lỗi khi export: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleImport = async (
    connection: DbConnection,
    mode: "merge" | "replace"
  ) => {
    if (
      !window.confirm(
        `Bạn có muốn ${
          mode === "merge" ? "gộp" : "thay thế"
        } bookmark với dữ liệu từ cloud?`
      )
    ) {
      return;
    }

    setImporting(connection.id);
    try {
      const result = await importFromCloud(connection, mode);
      alert(result.message);
      if (result.success) {
        onRefreshBookmarks?.();
        onClose();
      }
    } catch (error: any) {
      alert(`Lỗi khi import: ${error.message}`);
    } finally {
      setImporting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#282C34] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Quản lý Database Cloud
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Connections List */}
          <div className="space-y-4">
            {connections.map((connection) => (
              <div key={connection.id} className="bg-[#21252C] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      {connection.name}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {connection.connectionString}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {connection.isActive && (
                      <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleTestConnection(connection)}
                    disabled={testingConnection === connection.id}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testingConnection === connection.id
                      ? "Testing..."
                      : "Test"}
                  </button>

                  <button
                    onClick={() => handleExport(connection)}
                    disabled={exporting === connection.id}
                    className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {exporting === connection.id
                      ? "Exporting..."
                      : "Export to Cloud"}
                  </button>

                  <button
                    onClick={() => handleImport(connection, "merge")}
                    disabled={importing === connection.id}
                    className="px-3 py-1 bg-sky-600 text-white text-sm rounded hover:bg-sky-700 disabled:opacity-50"
                  >
                    {importing === connection.id
                      ? "Importing..."
                      : "Import (Merge)"}
                  </button>

                  <button
                    onClick={() => handleImport(connection, "replace")}
                    disabled={importing === connection.id}
                    className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50"
                  >
                    {importing === connection.id
                      ? "Importing..."
                      : "Import (Replace)"}
                  </button>

                  <button
                    onClick={() => handleDeleteConnection(connection.id)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Connection */}
          <div className="mt-6">
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="w-full bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                + Thêm Database Connection
              </button>
            ) : (
              <div className="bg-[#21252C] rounded-lg p-4">
                <h3 className="font-semibold text-white mb-3">
                  Thêm Database Mới
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Tên connection (nickname)
                    </label>
                    <input
                      type="text"
                      value={newConnection.name}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Ví dụ: Neon Database"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      PostgreSQL Connection String
                    </label>
                    <input
                      type="password"
                      value={newConnection.connectionString}
                      onChange={(e) =>
                        setNewConnection((prev) => ({
                          ...prev,
                          connectionString: e.target.value,
                        }))
                      }
                      placeholder="postgres://username:password@host:port/database"
                      className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm font-mono"
                    />
                    <div className="space-y-1">
                      <p className="text-xs text-amber-400 bg-amber-900/20 p-2 rounded">
                        <strong>⚠️ Note:</strong> Neon HTTP API không hỗ trợ CORS trong browser. Khuyên dùng Supabase thay thế.
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Option 1 (Khuyên):</strong> <code className="bg-gray-800 px-1 rounded">supabase://[url]/[apikey]</code>
                      </p>
                      <p className="text-xs text-gray-500">
                        <strong>Option 2 (Neon):</strong> <code className="bg-gray-800 px-1 rounded">postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/dbname</code>
                      </p>
                      <div className="flex gap-2 mt-2">
                        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">
                          → Tạo Supabase project
                        </a>
                        <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 underline">
                          → Neon (cần server proxy)
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAddConnection}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700"
                    >
                      Thêm Connection
                    </button>
                    <button
                      onClick={() => {
                        setShowNewForm(false);
                        setNewConnection({ name: "", connectionString: "" });
                      }}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Usage Instructions */}
          <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h4 className="font-semibold text-blue-300 mb-2">
              Hướng dẫn sử dụng
            </h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>
                • <strong>Neon.tech:</strong> Đăng ký tài khoản, tạo database,
                copy connection string
              </li>
              <li>
                • <strong>Test:</strong> Kiểm tra kết nối trước khi
                export/import
              </li>
              <li>
                • <strong>Export:</strong> Đưa toàn bộ bookmark local lên cloud
              </li>
              <li>
                • <strong>Import:</strong> Lấy bookmark từ cloud về local
              </li>
              <li>
                • <strong>Merge:</strong> Gộp với bookmark hiện có, ghi đè trùng
                URL
              </li>
              <li>
                • <strong>Replace:</strong> Thay thế toàn bộ bookmark local
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DbConnectionModal;
