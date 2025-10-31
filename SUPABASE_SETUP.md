# Supabase Table Setup for AI Bookmark Architect

## 📋 SQL Script to Create Tables

Copy and paste this SQL script into your **Supabase SQL Editor** to create the required tables:

```sqlasdfqwer1234
```

## 🚀 How to Run

1. **Open Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy the entire SQL script above**
4. **Paste and Run**

## 📊 Table Structure

### `backups` Table
- **`id`**: UUID (Primary Key)
- **`user_id`**: TEXT (Always 'anonymous' for key-based access)
- **`name`**: TEXT (Unique key for accessing backup)
- **`description`**: TEXT (Optional description)
- **`data`**: JSONB (Bookmarks and folders data)
- **`size_bytes`**: BIGINT (Size in bytes)
- **`bookmark_count`**: INTEGER (Number of bookmarks)
- **`folder_count`**: INTEGER (Number of folders)
- **`type`**: TEXT ('manual' or 'auto')
- **`status`**: TEXT ('pending', 'completed', 'failed')
- **`created_at`**: TIMESTAMP
- **`updated_at`**: TIMESTAMP

### Key Points
- **Key-based Access**: The `name` field stores the unique key
- **Anonymous Access**: No user authentication required
- **JSONB Storage**: Efficient storage of complex data structures
- **RLS Enabled**: Row Level Security for data protection
- **Indexes**: Optimized for fast key lookups and ordering

## ✅ After Setup

Once you run the SQL script:
- ✅ **Tables will be visible** in Supabase Dashboard
- ✅ **Application can upload/download** backups
- ✅ **Data persists** across sessions and devices
- ✅ **Key validation** works properly

## 🧪 Testing

You can test the setup by:
1. Running the application
2. Clicking the ☁️ upload button
3. Entering a key like "test-backup-123"
4. Checking Supabase Dashboard to see the new record

---

**Note**: This setup uses key-based access instead of user authentication, making it simple and secure for personal use.
