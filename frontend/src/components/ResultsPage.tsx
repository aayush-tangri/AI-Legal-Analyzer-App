"use client";
import mermaid from "mermaid";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Shield,
  ArrowRightCircle,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { askChatbot } from "@/utils/api";

interface ResultsPageProps {
  analysisData: {
    documentId: string;
    filename: string;
    analysisReady: boolean;
    documentType?: string;
    additionalData?: {
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
      keyEntities?: { [key: string]: string };
    };
  };
  onNewAnalysis: () => void;
}

type TabType = "summary" | "flowchart";
type RiskLevel = "safe" | "neutral" | "risky";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
}

export function ResultsPage({ analysisData, onNewAnalysis }: ResultsPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: `I've analyzed your ${analysisData.documentType && analysisData.documentType !== "general"
        ? `${analysisData.documentType} agreement`
        : "document"
        }. What specific questions do you have about the terms or clauses?`,
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (activeTab === "flowchart") {
      mermaid.initialize({ startOnLoad: true, theme: "default" });
      mermaid.contentLoaded();
    }
  }, [activeTab]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !analysisData.additionalData) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: chatInput,
      sender: "user",
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setLoading(true);

    try {
      const response = await askChatbot(analysisData.additionalData, userMessage.text);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response?.answer || response?.summary || "No response available.",
        sender: "ai",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "⚠️ Sorry, I couldn’t get a response from the chatbot.",
          sender: "ai",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };


  // --- Corrected Helper Function to parse Key Entities ---
  const parseKeyEntities = (entitiesString: string | undefined) => {
    if (!entitiesString) return [];

    const lines = entitiesString.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('*'));

    return lines.map(line => {
      const cleanLine = line.replace(/^\*\s*/, '');
      const parts = cleanLine.split(':');
      const key = parts[0]?.trim() || '';
      const value = parts.slice(1).join(':').trim();
      return { key, value };
    });
  };

  const keyPoints = parseKeyEntities(analysisData.additionalData?.keyEntities as string | undefined);
  // --- End of New Helper Function ---

  const getRiskLevel = (level?: string): RiskLevel => {
    switch ((level || "").toLowerCase()) {
      case "green":
      case "neutral": // informational text (title, parties) – not a risk
        return "safe";
      case "red":
        return "risky";
      case "yellow":
      default:
        return "neutral";
    }
  };

  const getRiskColor = (level: RiskLevel) => {
    switch (level) {
      case "safe":
        return "text-google-green bg-google-green/10 border-google-green/20";
      case "neutral":
        return "text-google-yellow bg-google-yellow/10 border-google-yellow/20";
      case "risky":
        return "text-google-red bg-google-red/10 border-google-red/20";
    }
  };

  const getRiskIcon = (level: RiskLevel) => {
    switch (level) {
      case "safe":
        return <CheckCircle className="w-5 h-5" />;
      case "neutral":
        return <AlertTriangle className="w-5 h-5" />;
      case "risky":
        return <XCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="google-fade-in">
      <section className="py-8">
        <div className="container max-w-7xl mx-auto px-6">
          {/* Document Header */}
          <div className="google-card p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-google-blue/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-google-blue" />
                </div>
                <div>
                  <h1 className="font-google-sans text-2xl font-medium text-gray-900">
                    {analysisData.filename}
                  </h1>
                  <p className="text-gray-600 font-roboto">
                    Analysis completed •{" "}
                    {analysisData.documentType && analysisData.documentType !== "general"
                      ? `${analysisData.documentType.charAt(0).toUpperCase()}${analysisData.documentType.slice(1)} Agreement`
                      : "Legal Document"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-google-green/10 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-google-green rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium font-google-sans text-google-green">
                    Analysis Ready
                  </span>
                </div>
                <Button
                  onClick={onNewAnalysis}
                  variant="outline"
                  className="google-button"
                >
                  New Analysis
                </Button>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="google-card bg-gradient-to-r from-google-blue/5 to-google-green/5 border border-gray-100 mb-8">
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-google-blue" />
                <h3 className="text-xl font-google-sans font-medium text-gray-900">
                  Executive Summary
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                {/* Key Points */}
                <div className="space-y-3">
                  <h4 className="font-google-sans font-medium text-gray-800">
                    Key Points
                  </h4>
                  <ul className="space-y-2">
                    {keyPoints.map(({ key, value }, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 font-roboto text-gray-700"
                      >
                        <span className="text-google-blue mt-1.5">●</span>
                        <div>
                          <span className="font-medium">{key}:</span>{" "}
                          <span>{value}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>


                {/* Recommended Actions */}
                <div className="space-y-3">
                  <h4 className="font-google-sans font-medium text-gray-800">
                    Recommended Actions
                  </h4>
                  <ul className="space-y-2">
                    {(analysisData.additionalData?.detailedAnalysis || [])
                      .filter(item => getRiskLevel(item.analysis.risk_level) !== 'safe')
                      .slice(0, 3)
                      .map((item, index) => (
                        <li
                          key={index}
                          className="flex items-center gap-3 font-roboto text-gray-700"
                        >
                          <ArrowRightCircle className="w-5 h-5 text-google-green flex-shrink-0" />
                          {/* Direct access to actionable_advice */}
                          <span>{item.analysis.actionable_advice}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
              {/* Calculate overall risk before rendering */}
              {(() => {
                // Get all risk levels from detailedAnalysis
                const riskLevels = analysisData.additionalData?.detailedAnalysis?.map(
                  item => getRiskLevel(item.analysis.risk_level)
                ) || [];

                // Determine the highest risk present
                let overallRiskLevel: RiskLevel = "safe";
                if (riskLevels.includes("risky")) {
                  overallRiskLevel = "risky";
                } else if (riskLevels.includes("neutral")) {
                  overallRiskLevel = "neutral";
                }

                // Map to display string and color
                const overallRisk = {
                  level:
                    overallRiskLevel === "risky"
                      ? "High"
                      : overallRiskLevel === "neutral"
                        ? "Medium"
                        : "Low",
                  color: getRiskColor(overallRiskLevel),
                };

                return (
                  <div className="border-t border-gray-200 pt-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-google-yellow" />
                    <p className="font-roboto text-gray-800">
                      <span className="font-medium">Overall Risk Level:</span>{" "}
                      <span className={`font-medium capitalize ${overallRisk.color}`}>
                        {overallRisk.level}
                      </span>
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
          {/* Split Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side */}
            <div className="lg:col-span-2 space-y-6">
              <div className="google-card">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6">
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`py-4 px-2 border-b-2 font-google-sans font-medium text-sm transition-colors ${activeTab === "summary"
                        ? "border-google-blue text-google-blue"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Summary & Risk Assessment
                    </button>
                    <button
                      onClick={() => setActiveTab("flowchart")}
                      className={`py-4 px-2 border-b-2 font-google-sans font-medium text-sm transition-colors ${activeTab === "flowchart"
                        ? "border-google-blue text-google-blue"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                      Flowchart
                    </button>
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === "summary" && (
                    <div className="space-y-8">
                      {/* --- Summary Section --- */}
                      <h3 className="text-xl font-google-sans font-medium text-gray-900">
                        Summary
                      </h3>
                      <div className="google-card p-6">
                        <div className="prose prose-blue max-w-none text-gray-700 font-roboto text-base leading-relaxed">
                          <ReactMarkdown>
                            {analysisData.additionalData?.summary || "No summary available."}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* --- Risk Flags Section --- */}
                      <h3 className="text-xl font-google-sans font-medium text-gray-900">
                        Risk Flags
                      </h3>
                      <div className="space-y-4">
                        {analysisData.additionalData?.detailedAnalysis?.map(
                          (item, idx) => (
                            <div
                              key={idx}
                              className={`google-card border-l-4 ${getRiskColor(
                                getRiskLevel(item.analysis.risk_level)
                              )
                                .replace("text-", "border-")
                                .split(" ")[0]}`}
                            >
                              <div className="p-6 space-y-4">
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`p-1.5 rounded-full ${getRiskColor(
                                      getRiskLevel(item.analysis.risk_level)
                                    )}`}
                                  >
                                    {getRiskIcon(
                                      getRiskLevel(item.analysis.risk_level)
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <span
                                      className={`text-xs font-google-sans font-medium px-2 py-1 rounded-full ${getRiskColor(
                                        getRiskLevel(item.analysis.risk_level)
                                      )}`}
                                    >
                                      {/* Direct access to risk_level */}
                                      {(item.analysis.risk_level || "Unrated").toUpperCase()}
                                    </span>
                                    <blockquote className="text-gray-800 font-roboto italic border-l-2 border-gray-200 pl-4 my-2 text-base leading-relaxed">
                                      <ReactMarkdown>
                                        {item.original_clause}
                                      </ReactMarkdown>
                                    </blockquote>
                                    <div className="space-y-3 text-sm">
                                      <div>
                                        <h4 className="font-google-sans font-semibold text-gray-800">
                                          Analysis
                                        </h4>
                                        <p className="text-gray-600 font-roboto">
                                          {/* Direct access to risk_explanation */}
                                          {item.analysis.risk_explanation}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-google-sans font-semibold text-gray-800">
                                          Recommendation
                                        </h4>
                                        <p className="text-gray-600 font-roboto">
                                          {/* Direct access to actionable_advice */}
                                          {item.analysis.actionable_advice}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "flowchart" && (
                    <div>
                      <h3 className="text-xl font-google-sans font-medium text-gray-900 mb-4">
                        Document Decision Flow
                      </h3>
                      <div className="prose max-w-none mb-4">
                        <p className="text-gray-600 font-roboto">
                          Interactive flowchart showing key decision points and outcomes
                        </p>
                      </div>
                      <div className="mermaid" id="mermaid-flowchart">
                        {analysisData.additionalData?.flowchart || "graph TD; A[No flowchart available];"}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

            {/* Right Side - Chatbot */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="google-card h-[600px] flex flex-col">
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-google-blue to-google-green rounded-full flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <h3 className="font-google-sans font-medium text-gray-900">
                          Legal Assistant
                        </h3>
                        <p className="text-xs text-gray-500 font-roboto">
                          Powered by Gemini
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === "user"
                          ? "justify-end"
                          : "justify-start"
                          }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl ${message.sender === "user"
                            ? "bg-google-blue text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                            }`}
                        >
                          <div className="text-sm font-roboto leading-relaxed [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5">
                            <ReactMarkdown>
                              {message.text}
                            </ReactMarkdown>
                          </div>
                          <p
                            className={`text-xs mt-1 ${message.sender === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                              }`}
                          >
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {loading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-600 px-3 py-2 rounded-2xl text-sm">
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleSendMessage()
                        }
                        placeholder="Ask about your document..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-full text-sm font-roboto focus:ring-2 focus:ring-google-blue focus:border-transparent"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || loading}
                        size="sm"
                        className="rounded-full w-8 h-8 p-0 bg-google-blue hover:bg-google-blue/90"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
