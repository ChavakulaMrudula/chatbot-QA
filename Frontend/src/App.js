import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const App = () => {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.className = theme;
    fetchFiles();
  }, [theme]);

  const fetchFiles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/debug");
      setFiles(res.data.stored_files || []);
    } catch (error) {
      console.error("Error fetching files", error);
      alert("Failed to fetch uploaded files.");
    }
  };

  const pollFiles = async (expectedFiles, attempts = 10, interval = 1000) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await axios.get("http://localhost:5000/debug");
        const currentFiles = res.data.stored_files || [];
        if (expectedFiles.every(file => currentFiles.includes(file))) {
          setFiles(currentFiles);
          return true;
        }
      } catch (error) {
        console.error("Error polling files", error);
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    alert("Some files may not have processed correctly.");
    fetchFiles();
    return false;
  };

  const handleUpload = async (event) => {
    const formData = new FormData();
    const uploadedFiles = Array.from(event.target.files);
    for (let file of uploadedFiles) {
      formData.append("file", file);
    }

    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Files uploaded. Processing...");
      const expectedFiles = res.data.files || uploadedFiles.map(f => f.name);
      await pollFiles(expectedFiles);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload files. Ensure files are PDF, TXT, or DOCX.");
    }
  };

  const toggleFileSelection = (filename) => {
    setSelectedFiles((prev) =>
      prev.includes(filename)
        ? prev.filter((f) => f !== filename)
        : [...prev, filename]
    );
  };

  const handleAsk = async () => {
    if (!question) return;
    setLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/ask", {
        files: selectedFiles,
        question,
      });

      setChat((prevChat) => [
        ...prevChat,
        { 
          role: "user", 
          text: question, 
          timestamp: new Date().toLocaleTimeString() 
        },
        { 
          role: "bot", 
          text: res.data.answer, 
          timestamp: new Date().toLocaleTimeString() 
        },
      ]);
    } catch (error) {
      console.error("Error fetching response", error);
      setChat((prevChat) => [
        ...prevChat,
        { 
          role: "user", 
          text: question, 
          timestamp: new Date().toLocaleTimeString() 
        },
        { 
          role: "bot", 
          text: `Error: ${error.response?.data?.error || "Could not fetch response."}`, 
          timestamp: new Date().toLocaleTimeString() 
        },
      ]);
    }
    setLoading(false);
    setQuestion("");
  };

  const handleDelete = async (filename) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${filename}?`);
    if (!confirmDelete) return;

    try {
      await axios.delete("http://localhost:5000/delete", {
        data: { filename },
      });
      alert(`${filename} deleted successfully`);
      setSelectedFiles((prev) => prev.filter((f) => f !== filename));
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file", error);
      alert("Failed to delete file.");
    }
  };

  return (
    <div className={`app-container ${theme}`}>
      <aside className="sidebar">
        <h2>File Library</h2>
        <label className="upload-btn">
          Upload Files
          <input
            type="file"
            multiple
            accept=".pdf,.txt,.docx"
            onChange={handleUpload}
            style={{ display: "none" }}
          />
        </label>
        <ul className="file-list">
          {files.length > 0 ? (
            files.map((file, index) => (
              <li key={index} className="file-item">
                <label className="file-label">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file)}
                    onChange={() => toggleFileSelection(file)}
                  />
                  <span title={file}>{file.length > 20 ? file.slice(0, 17) + "..." : file}</span>
                </label>
                <button className="delete-btn" onClick={() => handleDelete(file)}>
                  ✕
                </button>
              </li>
            ))
          ) : (
            <p className="no-files">No files uploaded</p>
          )}
        </ul>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </aside>

      <main className="chat-section">
        <div className="chat-header">
          {selectedFiles.length > 0 ? (
            <h3>Chatting with: {selectedFiles.join(", ")}</h3>
          ) : (
            <h3>General chat (no files selected)</h3>
          )}
        </div>
        <div className="chat-box">
          {chat.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              <div className="message-content">
                <pre className="message-text">{msg.text}</pre>
                <span className="timestamp">{msg.timestamp}</span>
              </div>
            </div>
          ))}
          {loading && (
            <div className="thinking">
              <div className="spinner"></div>
              Processing...
            </div>
          )}
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAsk()}
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={!question || loading}
          >
            Send
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;