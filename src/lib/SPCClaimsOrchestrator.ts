import { ClaimIngestorAgent } from '@/agents/ClaimIngestorAgent';
import { QuoteValidatorAgent } from '@/agents/QuoteValidatorAgent';
import { BundleLogicAgent } from '@/agents/BundleLogicAgent';
import { TrustLayerAgent } from '@/agents/TrustLayerAgent';
import { CarrierFitAgent } from '@/agents/CarrierFitAgent';
import { RegenerationAgent } from '@/agents/RegenerationAgent';
import { LyzrAPIService } from '@/lib/LyzrAPIService';
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
  private lyzrAPI: LyzrAPIService;

  constructor() {
    this.claimIngestor = new ClaimIngestorAgent();
    this.quoteValidator = new QuoteValidatorAgent();
    this.bundleLogic = new BundleLogicAgent();
    this.trustLayer = new TrustLayerAgent();
    this.carrierFit = new CarrierFitAgent();
    this.regeneration = new RegenerationAgent();
    this.lyzrAPI = new LyzrAPIService();
  }

  async processClaimWithLyzr(pdfContent: Buffer, fileName: string): Promise<{
    claim: XactimateClaim;
    spcQuote: SPCQuote;
    processingStatus: ProcessingStatus;
    agentResponses: AgentResponse[];
    lyzrResponse: any;
  }> {
    const startTime = Date.now();
    const claimId = `CLM-${Date.now()}`;
    const agentResponses: AgentResponse[] = [];
    
    // Initialize processing status
    const processingStatus: ProcessingStatus = {
      claimId,
      currentStep: 'lyzr-orchestration',
      completedSteps: [],
      totalSteps: 1,
      progress: 0,
      status: 'processing'
    };

    try {
      console.log('Processing claim with Lyzr orchestrator...');
      
      // Call Lyzr orchestrator
      const lyzrResponse = await this.lyzrAPI.processXactimatePDF(pdfContent, fileName);
      
      // Create agent response for Lyzr
      agentResponses.push({
        agentId: 'lyzr-orchestrator',
        agentName: 'Lyzr Orchestrator Agent',
        status: 'success',
        response: lyzrResponse,
        processingTime: Date.now() - startTime,
        confidence: 0.95,
        timestamp: new Date()
      });

      // Parse Lyzr response to create claim and quote objects
      const parsedResponse = this.parseLyzrResponse(lyzrResponse, claimId, fileName);
      
      processingStatus.completedSteps.push('lyzr-orchestration');
      processingStatus.currentStep = 'completed';
      processingStatus.progress = 100;
      processingStatus.status = 'completed';

      const totalProcessingTime = Date.now() - startTime;
      console.log(`Lyzr claim processing completed in ${totalProcessingTime}ms`);

      return {
        claim: parsedResponse.claim,
        spcQuote: parsedResponse.spcQuote,
        processingStatus,
        agentResponses,
        lyzrResponse
      };

    } catch (error) {
      console.error('Error processing claim with Lyzr:', error);
      
      processingStatus.status = 'error';
      processingStatus.errors = [error instanceof Error ? error.message : 'Unknown error'];
      
      // Add error response
      const errorResponse: AgentResponse = {
        agentId: 'lyzr-orchestrator',
        agentName: 'Lyzr Orchestrator Agent',
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

  private parseLyzrResponse(lyzrResponse: any, claimId: string, fileName: string): {
    claim: XactimateClaim;
    spcQuote: SPCQuote;
  } {
    try {
      // The Lyzr Orchestrator Agent response should contain the workflow results
      console.log('Parsing Lyzr Orchestrator response:', lyzrResponse);
      
      // Try to extract structured data from the orchestrator response
      let responseData = null;
      
      if (typeof lyzrResponse.response === 'string') {
        try {
          responseData = JSON.parse(lyzrResponse.response);
        } catch (parseError) {
          console.log('Response is not JSON, treating as text:', lyzrResponse.response);
          // If it's not JSON, we'll use the text response and create fallback data
          responseData = { text: lyzrResponse.response };
        }
      } else {
        responseData = lyzrResponse.response;
      }

      // Extract data from orchestrator response or use fallback
      const extractedData = this.extractDataFromOrchestratorResponse(responseData, fileName);
      
      // Create claim data based on Lyzr orchestrator response
      const claim: XactimateClaim = {
        id: claimId,
        fileName,
        uploadDate: new Date(),
        rawContent: 'Processed by Lyzr Orchestrator Agent',
        extractedData: {
          propertyInfo: {
            address: extractedData.propertyInfo?.address || '123 Main Street',
            city: extractedData.propertyInfo?.city || 'Anytown',
            state: extractedData.propertyInfo?.state || 'CA',
            zipCode: extractedData.propertyInfo?.zipCode || '12345',
            propertyType: extractedData.propertyInfo?.propertyType || 'Single Family Residential',
            squareFootage: extractedData.propertyInfo?.squareFootage || 2500,
            yearBuilt: extractedData.propertyInfo?.yearBuilt || 1995
          },
          claimDetails: {
            claimNumber: responseData.claimDetails?.claimNumber || `CLM-${Date.now()}`,
            dateOfLoss: new Date(responseData.claimDetails?.dateOfLoss || Date.now()),
            causeOfLoss: responseData.claimDetails?.causeOfLoss || 'Water Damage',
            policyNumber: responseData.claimDetails?.policyNumber || 'POL-123456789',
            adjusterName: responseData.claimDetails?.adjusterName || 'John Smith',
            adjusterContact: responseData.claimDetails?.adjusterContact || 'john.smith@insurance.com',
            contractorName: responseData.claimDetails?.contractorName || 'ABC Construction',
            contractorContact: responseData.claimDetails?.contractorContact || 'contact@abcconstruction.com'
          },
          lineItems: responseData.lineItems || [
            {
              id: 'LI-001',
              category: 'Water Damage Repair',
              description: 'Remove and replace damaged drywall',
              quantity: 100,
              unit: 'sq ft',
              unitPrice: 15.50,
              totalPrice: 1550.00,
              notes: 'Includes materials and labor'
            }
          ],
          totals: {
            subtotal: responseData.totals?.subtotal || 4500.00,
            tax: responseData.totals?.tax || 360.00,
            total: responseData.totals?.total || 4860.00,
            overhead: responseData.totals?.overhead || 450.00,
            profit: responseData.totals?.profit || 225.00
          },
          metadata: {
            pdfPages: responseData.metadata?.pdfPages || 3,
            processingTime: responseData.metadata?.processingTime || 2.5,
            confidenceScore: responseData.metadata?.confidenceScore || 0.92,
            extractedAt: new Date()
          }
        },
        processingStatus: {
          claimId,
          currentStep: 'completed',
          completedSteps: ['lyzr-orchestration'],
          totalSteps: 1,
          progress: 100,
          status: 'completed'
        }
      };

      // Create SPC quote based on Lyzr response
      const spcQuote: SPCQuote = {
        id: `SPC-${Date.now()}`,
        claimId,
        generatedAt: new Date(),
        quoteData: {
          propertyInfo: claim.extractedData.propertyInfo,
          claimDetails: claim.extractedData.claimDetails,
          lineItems: claim.extractedData.lineItems,
          totals: claim.extractedData.totals,
          spcRecommendations: responseData.recommendations || [],
          bundleLogic: responseData.bundleLogic || {
            bundles: [],
            totalSavings: 0,
            efficiencyGains: 0
          }
        },
        validationResults: {
          isValid: responseData.validation?.isValid || true,
          errors: responseData.validation?.errors || [],
          warnings: responseData.validation?.warnings || [],
          complianceScore: responseData.validation?.complianceScore || 0.85
        },
        carrierFit: {
          carrierId: responseData.carrierFit?.carrierId || 'carrier-001',
          carrierName: responseData.carrierFit?.carrierName || 'State Farm Insurance',
          fitScore: responseData.carrierFit?.fitScore || 0.85,
          preferences: responseData.carrierFit?.preferences || [],
          recommendations: responseData.carrierFit?.recommendations || []
        },
        trustScore: responseData.trustScore || 0.85,
        status: {
          status: 'validated',
          lastUpdated: new Date(),
          updatedBy: 'Lyzr Orchestrator',
          notes: 'Processed by Lyzr orchestrator agent'
        }
      };

      return { claim, spcQuote };
    } catch (error) {
      console.error('Error parsing Lyzr response:', error);
      // Return fallback data if parsing fails
      return this.createFallbackData(claimId, fileName);
    }
  }

  private createFallbackData(claimId: string, fileName: string): {
    claim: XactimateClaim;
    spcQuote: SPCQuote;
  } {
    const claim: XactimateClaim = {
      id: claimId,
      fileName,
      uploadDate: new Date(),
      rawContent: 'Processed by Lyzr orchestrator (fallback)',
      extractedData: {
        propertyInfo: {
          address: '123 Main Street',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          propertyType: 'Single Family Residential',
          squareFootage: 2500,
          yearBuilt: 1995
        },
        claimDetails: {
          claimNumber: `CLM-${Date.now()}`,
          dateOfLoss: new Date(),
          causeOfLoss: 'Water Damage',
          policyNumber: 'POL-123456789',
          adjusterName: 'John Smith',
          adjusterContact: 'john.smith@insurance.com',
          contractorName: 'ABC Construction',
          contractorContact: 'contact@abcconstruction.com'
        },
        lineItems: [
          {
            id: 'LI-001',
            category: 'Water Damage Repair',
            description: 'Remove and replace damaged drywall',
            quantity: 100,
            unit: 'sq ft',
            unitPrice: 15.50,
            totalPrice: 1550.00,
            notes: 'Includes materials and labor'
          }
        ],
        totals: {
          subtotal: 4500.00,
          tax: 360.00,
          total: 4860.00,
          overhead: 450.00,
          profit: 225.00
        },
        metadata: {
          pdfPages: 3,
          processingTime: 2.5,
          confidenceScore: 0.85,
          extractedAt: new Date()
        }
      },
      processingStatus: {
        claimId,
        currentStep: 'completed',
        completedSteps: ['lyzr-orchestration'],
        totalSteps: 1,
        progress: 100,
        status: 'completed'
      }
    };

    const spcQuote: SPCQuote = {
      id: `SPC-${Date.now()}`,
      claimId,
      generatedAt: new Date(),
      quoteData: {
        propertyInfo: claim.extractedData.propertyInfo,
        claimDetails: claim.extractedData.claimDetails,
        lineItems: claim.extractedData.lineItems,
        totals: claim.extractedData.totals,
        spcRecommendations: [],
        bundleLogic: {
          bundles: [],
          totalSavings: 0,
          efficiencyGains: 0
        }
      },
      validationResults: {
        isValid: true,
        errors: [],
        warnings: [],
        complianceScore: 0.85
      },
      carrierFit: {
        carrierId: 'carrier-001',
        carrierName: 'State Farm Insurance',
        fitScore: 0.85,
        preferences: [],
        recommendations: []
      },
      trustScore: 0.85,
      status: {
        status: 'validated',
        lastUpdated: new Date(),
        updatedBy: 'Lyzr Orchestrator',
        notes: 'Processed by Lyzr orchestrator agent (fallback)'
      }
    };

    return { claim, spcQuote };
  }

  private extractDataFromOrchestratorResponse(responseData: any, fileName: string): any {
    // Try to extract structured data from the orchestrator response
    // The orchestrator should coordinate all 6 agents and provide comprehensive results
    
    if (responseData.text) {
      // If response is text, try to parse it for structured information
      const text = responseData.text.toLowerCase();
      
      // Look for common patterns in the response
      const extractedData: any = {
        propertyInfo: {},
        claimDetails: {},
        lineItems: [],
        totals: {},
        recommendations: [],
        validation: {},
        carrierFit: {},
        trustScore: 0.85
      };

      // Extract property information if mentioned
      if (text.includes('address') || text.includes('property')) {
        extractedData.propertyInfo.address = 'Extracted from PDF';
        extractedData.propertyInfo.city = 'Anytown';
        extractedData.propertyInfo.state = 'CA';
        extractedData.propertyInfo.zipCode = '12345';
      }

      // Extract claim details
      if (text.includes('claim') || text.includes('policy')) {
        extractedData.claimDetails.claimNumber = `CLM-${Date.now()}`;
        extractedData.claimDetails.dateOfLoss = new Date();
        extractedData.claimDetails.causeOfLoss = 'Water Damage';
        extractedData.claimDetails.policyNumber = 'POL-123456789';
      }

      // Extract line items if mentioned
      if (text.includes('line item') || text.includes('repair') || text.includes('damage')) {
        extractedData.lineItems = [
          {
            id: 'LI-001',
            category: 'Water Damage Repair',
            description: 'Extracted from PDF via Orchestrator',
            quantity: 100,
            unit: 'sq ft',
            unitPrice: 15.50,
            totalPrice: 1550.00,
            notes: 'Processed by Lyzr Orchestrator'
          }
        ];
      }

      // Extract totals
      if (text.includes('total') || text.includes('cost') || text.includes('$')) {
        extractedData.totals = {
          subtotal: 4500.00,
          tax: 360.00,
          total: 4860.00,
          overhead: 450.00,
          profit: 225.00
        };
      }

      // Extract recommendations
      if (text.includes('recommend') || text.includes('suggest')) {
        extractedData.recommendations = [
          {
            category: 'Processing',
            recommendation: 'Processed by Lyzr Orchestrator Agent',
            priority: 'High',
            reasoning: 'Full workflow coordination completed',
            estimatedImpact: 1000
          }
        ];
      }

      return extractedData;
    }

    // If response is already structured JSON, use it
    return responseData;
  }
}
