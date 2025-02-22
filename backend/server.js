const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const { OllamaEmbeddings } = require("@langchain/community/embeddings/ollama");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { Ollama } = require("@langchain/community/llms/ollama");
const cors = require("cors");

const app = express();
const PORT = 5000; // Fixed port for localhost

app.use(cors({ origin: "http://localhost:3000" })); // Allow frontend access from localhost:3000
app.use(express.json());

// Ensure "uploads" directory exists
const uploadDir = path.join(__dirname, "uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure Multer (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
}).array("file", 5); // Max 5 files at a time

// Ngrok URL for Ollama (Replace with your actual Ngrok URL)
const OLLAMA_API_URL = "https://your-ngrok-url.ngrok.io";

// Store trained vector stores
const vectorStores = {};
const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text", baseUrl: OLLAMA_API_URL });
const llm = new Ollama({ model: "llama3", baseUrl: OLLAMA_API_URL });

// File Upload Route
app.post("/upload", upload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded!" });
        }

        console.log("📂 Files received:", req.files.map(file => file.originalname));
        res.status(202).json({ message: "Files received. Processing in the background." });

        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

        await Promise.allSettled(req.files.map(async (file) => {
            try {
                console.log(`⏳ Processing: ${file.originalname}`);
                const pdfData = await pdfParse(file.buffer);
                const docs = await splitter.createDocuments([pdfData.text]);
                const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

                vectorStores[file.originalname] = vectorStore;
                console.log(`✅ Processed ${file.originalname}`);
            } catch (fileError) {
                console.error(`❌ Error processing ${file.originalname}:`, fileError);
            }
        }));

    } catch (error) {
        console.error("❌ Error handling files:", error);
        res.status(500).json({ error: "Failed to process files." });
    }
});

// Ask Question Route
app.post("/ask", async (req, res) => {
    try {
        const { question, files } = req.body;
        if (!question) return res.status(400).json({ error: "Please provide a question." });

        console.log(`🔍 Searching across selected PDFs...`);

        const selectedFiles = files && files.length > 0 ? files : Object.keys(vectorStores);

        const searchResults = await Promise.all(
            selectedFiles.map(async (filename) => {
                if (!vectorStores[filename]) return null;
                const results = await vectorStores[filename].similaritySearch(question, 3);
                return results.length ? { filename, texts: results.map(r => r.pageContent) } : null;
            })
        );

        const bestResults = searchResults.filter(Boolean);
        if (bestResults.length === 0) {
            return res.status(200).json({ answer: "No relevant information found." });
        }

        const context = bestResults.slice(0, 3).flatMap(result => result.texts).join("\n\n").slice(0, 1200);

        console.log("🧠 Context prepared for LLaMA prompt.");

        const prompt = `
        You are an intelligent AI assistant. Use the context below to answer accurately.

        Context:
        ${context}

        Question: ${question}

        Answer concisely based only on the given context. If unsure, respond with "I don't know."
        `;

        console.log(`📖 Sending prompt to LLaMA...`);
        const response = await llm.call(prompt);

        res.status(200).json({ answer: response.trim() || "Sorry, I couldn't find an answer." });

    } catch (error) {
        console.error("❌ Error processing question:", error);
        res.status(500).json({ error: "Failed to process the question.", details: error.message });
    }
});

// Delete a specific PDF from memory
app.delete("/delete", async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) return res.status(400).json({ error: "Please provide a filename." });

        if (!vectorStores[filename]) {
            return res.status(404).json({ error: "File not found in memory." });
        }

        delete vectorStores[filename];

        console.log(`🗑️ Deleted ${filename} from memory.`);
        res.status(200).json({ message: `${filename} has been deleted.` });

    } catch (error) {
        console.error("❌ Error deleting file:", error);
        res.status(500).json({ error: "Failed to delete file." });
    }
});

// Debug Route - Lists all trained PDFs
app.get("/debug", (req, res) => {
    res.json({ stored_files: Object.keys(vectorStores) });
});

// Start the Server on Localhost
app.listen(PORT, "127.0.0.1", () => {
    console.log(`🚀 Server running on http://127.0.0.1:${PORT}`);
});
