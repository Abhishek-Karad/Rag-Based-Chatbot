# 📘 RAG-Based AI Tutor with Visual Context

A Retrieval-Augmented Generation (RAG) application powered by **Google Gemini AI**, designed to help students understand PDF-based content through contextual question answering and relevant visual aids.

This project allows users to upload chapter PDFs, ask questions about the content, and get intelligent, context-aware answers along with best-fitting images from a preloaded library. It's ideal for building AI-powered interactive learning tools.

---

## 🚀 Features

- **PDF Upload & Parsing**: Upload a PDF and extract its text content.
- **Chunking & Embedding**: Text is chunked and embedded using a local MiniLM model.
- **Retrieval-Augmented Generation**: Relevant text chunks are retrieved to ground responses.
- **Fallback Logic**: If RAG fails but question matches chapter semantics, AI fallback is used.
- **Image Matching**: Relevant images are surfaced based on text-image semantic similarity.
- **Frontend Chat System**: React app provides an interactive tutor interface.
- **Persistent Topic Store**: Topics are cached and stored on disk for reuse.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Multer, pdf-parse, @google/generative-ai
- **Text Embeddings**: @xenova/transformers (MiniLM)
- **Frontend**: React + Vite, Axios
- **Image Embeddings + Search**: Cosine similarity matching
- **Persistence**: Local JSON file storage

---

## 📦 Getting Started

### 1. Clone the Repository

```bash
git clone <repo-url>
cd <project-folder>
2. Install Dependencies
Backend
bash
Copy code
cd backend
npm install
Frontend
bash
Copy code
cd frontend
npm install
3. Environment Variables
Create a .env file inside the backend folder with:

ini
Copy code
GEMINI_API_KEY=your_google_generative_ai_key_here
PORT=4000
4. Run the Backend Server
bash
Copy code
cd backend
node index.js
or use nodemon if installed.

5. Run the Frontend App
bash
Copy code
cd frontend
npm run dev
The app will be available at:
👉 http://localhost:5173 (default Vite port)

✨ Usage
Upload a PDF chapter using the left panel.

Once uploaded, view the content in the embedded PDF viewer.

Ask questions in the chat box based on the chapter content.

Get answers grounded in the chapter, accompanied by images when relevant.

📁 Folder Structure
bash
Copy code
/backend
  ├─ index.js             # Express server
  ├─ rag.js               # RAG logic
  ├─ embeddings.js        # Embedding logic
  ├─ imageStore.js        # Image matching logic
  ├─ data/
      ├─ topics/          # Persisted topic JSONs
      └─ images.json      # Image metadata with embeddings

/frontend
  ├─ src/App.jsx          # Main React component
  └─ ...                  # Vite-based React setup
🔧 Customizing Image Library
Images are stored under /backend/public/images and their metadata is defined in /backend/data/images.json. You can update this JSON to map images to specific topics and provide better descriptions or keywords.

🧠 How RAG Works
PDF text is chunked into ~800 character blocks.

Chunks are embedded using MiniLM (locally).

Upon receiving a question:

The query is embedded.

Top-k chunks are retrieved based on cosine similarity.

Gemini answers using those chunks as context.

If confidence is low but the question is semantically close, fallback LLM answer is used.

