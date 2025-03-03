import type { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Disable Next.js body parsing so multer can handle multipart/form-data
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure the uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Helper to run middleware (for multer)
const runMiddleware = (req: NextApiRequest, res: NextApiResponse, fn: Function) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Run multer middleware to handle file upload
    await runMiddleware(req, res, upload.single('audioFile'));
    
    // Type assertion for multer file
    const file = (req as any).file as Express.Multer.File;
    if (!file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const filePath = file.path;
    const shouldTranscribe = req.body.transcribe === 'true';
    
    // Read the audio file
    const audioData = fs.readFileSync(filePath);
    
    // Use an environment variable for the API key (set GEMINI_API_KEY in your .env)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    // Make API request to the Gemini API
    const geminiResponse = await fetch('https://api.gemini.ai/analyze', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioData.toString('base64'),
        transcribe: shouldTranscribe,
      }),
    });
    
    if (!geminiResponse.ok) {
      const errorResponse = await geminiResponse.text();
      throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorResponse}`);
    }
    
    const analysisResult = await geminiResponse.json();
    
    // Clean up the uploaded file
    fs.unlinkSync(filePath);
    
    return res.status(200).json(analysisResult);
  } catch (error) {
    console.error('Error processing audio file:', error);
    return res.status(500).json({ error: 'Failed to process audio file' });
  }
}
