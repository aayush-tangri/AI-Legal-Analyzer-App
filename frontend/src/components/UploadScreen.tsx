"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Shield, Scale, Award, CheckCircle, AlertCircle, Loader2, Gavel, Lock, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadScreenProps {
  onComplete: (data: { documentId: string; filename: string; analysisReady: boolean }) => void;
  className?: string;
}

interface UploadState {
  isDragging: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadedFile: File | null;
  error: string | null;
  success: boolean;
}

const ACCEPTED_FORMATS = ['pdf', 'docx', 'txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function UploadScreen({ onComplete, className = "" }: UploadScreenProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isDragging: false,
    isUploading: false,
    uploadProgress: 0,
    uploadedFile: null,
    error: null,
    success: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ACCEPTED_FORMATS.includes(extension)) {
      return `Please upload a valid document format: ${ACCEPTED_FORMATS.join(', ').toUpperCase()}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 50MB limit. Please select a smaller file.';
    }
    return null;
  }, []);

  const simulateUpload = useCallback(async (file: File) => {
    setUploadState(prev => ({ ...prev, isUploading: true, error: null, uploadProgress: 0 }));

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setUploadState(prev => ({ ...prev, uploadProgress: progress }));
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    const documentId = `doc_${Date.now()}`;
    setUploadState(prev => ({
      ...prev,
      isUploading: false,
      success: true,
      uploadedFile: file,
    }));

    // Call onComplete after a brief success animation
    setTimeout(() => {
      onComplete({ documentId, filename: file.name, analysisReady: true });
    }, 1500);
  }, [onComplete]);

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }));
      return;
    }

    await simulateUpload(file);
  }, [validateFile, simulateUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState(prev => ({ ...prev, isDragging: false }));

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetUpload = useCallback(() => {
    setUploadState({
      isDragging: false,
      isUploading: false,
      uploadProgress: 0,
      uploadedFile: null,
      error: null,
      success: false,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className={`${className}`}>
      {/* Main Upload Card */}
      <div className="bg-card/90 backdrop-blur-sm rounded-2xl border border-border legal-card-shadow overflow-hidden">
        <div className="p-8 lg:p-12">
          {uploadState.success ? (
            /* Success State */
            <div className="text-center animate-in fade-in duration-500">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-legal-gold to-legal-navy rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-legal-gold-foreground" />
                </div>
                <div className="absolute inset-0 w-20 h-20 bg-legal-gold rounded-full animate-ping opacity-20"></div>
              </div>
              <h2 className="font-heading text-3xl font-bold text-foreground mb-4">
                Document Uploaded Successfully!
              </h2>
              <p className="text-muted-foreground mb-4 text-lg">
                <span className="font-semibold text-legal-gold">{uploadState.uploadedFile?.name}</span> has been processed and is ready for analysis.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-legal-gold">
                <Sparkles className="w-4 h-4" />
                <span>Preparing comprehensive legal analysis...</span>
              </div>
            </div>
          ) : uploadState.isUploading ? (
            /* Upload Progress State */
            <div className="text-center">
              <div className="relative w-20 h-20 mx-auto mb-8">
                <div className="w-20 h-20 bg-legal-gold/10 border border-legal-gold/20 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-legal-gold animate-spin" />
                </div>
              </div>
              <h2 className="font-heading text-3xl font-bold text-foreground mb-6">
                Processing Your Document
              </h2>
              <div className="max-w-md mx-auto mb-6">
                <div className="bg-muted rounded-full h-3 mb-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-legal-gold to-legal-navy h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadState.uploadProgress}%` }}
                  />
                </div>
                <p className="text-lg font-semibold text-legal-gold">
                  {uploadState.uploadProgress}% Complete
                </p>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p className="flex items-center justify-center gap-2">
                  <Scale className="w-4 h-4 text-legal-gold" />
                  Analyzing contract structure and legal clauses...
                </p>
                <p className="text-sm">This may take a few moments for comprehensive analysis</p>
              </div>
            </div>
          ) : (
            /* Upload Interface */
            <>
              <div 
                className={`
                  relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                  legal-button-animate transition-all duration-300 ease-in-out
                  ${uploadState.isDragging 
                    ? 'border-legal-gold bg-legal-gold/5 scale-[1.02] shadow-lg' 
                    : 'border-border hover:border-legal-gold hover:bg-legal-cream/30'
                  }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="flex flex-col items-center">
                  <div className={`
                    relative p-6 rounded-2xl mb-8 transition-all duration-300 legal-icon-hover
                    ${uploadState.isDragging 
                      ? 'bg-gradient-to-br from-legal-gold to-legal-navy shadow-xl scale-110' 
                      : 'bg-gradient-to-br from-legal-cream to-muted hover:from-legal-gold hover:to-legal-navy hover:shadow-lg'
                    }
                  `}>
                    <Upload className={`
                      w-12 h-12 transition-colors duration-300
                      ${uploadState.isDragging 
                        ? 'text-legal-gold-foreground' 
                        : 'text-legal-navy hover:text-legal-navy-foreground'
                      }
                    `} />
                    
                    {/* Decorative legal symbols */}
                    <div className="absolute -top-2 -right-2 p-1 bg-legal-gold rounded-full">
                      <Scale className="w-4 h-4 text-legal-gold-foreground" />
                    </div>
                  </div>
                  
                  <h3 className="font-heading text-2xl font-bold text-foreground mb-3">
                    {uploadState.isDragging ? 'Drop Your Legal Document' : 'Upload Legal Document'}
                  </h3>
                  
                  <p className="text-muted-foreground mb-8 text-lg max-w-md">
                    Drag and drop your contract or legal document here, or{' '}
                    <span className="text-legal-gold font-semibold hover:underline cursor-pointer">
                      browse files
                    </span>
                  </p>
                  
                  {/* Enhanced CTA Button */}
                  <Button 
                    onClick={handleUploadClick}
                    className="legal-button-animate bg-gradient-to-r from-legal-gold to-legal-navy hover:from-legal-navy hover:to-legal-gold text-legal-gold-foreground font-semibold px-8 py-3 text-lg mb-8"
                  >
                    <FileText className="w-5 h-5 mr-2" />
                    Select Document
                  </Button>
                  
                  {/* File Format Indicators */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 px-3 py-2 bg-legal-cream rounded-lg border border-legal-gold/20">
                      <FileText className="w-4 h-4 text-legal-gold" />
                      <span className="font-medium text-legal-navy">PDF</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-legal-cream rounded-lg border border-legal-gold/20">
                      <FileText className="w-4 h-4 text-legal-gold" />
                      <span className="font-medium text-legal-navy">DOCX</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-legal-cream rounded-lg border border-legal-gold/20">
                      <FileText className="w-4 h-4 text-legal-gold" />
                      <span className="font-medium text-legal-navy">TXT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {uploadState.error && (
                <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 legal-card-shadow">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 mb-1">Upload Error</p>
                    <p className="text-sm text-red-700 mb-3">{uploadState.error}</p>
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      size="sm"
                      className="text-red-800 border-red-300 hover:bg-red-50"
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Professional Guidelines */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 bg-legal-cream/50 rounded-xl border border-legal-gold/20 legal-card-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-legal-gold/10 rounded-lg">
                      <Scale className="w-5 h-5 text-legal-gold" />
                    </div>
                    <h4 className="font-heading text-lg font-semibold text-foreground">
                      Supported Documents
                    </h4>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
                      <span>Commercial Contracts & Agreements</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
                      <span>Terms of Service & Privacy Policies</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
                      <span>NDAs & Confidentiality Agreements</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
                      <span>Employment & Service Contracts</span>
                    </li>
                  </ul>
                  <p className="text-sm text-muted-foreground mt-4 font-medium">
                    Maximum file size: 50MB
                  </p>
                </div>

                <div className="p-6 bg-legal-cream/50 rounded-xl border border-legal-gold/20 legal-card-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-legal-navy/10 rounded-lg">
                      <Gavel className="w-5 h-5 text-legal-navy" />
                    </div>
                    <h4 className="font-heading text-lg font-semibold text-foreground">
                      AI Analysis Features
                    </h4>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-navy rounded-full"></div>
                      <span>Comprehensive Risk Assessment</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-navy rounded-full"></div>
                      <span>Key Clause Identification</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-navy rounded-full"></div>
                      <span>Compliance & Regulatory Check</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-legal-navy rounded-full"></div>
                      <span>Actionable Legal Insights</span>
                    </li>
                  </ul>
                  <p className="text-sm text-legal-gold font-semibold mt-4">
                    ⚡ Analysis completed in seconds
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Security Footer */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
          <Shield className="w-5 h-5 text-legal-gold" />
          <span className="font-medium">Enterprise-Grade Security & Confidentiality</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
            <span>256-bit SSL Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
            <span>Zero Data Retention Policy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
            <span>SOC 2 Type II Certified</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-legal-gold rounded-full"></div>
            <span>GDPR & CCPA Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}