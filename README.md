# AI Bookmark Architect

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/yana-arch/ai-bookmark-architect/releases)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A sophisticated React-based application that leverages artificial intelligence to revolutionize bookmark organization. Using Google's Gemini AI, this tool intelligently restructures and categorizes your bookmarks, making information management effortless and intuitive.

## ✨ Features

- 🤖 **AI-Powered Restructuring**: Automatically categorize and organize bookmarks using advanced AI algorithms
- 💾 **Local Storage**: Secure, offline-first storage using IndexedDB
- 🎨 **Modern UI**: Clean, responsive interface built with React and TypeScript
- ⚡ **Fast Performance**: Optimized with Vite for lightning-fast development and builds
- 🔒 **Privacy-Focused**: All processing happens locally with your API key

## 💻 Reviews

   <img width="1920" height="939" alt="image" src="./image-start.png" />

   <hr/>

   <img width="1920" height="939" alt="image" src="./image-processing.png" />

   <hr/>

   <img width="1920" height="939" alt="image" src="./image-end.png" />

## 📋 Table of Contents

- [AI Bookmark Architect](#ai-bookmark-architect)
  - [✨ Features](#-features)
  - [💻 Reviews](#-reviews)
  - [📋 Table of Contents](#-table-of-contents)
  - [📋 Prerequisites](#-prerequisites)
  - [🚀 Installation](#-installation)
  - [⚙️ Configuration](#️-configuration)
  - [🎯 Usage](#-usage)
    - [Development Server](#development-server)
    - [Production Build](#production-build)
  - [🛠️ Development](#️-development)
    - [Project Structure](#project-structure)
    - [Available Scripts](#available-scripts)
  - [🤝 Contributing](#-contributing)
  - [📄 License](#-license)
  - [🏗️ Technologies Used](#️-technologies-used)

## 📋 Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **Gemini API Key**: Obtain from [Google AI Studio](https://makersuite.google.com/app/apikey)

## 🚀 Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yana-arch/ai-bookmark-architect.git
   cd ai-bookmark-architect
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment** (see [Configuration](#configuration) section)

## ⚙️ Configuration

Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Security Note**: Never commit your API key to version control. The `.env.local` file is already included in `.gitignore`.

## 🎯 Usage

### Development Server

Start the development server with hot reload:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

## 🛠️ Development

### Project Structure

```
ai-bookmark-architect/
├── components/          # React components
├── src/                 # Core application logic
│   ├── aiWorker.ts     # AI processing worker
│   ├── cache.ts        # Caching utilities
│   ├── performance.ts  # Performance monitoring
│   └── utils.ts        # Utility functions
├── types.ts            # TypeScript type definitions
├── db.ts               # Database operations
└── App.tsx             # Main application component
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏗️ Technologies Used

- **Frontend Framework**: React 19.1.1
- **Language**: TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **AI Integration**: Google Gemini AI API
- **Database**: IndexedDB (via idb library)
- **Styling**: CSS Modules

---

<div align="center">
  <p>Built with ❤️ using React and AI</p>
  <p>
    <a href="#ai-bookmark-architect">Back to top</a>
  </p>
</div>
