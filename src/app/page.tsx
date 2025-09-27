'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, BarChart3, Settings, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { SPCClaimsOrchestrator } from '@/lib/SPCClaimsOrchestrator';
import { XactimateClaim, SPCQuote, DashboardStats, AgentResponse } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [orchestrator] = useState(new SPCClaimsOrchestrator());
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentClaims, setRecentClaims] = useState<XactimateClaim[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<SPCQuote[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [uploadedClaimFile, setUploadedClaimFile] = useState<File | null>(null);
  const [uploadedRoofReportFile, setUploadedRoofReportFile] = useState<File | null>(null);
  const [uploadedTestRoofFile, setUploadedTestRoofFile] = useState<File | null>(null);
  const [lyzrStatus, setLyzrStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [processingResult, setProcessingResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [testRoofResponse, setTestRoofResponse] = useState<any>(null);
  const [isTestingRoof, setIsTestingRoof] = useState(false);
  const [testRoofStatus, setTestRoofStatus] = useState<string>('');

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

  const handleClaimFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploadedClaimFile(file);
  };

  const handleRoofReportFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploadedRoofReportFile(file);
  };

  const handleTestRoofFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setUploadedTestRoofFile(file);
  };

  const handleTestRoofMeasurementAgent = async () => {
    if (!uploadedTestRoofFile) {
      alert('Please upload a PDF file to test');
      return;
    }

    setIsTestingRoof(true);
    setTestRoofStatus('Uploading PDF to RAG training system...');
    setTestRoofResponse(null);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      formData.append('data_parser', 'llmsherpa');
      formData.append('extra_info', '{}');
      formData.append('file', uploadedTestRoofFile);

      setTestRoofStatus('Sending PDF to RAG training endpoint...');

      // Call the RAG training API directly
      const response = await fetch('https://rag-prod.studio.lyzr.ai/v3/train/pdf/?rag_id=68d6bfd61b693edb7cee5f65', {
        method: 'POST',
        headers: {
          'x-api-key': 'sk-default-umuEtNZJCnYbBCmy448B42Neb90nTx5W'
          // Note: Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      
      setTestRoofStatus('PDF uploaded to RAG training system successfully!');
      setTestRoofResponse(result);
      console.log('RAG training response:', result);
      
    } catch (error) {
      console.error('Error uploading PDF to RAG training:', error);
      setTestRoofStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTestingRoof(false);
    }
  };

  const handleProcessFiles = async () => {
    if (!uploadedClaimFile || !uploadedRoofReportFile) {
      alert('Please upload both the insurance claim PDF and roof report PDF');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Uploading files...');
    setShowResults(false);
    setProcessingResult(null);

    try {
      const formData = new FormData();
      formData.append('claimFile', uploadedClaimFile);
      formData.append('roofReportFile', uploadedRoofReportFile);
      
      setProcessingStatus('Sending to Lyzr orchestrator...');
      
      const response = await fetch('/api/process-claim', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setProcessingStatus('Processing completed! Redirecting to estimate...');
        setProcessingResult(result.data);
        setShowResults(true);
        console.log('Processing result:', result.data);
        
        // Refresh dashboard data
        await loadDashboardData();
        
        // Redirect to estimate page after a short delay
        setTimeout(() => {
          router.push('/estimate');
        }, 3000);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
      
    } catch (error) {
      console.error('Error processing claim:', error);
      setProcessingStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                <p className="text-sm text-blue-600">Powered by Lyzr Orchestrator Agent</p>
                <p className="text-xs text-gray-500">Coordinating 6 specialized agents for complete workflow</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  lyzrStatus === 'connected' ? 'bg-green-500' : 
                  lyzrStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`}></div>
                <span className="text-sm text-gray-500">
                  {lyzrStatus === 'connected' ? 'Orchestrator Ready' : 
                   lyzrStatus === 'error' ? 'Orchestrator Error' : 'Checking...'}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Upload Documents</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Insurance Claim Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Insurance Claim PDF</h3>
                <p className="text-xs text-gray-600">
                  Upload your Xactimate claim PDF
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleClaimFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  id="claim-file-upload"
                />
                <label
                  htmlFor="claim-file-upload"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Choose Claim File
                </label>
              </div>
              {uploadedClaimFile && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {uploadedClaimFile.name}
                </p>
              )}
            </div>

            {/* Roof Report Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Roof Report PDF</h3>
                <p className="text-xs text-gray-600">
                  Upload your roof measurement report
                </p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleRoofReportFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                  id="roof-report-file-upload"
                />
                <label
                  htmlFor="roof-report-file-upload"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Choose Roof Report
                </label>
              </div>
              {uploadedRoofReportFile && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ {uploadedRoofReportFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Process Button */}
          <div className="text-center">
            <button
              onClick={handleProcessFiles}
              disabled={isProcessing || !uploadedClaimFile || !uploadedRoofReportFile}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Process Both Documents'}
            </button>
          </div>

          {processingStatus && (
            <p className="text-sm text-blue-600 mt-4 text-center">
              {processingStatus}
            </p>
          )}
        </div>

        {/* Upload Roof Measurement Report to RAG Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Upload Roof Measurement Report to RAG</h2>
          
          <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center mb-6">
            <Upload className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">PDF Upload</h3>
              <p className="text-xs text-gray-600">
                Upload a roof measurement report PDF to train the RAG system
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleTestRoofFileUpload}
                disabled={isTestingRoof}
                className="hidden"
                id="test-roof-file-upload"
              />
                <label
                  htmlFor="test-roof-file-upload"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Choose PDF
                </label>
            </div>
            {uploadedTestRoofFile && (
              <p className="text-xs text-green-600 mt-2">
                ✓ {uploadedTestRoofFile.name}
              </p>
            )}
          </div>

          {/* Test Button */}
          <div className="text-center">
            <button
              onClick={handleTestRoofMeasurementAgent}
              disabled={isTestingRoof || !uploadedTestRoofFile}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingRoof ? 'Uploading...' : 'Upload to RAG Training System'}
            </button>
          </div>

          {testRoofStatus && (
            <p className="text-sm text-orange-600 mt-4 text-center">
              {testRoofStatus}
            </p>
          )}

          {/* RAG Training Response Display */}
          {testRoofResponse && (
            <div className="mt-6 border rounded-lg p-4">
              <h3 className="text-md font-semibold text-gray-800 mb-3">RAG Training Response (Debug Output)</h3>
              <div className="bg-gray-50 rounded p-3">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(testRoofResponse, null, 2)}
                </pre>
              </div>
              <div className="mt-4 flex space-x-4">
                <button
                  onClick={() => setTestRoofResponse(null)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Clear Response
                </button>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(testRoofResponse, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `rag-training-response-${Date.now()}.json`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download Response
                </button>
              </div>
            </div>
          )}
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

        {/* Processing Results */}
        {showResults && processingResult && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Results</h2>
            <div className="space-y-6">
              {/* Claim Information */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Claim Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Claim ID</p>
                    <p className="font-medium">{processingResult.claim.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">File Name</p>
                    <p className="font-medium">{processingResult.claim.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Property Address</p>
                    <p className="font-medium">{processingResult.claim.extractedData.propertyInfo.address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Claim Value</p>
                    <p className="font-medium text-green-600">{formatCurrency(processingResult.claim.extractedData.totals.total)}</p>
                  </div>
                </div>
              </div>

              {/* SPC Quote */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">SPC Quote</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Quote ID</p>
                    <p className="font-medium">{processingResult.spcQuote.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Trust Score</p>
                    <p className="font-medium text-blue-600">{formatPercentage(processingResult.spcQuote.trustScore)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Compliance Score</p>
                    <p className="font-medium text-green-600">{formatPercentage(processingResult.spcQuote.validationResults.complianceScore)}</p>
                  </div>
                </div>
              </div>

              {/* Carrier Fit */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Carrier Fit Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Recommended Carrier</p>
                    <p className="font-medium">{processingResult.spcQuote.carrierFit.carrierName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fit Score</p>
                    <p className="font-medium text-purple-600">{formatPercentage(processingResult.spcQuote.carrierFit.fitScore)}</p>
                  </div>
                </div>
                {processingResult.spcQuote.carrierFit.recommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Recommendations</p>
                    <ul className="list-disc list-inside space-y-1">
                      {processingResult.spcQuote.carrierFit.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="text-sm text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Roof Report Information */}
              {processingResult.roofReport && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-3">Roof Report Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Report ID</p>
                      <p className="font-medium">{processingResult.roofReport.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">File Name</p>
                      <p className="font-medium">{processingResult.roofReport.fileName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Area</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.totalArea} sq ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Net Area</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.netArea} sq ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Predominant Pitch</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.predominantPitch}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Facet Count</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.facetCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Eave Length</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.eaveLength} ft</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ridge Length</p>
                      <p className="font-medium">{processingResult.roofReport.extractedData.roofMeasurements.ridgeLength} ft</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Roof Analysis */}
              {processingResult.roofAnalysis && (
                <div className="border rounded-lg p-4">
                  <h3 className="text-md font-semibold text-gray-800 mb-3">Roof Analysis</h3>
                  
                  {/* Area Discrepancies */}
                  {processingResult.roofAnalysis.areaDiscrepancies && processingResult.roofAnalysis.areaDiscrepancies.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Area Discrepancies</h4>
                      <div className="space-y-2">
                        {processingResult.roofAnalysis.areaDiscrepancies.map((discrepancy: any, index: number) => (
                          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{discrepancy.type} Area</p>
                                <p className="text-sm text-gray-600">
                                  Estimated: {discrepancy.estimatedValue} sq ft | 
                                  Measured: {discrepancy.measuredValue} sq ft | 
                                  Variance: {discrepancy.variance}%
                                </p>
                                <p className="text-sm text-gray-700 mt-1">{discrepancy.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Material Recommendations */}
                  {processingResult.roofAnalysis.materialRecommendations && processingResult.roofAnalysis.materialRecommendations.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Material Recommendations</h4>
                      <div className="space-y-2">
                        {processingResult.roofAnalysis.materialRecommendations.map((rec: any, index: number) => (
                          <div key={index} className="bg-blue-50 border border-blue-200 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{rec.category}</p>
                                <p className="text-sm text-gray-600">
                                  Current: {rec.currentSpec} → Recommended: {rec.recommendedSpec}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">{rec.reasoning}</p>
                                {rec.costImpact > 0 && (
                                  <p className="text-sm text-green-600 mt-1">Cost Impact: {formatCurrency(rec.costImpact)}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Code Compliance Issues */}
                  {processingResult.roofAnalysis.codeComplianceIssues && processingResult.roofAnalysis.codeComplianceIssues.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Code Compliance Issues</h4>
                      <div className="space-y-2">
                        {processingResult.roofAnalysis.codeComplianceIssues.map((issue: any, index: number) => (
                          <div key={index} className={`border rounded p-3 ${
                            issue.severity === 'Critical' ? 'bg-red-50 border-red-200' :
                            issue.severity === 'High' ? 'bg-orange-50 border-orange-200' :
                            issue.severity === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{issue.rule}</p>
                                <p className="text-sm text-gray-600">{issue.description}</p>
                                <p className="text-sm text-gray-700 mt-1">{issue.recommendation}</p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded ${
                                issue.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                                issue.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                                issue.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ventilation Analysis */}
                  {processingResult.roofAnalysis.ventilationAnalysis && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Ventilation Analysis</h4>
                      <div className={`border rounded p-3 ${
                        processingResult.roofAnalysis.ventilationAnalysis.compliance ? 
                        'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Current NFA: {processingResult.roofAnalysis.ventilationAnalysis.currentNFA} sq in
                            </p>
                            <p className="text-sm text-gray-600">
                              Required NFA: {processingResult.roofAnalysis.ventilationAnalysis.requiredNFA} sq in
                            </p>
                            <p className="text-sm font-medium mt-1">
                              Status: {processingResult.roofAnalysis.ventilationAnalysis.compliance ? 
                                <span className="text-green-600">Compliant</span> : 
                                <span className="text-red-600">Non-Compliant</span>
                              }
                            </p>
                          </div>
                        </div>
                        {processingResult.roofAnalysis.ventilationAnalysis.recommendations && 
                         processingResult.roofAnalysis.ventilationAnalysis.recommendations.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Recommendations:</p>
                            <ul className="list-disc list-inside mt-1">
                              {processingResult.roofAnalysis.ventilationAnalysis.recommendations.map((rec: string, index: number) => (
                                <li key={index} className="text-sm text-gray-600">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Suggested Adjustments */}
                  {processingResult.roofAnalysis.suggestedAdjustments && processingResult.roofAnalysis.suggestedAdjustments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Adjustments</h4>
                      <div className="space-y-2">
                        {processingResult.roofAnalysis.suggestedAdjustments.map((adjustment: any, index: number) => (
                          <div key={index} className="bg-green-50 border border-green-200 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Rule {adjustment.ruleNumber}: {adjustment.description}
                                </p>
                                <p className="text-sm text-gray-700 mt-1">{adjustment.reasoning}</p>
                                <p className="text-sm text-green-600 mt-1">
                                  Adjustment: {formatCurrency(adjustment.adjustment)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Line Items */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {processingResult.claim.extractedData.lineItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.quantity} {item.unit}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lyzr Response */}
              <div className="border rounded-lg p-4">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Lyzr Orchestrator Response</h3>
                <div className="bg-gray-50 rounded p-3">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(processingResult.lyzrResponse, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowResults(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Close Results
                </button>
                <button
                  onClick={() => {
                    const dataStr = JSON.stringify(processingResult, null, 2);
                    const dataBlob = new Blob([dataStr], {type: 'application/json'});
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `spc-claim-${processingResult.claim.id}.json`;
                    link.click();
                  }}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download Results
                </button>
              </div>
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