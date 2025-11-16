# RAG-Based AI Tutor With Images (Gemini)

This project is a small **RAG (Retrieval-Augmented Generation) AI Tutor** that answers questions from a textbook chapter PDF and automatically shows a relevant diagram image for each answer.

- Backend: **Node.js + Express**
- LLM + Embeddings: **Google Gemini**
  - `gemini-pro` for chat
  - `text-embedding-004` for embeddings
- Frontend: **React (Vite)**
- Storage: **Local JSON** with embeddings stored for each text chunk

---

## 1. Features

- Upload a PDF chapter (e.g., *Sound* chapter from physics).
- The backend:
  - Extracts text using `pdf-parse`
  - Chunks text
  - Generates embeddings using Gemini
  - Saves everything to a **topic JSON file** (including embeddings)
- Ask questions about the chapter:
  - Retrieve top-K most relevant chunks via cosine similarity
  - Build a grounded prompt and call **Gemini Pro**
  - Return answer + best-matching diagram image
- Image retrieval:
  - Image metadata with keywords and description
  - Embeddings for each image are precomputed at startup
  - For every answer, the system finds the **most relevant image** by embedding similarity

---

## 2. Project Structure

```text
rag-gemini-tutor/
  backend/
    server.js
    rag.js
    embeddings.js
    imageStore.js
    package.json
    .env.example
    data/
      images.json
      topics/
        # topic JSON files saved here (with embeddings)
    public/
      images/
        bell.png
        wave.png
        ear.png
    uploads/
  frontend/
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
```

---

## 3. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set GEMINI_API_KEY
npm start
```

Backend runs on `http://localhost:4000`.

### 3.1. RAG Pipeline (Backend)

1. **Upload PDF** → `POST /upload`
   - Multer saves the file.
   - `pdf-parse` extracts raw text.
   - Text is **chunked** into ~800-character pieces.
   - For each chunk:
     - `text-embedding-004` generates an embedding.
   - All chunks are stored in `data/topics/<topicId>.json`:

   ```jsonc
   {
     "id": "topic_1731755643000",
     "title": "Uploaded Chapter",
     "chunks": [
       {
         "id": 0,
         "text": "First chunk text ...",
         "embedding": [0.01, -0.03, ...]
       },
       {
         "id": 1,
         "text": "Second chunk text ...",
         "embedding": [0.02, 0.12, ...]
       }
     ],
     "createdAt": "2025-11-16T..."
   }
   ```

2. **Ask a Question** → `POST /chat`
   - Body: `{ "topicId": "topic_...", "question": "How does a bell produce sound?" }`
   - The server:
     - Finds the topic in memory (`topics[topicId]`).
     - Embeds the question using `text-embedding-004`.
     - Computes cosine similarity between question embedding and each chunk embedding.
     - Selects **top K** chunks (e.g., 4).
   - Builds a prompt:

     ```text
     You are an AI Tutor for a specific textbook chapter.
     You must answer ONLY using the provided context chunks.
     If the answer is not clearly supported by the context, say:
     "I am not sure based on this chapter."

     Context:
     Chunk 1:
     ...

     Chunk 2:
     ...

     Question: <user question>
     Answer in a clear, student-friendly way.
     ```

   - Sends this to **Gemini Pro (`gemini-pro`)**.
   - Returns the generated answer + selected image.

### 3.2. Image Retrieval Logic

- `data/images.json` contains metadata like:

  ```json
  [
    {
      "id": "img_001",
      "filename": "bell.png",
      "title": "Bell Vibration",
      "keywords": ["bell", "vibration", "sound", "oscillation"],
      "description": "Diagram showing how a bell vibrates to produce sound waves",
      "topicId": "sound"
    }
  ]
  ```

- On backend startup:
  - `imageStore.initImageStore()`:
    - Reads `images.json`.
    - For each image:
      - Concatenates `title + description + keywords`.
      - Generates an embedding via `text-embedding-004`.
      - Stores it in memory.

- For each `/chat` answer:

  ```js
  const queryText = question + "\n\n" + answer;
  const bestImage = await findBestImageForText(queryText, "sound");
  ```

- `findBestImageForText`:
  - Embeds `queryText`.
  - Computes cosine similarity with each image embedding.
  - Picks the image with the **highest similarity**.
  - Returns:

  ```json
  {
    "id": "img_001",
    "title": "Bell Vibration",
    "url": "/static/images/bell.png",
    "description": "Diagram showing how a bell vibrates..."
  }
  ```

- Frontend displays this image under the AI answer.

### 3.3. API Endpoints

- `POST /upload`
  - Form-data:
    - `pdf` (file)
    - `title` (optional)
    - `topicId` (optional; else auto-generated)
  - Returns: `{ topicId, title, chunksCount }`

- `POST /chat`
  - JSON:
    - `topicId`
    - `question`
  - Returns:

    ```json
    {
      "answer": "Explanation...",
      "image": {
        "id": "img_001",
        "title": "Bell Vibration",
        "url": "/static/images/bell.png",
        "description": "Diagram showing how a bell vibrates..."
      },
      "meta": {
        "topicId": "topic_...",
        "usedChunksCount": 4
      }
    }
    ```

- `GET /images/:topicId`
  - Returns all images with `topicId` in `images.json`.

---

## 4. Frontend (React) Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on `http://localhost:5173`.

### 4.1. UI Overview

- Top bar:
  - PDF upload (calls `POST /upload`).
  - Shows current `topicId`.
- Chat area:
  - User & AI messages in simple bubbles.
  - AI messages can include an inline image (diagram).
- Input bar:
  - Text field + button to send question.

No fancy styling; just basic layout with inline styles.

---

## 5. Prompts Used

**System-style context prompt:**

```text
You are an AI Tutor for a specific textbook chapter.
You must answer ONLY using the provided context chunks.
If the answer is not clearly supported by the context, say:
"I am not sure based on this chapter."

Context:
[Top K chunks here]
```

**User turn to Gemini:**

```text
Question: <user question>
Answer in a clear, student-friendly way.
```

---

## 6. How to Demo (2–4 min)

1. Start backend and frontend.
2. In the UI, upload a chapter PDF (e.g., "Sound Chapter.pdf").
3. Show that you get a `topicId`.
4. Ask a conceptual question:
   - "How does a bell produce sound?"
   - The answer should mention vibrations, sound waves, etc., and show `bell.png`.
5. Ask another question:
   - "Explain longitudinal sound waves."
   - The answer should show the `wave.png` diagram.
6. Briefly open `data/topics/<topicId>.json`:
   - Point out chunks and embeddings stored in JSON.
7. Briefly open `data/images.json`:
   - Show how images have `keywords` and are matched using embeddings.

---

## 7. Notes

- Replace the placeholder PNGs in `backend/public/images` with real diagrams.
- You can add more images and topics by editing `images.json` and mapping topic IDs.
- If you want multiple subjects, you can:
  - Use `topicId` as `"sound"`, `"light"`, etc.
  - Add separate chapter PDFs per topic.

Enjoy experimenting with RAG + Gemini + diagram retrieval!
