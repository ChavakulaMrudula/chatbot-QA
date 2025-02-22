import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";
const API_BASE_URL = "https://chatbot-qa-tk0f.onrender.com";
const App = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState([]);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.className = theme;
    fetchFiles();
  }, [theme]);

  // Fetch uploaded PDFs from the backend
  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/debug`);
      setFiles(res.data.stored_files || []);
    } catch (error) {
      console.error("Error fetching files", error);
    }
  };

  // Handle file upload
  const handleUpload = async (event) => {
    const formData = new FormData();
    for (let file of event.target.files) {
      formData.append("file", file);
    }

    try {
      await axios.post(`${API_BASE_URL}/upload`, formData,{
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Upload Complete. Processing in background.");
      fetchFiles();
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  // Handle asking a question based on the selected file
  const handleAsk = async () => {
    if (!selectedFile || !question) return;
    setLoading(true);
    setChat([...chat, { role: "user", text: question }]);

    try {
      const res = await axios.post(`${API_BASE_URL}/ask`,{
        filename: selectedFile,
        question,
      });

      setChat((prevChat) => [
        ...prevChat,
        { role: "user", text: question },
        { role: "bot", text: res.data.answer },
      ]);
    } catch (error) {
      console.error("Error fetching response", error);
    }
    setLoading(false);
    setQuestion("");
  };

  // Handle file deletion
  const handleDelete = async (filename) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${filename}?`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/delete`, {
        data: { filename },
      });
      alert(`${filename} deleted successfully`);
      fetchFiles(); // Refresh the file list
    } catch (error) {
      console.error("Error deleting file", error);
    }
  };

  return (
    <div className={`app-container ${theme}`}>
      {/* Sidebar with uploaded files */}
      <aside className="sidebar">
        <h2>Uploaded PDFs</h2>
        <input type="file" multiple onChange={handleUpload} />
        <ul className="file-list">
          {files.length > 0 ? (
            files.map((file, index) => (
              <li
                key={index}
                onClick={() => setSelectedFile(file)}
                className={`file-item ${selectedFile === file ? "active" : ""}`}
              >
                {file}
                <button className="delete-btn" onClick={() => handleDelete(file)}>
                  Delete
                </button>
              </li>
            ))
          ) : (
            <p>No files uploaded</p>
          )}
        </ul>
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        >
          Toggle {theme === "light" ? "Dark" : "Light"} Mode
        </button>
      </aside>

      {/* Chat interface */}
      <main className="chat-section">
        <div className="selected-file">
          {selectedFile ? (
            <h3>Chat with: {selectedFile}</h3>
          ) : (
            <h3>Select a file to start chatting</h3>
          )}
        </div>
        <div className="chat-box">
          {chat.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {loading && <div className="thinking">Thinking...</div>}
        </div>
        <div className="chat-input">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!selectedFile}
          />
          <button onClick={handleAsk} disabled={!selectedFile || !question}>
            Ask
          </button>
        </div>
      </main>
    </div>
  );
};

export default App;
