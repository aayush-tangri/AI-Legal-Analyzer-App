"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, ChevronUp, ChevronRight, Search, Filter, Download, Share2, Minimize2, Send, FileText, Scale, Users, MessageSquare, ArrowRight, Circle, AlertCircle, CheckCircle, AlertTriangle, Building, User, Calendar, DollarSign } from "lucide-react"
import { toast } from "sonner"

// Dummy data structure
const dummyData = {
  document: {
    title: "Master Service Agreement",
    type: "Contract", 
    date: "2024-01-15",
    pages: 24,
    language: "English"
  },
  keyEntities: {
    parties: [
      { name: "TechCorp Solutions Inc.", role: "Service Provider", type: "company" },
      { name: "Global Industries LLC", role: "Client", type: "company" }
    ],
    keyDates: [
      { date: "2024-01-15", description: "Contract Effective Date" },
      { date: "2024-12-31", description: "Initial Term Expiration" },
      { date: "90 days prior", description: "Renewal Notice Required" }
    ],
    financialTerms: [
      { amount: "$2.5M", description: "Annual Contract Value" },
      { amount: "$2M+", description: "Potential Liability Exposure" },
      { amount: "NET 60", description: "Payment Terms" }
    ]
  },
  summary: {
    short: "This Master Service Agreement contains several high-risk clauses including unlimited liability exposure and automatic renewal terms. The indemnification clause places significant burden on the service provider.",
    full: "This Master Service Agreement contains several high-risk clauses including unlimited liability exposure and automatic renewal terms. The indemnification clause places significant burden on the service provider with potential exposure exceeding $2M annually. Key concerns include ambiguous termination procedures, one-sided intellectual property assignments, and exclusion of consequential damages that may not be enforceable in all jurisdictions. The payment terms favor the client with extended NET 60 terms while requiring immediate deliverables. Recommend negotiating liability caps, mutual indemnification, and clearer termination procedures before execution."
  },
  highlight: "Liability exposure may exceed $2M annually with current indemnification terms",
  clauses: [
    {
      id: "clause-1",
      title: "Unlimited Liability Clause",
      risk: "risky",
      excerpt: "Service Provider shall indemnify and hold harmless Client from any and all claims...",
      fullText: "Service Provider shall indemnify and hold harmless Client from any and all claims, damages, losses, costs, and expenses arising from or relating to the performance of services under this Agreement, without limitation as to amount or scope.",
      recommendation: "Add liability cap of $1M and exclude consequential damages",
      severity: "High",
      relatedNodes: ["node-1", "node-3"]
    },
    {
      id: "clause-2", 
      title: "Automatic Renewal Terms",
      risk: "neutral",
      excerpt: "This Agreement shall automatically renew for successive one-year terms...",
      fullText: "This Agreement shall automatically renew for successive one-year terms unless either party provides ninety (90) days written notice of non-renewal.",
      recommendation: "Standard auto-renewal, ensure calendar reminder for notice period",
      severity: "Medium",
      relatedNodes: ["node-2"]
    },
    {
      id: "clause-3",
      title: "IP Assignment Rights", 
      risk: "safe",
      excerpt: "All work product created under this Agreement remains property of Client...",
      fullText: "All work product, including but not limited to deliverables, documentation, and improvements created under this Agreement shall remain the exclusive property of Client.",
      recommendation: "Standard IP assignment clause, no changes needed",
      severity: "Low",
      relatedNodes: ["node-4"]
    },
    {
      id: "clause-4",
      title: "Payment Terms NET 60",
      risk: "risky", 
      excerpt: "Payment shall be due sixty (60) days after receipt of invoice...",
      fullText: "Payment shall be due sixty (60) days after Client's receipt of properly submitted invoice, subject to Client's standard approval process which may require additional documentation.",
      recommendation: "Negotiate to NET 30 and define approval process timeline",
      severity: "Medium",
      relatedNodes: ["node-5"]
    }
  ],
  flowchart: {
    nodes: [
      { id: "node-1", title: "Liability Assessment", risk: "risky", x: 100, y: 50 },
      { id: "node-2", title: "Renewal Notice", risk: "neutral", x: 300, y: 50 },
      { id: "node-3", title: "Indemnification", risk: "risky", x: 100, y: 150 },
      { id: "node-4", title: "IP Rights", risk: "safe", x: 300, y: 150 },
      { id: "node-5", title: "Payment Process", risk: "risky", x: 200, y: 250 }
    ],
    connections: [
      { from: "node-1", to: "node-3" },
      { from: "node-2", to: "node-4" },
      { from: "node-3", to: "node-5" },
      { from: "node-4", to: "node-5" }
    ]
  }
}

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: Date
}

