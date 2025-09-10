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
  private apiKey = 'sk-default-umuEtNZJCnYbBCmy448B42Neb90nTx5W';
  private agentId = '68c1758c3256c310278a7814';
  private userId = 'max@gdna.io';

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
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: JSON.stringify({
          type: 'pdf_processing',
          fileName: fileName,
          pdfContent: base64Content,
          instructions: 'Extract data from this Xactimate PDF and process it through the complete SPC Claims workflow including ingestion, validation, bundling, trust assessment, carrier fit analysis, and quote regeneration.'
        })
      };

      console.log('Sending PDF to Lyzr orchestrator for processing');
      console.log('Request URL:', this.baseURL);
      console.log('Request data:', {
        ...requestData,
        message: JSON.parse(requestData.message) // Log parsed message for debugging
      });
      
      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      console.log('Lyzr PDF processing response status:', response.status);
      console.log('Lyzr PDF processing response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error processing PDF with Lyzr orchestrator:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new Error(`Lyzr PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAgentStatus(): Promise<boolean> {
    try {
      const sessionId = `${this.agentId}-${Date.now()}`;
      
      const requestData: LyzrAgentRequest = {
        user_id: this.userId,
        agent_id: this.agentId,
        session_id: sessionId,
        message: JSON.stringify({
          type: 'health_check',
          instructions: 'Respond with agent status and capabilities'
        })
      };

      const response: AxiosResponse<LyzrAgentResponse> = await this.api.post('', requestData);
      
      return response.status === 200;
    } catch (error) {
      console.error('Error checking Lyzr agent status:', error);
      return false;
    }
  }
}
