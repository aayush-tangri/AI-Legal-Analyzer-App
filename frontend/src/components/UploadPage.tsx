"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Zap,
  Sparkles,
  CheckCircle,
  Eye,
  Languages,
} from "lucide-react";
import { analyzeDocument } from "@/utils/api";

interface AdditionalData {
  state?: string;
  companyName?: string;
  bankName?: string;
  keyEntities?: any;
  calendarEvents?: any;
  summary?: string;
  detailedAnalysis?: {
    analysis: {
      actionable_advice: string;
      clause_category: string;
      risk_explanation: string;
      risk_level: string;
    };
    original_clause: string;
  }[];
  flowchart?: string;
}

interface UploadPageProps {
  onAnalysisComplete: (data: {
    documentId: string;
    filename: string;
    analysisReady: boolean;
    documentType?: string;
    additionalData?: AdditionalData;
  }) => void;
}

type DocumentType = "rental" | "loan" | "employability" | "general";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export function UploadPage({ onAnalysisComplete }: UploadPageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>("general");
  const [selectedState, setSelectedState] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [bankName, setBankName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(0);

  const analysisSteps = ["Extract Text", "Analyze", "Summarize", "Finalize"];

  useEffect(() => {
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;
        setPdfjsLib(pdfjs);
      } catch (e) {
        console.error("Failed to load pdf.js", e);
        setError("Could not load PDF viewer. Please refresh the page.");
      }
    })();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (!file.type.includes("pdf")) {
          setError("Only PDF files are accepted.");
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError("File size cannot exceed 10MB.");
          return;
        }
        setSelectedFile(file);
        setError(null);
      }
    },
    []
  );

  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (!pdfjsLib) throw new Error("PDF.js not loaded yet");
    setCurrentStep(0);

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Keep the PDF's line breaks (hasEOL) so the backend can split the text into clauses
      text += content.items.map((item: any) => item.str + (item.hasEOL ? "\n" : " ")).join("") + "\n\n";
    }
    return text.trim();
  };

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) {
      setError("Please select a file first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(0);

    try {
      const minStepDuration = 5000; // 5 seconds

      // --- Step 1: Extract Text with Delay ---
      const textPromise = extractTextFromPDF(selectedFile);
      const delayPromise1 = new Promise(resolve => setTimeout(resolve, minStepDuration));
      const [extractedText] = await Promise.all([textPromise, delayPromise1]);

      setCurrentStep(1); // Mark "Extract Text" as complete, start "Analyze"

      // --- Step 2: Analyze Document with Delay ---
      const analysisPromise = analyzeDocument(extractedText);
      const delayPromise2 = new Promise(resolve => setTimeout(resolve, minStepDuration));
      const [data] = await Promise.all([analysisPromise, delayPromise2]);

      setCurrentStep(2); // Mark "Analyze" as complete, start "Summarize"

      // Simulate final steps quickly
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(3); // Mark "Summarize" as complete, start "Finalize"

      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep(4);

      setTimeout(() => {
        onAnalysisComplete({
          documentId: `doc_${Date.now()}`,
          filename: selectedFile.name,
          analysisReady: true,
          // Use the type the backend detected (rental/employment/loan) when available
          documentType: data.contract_type || documentType,
          additionalData: {
            state: selectedState,
            companyName,
            bankName,
            keyEntities: data.key_entities,
            calendarEvents: data.calendar_events,
            summary: data.summary,
            detailedAnalysis: data.detailed_analysis,
            flowchart: data.flowchart,
          },
        });
      }, 500);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError(
        err?.message === "Failed to fetch"
          ? "Could not reach the analysis server. Is the backend running?"
          : err?.message || "Failed to analyze the document. Please try again."
      );
      setIsAnalyzing(false);
    }
  }, [
    selectedFile,
    documentType,
    selectedState,
    companyName,
    bankName,
    onAnalysisComplete,
    pdfjsLib,
  ]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  if (isAnalyzing) {
    return (
      <div className="google-fade-in">
        <section className="pt-16 pb-20">
          <div className="container max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-google-sans font-medium text-gray-900 mb-4">
                Analyzing Your Document
              </h1>
              <p className="text-xl text-gray-600 font-roboto">
                Processing with advanced AI technology
              </p>
            </div>

            <div className="google-card-floating p-12 text-center space-y-8 max-w-lg mx-auto">
              {selectedFile && (
                <div className="google-card bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-google-blue flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {selectedFile.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        PDF • {formatFileSize(selectedFile.size)} •{" "}
                        {documentType}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">

                <div className="flex justify-center space-x-8">
                  {analysisSteps.map((step, index) => (
                    <div
                      key={step}
                      className="flex flex-col items-center space-y-2"
                    >
                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${index <= currentStep
                          ? "border-google-blue bg-google-blue text-white google-glow"
                          : "border-gray-300 text-gray-400"
                          }`}
                      >
                        {index < currentStep ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : index === currentStep ? (
                          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        ) : (
                          <span className="text-sm font-medium">
                            {index + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-sm font-roboto transition-colors duration-300 ${index <= currentStep
                          ? "text-google-blue font-medium"
                          : "text-gray-500"
                          }`}
                      >
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="google-fade-in">
      <section className="pt-16 pb-20">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="text-center mb-12 google-slide-in">
            <h1 className="text-4xl font-google-sans font-medium text-gray-900 mb-4">
              Upload Your Legal Document
            </h1>
            <p className="text-xl text-gray-600 font-roboto">
              Choose your document and specify its type for better analysis
            </p>
          </div>

          <div className="space-y-8">
            <div className="google-upload-card-floating">
              {!selectedFile ? (
                <div className="space-y-6">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-google-blue to-google-blue/80 rounded-3xl flex items-center justify-center google-icon-float">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-google-sans font-medium text-gray-900 mb-3">
                      Upload PDF Document
                    </h3>
                    <p className="text-gray-600 font-roboto">
                      Drag and drop your file here, or click to browse
                    </p>
                  </div>
                  <div className="space-y-4">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="google-primary-button w-full text-lg px-8 py-4 h-auto google-upload-hover"
                    >
                      <Upload className="w-6 h-6 mr-3" />
                      Choose File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={handleFileSelect}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="mx-auto w-20 h-20 bg-google-green/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-google-green" />
                  </div>

                  <div className="google-card bg-gray-50 p-6">
                    <div className="flex items-center gap-4">
                      <FileText className="w-8 h-8 text-google-blue flex-shrink-0" />
                      <div className="text-left">
                        <div className="font-medium text-gray-900 text-lg">
                          {selectedFile.name}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          PDF • {formatFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-google-blue hover:underline font-roboto"
                  >
                    Choose different file
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-center text-sm text-google-red font-roboto">
                {error}
              </p>
            )}
            <Button
              onClick={handleAnalyze}
              disabled={!selectedFile || isAnalyzing || !pdfjsLib}
              className="google-primary-button w-full text-lg px-8 py-4 h-auto google-upload-hover"
            >
              <Sparkles className="w-6 h-6 mr-3" />
              Analyze Document
            </Button>


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
              <div className="text-center space-y-4">
                <div
                  className="mx-auto w-16 h-16 google-feature-icon"
                  style={
                    {
                      "--bg-color": "#e3f2fd",
                      "--bg-color-dark": "#bbdefb",
                    } as React.CSSProperties
                  }
                >
                  <Eye className="w-8 h-8 text-google-blue" />
                </div>
                <div>
                  <h4 className="font-google-sans font-medium text-gray-900 text-lg">
                    OCR Ready
                  </h4>
                  <p className="text-gray-600 font-roboto">
                    Process scanned documents
                  </p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <div
                  className="mx-auto w-16 h-16 google-feature-icon"
                  style={
                    {
                      "--bg-color": "#e8f5e8",
                      "--bg-color-dark": "#c8e6c9",
                    } as React.CSSProperties
                  }
                >
                  <Languages className="w-8 h-8 text-google-green" />
                </div>
                <div>
                  <h4 className="font-google-sans font-medium text-gray-900 text-lg">
                    Multilingual
                  </h4>
                  <p className="text-gray-600 font-roboto">
                    Auto-translate to English
                  </p>
                </div>
              </div>
              <div className="text-center space-y-4">
                <div
                  className="mx-auto w-16 h-16 google-feature-icon"
                  style={
                    {
                      "--bg-color": "#fff3e0",
                      "--bg-color-dark": "#ffe0b2",
                    } as React.CSSProperties
                  }
                >
                  <Zap className="w-8 h-8 text-google-yellow" />
                </div>
                <div>
                  <h4 className="font-google-sans font-medium text-gray-900 text-lg">
                    AI Powered
                  </h4>
                  <p className="text-gray-600 font-roboto">
                    Advanced Gemini analysis
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