export default function InsightsScreen() {
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const [selectedClause, setSelectedClause] = useState<string | null>(null)
  const [clauseFilter, setClauseFilter] = useState("all")
  const [clauseSearch, setClauseSearch] = useState("")
  const [highlightedNodes, setHighlightedNodes] = useState<string[]>([])
  const [chatMinimized, setChatMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "ai",
      content: "I've analyzed your Master Service Agreement. I found 4 key clauses that need attention, with 2 high-risk items requiring immediate review. How can I help you understand these findings?",
      timestamp: new Date(Date.now() - 300000)
    }
  ])
  const [chatInput, setChatInput] = useState("")

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case "risky": return <AlertCircle className="w-3 h-3" />
      case "neutral": return <AlertTriangle className="w-3 h-3" />
      case "safe": return <CheckCircle className="w-3 h-3" />
      default: return <Circle className="w-3 h-3" />
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "risky": return "bg-red-100 text-red-800 border-red-200"
      case "neutral": return "bg-yellow-100 text-yellow-800 border-yellow-200" 
      case "safe": return "bg-green-100 text-green-800 border-green-200"
      default: return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case "risky": return "High Risk"
      case "neutral": return "Medium Risk"
      case "safe": return "Low Risk"
      default: return "Unknown"
    }
  }

  const filteredClauses = dummyData.clauses.filter(clause => {
    const matchesFilter = clauseFilter === "all" || clause.risk === clauseFilter
    const matchesSearch = clause.title.toLowerCase().includes(clauseSearch.toLowerCase()) || 
                         clause.excerpt.toLowerCase().includes(clauseSearch.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleClauseClick = useCallback((clauseId: string) => {
    setSelectedClause(selectedClause === clauseId ? null : clauseId)
    const clause = dummyData.clauses.find(c => c.id === clauseId)
    if (clause) {
      setHighlightedNodes(clause.relatedNodes)
    } else {
      setHighlightedNodes([])
    }
  }, [selectedClause])

  const handleSendMessage = useCallback(() => {
    if (!chatInput.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user", 
      content: chatInput,
      timestamp: new Date()
    }

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      type: "ai",
      content: "Based on the clauses I've analyzed, I recommend prioritizing the liability and payment terms. Would you like me to draft specific negotiation points for these issues?",
      timestamp: new Date(Date.now() + 1000)
    }

    setMessages(prev => [...prev, userMessage, aiResponse])
    setChatInput("")
    toast.success("Message sent")
  }, [chatInput])

  const suggestedPrompts = [
    "Summarize risk levels",
    "Show recommended edits", 
    "Explain liability clause",
    "Draft negotiation points"
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          {/* Left Column - Main Content */}
          <div className="space-y-8">
            {/* Key Entity Box with Summary Inside */}
            <Card className="bg-card shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="font-heading text-xl">Key Entities & Executive Summary</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {dummyData.document.type} • {dummyData.document.date} • {dummyData.document.pages} pages • {dummyData.document.language}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm">
                      <Share2 className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Key Entities Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Parties */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm text-foreground">Contract Parties</h4>
                    </div>
                    <div className="space-y-2">
                      {dummyData.keyEntities.parties.map((party, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-sm text-foreground">{party.name}</p>
                          <p className="text-xs text-muted-foreground">{party.role}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Dates */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm text-foreground">Important Dates</h4>
                    </div>
                    <div className="space-y-2">
                      {dummyData.keyEntities.keyDates.map((dateItem, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-sm text-foreground">{dateItem.date}</p>
                          <p className="text-xs text-muted-foreground">{dateItem.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Terms */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <h4 className="font-medium text-sm text-foreground">Financial Terms</h4>
                    </div>
                    <div className="space-y-2">
                      {dummyData.keyEntities.financialTerms.map((term, index) => (
                        <div key={index} className="bg-muted/50 rounded-lg p-3">
                          <p className="font-medium text-sm text-foreground">{term.amount}</p>
                          <p className="text-xs text-muted-foreground">{term.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Critical Finding Alert */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Critical Finding</p>
                      <p className="text-sm text-yellow-700">{dummyData.highlight}</p>
                    </div>
                  </div>
                </div>
                
                {/* Summary Content */}
                <div className="prose prose-sm max-w-none">
                  <h4 className="font-medium text-foreground mb-3">Document Summary</h4>
                  <p className="text-foreground leading-relaxed">
                    {summaryExpanded ? dummyData.summary.full : dummyData.summary.short}
                  </p>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="text-primary hover:text-primary/80"
                >
                  {summaryExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-2" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Read more
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Risk Flags Section */}
            <Card className="bg-card shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Scale className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="font-heading text-xl">Risk Flags</CardTitle>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search clauses..."
                        value={clauseSearch}
                        onChange={(e) => setClauseSearch(e.target.value)}
                        className="w-48"
                      />
                    </div>
                    <Select value={clauseFilter} onValueChange={setClauseFilter}>
                      <SelectTrigger className="w-32">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk</SelectItem>
                        <SelectItem value="risky">High Risk</SelectItem>
                        <SelectItem value="neutral">Medium Risk</SelectItem>
                        <SelectItem value="safe">Low Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {filteredClauses.map((clause) => (
                    <Card key={clause.id} className="border hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div 
                          className="flex items-center justify-between"
                          onClick={() => handleClauseClick(clause.id)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-foreground">{clause.title}</h4>
                              <Badge 
                                variant="outline" 
                                className={`${getRiskColor(clause.risk)} border flex items-center gap-1`}
                              >
                                {getRiskIcon(clause.risk)}
                                {getRiskLabel(clause.risk)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {clause.excerpt}
                            </p>
                          </div>
                          <ChevronRight 
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              selectedClause === clause.id ? 'rotate-90' : ''
                            }`}
                          />
                        </div>

                        {selectedClause === clause.id && (
                          <div className="mt-4 pt-4 border-t border-border space-y-3 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <h5 className="font-medium text-sm text-foreground mb-2">Full Clause Text</h5>
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                {clause.fullText}
                              </p>
                            </div>
                            <div>
                              <h5 className="font-medium text-sm text-foreground mb-2">Recommended Action</h5>
                              <p className="text-sm text-foreground">
                                {clause.recommendation}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              Severity: {clause.severity}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Flowchart Section */}
            <Card className="bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="font-heading text-xl">Document Flow Analysis</CardTitle>
                <CardDescription>Visual representation of clause relationships and dependencies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative bg-muted/30 rounded-lg p-8 min-h-[400px]">
                  <svg width="100%" height="400" viewBox="0 0 500 350" className="overflow-visible">
                    {/* Connections */}
                    {dummyData.flowchart.connections.map((conn, index) => {
                      const fromNode = dummyData.flowchart.nodes.find(n => n.id === conn.from)
                      const toNode = dummyData.flowchart.nodes.find(n => n.id === conn.to)
                      if (!fromNode || !toNode) return null

                      const isHighlighted = highlightedNodes.includes(conn.from) || highlightedNodes.includes(conn.to)
                      
                      return (
                        <line
                          key={index}
                          x1={fromNode.x + 60}
                          y1={fromNode.y + 20}
                          x2={toNode.x + 60}
                          y2={toNode.y + 20}
                          stroke={isHighlighted ? "#e7ff3a" : "#e6dfd2"}
                          strokeWidth={isHighlighted ? "3" : "2"}
                          markerEnd="url(#arrowhead)"
                          className="transition-all duration-200"
                        />
                      )
                    })}
                    
                    {/* Arrow marker */}
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="#8a847b"
                        />
                      </marker>
                    </defs>
                  </svg>
                  
                  {/* Nodes */}
                  {dummyData.flowchart.nodes.map((node) => {
                    const isHighlighted = highlightedNodes.includes(node.id)
                    return (
                      <div
                        key={node.id}
                        className={`absolute bg-card border rounded-lg p-3 min-w-[120px] transition-all duration-200 ${
                          isHighlighted 
                            ? 'border-accent shadow-lg scale-105' 
                            : 'border-border shadow-sm hover:shadow-md'
                        }`}
                        style={{ 
                          left: `${node.x}px`, 
                          top: `${node.y}px` 
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {node.title}
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            node.risk === 'risky' ? 'bg-red-500' :
                            node.risk === 'neutral' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <h5 className="font-medium text-sm text-foreground mb-3">Legend</h5>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm text-muted-foreground">High Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm text-muted-foreground">Medium Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">Low Risk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Dependencies</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Chat Sidebar */}
          <div className="lg:sticky lg:top-8 lg:h-fit">
            <Card className={`bg-card shadow-lg transition-all duration-200 ${chatMinimized ? 'h-16' : 'h-[600px]'}`}>
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        LA
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-heading text-lg">Legal Assistant</CardTitle>
                      <CardDescription className="text-xs">Available • Ready to help</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatMinimized(!chatMinimized)}
                  >
                    <Minimize2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>

              {!chatMinimized && (
                <>
                  <CardContent className="p-0 flex flex-col h-[480px]">
                    {/* Chat Messages */}
                    <ScrollArea className="flex-1 p-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                                message.type === 'user'
                                  ? 'bg-primary text-primary-foreground ml-4'
                                  : 'bg-muted text-foreground mr-4'
                              }`}
                            >
                              <p className="leading-relaxed">{message.content}</p>
                              <p className={`text-xs mt-2 ${
                                message.type === 'user' 
                                  ? 'text-primary-foreground/70' 
                                  : 'text-muted-foreground'
                              }`}>
                                {message.timestamp.toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* Suggested Prompts */}
                    <div className="p-4 border-t border-border">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {suggestedPrompts.map((prompt) => (
                          <Button
                            key={prompt}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setChatInput(prompt)}
                          >
                            {prompt}
                          </Button>
                        ))}
                      </div>

                      {/* Chat Input */}
                      <div className="flex gap-2">
                        <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask about your document..."
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}