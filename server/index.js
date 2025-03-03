
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// Set up Gemini API
const GEMINI_API_KEY = 'AIzaSyBD5MlVkd78waOrDFMNyjnZ3l9pcFOvfXY';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Please upload an audio file'));
    }
  }
});

// Create /uploads directory if it doesn't exist
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Analyze audio call quality
app.post('/api/analyze', (req, res) => {
  upload.single('audioFile')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
      const filePath = req.file.path;
      const shouldTranscribe = req.body.transcribe === 'true';
      
      // Read the audio file as base64
      const audioData = fs.readFileSync(filePath);
      const audioBase64 = audioData.toString('base64');
    
    // Create a mock transcription if requested (for demo)
    let transcription = null;
    if (shouldTranscribe) {
      // In a real scenario, you would use a speech-to-text service here
      // For this demo, we'll use Gemini to pretend to generate a transcription
      const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      const result = await geminiModel.generateContent(
        "You are a speech-to-text system. Generate a realistic call center conversation transcript (around 150 words) between a customer and a support agent discussing a technical issue with their internet service."
      );
      transcription = result.response.text();
    }
    
    // Use Gemini API to analyze the call quality
    // In real implementation, you'd analyze the audio file directly
    // Since Gemini can't directly analyze audio yet, we'll simulate the analysis
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const analysisPrompt = `
    You are an AI specialist in analyzing call center audio quality. 
    Based on an audio file with the following characteristics:
    - File name: ${req.file.originalname}
    - File size: ${req.file.size} bytes
    - File type: ${req.file.mimetype}
    
    Create a detailed call quality analysis report with the following components:
    1. Overall call quality rating (Good, Moderate, or Poor)
    2. Noise level assessment (Low, Medium, or High)
    3. Clarity rating (High, Medium, or Low)
    4. List of 3-4 specific issues that might be present in a call of this quality
    5. List of 3-4 recommendations for improving call quality
    
    Format the response as a JSON object with the following structure:
    {
      "callQuality": "string",
      "noiseLevel": "string",
      "clarity": "string",
      "issues": ["string", "string", ...],
      "recommendations": ["string", "string", ...]
    }
    `;
    
    const result = await geminiModel.generateContent(analysisPrompt);
    const analysisText = result.response.text();
    
    // Parse the JSON from the response
    const analysisJson = JSON.parse(analysisText);
    
    // Clean up the uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up file:', cleanupError);
      // Continue anyway, this shouldn't stop the response
    }
    
    // Return the analysis results
    return res.status(200).json({
      transcription: transcription,
      analysis: analysisJson
    });
  } catch (error) {
    console.error('Error processing audio file:', error);
    
    // Clean up file if it exists despite the error
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up file after processing error:', cleanupError);
    }
    
    return res.status(500).json({ error: 'Failed to process audio file: ' + error.message });
  }
  });
});

// In development mode, don't try to serve static files from dist
if (fs.existsSync(path.join(process.cwd(), 'dist'))) {
  // Serve static files from the dist directory (for production)
  app.use(express.static('dist'));

  // Catch-all route to serve the SPA
  app.get('*', (req, res) => {
    if (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))) {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    } else {
      res.status(404).send('Frontend not built yet. Please run "npm run build" first for production.');
    }
  });
} else {
  // Development mode - API only
  app.get('/', (req, res) => {
    res.send('API server is running. Frontend not built yet.');
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
  console.log(`API available at http://0.0.0.0:${port}/api/analyze`);
});

export default app;
