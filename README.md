# Call Quality Analyzer

A modern web application for analyzing call quality using AI, developed for Kalam Academy, Ranchi.

## Features

- Upload audio files (MP3, WAV) for analysis
- Optional transcription of audio content
- Comprehensive call quality analysis including:
  - Overall call quality rating
  - Noise level assessment
  - Audio clarity measurement
  - Identification of specific issues
  - Personalized recommendations for improvement

## Technology Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **UI Components**: Custom components with Lucide React icons
- **Backend** (for production): Node.js with Express, Multer for file handling
- **AI Integration**: Grok AI API for audio analysis

## Setup Guide

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/your-username/call-quality-analyzer.git
   cd call-quality-analyzer
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your Grok AI API key:
   ```
   GROK_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

### Building for Production

1. Build the application:
   ```
   npm run build
   ```

2. The build output will be in the `dist` directory, which can be deployed to Vercel or any other hosting service.

## Deployment

This application is designed to be deployed on Vercel. Follow these steps to deploy:

1. Install Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Deploy the application:
   ```
   vercel
   ```

3. Follow the prompts to complete the deployment.

## Usage

1. Open the application in your web browser.
2. Click on the upload area or drag and drop an audio file (MP3 or WAV format, up to 10MB).
3. Choose whether you want to transcribe the audio.
4. Click "Analyze Call Quality" to process the file.
5. View the comprehensive analysis results, including:
   - Transcription (if requested)
   - Overall call quality assessment
   - Detailed metrics (noise level, clarity)
   - Identified issues
   - Recommendations for improvement

## Error Handling

The application includes robust error handling for:
- Invalid file types (only audio files are accepted)
- File size limits (maximum 10MB)
- API connection issues
- Processing errors

## Security Considerations

- All file uploads are validated for type and size
- Temporary files are deleted after processing
- API keys are stored securely as environment variables
- No user data is stored permanently

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Kalam Academy, Ranchi for the project requirements
- Grok AI for the audio analysis capabilities
- Vercel for hosting services#   c a l l - a i  
 