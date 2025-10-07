import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface LyzrAgentResponse {
  response: string;
  session_id: string;
  user_id: string;
  agent_id: string;
  timestamp: string;
}

export interface LyzrAgentRequest {
  user_id: string;
  agent_id: string;
  session_id: string;
  message: string;
}

export class LyzrAPIService {
  private api: AxiosInstance;
  private baseURL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/';
  private apiKey = 'sk-default-Lpq8P8pB0PGzf8BBaXTJArdMcYa0Fr6K';
  private agentId = '68de85dca3e9701820177801';
  private userId = 'gdnaaccount@lyzr.ai';
  
  // Managed agents from the orchestrator configuration
  private managedAgents = {
    claimIngestor: '68c0e260632e1fbe764f1055',
    quoteValidator: '68c0e298106887739665fe23',
    bundleLogic: '68c0e2b62d6313a9a8735dd0',
    trustLayer: '68c0e2d7632e1fbe764f1056',
    carrierFit: '68c0e2f62d6313a9a8735dd1',
    regeneration: '68c0e3c02d6313a9a8735dd2'
  };

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  async processClaim(claimData: any): Promise<LyzrAgentResponse> {
    try {
      const sessionId = `${this.agentId}-${Date.now()}`;
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: JSON.stringify({
          type: 'claim_processing',
          data: claimData,
          instructions: 'Process this Xactimate claim data and generate an SPC quote with all required analysis including validation, bundling, trust assessment, carrier fit, and regeneration recommendations.'
        })
      };

      console.log('Sending claim to Lyzr orchestrator:', requestData);
      
      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      console.log('Lyzr orchestrator response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error calling Lyzr orchestrator:', error);
      throw new Error(`Lyzr orchestrator failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processXactimatePDF(pdfContent: Buffer, fileName: string): Promise<LyzrAgentResponse> {
    try {
      const sessionId = `${this.agentId}-${Date.now()}`;
      
      // Convert PDF to base64 for transmission
      const base64Content = pdfContent.toString('base64');
      
      // Create the orchestrator workflow message
      const workflowMessage = `Process this Xactimate PDF through the complete SPC Claims workflow:

1. @ClaimIngestorAgent - Extract and convert PDF data into structured formats
2. @QuoteValidatorAgent - Apply SPC rules and flag format/coverage issues  
3. @BundleLogicAgent - Suggest logical groupings and optimizations
4. @TrustLayerAgent - Apply audit and risk assessment
5. @CarrierFitAgent - Filter based on carrier preferences
6. @RegenerationAgent - Generate final SPC-style quote PDF

PDF File: ${fileName}
PDF Content (base64): ${base64Content}

Please coordinate all six agents to process this claim and provide a comprehensive SPC quote with all analysis results.`;
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: workflowMessage
      };

      console.log('Sending PDF to Lyzr Orchestrator Agent for workflow processing');
      console.log('Request URL:', this.baseURL);
      console.log('Agent ID:', this.agentId);
      console.log('Session ID:', sessionId);
      console.log('Message length:', workflowMessage.length);
      
      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      console.log('Lyzr Orchestrator response status:', response.status);
      console.log('Lyzr Orchestrator response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error processing PDF with Lyzr Orchestrator:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Lyzr Orchestrator processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processDualPDFs(
    claimPdfContent: Buffer, 
    claimFileName: string,
    roofReportPdfContent: Buffer,
    roofReportFileName: string
  ): Promise<LyzrAgentResponse> {
    try {
      const sessionId = `${this.agentId}-${Date.now()}`;
      
      // Convert both PDFs to base64 for transmission
      const claimBase64Content = claimPdfContent.toString('base64');
      const roofReportBase64Content = roofReportPdfContent.toString('base64');
      
      // Create the orchestrator workflow message for dual PDF processing
      const workflowMessage = `Process these dual PDFs through the complete SPC Claims workflow with roof analysis:

1. @ClaimIngestorAgent - Extract and convert claim PDF data into structured formats
2. @QuoteValidatorAgent - Apply SPC rules and flag format/coverage issues  
3. @BundleLogicAgent - Suggest logical groupings and optimizations
4. @TrustLayerAgent - Apply audit and risk assessment
5. @CarrierFitAgent - Filter based on carrier preferences
6. @RegenerationAgent - Generate final SPC-style quote PDF

ADDITIONAL ROOF ANALYSIS:
- Compare insurance claim measurements with roof report measurements
- Identify area discrepancies and suggest adjustments per SPC rules
- Analyze roof geometry (facets, penetrations, valleys, ridges)
- Check ventilation compliance (IRC R806.2)
- Validate material specifications against roof report
- Apply roof-specific rules from the master macro database

CLAIM PDF File: ${claimFileName}
Claim PDF Content (base64): ${claimBase64Content}

ROOF REPORT PDF File: ${roofReportFileName}
Roof Report PDF Content (base64): ${roofReportBase64Content}

Please coordinate all agents to process both documents and provide:
1. Standard SPC quote analysis
2. Comprehensive roof analysis comparing claim vs. measurement report
3. Area discrepancy adjustments
4. Material specification recommendations
5. Code compliance validation
6. Ventilation adequacy assessment

Include detailed analysis results for both the insurance claim and roof measurement report.`;
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: workflowMessage
      };

      console.log('Sending dual PDFs to Lyzr Orchestrator Agent for workflow processing');
      console.log('Request URL:', this.baseURL);
      console.log('Agent ID:', this.agentId);
      console.log('Session ID:', sessionId);
      console.log('Claim file:', claimFileName);
      console.log('Roof report file:', roofReportFileName);
      console.log('Message length:', workflowMessage.length);
      
      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      console.log('Lyzr Orchestrator dual PDF response status:', response.status);
      console.log('Lyzr Orchestrator dual PDF response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error processing dual PDFs with Lyzr Orchestrator:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Lyzr Orchestrator dual PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAgentStatus(): Promise<boolean> {
    try {
      const sessionId = `${this.agentId}-${Date.now()}`;
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: 'Health check: Please confirm that the Orchestrator Agent and all managed agents (@ClaimIngestorAgent, @QuoteValidatorAgent, @BundleLogicAgent, @TrustLayerAgent, @CarrierFitAgent, @RegenerationAgent) are ready for SPC Claims processing workflow.'
      };

      console.log('Checking Lyzr Orchestrator Agent status');
      
      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      console.log('Lyzr Orchestrator Agent status response:', response.status);
      
      return response.status === 200;
    } catch (error) {
      console.error('Error checking Lyzr Orchestrator Agent status:', error);
      return false;
    }
  }
}
