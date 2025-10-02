# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
