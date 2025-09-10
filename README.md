# SPC Claims Carrier Network

A proof of concept multi-agent AI system for processing Xactimate claims and generating SPC (Smart Property Claims) quotes using Lyzr.ai's agentic architecture.

## Project Overview

This system implements a 6-agent orchestration workflow to:
1. Extract and structure data from Xactimate PDF claims
2. Validate quote compliance and quality
3. Optimize costs through intelligent bundling
4. Assess trust and risk factors
5. Match claims with appropriate carriers
6. Regenerate quotes in SPC format

## Architecture

### Core Agents

1. **Claim Ingestor Agent** - Extracts structured data from Xactimate PDFs
2. **Quote Validator Agent** - Validates compliance and data quality
3. **Bundle Logic Agent** - Optimizes costs through intelligent bundling
4. **Trust Layer Agent** - Assesses trust scores and risk factors
5. **Carrier Fit Agent** - Matches claims with appropriate carriers
6. **Regeneration Agent** - Generates SPC-formatted quotes

### Technology Stack

- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes
- **AI/ML**: Lyzr.ai multi-agent orchestration
- **PDF Processing**: AWS Textract (planned)
- **Cloud**: AWS (S3, Bedrock, etc.)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- AWS Account (for production deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ericmheilman/spc-claims.git
cd spc-claims
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Lyzr.ai Configuration
LYZR_API_KEY=your_lyzr_api_key
LYZR_BASE_URL=https://api.lyzr.ai

# Application Configuration
NEXT_PUBLIC_APP_NAME=SPC Claims
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## Usage

### Upload and Process Claims

1. Navigate to the main dashboard
2. Click "Choose File" to upload a Xactimate PDF
3. The system will automatically process the claim through all 6 agents
4. View the generated SPC quote and processing results

### Dashboard Features

- **Real-time Processing**: Monitor claim processing status
- **Analytics**: View processing statistics and success rates
- **Cost Optimization**: See potential savings from bundling
- **Trust Assessment**: Review trust scores and risk factors
- **Carrier Matching**: View carrier fit scores and recommendations

## API Endpoints

### POST /api/process-claim
Process a Xactimate PDF claim and generate an SPC quote.

**Request:**
- `file`: PDF file (multipart/form-data)

**Response:**
```json
{
  "success": true,
  "data": {
    "claim": { /* XactimateClaim object */ },
    "spcQuote": { /* SPCQuote object */ },
    "processingStatus": { /* ProcessingStatus object */ },
    "agentResponses": [ /* AgentResponse array */ ]
  }
}
```

### GET /api/dashboard-stats
Get dashboard statistics and metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClaims": 150,
    "processedClaims": 142,
    "averageProcessingTime": 45.2,
    "successRate": 94.7,
    "totalSavings": 125000,
    "averageTrustScore": 0.87
  }
}
```

## Agent Details

### Claim Ingestor Agent
- Extracts property information, claim details, and line items
- Calculates confidence scores based on data completeness
- Handles PDF parsing and data structuring

### Quote Validator Agent
- Validates data completeness and consistency
- Checks pricing calculations and compliance
- Generates recommendations for improvement

### Bundle Logic Agent
- Identifies bundling opportunities for cost savings
- Groups related work items for efficiency
- Calculates potential savings and efficiency gains

### Trust Layer Agent
- Assesses trust scores based on data quality
- Identifies risk factors and compliance issues
- Generates audit trails and recommendations

### Carrier Fit Agent
- Matches claims with appropriate insurance carriers
- Considers carrier preferences and requirements
- Provides carrier-specific recommendations

### Regeneration Agent
- Generates SPC-formatted quotes
- Applies optimizations and recommendations
- Creates final deliverables (PDF, Excel)

## Development

### Project Structure

```
src/
├── agents/           # Individual agent implementations
├── components/       # React components
├── lib/             # Core orchestration logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── app/             # Next.js app directory
    ├── api/         # API routes
    └── page.tsx     # Main dashboard
```

### Adding New Agents

1. Create a new agent class in `src/agents/`
2. Implement the required interface methods
3. Add the agent to the orchestrator in `src/lib/SPCClaimsOrchestrator.ts`
4. Update the processing workflow

### Testing

Run the test suite:
```bash
npm test
```

Run linting:
```bash
npm run lint
```

## Deployment

### AWS Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy to AWS using your preferred method (Amplify, ECS, etc.)

3. Configure environment variables in your deployment environment

### Docker Deployment

1. Build the Docker image:
```bash
docker build -t spc-claims .
```

2. Run the container:
```bash
docker run -p 3000:3000 spc-claims
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@spc-claims.com
- Documentation: [docs.spc-claims.com](https://docs.spc-claims.com)
- Issues: [GitHub Issues](https://github.com/ericmheilman/spc-claims/issues)

## Roadmap

- [ ] AWS Textract integration for PDF processing
- [ ] Real-time processing status updates
- [ ] Advanced analytics and reporting
- [ ] Multi-tenant support
- [ ] API rate limiting and authentication
- [ ] Automated testing suite
- [ ] Performance monitoring and optimization