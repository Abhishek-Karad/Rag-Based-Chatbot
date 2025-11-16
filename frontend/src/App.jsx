import { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

function App() {
  const [topicId, setTopicId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("title", file.name);

    try {
      setUploading(true);
      const res = await axios.post(`${API_BASE}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTopicId(res.data.topicId);
      setPdfUrl(URL.createObjectURL(file));
      alert(`Upload successful. topicId = ${res.data.topicId}`);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk() {
    const q = question.trim();
    if (!q || !topicId) return;

    setMessages((prev) => [...prev, { from: "user", text: q }]);
    setQuestion("");
    setLoadingAnswer(true);

    try {
      const res = await axios.post(`${API_BASE}/chat`, { topicId, question: q });
      const { answer, image } = res.data;
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: answer,
          image,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Sorry, something went wrong.",
        },
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        maxWidth: "1000px",
        margin: "auto",
        padding: 20,
        fontFamily: "Arial, sans-serif",
        gap: "20px",
      }}
    >
      {/* Left: PDF Viewer */}
      <div
        style={{
          flex: 1,
          borderRadius: 12,
          backgroundColor: "#fafafa",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: 10,
        }}
      >
        <h2 style={{ margin: 0, fontWeight: "600", fontSize: 24 }}>
          RAG-Based AI Tutor With Images
        </h2>
        <p style={{ marginTop: 4, fontSize: 14, color: "#555" }}>
          Upload a chapter PDF and ask questions
        </p>

        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 14 }}>
            <strong>Upload PDF: </strong>
            <input type="file" accept="application/pdf" onChange={handleUpload} />
          </label>
          {uploading && <span style={{ marginLeft: 10, color: "#007bff" }}>Uploading...</span>}
        </div>

        <div style={{ marginTop: 8, fontSize: 14 }}>
          Topic ID: <strong>{topicId || "N/A"}</strong>
        </div>

        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="PDF Preview"
            width="100%"
            height="500px"
            style={{ borderRadius: 8, marginTop: 12 }}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "#aaa",
              marginTop: 50,
            }}
          >
            No PDF uploaded yet
          </div>
        )}
      </div>

      {/* Right: Chat System */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: 12,
          padding: 16,
          backgroundColor: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          height: "600px",
        }}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>AI Tutor Chat</h3>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 10,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: "#888", paddingTop: 50 }}>
              Ask a question to begin!
            </div>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: m.from === "user" ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: m.from === "user" ? "#e3f2fd" : "#f5f5f5",
                    maxWidth: "75%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      marginBottom: 4,
                      opacity: 0.6,
                    }}
                  >
                    {m.from === "user" ? "You" : "AI Tutor"}
                  </div>
                  <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  {m.image && (
                    <img
                      src={`${API_BASE}${m.image.url}`}
                      alt={m.image.description}
                      style={{
                        maxWidth: "100%",
                        marginTop: 8,
                        borderRadius: 4,
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder={topicId ? "Ask about this chapter..." : "Upload a PDF first..."}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
            disabled={!topicId || loadingAnswer}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
          />
          <button
            onClick={handleAsk}
            disabled={!topicId || loadingAnswer}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "none",
              backgroundColor: loadingAnswer ? "#ccc" : "#00acc1",
              color: "#fff",
              fontSize: 14,
              fontWeight: "600",
              cursor: loadingAnswer ? "not-allowed" : "pointer",
            }}
          >
            {loadingAnswer ? "Thinking..." : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
