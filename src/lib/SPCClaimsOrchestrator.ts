import { ClaimIngestorAgent } from '@/agents/ClaimIngestorAgent';
import { QuoteValidatorAgent } from '@/agents/QuoteValidatorAgent';
import { BundleLogicAgent } from '@/agents/BundleLogicAgent';
import { TrustLayerAgent } from '@/agents/TrustLayerAgent';
import { CarrierFitAgent } from '@/agents/CarrierFitAgent';
import { RegenerationAgent } from '@/agents/RegenerationAgent';
import { 
  XactimateClaim, 
  SPCQuote, 
  AgentResponse, 
  ProcessingStatus,
  DashboardStats 
} from '@/types';

export class SPCClaimsOrchestrator {
  private claimIngestor: ClaimIngestorAgent;
  private quoteValidator: QuoteValidatorAgent;
  private bundleLogic: BundleLogicAgent;
  private trustLayer: TrustLayerAgent;
  private carrierFit: CarrierFitAgent;
  private regeneration: RegenerationAgent;

  constructor() {
    this.claimIngestor = new ClaimIngestorAgent();
    this.quoteValidator = new QuoteValidatorAgent();
    this.bundleLogic = new BundleLogicAgent();
    this.trustLayer = new TrustLayerAgent();
    this.carrierFit = new CarrierFitAgent();
    this.regeneration = new RegenerationAgent();
  }

