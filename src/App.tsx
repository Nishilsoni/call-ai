import React, { useState, useRef } from "react";
import {
  Upload,
  FileAudio,
  Headphones,
  FileText,
  Loader2,
  Mic,
  Volume2,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import "./App.css";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const [transcribe, setTranscribe] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if file is audio
      if (!selectedFile.type.startsWith("audio/")) {
        setError("Please upload an audio file (MP3, WAV, etc.)");
        setFile(null);
        return;
      }

      // Check file size (limit to 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];

      if (!droppedFile.type.startsWith("audio/")) {
        setError("Please upload an audio file (MP3, WAV, etc.)");
        return;
      }

      if (droppedFile.size > 10 * 1024 * 1024) {
        setError("File size exceeds 10MB limit");
        return;
      }

      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select an audio file");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("audioFile", file);
    formData.append("transcribe", transcribe.toString());

    try {
      console.log("Uploading file:", file.name, "Size:", file.size, "Type:", file.type);
      
      // Set a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        // Disable caching to ensure fresh responses
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log("Response status:", response.status);
      
      // Even if the response has an error status, try to parse it
      let data;
      try {
        data = await response.json();
        console.log("Response data received");
      } catch (jsonError) {
        console.error("Failed to parse response as JSON:", jsonError);
        throw new Error("Server returned invalid JSON. Please try again.");
      }
      
      if (!response.ok) {
        // If server returned an error with proper format
        const errorMessage = data?.error || `Server error: ${response.status}`;
        console.error("Server returned error:", errorMessage);
        throw new Error(errorMessage);
      }

      console.log("Response processed successfully");
      
      // Check if we have the expected data structure
      if (data && data.analysis) {
        setResult(data);
        setActiveTab("results");
      } else {
        console.error("Invalid response format:", data);
        throw new Error("Server returned incomplete data. Please try again.");
      }
    } catch (err: any) {
      console.error("Error details:", err);
      
      if (err.name === 'AbortError') {
        setError("Request timed out. Please try again with a smaller file or check your internet connection.");
      } else {
        // Provide more detailed error information including the server error if available
        let errorMessage = "Failed to analyze audio. Please try again.";
        
        if (err.message && err.message.includes("Server returned error:")) {
          errorMessage = err.message;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        
        // Log server error details if available
        if (err.serverError) {
          console.error("Server error details:", err.serverError);
        }
      }
      
      // Log file info for debugging
      console.log("File info:", file ? {
        name: file.name,
        type: file.type,
        size: file.size
      } : 'No file');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 perspective">
      <div className="stars"></div>
      <div className="twinkling"></div>

      <header className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="logo-container">
                <Headphones className="h-8 w-8 text-indigo-600 logo-icon" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 gradient-text">
                Call Quality Analyzer
              </h1>
            </div>
            <div className="text-sm text-gray-600 hidden sm:block">
              Made for Kalam Academy, Ranchi by Nishil
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg overflow-hidden card-hover">
            {result && (
              <div className="flex border-b">
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === "upload" ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"}`}
                  onClick={() => setActiveTab("upload")}
                >
                  Upload
                </button>
                <button
                  className={`flex-1 py-3 px-4 text-center font-medium ${activeTab === "results" ? "bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500" : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"}`}
                  onClick={() => setActiveTab("results")}
                >
                  Results
                </button>
              </div>
            )}

            <div className="p-8">
              {activeTab === "upload" && (
                <>
                  <h2 className="text-2xl font-semibold text-gray-800 mb-6 fade-in">
                    Analyze Your Call Quality
                  </h2>

                  <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                      <label className="block text-gray-700 text-sm font-medium mb-2">
                        Upload Audio File
                      </label>

                      <div
                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 ${isDragging ? "border-indigo-500 bg-indigo-50" : file ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-indigo-300"}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleUploadClick}
                      >
                        {!file ? (
                          <div className="space-y-3 upload-animation">
                            <Upload className="h-10 w-10 text-gray-400 mx-auto" />
                            <div className="text-gray-600">
                              <span className="font-medium text-indigo-600">
                                Click to upload
                              </span>{" "}
                              or drag and drop
                            </div>
                            <p className="text-xs text-gray-500">
                              MP3, WAV up to 10MB
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-3 file-selected">
                            <FileAudio className="h-8 w-8 text-green-500" />
                            <span className="font-medium text-gray-900">
                              {file.name}
                            </span>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept="audio/*"
                        />
                      </div>

                      {error && (
                        <p className="mt-2 text-sm text-red-600 error-message">
                          {error}
                        </p>
                      )}
                    </div>

                    <div className="mb-6">
                      <div className="flex items-center">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input
                            type="checkbox"
                            name="transcribe"
                            id="transcribe"
                            checked={transcribe}
                            onChange={(e) => setTranscribe(e.target.checked)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                          />
                          <label
                            htmlFor="transcribe"
                            className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                          ></label>
                        </div>
                        <label
                          htmlFor="transcribe"
                          className="text-sm text-gray-700"
                        >
                          Transcribe audio (generate text from speech)
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!file || isLoading}
                      className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${!file || isLoading ? "opacity-50 cursor-not-allowed" : "button-pulse"}`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          Analyzing...
                        </>
                      ) : (
                        "Analyze Call Quality"
                      )}
                    </button>
                  </form>
                </>
              )}

              {activeTab === "results" && result && (
                <div className="fade-in">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    Analysis Results
                  </h3>

                  <div className="space-y-6">
                    {result.transcription && (
                      <div className="bg-gray-50 p-4 rounded-lg shadow-inner slide-in-right">
                        <div className="flex items-center mb-2">
                          <FileText className="h-5 w-5 text-indigo-500 mr-2" />
                          <h4 className="font-medium text-gray-900">
                            Transcription
                          </h4>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-line">
                          {result.transcription}
                        </p>
                      </div>
                    )}

                    <div className="slide-in-left">
                      <h4 className="font-medium text-gray-900 mb-2">
                        Call Quality Analysis
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 metric-card">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-blue-500 uppercase font-semibold">
                              Overall Quality
                            </div>
                            <Mic className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="text-lg font-medium mt-1">
                            {result.analysis.callQuality}
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full progress-bar"
                              style={{
                                width:
                                  result.analysis.callQuality === "Good"
                                    ? "75%"
                                    : "50%",
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 metric-card">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-blue-500 uppercase font-semibold">
                              Noise Level
                            </div>
                            <Volume2 className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="text-lg font-medium mt-1">
                            {result.analysis.noiseLevel}
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full progress-bar"
                              style={{
                                width:
                                  result.analysis.noiseLevel === "Low"
                                    ? "25%"
                                    : "75%",
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 metric-card">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-blue-500 uppercase font-semibold">
                              Clarity
                            </div>
                            <BarChart2 className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="text-lg font-medium mt-1">
                            {result.analysis.clarity}
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full progress-bar"
                              style={{
                                width:
                                  result.analysis.clarity === "High"
                                    ? "90%"
                                    : "60%",
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 slide-up">
                          <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                            <span className="h-2 w-2 bg-amber-500 rounded-full mr-2"></span>
                            Identified Issues
                          </h5>
                          <ul className="space-y-2">
                            {result.analysis.issues.map(
                              (issue: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-gray-700 flex items-start"
                                >
                                  <span className="inline-block h-5 w-5 rounded-full bg-amber-100 text-amber-600 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">
                                    {index + 1}
                                  </span>
                                  {issue}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 slide-up">
                          <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                            <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                            Recommendations
                          </h5>
                          <ul className="space-y-2">
                            {result.analysis.recommendations.map(
                              (rec: string, index: number) => (
                                <li
                                  key={index}
                                  className="text-sm text-gray-700 flex items-start recommendation-item"
                                >
                                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" />
                                  {rec}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            <p>© 2025 Kalam Academy, Ranchi. Made by Nishil.</p>
            <p className="mt-1">
              This application uses AI for call quality analysis.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
