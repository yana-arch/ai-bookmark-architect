# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-10-31

### Added

- **Phase 2: Enhanced Features - Analytics Dashboard**: Comprehensive data visualization and insights
  - Interactive charts showing domain distribution, folder usage, and growth trends
  - AI performance metrics including success rates, token usage, and accuracy scoring
  - Real-time analytics calculation from bookmarks, logs, and user corrections
  - Tag usage analysis and bookmark categorization insights
  - Usage statistics tracking import/export activities

- **Advanced Data Visualization**: Chart.js integration for rich analytics
  - Bar charts for domain and folder distribution analysis
  - Line charts for bookmark growth trends over time
  - Doughnut charts for tag usage visualization
  - Responsive design with customizable chart options
  - Real-time data updates and performance metrics

- **Database Schema Enhancement**: Extended IndexedDB for Phase 2 features
  - New stores for backups, sync status, analytics data, and OAuth tokens
  - Database version upgrade to v8 with migration support
  - CRUD operations for all new data types
  - Enhanced data persistence and retrieval functions

- **TypeScript Type System Expansion**: Comprehensive type definitions
  - New interfaces for backup metadata, sync status, and analytics data
  - OAuth token management types
  - Extension message types for future browser integration
  - Enhanced type safety across all new features

### Technical Improvements

- **Chart.js Integration**: Modern charting library for data visualization
  - React-Chartjs-2 wrapper for seamless React integration
  - Customizable chart themes and responsive design
  - Performance-optimized rendering and updates

- **Database Architecture**: Scalable IndexedDB implementation
  - Version-controlled schema migrations
  - Efficient batch operations and data retrieval
  - Enhanced error handling and data validation

- **Component Architecture**: Modular analytics system
  - Lazy-loaded AnalyticsDashboard component
  - Real-time data calculation and caching
  - Responsive modal interface with smooth animations

### Features

- **📊 Analytics Dashboard**: Comprehensive bookmark insights and visualization
- **📈 Interactive Charts**: Domain analysis, folder distribution, and growth trends
- **🤖 AI Performance Tracking**: Success rates, token usage, and accuracy metrics
- **🏷️ Tag Analytics**: Usage patterns and categorization insights
- **💾 Enhanced Data Storage**: Extended database schema for future features

## [1.3.0] - 2025-10-31

### Added

- **Import Preview System**: Comprehensive import workflow with detailed preview
  - ImportPreview component with statistics and domain analysis
  - Real-time duplicate detection during import process
  - Domain-based statistics and bookmark validation
  - Enhanced ImportModal with preview functionality

- **Advanced Duplicate Management**: Intelligent duplicate detection and cleanup
  - Real-time duplicate detection across all bookmarks
  - Duplicate statistics by hostname/domain
  - Automated duplicate cleanup with user confirmation
  - DuplicateModal with detailed statistics and cleanup options

- **Selective Export Functionality**: Advanced export capabilities with filtering
  - ExportModal with comprehensive filtering options
  - Filter by folders, tags, and date ranges (framework ready)
  - Multiple export formats: HTML, CSV, JSON, Markdown
  - Domain-based filtering and export statistics

- **Enhanced Toast Notification System**: Improved user feedback
  - Stacked notification system with progress bars
  - Different notification types (info, success, warning, error)
  - Configurable duration and auto-dismiss
  - Action buttons for interactive notifications

- **Advanced Log Management**: Comprehensive logging and analysis tools
  - Enhanced LogModal with search and filtering capabilities
  - Log statistics dashboard (total, by type, token usage)
  - Export logs to JSON format
  - Auto-scroll for real-time log monitoring
  - Type-based filtering (Info, Request, Response, Error)

- **Import Button Functionality**: Fixed import workflow across all app states
  - Hidden file input system for consistent import experience
  - Works in all application states (EMPTY, LOADED, STRUCTURED)
  - Support for both HTML and CSV bookmark files
  - Integrated with existing import preview system

### Fixed

- **TypeScript Compilation Errors**: Complete type safety resolution
  - Fixed all TypeScript errors across 3 files (DuplicateModal, ImportPreview, db.ts)
  - Resolved arithmetic operation type issues in sorting functions
  - Added missing type imports for DetailedLog and UserCorrection
  - Enhanced type annotations for better code reliability

- **Import Button Responsiveness**: Resolved non-functional import button
  - Implemented proper file selection mechanism
  - Fixed handleImportClick function to trigger file dialog
  - Ensured import functionality works regardless of app state

### Changed

- **Import Workflow Enhancement**: Streamlined import process
  - Preview system integrated into import modal
  - Statistics display with duplicate and validity counts
  - Improved user experience with step-by-step import process

- **Notification System Upgrade**: Better user feedback mechanisms
  - Stacked notifications with visual progress indicators
  - Enhanced notification types and durations
  - Improved accessibility and user interaction

### Technical Improvements

- **Component Architecture**: Enhanced modularity and reusability
  - ImportPreview component with comprehensive statistics
  - Enhanced LogModal with advanced filtering and search
  - Improved NotificationToast with stacking and actions

- **Type Safety**: Complete TypeScript compliance
  - Resolved all compilation errors
  - Enhanced type definitions and imports
  - Improved code reliability and maintainability

