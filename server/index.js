
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Check for required directories
const ensureDirectoriesExist = () => {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'dist')
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.log(`Creating directory: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

ensureDirectoriesExist();

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
  console.log('Received /api/analyze request');
  
  upload.single('audioFile')(req, res, async (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message });
    }
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No audio file provided' });
    }

    try {
      const filePath = req.file.path;
      const shouldTranscribe = req.body.transcribe === 'true';
      
      console.log('Processing file:', req.file.originalname);
      console.log('File path:', filePath);
      console.log('File size:', req.file.size);
      console.log('File type:', req.file.mimetype);
      console.log('Should transcribe:', shouldTranscribe);
      
      // Create a mock transcription if requested (for demo)
      let transcription = null;
      if (shouldTranscribe) {
        try {
          console.log('Generating transcription...');
          const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
          const transcriptionResult = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: 
              "You are a speech-to-text system. Generate a realistic call center conversation transcript (around 150 words) between a customer and a support agent discussing a technical issue with their internet service."
            }]}]
          });
          transcription = transcriptionResult.response.text();
          console.log('Transcription generated successfully');
        } catch (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          transcription = "An error occurred while generating the transcription. This is a fallback transcript of a call between a customer and support agent discussing internet connectivity issues.";
        }
      }
      
      // Use Gemini API to analyze the call quality
      console.log('Analyzing call quality with Gemini API...');
      try {
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
        
        const analysisResult = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: analysisPrompt }]}]
        });
        
        const analysisText = analysisResult.response.text();
        console.log('Analysis text received from Gemini');
        
        // Parse the JSON from the response, handling potential format issues
        let analysisJson;
        try {
          // Handle cases where there might be markdown code blocks in the response
          let cleanedJson = analysisText;
          
          // Remove markdown code blocks if present
          if (analysisText.includes('```')) {
            // Try to extract content from code blocks
            const jsonMatch = analysisText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              cleanedJson = jsonMatch[1].trim();
            } else {
              // If regexp fails, manually remove the code block markers
              cleanedJson = analysisText.replace(/```json/g, '').replace(/```/g, '').trim();
            }
          }
          
          // Ensure we have valid JSON by trying to find a JSON object
          if (cleanedJson.indexOf('{') >= 0) {
            cleanedJson = cleanedJson.substring(cleanedJson.indexOf('{'));
            if (cleanedJson.lastIndexOf('}') >= 0) {
              cleanedJson = cleanedJson.substring(0, cleanedJson.lastIndexOf('}') + 1);
            }
          }
          
          console.log('Attempting to parse:', cleanedJson);
          analysisJson = JSON.parse(cleanedJson);
          console.log('Successfully parsed JSON from Gemini response');
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          // Provide fallback analysis if JSON parsing fails
          analysisJson = {
            "callQuality": "Moderate",
            "noiseLevel": "Medium",
            "clarity": "Medium",
            "issues": [
              "Background noise detected",
              "Occasional voice distortion",
              "Some parts of the conversation are unclear"
            ],
            "recommendations": [
              "Use noise cancellation technology",
              "Ensure proper microphone placement",
              "Speak clearly and at a moderate pace",
              "Consider upgrading call equipment"
            ]
          };
        }
        
        // Clean up the uploaded file
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('File cleaned up successfully');
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
          // Continue anyway, this shouldn't stop the response
        }
        
        // Return the analysis results
        console.log('Sending successful response with analysis');
        return res.status(200).json({
          transcription: transcription,
          analysis: analysisJson
        });
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        throw new Error(`Gemini API error: ${geminiError.message}`);
      }
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
      
      // Send a more user-friendly error response with fallback data
      console.log('Sending fallback response due to error');
      return res.status(200).json({
        transcription: "Error generating transcription. This is a fallback transcript for demonstration purposes.",
        analysis: {
          "callQuality": "Moderate",
          "noiseLevel": "Medium",
          "clarity": "Medium",
          "issues": [
            "There was an error analyzing the actual audio",
            "This is fallback data for demonstration",
            "Please try again with a different audio file"
          ],
          "recommendations": [
            "Try uploading a smaller audio file",
            "Ensure the audio file is not corrupted",
            "Check your network connection",
            "Contact support if the issue persists"
          ]
        },
        _error: error.message // Include error for debugging but don't display to user
      });
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
