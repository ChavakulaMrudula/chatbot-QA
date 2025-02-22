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
const PORT = 5000;

app.use(express.json());
app.use(cors()); 

// Ensure "uploads" directory exists
const uploadDir = path.join(__dirname, "uploads");
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Configure Multer (Memory Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
}).array("file", 5); // Max 5 files at a time

// Store trained vector stores
const vectorStores = {};
const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" }); // Faster embeddings
const llm = new Ollama({ model: "llama3" }); // Use LLaMA 3 for response generation

// ✅ File Upload Route
app.post("/upload", upload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded!" });
        }

        console.log("📂 Files received:", req.files.map(file => file.originalname));
        res.status(202).json({ message: "Files received. Processing in the background." });

        const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 }); // Increase chunk size

        await Promise.allSettled(req.files.map(async (file) => {
            try {
                console.log(`⏳ Processing: ${file.originalname}`);
                const startTime = Date.now();

                // Step 1: Extract Text
                const pdfData = await pdfParse(file.buffer);

                // Step 2: Split Text into smaller chunks
                const docs = await splitter.createDocuments([pdfData.text]);

                // Step 3: Generate Embeddings for each chunk
                const vectorStore = await MemoryVectorStore.fromDocuments(docs, embeddings);

                // Store vector data in memory
                vectorStores[file.originalname] = vectorStore;
                console.log(`✅ Processed ${file.originalname} in ${(Date.now() - startTime) / 1000}s`);

            } catch (fileError) {
                console.error(`❌ Error processing ${file.originalname}:`, fileError);
            }
        }));

    } catch (error) {
        console.error("❌ Error handling files:", error);
        res.status(500).json({ error: "Failed to process files." });
    }
});

// ✅ Optimized Ask Question Route
app.post("/ask", async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: "Please provide a question." });

        console.log(`🔍 Searching across PDFs...`);

        // ✅ Step 1: Parallel Similarity Search (Top 3 results per file)
        const searchResults = await Promise.all(
            Object.entries(vectorStores).map(async ([filename, vectorStore]) => {
                const results = await vectorStore.similaritySearch(question, 3); // Get top 3 results
                return results.length ? { filename, texts: results.map(r => r.pageContent) } : null;
            })
        );

        // ✅ Step 2: Filter out empty results
        const bestResults = searchResults.filter(Boolean);
        if (bestResults.length === 0) {
            return res.status(200).json({ answer: "No relevant information found." });
        }

        // ✅ Step 3: Build Context (Limit to top 3 results & increase context size)
        const context = bestResults
            .slice(0, 3) // Use top 3 relevant documents
            .flatMap(result => result.texts)
            .join("\n\n")
            .slice(0, 1200); // Limit context to 1200 characters

        console.log("🧠 Context prepared for LLaMA prompt.");

        // ✅ Step 4: LLaMA Prompt
        const prompt = `
        You are an intelligent AI assistant. Use the context below to answer accurately.

        Context:
        ${context}

        Question: ${question}

        Answer concisely based only on the given context. If unsure, respond with "I don't know."
        `;

        console.log(`📖 Sending prompt to LLaMA...`);

        // ✅ Step 5: LLaMA API Call
        const response = await llm.call(prompt);

        // ✅ Step 6: Respond with trimmed answer
        res.status(200).json({ answer: response.trim() || "Sorry, I couldn't find an answer." });

    } catch (error) {
        console.error("❌ Error processing question:", error);
        res.status(500).json({ error: "Failed to process the question.", details: error.message });
    }
});

// ✅ Delete File Route
app.delete("/delete", async (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({ error: "Please provide a filename to delete." });
        }

        if (!vectorStores[filename]) {
            return res.status(404).json({ error: "File not found in memory." });
        }

        // Remove file from vector store
        delete vectorStores[filename];
        console.log(`🗑️ Deleted: ${filename}`);

        res.status(200).json({ message: `File '${filename}' deleted successfully.` });
    } catch (error) {
        console.error("❌ Error deleting file:", error);
        res.status(500).json({ error: "Failed to delete the file." });
    }
});

// ✅ Debug Route - Lists all trained PDFs
app.get("/debug", (req, res) => {
    res.json({ stored_files: Object.keys(vectorStores) });
});

// ✅ Start the Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
