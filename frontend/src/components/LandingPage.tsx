"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  Zap, 
  Globe, 
  Shield
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted
}) => {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-b from-white to-gray-50/30">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <div className="lg:pr-8">
              <div className="google-fade-in">
                <h1 className="text-4xl lg:text-6xl xl:text-7xl font-google-sans font-bold text-gray-900 leading-tight mb-6">
                  Make Legal Documents
                  <span className="block text-google-blue">Simple & Clear</span>
                </h1>
              </div>
              
              <div className="google-fade-in google-fade-delay-1">
                <p className="text-xl lg:text-2xl text-gray-600 font-roboto leading-relaxed mb-8">
                  Transform complex legal jargon into plain English with 
                  <span className="text-google-green font-medium"> AI-powered analysis</span>.
                </p>
              </div>

              <div className="google-fade-in google-fade-delay-2 flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  onClick={onGetStarted}
                  className="google-primary-button text-lg px-8 py-4 group"
                >
                  <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Get Started
                </Button>
              </div>

              {/* Stats */}
              <div className="google-fade-in google-fade-delay-3 grid grid-cols-3 gap-8 pt-8 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-google-sans font-bold text-google-blue mb-1">99%</div>
                  <div className="text-sm text-gray-600 font-roboto">Accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-google-sans font-bold text-google-green mb-1">50+</div>
                  <div className="text-sm text-gray-600 font-roboto">Languages</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl lg:text-3xl font-google-sans font-bold text-google-yellow mb-1">24/7</div>
                  <div className="text-sm text-gray-600 font-roboto">Available</div>
                </div>
              </div>
            </div>

            {/* Right Column - Illustration */}
            <div className="relative">
              <div className="google-float">
                <div className="relative bg-white rounded-3xl shadow-2xl shadow-google-blue/10 p-8 lg:p-12">
                  {/* Main Character Illustration */}
                  <div className="relative z-10 mb-6">
                    <img 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/0efe640d-d714-4c93-8ece-67180a23e426/generated_images/3d-animated-illustration-of-a-cute-profe-dba91189-20250903184223.jpg"
                      alt="AI Assistant helping with legal documents"
                      className="w-full h-64 lg:h-80 object-contain"
                    />
                    
                    {/* Speech Bubble */}
                    <div className="absolute top-4 right-4 bg-white rounded-2xl shadow-lg px-4 py-3 max-w-48">
                      <div className="text-sm font-roboto text-gray-700 leading-snug">
                        "I'll help you with your documents!"
                      </div>
                      {/* Speech bubble arrow */}
                      <div className="absolute bottom-0 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white transform translate-y-full"></div>
                    </div>
                  </div>

                  {/* Floating Legal Icons */}
                  <div className="absolute inset-0 pointer-events-none">
                    <img 
                      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/0efe640d-d714-4c93-8ece-67180a23e426/generated_images/collection-of-small-floating-google-mate-90a306b6-20250903184232.jpg"
                      alt="Floating legal icons"
                      className="absolute inset-0 w-full h-full object-contain opacity-60 google-float-slow"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-google-sans font-bold text-gray-900 mb-4">
              Powered by Advanced AI
            </h2>
            <p className="text-xl text-gray-600 font-roboto max-w-2xl mx-auto">
              Our Gemini-powered system makes complex legal documents accessible to everyone
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {/* Feature 1 */}
            <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-google-blue to-google-blue/80 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                Smart Analysis
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Advanced OCR and AI comprehension to understand complex legal language and structure
              </p>
            </div>

            {/* Feature 2 */}
            <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-google-green to-google-green/80 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                Multi-Language
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Process documents in 50+ languages with accurate translation and cultural context
              </p>
            </div>

            {/* Feature 3 */}
            <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-google-yellow to-google-yellow/80 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                Instant Results
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Get comprehensive analysis, risk assessment, and plain-English summaries in seconds
              </p>
            </div>

            {/* Feature 4 */}
            <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-google-red to-google-red/80 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                Risk Detection
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Identify potential risks, unfavorable terms, and missing clauses with AI precision
              </p>
            </div>

            {/* Feature 5 */}
           <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                Document Types
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Supports contracts, leases, employment agreements, NDAs, and more legal documents
              </p>
            </div>

            {/* Feature 6 */}
            <div className="google-card google-fade-in p-6 lg:p-8 rounded-2xl shadow-md bg-white">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-google-sans font-semibold text-gray-900 mb-2">
                AI Chat Assistant
              </h3>
              <p className="text-gray-600 font-roboto leading-relaxed flex-grow">
                Ask questions about your document and get instant, contextual answers from our AI
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-google-blue/5 via-google-green/5 to-google-yellow/5">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <div className="google-fade-in">
            <h2 className="text-3xl lg:text-4xl font-google-sans font-bold text-gray-900 mb-6">
              Ready to Simplify Your Legal Documents?
            </h2>
            <p className="text-xl text-gray-600 font-roboto mb-8 max-w-2xl mx-auto">
              Join thousands who trust our AI to make legal documents clear and understandable
            </p>
       <div className="flex justify-center">
  <Button
    size="lg"
    onClick={onGetStarted}
    className="google-primary-button text-lg px-8 py-4 group"
  >
    <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
    Start Analyzing Now
  </Button>
</div>

          </div>
        </div>
      </section>
    </div>
  );
};