  async processClaim(pdfContent: Buffer, fileName: string): Promise<{
    claim: XactimateClaim;
    spcQuote: SPCQuote;
    processingStatus: ProcessingStatus;
    agentResponses: AgentResponse[];
  }> {
    const startTime = Date.now();
    const claimId = `CLM-${Date.now()}`;
    const agentResponses: AgentResponse[] = [];
    
    // Initialize processing status
    const processingStatus: ProcessingStatus = {
      claimId,
      currentStep: 'claim-ingestion',
      completedSteps: [],
      totalSteps: 6,
      progress: 0,
      status: 'processing'
    };

    try {
      // Step 1: Claim Ingestion
      console.log('Step 1: Starting claim ingestion...');
      const ingestionResponse = await this.claimIngestor.processClaim(pdfContent, fileName);
      agentResponses.push({
        agentId: 'claim-ingestor',
        agentName: 'Claim Ingestor Agent',
        status: 'success',
        response: ingestionResponse,
        processingTime: ingestionResponse.processingTime,
        confidence: ingestionResponse.confidence,
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('claim-ingestion');
      processingStatus.currentStep = 'quote-validation';
      processingStatus.progress = 16.67;

      // Step 2: Quote Validation
      console.log('Step 2: Starting quote validation...');
      const validationResponse = await this.quoteValidator.validateQuote(ingestionResponse.extractedData);
      agentResponses.push({
        agentId: 'quote-validator',
        agentName: 'Quote Validator Agent',
        status: 'success',
        response: validationResponse,
        processingTime: validationResponse.processingTime,
        confidence: validationResponse.complianceScore,
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('quote-validation');
      processingStatus.currentStep = 'bundle-logic';
      processingStatus.progress = 33.33;

      // Step 3: Bundle Logic Analysis
      console.log('Step 3: Starting bundle logic analysis...');
      const bundleResponse = await this.bundleLogic.optimizeBundles(ingestionResponse.extractedData);
      agentResponses.push({
        agentId: 'bundle-logic',
        agentName: 'Bundle Logic Agent',
        status: 'success',
        response: bundleResponse,
        processingTime: bundleResponse.processingTime,
        confidence: 0.9, // High confidence in bundle logic
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('bundle-logic');
      processingStatus.currentStep = 'trust-assessment';
      processingStatus.progress = 50;

      // Step 4: Trust Layer Assessment
      console.log('Step 4: Starting trust assessment...');
      const trustResponse = await this.trustLayer.assessTrust(ingestionResponse.extractedData);
      agentResponses.push({
        agentId: 'trust-layer',
        agentName: 'Trust Layer Agent',
        status: 'success',
        response: trustResponse,
        processingTime: trustResponse.processingTime,
        confidence: trustResponse.trustScore,
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('trust-assessment');
      processingStatus.currentStep = 'carrier-fit';
      processingStatus.progress = 66.67;

      // Step 5: Carrier Fit Assessment
      console.log('Step 5: Starting carrier fit assessment...');
      const carrierResponse = await this.carrierFit.assessCarrierFit(ingestionResponse.extractedData);
      agentResponses.push({
        agentId: 'carrier-fit',
        agentName: 'Carrier Fit Agent',
        status: 'success',
        response: carrierResponse,
        processingTime: carrierResponse.processingTime,
        confidence: carrierResponse.fitScore,
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('carrier-fit');
      processingStatus.currentStep = 'quote-regeneration';
      processingStatus.progress = 83.33;

      // Step 6: Quote Regeneration
      console.log('Step 6: Starting quote regeneration...');
      const regenerationResponse = await this.regeneration.regenerateQuote(
        ingestionResponse.extractedData,
        validationResponse.validationResults,
        bundleResponse.bundleLogic,
        carrierResponse.carrierFit,
        trustResponse
      );
      agentResponses.push({
        agentId: 'regeneration',
        agentName: 'Regeneration Agent',
        status: 'success',
        response: regenerationResponse,
        processingTime: regenerationResponse.processingTime,
        confidence: 0.95, // High confidence in regeneration
        timestamp: new Date()
      });

      processingStatus.completedSteps.push('quote-regeneration');
      processingStatus.currentStep = 'completed';
      processingStatus.progress = 100;
      processingStatus.status = 'completed';

      // Create the claim object
      const claim: XactimateClaim = {
        id: claimId,
        fileName,
        uploadDate: new Date(),
        rawContent: pdfContent.toString('base64'),
        extractedData: ingestionResponse.extractedData,
        processingStatus
      };

      const totalProcessingTime = Date.now() - startTime;
      console.log(`Claim processing completed in ${totalProcessingTime}ms`);

      return {
        claim,
        spcQuote: regenerationResponse.spcQuote,
        processingStatus,
        agentResponses
      };

    } catch (error) {
      console.error('Error processing claim:', error);
      
      processingStatus.status = 'error';
      processingStatus.errors = [error instanceof Error ? error.message : 'Unknown error'];
      
      // Add error response for the failed agent
      const errorResponse: AgentResponse = {
        agentId: processingStatus.currentStep,
        agentName: this.getAgentName(processingStatus.currentStep),
        status: 'error',
        response: { error: error instanceof Error ? error.message : 'Unknown error' },
        processingTime: 0,
        confidence: 0,
        timestamp: new Date()
      };
      agentResponses.push(errorResponse);

      throw error;
    }
  }

  private getAgentName(step: string): string {
    const agentNames: Record<string, string> = {
      'claim-ingestion': 'Claim Ingestor Agent',
      'quote-validation': 'Quote Validator Agent',
      'bundle-logic': 'Bundle Logic Agent',
      'trust-assessment': 'Trust Layer Agent',
      'carrier-fit': 'Carrier Fit Agent',
      'quote-regeneration': 'Regeneration Agent'
    };
    return agentNames[step] || 'Unknown Agent';
  }

  async getDashboardStats(): Promise<DashboardStats> {
    // This would typically query a database for real statistics
    // For now, return mock data
    return {
      totalClaims: 150,
      processedClaims: 142,
      averageProcessingTime: 45.2,
      successRate: 94.7,
      totalSavings: 125000,
      averageTrustScore: 0.87
    };
  }

  async getClaimHistory(limit: number = 10): Promise<XactimateClaim[]> {
    // This would typically query a database for claim history
    // For now, return mock data
    return [];
  }

  async getQuoteHistory(limit: number = 10): Promise<SPCQuote[]> {
    // This would typically query a database for quote history
    // For now, return mock data
    return [];
  }
}
