# 🚀 RAG-Based AI Tutor with Visual Context

A Retrieval-Augmented Generation (RAG) application powered by **Google Gemini AI**, designed to help students understand PDF-based content through contextual question answering and relevant visual aids.

This project allows users to upload chapter PDFs, ask questions about the content, and get intelligent, context-aware answers along with best-fitting images from a preloaded library. It's ideal for building AI-powered interactive learning tools.

---

##  Features

- **PDF Upload & Parsing**: Upload a PDF and extract its text content.
- **Chunking & Embedding**: Text is chunked and embedded using a local MiniLM model.
- **Retrieval-Augmented Generation**: Relevant text chunks are retrieved to ground responses when answering.
- **Fallback Logic with Intelligence**:
  - If the answer cannot be derived from the retrieved chunks and the question still matches the topic’s semantics based on cosine similarity, a fallback prompt is sent to **Gemini**.
  - This fallback answer is generated *without RAG context* but only allowed if the question is sufficiently related to the topic.
  - The response is clearly labeled as non-grounded to maintain transparency.
- **Image Matching**: Relevant images are surfaced based on text-image semantic similarity.
- **Frontend Chat System**: React app provides an interactive tutor interface.
- **Persistent Topic Store**: Topics are cached and stored on disk for reuse.

---

##  Why a Local Embedder?

We use a **locally hosted MiniLM model** from `@xenova/transformers` for generating embeddings:

- **Fast and Lightweight**: MiniLM is optimized for local inference without needing GPU, making it ideal for scalable use cases.
- **No Dependency on External APIs**: Avoids latency and rate-limits from cloud embedding APIs.
- **Edge or On-Prem Ready**: Can be deployed offline or in environments where cloud access is restricted.
- **Custom Control**: Easy to swap or fine-tune embeddings based on task needs.

This approach gives us complete control while keeping the pipeline efficient and cost-effective.

---

##  Tech Stack

- **Backend**: Node.js, Express.js, Multer, pdf-parse, @google/generative-ai
- **Text Embeddings**: @xenova/transformers (MiniLM)
- **Frontend**: React + Vite, Axios
- **Image Embeddings + Search**: Cosine similarity matching
- **Persistence**: Local JSON file storage

---

##  Getting Started

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
Create a .env file inside the backend folder:

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
 http://localhost:5173

 Usage
Upload a PDF chapter using the left panel.

Once uploaded, view the content in the embedded PDF viewer.

Ask questions in the chat box based on the chapter content.

Get answers grounded in the chapter, accompanied by images when relevant.

 Folder Structure
bash
Copy code
/backend
  ├─ index.js             # Express server
  ├─ rag.js               # RAG logic
  ├─ embeddings.js        # Local MiniLM embedding logic
  ├─ imageStore.js        # Image matching logic
  ├─ data/
      ├─ topics/          # Persisted topic JSONs
      └─ images.json      # Image metadata with embeddings

/frontend
  ├─ src/App.jsx          # Main React component
  └─ ...                  # Vite-based React setup
```
Customizing Image Library
Images are stored under: /backend/public/images

Metadata is stored in: /backend/data/images.json

Edit images.json to add new images or update descriptions and topics.

 How RAG Works
PDF text is chunked into ~800 character blocks.

Each chunk is embedded via a local MiniLM model.

For every question:

Question is embedded.

Top-k semantically relevant chunks are identified using cosine similarity.

These chunks are used as context for Gemini to answer.

Fallback Mode:

If the answer is insufficient and question meaning is strongly connected to topic (>0.3 similarity), Gemini generates a general answer.

The answer is flagged with:
*Note: This answer was generated outside the chapter context and may be open-ended.*

