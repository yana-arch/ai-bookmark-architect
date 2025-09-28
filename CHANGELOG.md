# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
