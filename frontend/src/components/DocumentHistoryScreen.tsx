"use client";

import React, { useState, useMemo } from 'react';
import { Search, FileText, Eye, RotateCcw, Clock, Calendar, Filter, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DocumentRecord {
  id: string;
  filename: string;
  uploadDate: Date;
  analysisDate: Date;
  status: 'completed' | 'failed' | 'pending';
  riskLevel?: 'low' | 'medium' | 'high';
  documentType?: string;
}

// Mock data for demonstration
const mockDocuments: DocumentRecord[] = [
  {
    id: 'doc-1',
    filename: 'Software_License_Agreement_v2.pdf',
    uploadDate: new Date('2024-01-15T10:30:00'),
    analysisDate: new Date('2024-01-15T10:32:15'),
    status: 'completed',
    riskLevel: 'medium',
    documentType: 'License Agreement'
  },
  {
    id: 'doc-2',
    filename: 'Employment_Contract_John_Doe.pdf',
    uploadDate: new Date('2024-01-14T14:20:00'),
    analysisDate: new Date('2024-01-14T14:22:45'),
    status: 'completed',
    riskLevel: 'low',
    documentType: 'Employment Contract'
  },
  {
    id: 'doc-3',
    filename: 'Vendor_Service_Agreement.pdf',
    uploadDate: new Date('2024-01-13T09:15:00'),
    analysisDate: new Date('2024-01-13T09:18:30'),
    status: 'completed',
    riskLevel: 'high',
    documentType: 'Service Agreement'
  },
  {
    id: 'doc-4',
    filename: 'NDA_Template_v3.pdf',
    uploadDate: new Date('2024-01-12T16:45:00'),
    analysisDate: new Date('2024-01-12T16:47:20'),
    status: 'completed',
    riskLevel: 'low',
    documentType: 'Non-Disclosure Agreement'
  },
  {
    id: 'doc-5',
    filename: 'Partnership_Agreement_Draft.pdf',
    uploadDate: new Date('2024-01-11T11:30:00'),
    analysisDate: new Date('2024-01-11T11:35:10'),
    status: 'failed',
    documentType: 'Partnership Agreement'
  },
];

export const DocumentHistoryScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  const filteredDocuments = useMemo(() => {
    return mockDocuments.filter(doc => {
      const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           doc.documentType?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
      const matchesRisk = riskFilter === 'all' || doc.riskLevel === riskFilter;
      
      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [searchTerm, statusFilter, riskFilter]);

  const getStatusBadge = (status: DocumentRecord['status']) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      pending: 'secondary',
    } as const;

    const labels = {
      completed: 'Completed',
      failed: 'Failed',
      pending: 'Pending',
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel?: DocumentRecord['riskLevel']) => {
    if (!riskLevel) return null;

    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200',
    };

    const labels = {
      low: 'Low Risk',
      medium: 'Medium Risk',
      high: 'High Risk',
    };

    return (
      <Badge variant="outline" className={`text-xs ${colors[riskLevel]}`}>
        {labels[riskLevel]}
      </Badge>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleViewDocument = (docId: string) => {
    console.log('View document:', docId);
    // Navigation to insights view would go here
  };

  const handleReanalyze = async (docId: string) => {
    setIsLoading(true);
    console.log('Re-analyze document:', docId);
    // Re-analysis logic would go here
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-gradient-start)] to-[var(--bg-gradient-end)]">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-3">
            Document History
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            View and manage all your previously analyzed legal documents. Track analysis results, 
            re-run analyses, or review past insights.
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8 shadow-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:border-primary"
                />
              </div>
              
              <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risks</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredDocuments.length} of {mockDocuments.length} documents
          </p>
        </div>

        {/* Document List */}
        {filteredDocuments.length === 0 ? (
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading text-xl font-semibold mb-2">
                {searchTerm || statusFilter !== 'all' || riskFilter !== 'all' 
                  ? 'No documents found' 
                  : 'No documents analyzed yet'
                }
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' || riskFilter !== 'all'
                  ? 'Try adjusting your search terms or filters to find what you\'re looking for.'
                  : 'Start by uploading and analyzing your first legal document to see it appear here.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => (
              <Card 
                key={doc.id} 
                className="shadow-sm border-border/50 hover:shadow-md transition-all duration-200 hover:border-primary/20"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3 mb-3">
                        <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-foreground truncate text-lg">
                            {doc.filename}
                          </h3>
                          <p className="text-muted-foreground text-sm mt-1">
                            {doc.documentType}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>Uploaded {formatDate(doc.uploadDate)}</span>
                        </div>
                        {doc.status === 'completed' && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Analyzed {formatDate(doc.analysisDate)}</span>
                          </div>
                        )}
                        <span className="text-muted-foreground/60">•</span>
                        <span className="font-mono text-xs">ID: {doc.id}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="flex gap-2">
                        {getStatusBadge(doc.status)}
                        {getRiskBadge(doc.riskLevel)}
                      </div>
                      
                      <div className="flex gap-2">
                        {doc.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc.id)}
                            className="hover:bg-primary hover:text-primary-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReanalyze(doc.id)}
                          disabled={isLoading}
                          className="hover:bg-secondary transition-colors"
                        >
                          <RotateCcw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                          Re-analyze
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};