- **User Experience**: Better interaction patterns
  - Consistent import functionality across app states
  - Enhanced feedback systems with notifications
  - Improved modal interfaces with better information display

### Features

- **Smart Import System**: Preview and validate before importing
- **Duplicate Intelligence**: Automatic detection and cleanup
- **Advanced Export Options**: Filter and format exports
- **Real-time Notifications**: Enhanced user feedback
- **Log Analysis Tools**: Search, filter, and export logs
- **Type-Safe Development**: Zero TypeScript errors

## [1.2.0] - 2025-10-02

### Added

- **Folder Template System**: Comprehensive template-based organization framework
  - Pre-defined templates for Web Development, AI/ML, and General use cases
  - Strict template mode with AI enforcement using specialized system prompts
  - Template-based categorization that restricts AI to only use predefined folder structures

- **AI Template Generation**: Natural language template creation
  - Generate custom folder hierarchies using descriptive text input
  - AI interprets user requirements and creates structured templates
  - Template creation through conversational interface with Gemini AI

- **Template Management Interface**: Full CRUD operations for templates
  - Create, read, update, and delete folder templates
  - Template library with searchable collection
  - Default templates automatically included with installation

- **Template Import/Export**: Data portability for templates
  - Export individual or multiple templates to JSON format
  - Import templates from JSON files with validation
  - Template sharing and backup capabilities

- **Enhanced UI Integration**: Improved restructure workflow
  - Template selection integrated into main restructure panel
  - Apply templates directly from dropdown with confirmation
  - Template status indicators and management shortcuts

- **Conditional System Prompts**: Context-aware AI instructions
  - Default prompts for general bookmark organization
  - Template-specific prompts when templates are active
  - Automatic prompt switching based on template selection

### Changed

- **Restructure Panel Redesign**: Streamlined user experience
  - Moved template selection from header to options panel
  - Unified AI configuration interface
  - Improved visual hierarchy with collapsible sections

- **System Prompt Logic**: Smarter AI context handling
  - Dynamic prompt generation based on user selections
  - Conditional template enforcement instructions
  - Context-aware prompt concatenation strategies

### Technical Improvements

- **Template State Management**: Robust template handling
  - Template persistence with IndexedDB integration
  - State synchronization across components
  - Template validation and error handling

- **UI Component Architecture**: Enhanced modularity
  - Enhanced FolderTemplateModal with multi-purpose functionality
  - Improved RestructurePanel with integrated options
  - Template-aware component interactions

### Features

- **Template-Enforced AI Categorization**: Strict adherence to defined structures
- **Natural Language Template Creation**: Conversational template generation
- **Template Ecosystem**: Shareable, importable template collections
- **Contextual AI Behavior**: Mode-specific AI processing logic

## [1.1.0] - 2025-09-28

### Added

- **DevOps Infrastructure**: Complete containerization setup with Docker
  - Multi-stage Dockerfile for optimized production builds
  - Development Dockerfile with hot reload support
  - Docker Compose configuration for local development and production
- **CI/CD Pipeline**: GitHub Actions workflow for automated testing and deployment
  - Automated testing on push/PR to main and develop branches
  - Docker image building and publishing to Docker Hub
  - Deployment automation framework
- **Production Deployment**: Nginx configuration optimized for SPA
  - Gzip compression and caching headers
  - Security headers (CSP, X-Frame-Options, etc.)
  - Health check endpoint
- **Deployment Automation**: Bash deployment script with rollback capabilities
  - Automated health checks
  - Colored output and error handling
  - Support for deploy/rollback/status commands
- **Environment Management**: Comprehensive environment variable setup
  - .env.example template
  - Proper .gitignore configuration for sensitive files

### Changed

- **Build Optimization**: Enhanced Vite configuration
  - Code splitting for better performance
  - Optimized chunk sizes and vendor separation
  - Modern ESNext target for better browser support

### Technical Improvements

- **Container Security**: Non-root user execution in production containers
- **Performance**: Nginx caching configuration for static assets
- **Monitoring**: Health check endpoints for deployment verification
- **Development Experience**: Docker-based development environment

## [1.0.0] - 2025-09-01

### Init

- **Core Application**: AI-powered bookmark management system
- **AI Integration**: Google Gemini API integration for intelligent bookmark processing
- **Database**: IndexedDB for client-side data storage
- **User Interface**: Modern React/TypeScript interface with responsive design
- **Bookmark Management**: Import, organize, and restructure bookmarks with AI assistance
- **Performance Monitoring**: Built-in performance tracking and caching system
- **Export Functionality**: CSV export capabilities for bookmark data

### Features

- **AI-Powered Restructuring**: Intelligent bookmark categorization and organization
- **Real-time Processing**: Web Worker implementation for non-blocking AI operations
- **Responsive Design**: Mobile-friendly interface
- **Data Persistence**: Local storage with IndexedDB
- **Batch Processing**: Handle large bookmark imports efficiently

### Technical Stack

- **Frontend**: React 19.1.1 with TypeScript
- **Build Tool**: Vite 6.2.0
- **AI**: Google Generative AI (@google/genai)
- **Database**: IndexedDB (idb library)
- **Styling**: CSS with modern responsive design

---

## Types of changes

- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` in case of vulnerabilities

## Version Format

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.0.0)
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible
