# CloudDriveRAG

**A self-hosted RAG (Retrieval-Augmented Generation) application that transforms your Google Drive documents into an intelligent knowledge base.**

CloudDriveRAG enables you to:
- 🔐 Securely connect to your Google Drive
- 📄 Process and ingest PDF, Excel, and Word documents
- 🧠 Create semantic search using vector embeddings
- 💬 Chat with your documents using AI language models
- 🔄 Switch between OpenAI, Google Gemini, and local Ollama
- 🏠 Run entirely on your own infrastructure

## Features

✅ **Self-Hosted** - No data leaves your control
✅ **Multi-LLM Support** - OpenAI, Gemini, or local Ollama
✅ **Persistent Login** - Stay authenticated across sessions
✅ **Configurable** - Manage settings, API keys, and Qdrant connection
✅ **Real-Time Ingestion** - Live progress updates
✅ **Source Attribution** - Know which documents powered your answers
✅ **Open Source** - Free to use, modify, and distribute

## Quick Start

### Prerequisites

- **Node.js** 18+ installed
- **Qdrant** running (local Docker or cloud)
- **Google Cloud Project** with Drive API enabled
- At least one LLM provider configured:
  - OpenAI API key
  - Google Gemini API key
  - Local Ollama instance

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CloudDriveRAG
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (update `.env`):
   ```env
   PORT=3000
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   QDRANT_URL=http://localhost:6333
   SESSION_SECRET=your-session-secret
   ```

5. **Start Qdrant** (if using Docker):
   ```bash
   docker run -p 6333:6333 qdrant/qdrant
   ```

6. **Run the application**
   ```bash
   npm start
   ```

7. **Open in browser**
   ```
   http://localhost:3000  
   ```

## Configuration

### First-Time Setup

When you first login:

1. **Settings Page** appears automatically
2. **Add API Keys**:
   - OpenAI API Key (optional)
   - Gemini API Key (optional)
3. **Configure Qdrant**:
   - URL: `http://localhost:6333` (local) or your Qdrant Cloud URL
   - Collection Name: `clouddrive_rag` (or custom)
   - Token: Optional (for Qdrant Cloud authentication)
4. **Select Default LLM**: OpenAI, Gemini, or Ollama
5. **Save Settings**

### Persistent Configuration

Settings are saved locally in `data/settings.json` and persist across sessions.

## How It Works

### 1. Google Drive Connection
- OAuth 2.0 authentication (password never stored)
- Tokens saved securely for persistent login
- Access only granted to files you explicitly select

### 2. Document Ingestion
- Browse and select documents from Google Drive
- Supported formats: PDF, Excel (.xlsx/.xls), Word (.docx/.doc)
- Real-time progress tracking

### 3. Processing Pipeline
- **Parse**: Extract text from documents
- **Chunk**: Split text into overlapping chunks (1000 chars, 200 overlap)
- **Embed**: Convert chunks to vectors using selected LLM
- **Store**: Save embeddings in Qdrant with metadata

### 4. RAG Chat
- Type questions in Chat tab
- Query embedding matched against knowledge base
- Retrieve most relevant document chunks
- LLM generates contextual answer with source attribution

## LLM Providers

### OpenAI
- **Embedding Model**: text-embedding-3-small (1536 dimensions)
- **Chat Model**: gpt-4o-mini
- **Cost**: Pay per API usage
- **API Key**: Required in Settings

### Google Gemini
- **Embedding Model**: gemini-embedding-001 (3072 dimensions)
- **Chat Model**: gemini-2.5-flash
- **Cost**: Pay per API usage
- **API Key**: Required in Settings

### Ollama (Local)
- **Embedding Model**: nomic-embed-text (768 dimensions)
- **Chat Model**: Configurable (default: llama3)
- **Cost**: Free (runs locally)
- **Setup**: Requires Ollama installed locally
  ```bash
  ollama pull nomic-embed-text
  ollama pull llama3
  ollama serve
  ```

## Project Structure

```
CloudDriveRAG/
├── config/              # Configuration loader
├── routes/              # API endpoints
├── services/            # Business logic
│   ├── googleAuth.js    # OAuth2 and token management
│   ├── googleDrive.js   # Drive API integration
│   ├── parser.js        # Document parsing
│   ├── chunker.js       # Text chunking
│   ├── embedding.js     # LLM embedding abstraction
│   ├── vectorStore.js   # Qdrant operations
│   ├── rag.js           # RAG pipeline
│   └── settingsStore.js # Persistent settings
├── providers/           # LLM provider implementations
│   ├── openai.js
│   ├── gemini.js
│   └── ollama.js
├── public/              # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── js/
│   └── css/
├── data/                # Local data (settings, tokens)
├── temp/                # Temporary file downloads
└── server.js            # Express app entry point
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| **Auth** | | |
| GET | `/api/auth/google` | Redirect to Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/status` | Check login status |
| POST | `/api/auth/logout` | Logout and revoke access |
| **Drive** | | |
| GET | `/api/drive/folders` | List folders |
| GET | `/api/drive/files` | List files in folder |
| **Ingest** | | |
| POST | `/api/ingest/folder` | Ingest documents (SSE) |
| GET | `/api/ingest/status` | Knowledge base stats |
| DELETE | `/api/ingest/collection` | Reset knowledge base |
| **Chat** | | |
| POST | `/api/chat` | Query knowledge base |
| **Settings** | | |
| GET | `/api/settings` | Get all settings |
| POST | `/api/settings` | Save settings |
| GET | `/api/settings/providers` | Available providers |
| POST | `/api/settings/provider` | Set active provider |
| POST | `/api/settings/test-qdrant` | Test DB connection |

## Security Considerations

### Data Privacy
- All processing happens on your infrastructure
- Google Drive tokens stored locally (not on our servers)
- API keys never sent to external services except necessary providers
- Document embeddings stored in your Qdrant instance

### Recommendations
1. Use HTTPS in production
2. Secure your API keys and Qdrant instance
3. Restrict network access to your deployment
4. Use Qdrant with authentication enabled
5. Regularly rotate API keys
6. Monitor Qdrant for unauthorized access

## Troubleshooting

### "Collection dimension mismatch" Error
- **Cause**: Switched LLM providers (different embedding dimensions)
- **Fix**: Click "Reset Knowledge Base" in Drive tab, then re-ingest

### "API Key not configured" Error
- **Cause**: Missing API key for selected provider
- **Fix**: Go to Settings, add API key, and save

### Qdrant Connection Failed
- **Cause**: Qdrant not running or unreachable
- **Fix**:
  - For local: `docker run -p 6333:6333 qdrant/qdrant`
  - For cloud: Verify URL and token in Settings

### Documents Not Ingesting
- **Cause**: File size, format, or parser error
- **Fix**: Check server logs, ensure file is supported format

## Contributing

Contributions are welcome! Areas for improvement:
- Support for more document formats
- Advanced chunking strategies
- Caching and performance optimization
- Additional LLM providers
- Web UI enhancements

## License

CloudDriveRAG is open-source software. See LICENSE file for details.

## Support

- 📖 **Documentation**: See `/about.html` for detailed app overview
- 🔐 **Privacy**: See `/privacy-policy.html`
- ⚖️ **Terms**: See `/terms-of-service.html`
- 🐛 **Issues**: Report bugs on GitHub

## Disclaimer

CloudDriveRAG is provided as-is. Users are responsible for:
- Securing their deployment
- Monitoring API costs with third-party providers
- Compliance with applicable laws
- Protecting sensitive documents

## Acknowledgments

Built with:
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Google APIs](https://developers.google.com/)
- [Qdrant](https://qdrant.tech/)
- [OpenAI](https://openai.com/) & [Google Gemini](https://ai.google.dev/)
- [Ollama](https://ollama.ai/)

---

**Happy documenting! 🚀**

For questions or feedback, feel free to open an issue or discussion on GitHub.
