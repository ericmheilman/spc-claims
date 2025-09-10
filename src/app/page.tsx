'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, BarChart3, Settings, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SPCClaimsOrchestrator } from '@/lib/SPCClaimsOrchestrator';
import { XactimateClaim, SPCQuote, DashboardStats, AgentResponse } from '@/types';

export default function HomePage() {
  const [orchestrator] = useState(new SPCClaimsOrchestrator());
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentClaims, setRecentClaims] = useState<XactimateClaim[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<SPCQuote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lyzrStatus, setLyzrStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    loadDashboardData();
    checkLyzrStatus();
  }, []);

  const checkLyzrStatus = async () => {
    try {
      // Test Lyzr connection
      const response = await fetch('/api/lyzr-status');
      if (response.ok) {
        setLyzrStatus('connected');
      } else {
        setLyzrStatus('error');
      }
    } catch (error) {
      console.error('Error checking Lyzr status:', error);
      setLyzrStatus('error');
    }
  };

  const loadDashboardData = async () => {
    try {
      const stats = await orchestrator.getDashboardStats();
      const claims = await orchestrator.getClaimHistory(5);
      const quotes = await orchestrator.getQuoteHistory(5);
      
      setDashboardStats(stats);
      setRecentClaims(claims);
      setRecentQuotes(quotes);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);
    setProcessingStatus('Uploading file...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfContent = Buffer.from(arrayBuffer);
      
      setProcessingStatus('Processing claim...');
      const result = await orchestrator.processClaim(pdfContent, file.name);
      
      setProcessingStatus('Processing completed!');
      console.log('Processing result:', result);
      
      // Refresh dashboard data
      await loadDashboardData();
      
    } catch (error) {
      console.error('Error processing claim:', error);
      setProcessingStatus('Error processing claim');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SPC Claims Carrier Network</h1>
                <p className="text-sm text-blue-600">Powered by Lyzr AI Orchestrator</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  lyzrStatus === 'connected' ? 'bg-green-500' : 
                  lyzrStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-500">
                  {lyzrStatus === 'connected' ? 'Lyzr Connected' : 
                   lyzrStatus === 'error' ? 'Lyzr Error' : 'Checking...'}
                </span>
              </div>
              <Settings className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">Admin</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Xactimate Claim</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Drag and drop your Xactimate PDF here, or click to browse
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Choose File'}
              </label>
            </div>
            {uploadedFile && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {uploadedFile.name}
              </p>
            )}
            {processingStatus && (
              <p className="text-sm text-blue-600 mt-2">
                {processingStatus}
              </p>
            )}
          </div>
        </div>

        {/* Dashboard Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Claims</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardStats.totalClaims}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Processed</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardStats.processedClaims}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Processing Time</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardStats.averageProcessingTime}s</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(dashboardStats.successRate / 100)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {dashboardStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Savings</h3>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(dashboardStats.totalSavings)}</p>
              <p className="text-sm text-gray-500 mt-2">Generated through bundle optimization</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Trust Score</h3>
              <p className="text-3xl font-bold text-blue-600">{formatPercentage(dashboardStats.averageTrustScore)}</p>
              <p className="text-sm text-gray-500 mt-2">Quality assessment across all claims</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Efficiency</h3>
              <p className="text-3xl font-bold text-purple-600">{formatPercentage(dashboardStats.successRate / 100)}</p>
              <p className="text-sm text-gray-500 mt-2">Successful claim processing rate</p>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Claims</h3>
            {recentClaims.length > 0 ? (
              <div className="space-y-3">
                {recentClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(claim.processingStatus.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{claim.fileName}</p>
                        <p className="text-xs text-gray-500">{claim.uploadDate.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(claim.extractedData.totals.total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPercentage(claim.extractedData.metadata.confidenceScore)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent claims</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
            {recentQuotes.length > 0 ? (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(quote.status.status)}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{quote.id}</p>
                        <p className="text-xs text-gray-500">{quote.generatedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(quote.quoteData.totals.total)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatPercentage(quote.trustScore)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent quotes</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}