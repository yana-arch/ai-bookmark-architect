# AI Bookmark Architect - Domain Context

## Domain Glossary

- **AI Orchestrator**: The central authority for executing AI tasks. It manages the lifecycle of **Jobs**, batching logic, model rotation, and error recovery. It encapsulates the Web Worker and provides a deep, async interface to the rest of the application.
- **Job**: A discrete unit of work (e.g., categorizing a list of bookmarks) submitted to the AI Orchestrator.
- **Repair Loop**: An internal process within the AI Orchestrator that attempts to fix malformed or invalid AI responses (e.g., broken JSON) before returning the result to the caller.
- **LibraryRepository**: A deep module responsible for the persistence and integrity of bookmarks, folders, and classification rules.
- **SettingsRepository**: A deep module managing AI profiles, API configurations, and user preferences.
- **Bookmark**: A record consisting of a URL and metadata (title, tags) to be organized.
- **Folder Tree**: The hierarchical representation of categorized bookmarks.
- **AI Profile**: Configuration governing LLM behavior (temperature, system instructions, etc.).
- **API Config**: Connection details for a specific AI provider (Gemini, OpenAI, etc.).

## Architectural Decisions

- **Deep AI Interface**: The AI Orchestrator is the only module that knows *how* AI processing is performed. All batching, retry, and repair logic is local to this module.
- **Worker Management**: The AI Orchestrator owns the Web Worker lifecycle. Main-thread components interact only with the Orchestrator via Promises.
- **Repository Pattern**: Database access is organized into domain-specific repositories to maintain data invariants and provide leverage to callers.
