// SPC Claims System Types

export interface XactimateClaim {
  id: string;
  fileName: string;
  uploadDate: Date;
  rawContent: string;
  extractedData: ExtractedClaimData;
  processingStatus: ProcessingStatus;
}

export interface ExtractedClaimData {
  propertyInfo: PropertyInfo;
  claimDetails: ClaimDetails;
  lineItems: LineItem[];
  totals: ClaimTotals;
  metadata: ClaimMetadata;
}

export interface PropertyInfo {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string;
  squareFootage?: number;
  yearBuilt?: number;
}

export interface ClaimDetails {
  claimNumber: string;
  dateOfLoss: Date;
  causeOfLoss: string;
  policyNumber: string;
  adjusterName: string;
  adjusterContact: string;
  contractorName?: string;
  contractorContact?: string;
}

export interface LineItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export interface ClaimTotals {
  subtotal: number;
  tax: number;
  total: number;
  overhead?: number;
  profit?: number;
}

export interface ClaimMetadata {
  pdfPages: number;
  processingTime: number;
  confidenceScore: number;
  extractedAt: Date;
}

export interface SPCQuote {
  id: string;
  claimId: string;
  generatedAt: Date;
  quoteData: QuoteData;
  validationResults: ValidationResults;
  carrierFit: CarrierFit;
  trustScore: number;
  status: QuoteStatus;
}

export interface QuoteData {
  propertyInfo: PropertyInfo;
  claimDetails: ClaimDetails;
  lineItems: LineItem[];
  totals: ClaimTotals;
  spcRecommendations: SPCRecommendation[];
  bundleLogic: BundleLogic;
}

export interface SPCRecommendation {
  category: string;
  recommendation: string;
  priority: 'High' | 'Medium' | 'Low';
  reasoning: string;
  estimatedImpact: number;
}

export interface BundleLogic {
  bundles: Bundle[];
  totalSavings: number;
  efficiencyGains: number;
}

export interface Bundle {
  id: string;
  name: string;
  lineItems: string[];
  savings: number;
  reasoning: string;
}

export interface ValidationResults {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  complianceScore: number;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion: string;
}

export interface CarrierFit {
  carrierId: string;
  carrierName: string;
  fitScore: number;
  preferences: CarrierPreference[];
  recommendations: string[];
}

export interface CarrierPreference {
  category: string;
  preference: string;
  weight: number;
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  status: 'success' | 'error' | 'processing';
  response: any;
  processingTime: number;
  confidence: number;
  timestamp: Date;
}

export interface ProcessingStatus {
  claimId: string;
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  progress: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errors?: string[];
}

export interface DashboardStats {
  totalClaims: number;
  processedClaims: number;
  averageProcessingTime: number;
  successRate: number;
  totalSavings: number;
  averageTrustScore: number;
}

export interface QuoteStatus {
  status: 'draft' | 'validated' | 'approved' | 'rejected' | 'regenerated';
  lastUpdated: Date;
  updatedBy: string;
  notes?: string;
}

// Agent-specific types
export interface ClaimIngestorResponse {
  extractedData: ExtractedClaimData;
  confidence: number;
  processingTime: number;
}

export interface QuoteValidatorResponse {
  validationResults: ValidationResults;
  recommendations: string[];
  complianceScore: number;
}

export interface BundleLogicResponse {
  bundleLogic: BundleLogic;
  savings: number;
  efficiencyGains: number;
}

export interface TrustLayerResponse {
  trustScore: number;
  riskFactors: string[];
  recommendations: string[];
  auditTrail: string[];
}

export interface CarrierFitResponse {
  carrierFit: CarrierFit;
  fitScore: number;
  recommendations: string[];
}

export interface RegenerationResponse {
  spcQuote: SPCQuote;
  success: boolean;
  processingTime: number;
}

