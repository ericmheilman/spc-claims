import { 
  ExtractedClaimData, 
  RegenerationResponse, 
  SPCQuote, 
  QuoteData, 
  ValidationResults,
  BundleLogic,
  CarrierFit,
  TrustLayerResponse,
  SPCRecommendation,
  QuoteStatus
} from '@/types';

export class RegenerationAgent {
  private agentId = 'regeneration';
  private agentName = 'Regeneration Agent';

  async regenerateQuote(
    extractedData: ExtractedClaimData,
    validationResults: ValidationResults,
    bundleLogic: BundleLogic,
    carrierFit: CarrierFit,
    trustAssessment: TrustLayerResponse
  ): Promise<RegenerationResponse> {
    const startTime = Date.now();
    
    try {
      const spcQuote = await this.createSPCQuote(
        extractedData,
        validationResults,
        bundleLogic,
        carrierFit,
        trustAssessment
      );
      
      const processingTime = Date.now() - startTime;
      
      return {
        spcQuote,
        success: true,
        processingTime
      };
    } catch (error) {
      throw new Error(`Quote regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async createSPCQuote(
    extractedData: ExtractedClaimData,
    validationResults: ValidationResults,
    bundleLogic: BundleLogic,
    carrierFit: CarrierFit,
    trustAssessment: TrustLayerResponse
  ): Promise<SPCQuote> {
    const quoteId = `SPC-${Date.now()}`;
    const generatedAt = new Date();

    // Create SPC-specific recommendations
    const spcRecommendations = this.generateSPCRecommendations(
      extractedData,
      validationResults,
      bundleLogic,
      carrierFit,
      trustAssessment
    );

    // Apply bundle logic to line items
    const optimizedLineItems = this.applyBundleLogic(extractedData.lineItems, bundleLogic);

    // Create quote data
    const quoteData: QuoteData = {
      propertyInfo: extractedData.propertyInfo,
      claimDetails: extractedData.claimDetails,
      lineItems: optimizedLineItems,
      totals: this.calculateOptimizedTotals(optimizedLineItems, bundleLogic),
      spcRecommendations,
      bundleLogic
    };

    // Determine quote status based on validation and trust
    const status = this.determineQuoteStatus(validationResults, trustAssessment.trustScore);

    const spcQuote: SPCQuote = {
      id: quoteId,
      claimId: extractedData.claimDetails.claimNumber,
      generatedAt,
      quoteData,
      validationResults,
      carrierFit,
      trustScore: trustAssessment.trustScore,
      status: {
        status,
        lastUpdated: generatedAt,
        updatedBy: 'SPC Regeneration Agent',
        notes: this.generateStatusNotes(validationResults, trustAssessment, carrierFit)
      }
    };

    return spcQuote;
  }

  private generateSPCRecommendations(
    extractedData: ExtractedClaimData,
    validationResults: ValidationResults,
    bundleLogic: BundleLogic,
    carrierFit: CarrierFit,
    trustAssessment: TrustLayerResponse
  ): SPCRecommendation[] {
    const recommendations: SPCRecommendation[] = [];

    // Cost optimization recommendations
    if (bundleLogic.totalSavings > 0) {
      recommendations.push({
        category: 'Cost Optimization',
        recommendation: 'Implement suggested bundles to reduce project costs',
        priority: 'High',
        reasoning: `Bundling related work items can save $${bundleLogic.totalSavings.toFixed(2)} and improve efficiency`,
        estimatedImpact: bundleLogic.totalSavings
      });
    }

    // Quality improvement recommendations
    if (validationResults.complianceScore < 0.8) {
      recommendations.push({
        category: 'Quality Improvement',
        recommendation: 'Improve data completeness and accuracy',
        priority: 'High',
        reasoning: `Current compliance score is ${(validationResults.complianceScore * 100).toFixed(1)}% - target is 80%+`,
        estimatedImpact: (0.8 - validationResults.complianceScore) * 1000
      });
    }

    // Trust and risk recommendations
    if (trustAssessment.trustScore < 0.7) {
      recommendations.push({
        category: 'Risk Management',
        recommendation: 'Address identified risk factors before proceeding',
        priority: 'High',
        reasoning: `Trust score is ${(trustAssessment.trustScore * 100).toFixed(1)}% - below acceptable threshold`,
        estimatedImpact: (0.7 - trustAssessment.trustScore) * 2000
      });
    }

    // Carrier-specific recommendations
    if (carrierFit.fitScore < 0.6) {
      recommendations.push({
        category: 'Carrier Alignment',
        recommendation: 'Consider alternative carriers or adjust quote parameters',
        priority: 'Medium',
        reasoning: `Current carrier fit score is ${(carrierFit.fitScore * 100).toFixed(1)}% - consider alternatives`,
        estimatedImpact: (0.6 - carrierFit.fitScore) * 1500
      });
    }

    // Efficiency recommendations
    if (bundleLogic.efficiencyGains > 0.2) {
      recommendations.push({
        category: 'Project Efficiency',
        recommendation: 'Schedule bundled work items together for maximum efficiency',
        priority: 'Medium',
        reasoning: `Bundling can improve project efficiency by ${(bundleLogic.efficiencyGains * 100).toFixed(1)}%`,
        estimatedImpact: bundleLogic.efficiencyGains * 1000
      });
    }

    // Documentation recommendations
    const itemsWithoutNotes = extractedData.lineItems.filter(item => !item.notes || item.notes.length < 10);
    if (itemsWithoutNotes.length > 0) {
      recommendations.push({
        category: 'Documentation',
        recommendation: 'Enhance documentation for better traceability',
        priority: 'Low',
        reasoning: `${itemsWithoutNotes.length} line items lack detailed documentation`,
        estimatedImpact: itemsWithoutNotes.length * 50
      });
    }

    return recommendations;
  }

  private applyBundleLogic(lineItems: any[], bundleLogic: BundleLogic): any[] {
    const optimizedItems = [...lineItems];
    
    // Apply bundle discounts
    bundleLogic.bundles.forEach(bundle => {
      bundle.lineItems.forEach(itemId => {
        const item = optimizedItems.find(i => i.id === itemId);
        if (item) {
          // Apply bundle discount (simplified - in reality this would be more complex)
          const discount = bundle.savings / bundle.lineItems.length;
          item.totalPrice = Math.max(0, item.totalPrice - discount);
          item.notes = (item.notes || '') + ` [Bundle: ${bundle.name}]`;
        }
      });
    });

    return optimizedItems;
  }

  private calculateOptimizedTotals(lineItems: any[], bundleLogic: BundleLogic): any {
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.08; // 8% tax rate
    const total = subtotal + tax;

    return {
      subtotal,
      tax,
      total,
      overhead: subtotal * 0.1, // 10% overhead
      profit: subtotal * 0.05, // 5% profit
      bundleSavings: bundleLogic.totalSavings
    };
  }

  private determineQuoteStatus(validationResults: ValidationResults, trustScore: number): 'draft' | 'validated' | 'approved' | 'rejected' | 'regenerated' {
    if (validationResults.errors.length > 0) {
      return 'rejected';
    }
    
    if (trustScore < 0.5) {
      return 'rejected';
    }
    
    if (validationResults.complianceScore < 0.7) {
      return 'draft';
    }
    
    if (trustScore > 0.8 && validationResults.complianceScore > 0.8) {
      return 'approved';
    }
    
    return 'validated';
  }

  private generateStatusNotes(
    validationResults: ValidationResults,
    trustAssessment: TrustLayerResponse,
    carrierFit: CarrierFit
  ): string {
    const notes: string[] = [];

    if (validationResults.errors.length > 0) {
      notes.push(`Validation errors: ${validationResults.errors.length}`);
    }

    if (validationResults.warnings.length > 0) {
      notes.push(`Validation warnings: ${validationResults.warnings.length}`);
    }

    notes.push(`Trust score: ${(trustAssessment.trustScore * 100).toFixed(1)}%`);
    notes.push(`Carrier fit: ${(carrierFit.fitScore * 100).toFixed(1)}%`);
    notes.push(`Compliance score: ${(validationResults.complianceScore * 100).toFixed(1)}%`);

    if (trustAssessment.riskFactors.length > 0) {
      notes.push(`Risk factors: ${trustAssessment.riskFactors.length}`);
    }

    return notes.join('; ');
  }

  async generatePDF(spcQuote: SPCQuote): Promise<Buffer> {
    // This would integrate with a PDF generation library like PDFKit or Puppeteer
    // For now, return a mock PDF buffer
    const mockPDF = Buffer.from('Mock PDF content for SPC Quote');
    return mockPDF;
  }

  async generateExcel(spcQuote: SPCQuote): Promise<Buffer> {
    // This would integrate with an Excel generation library like ExcelJS
    // For now, return a mock Excel buffer
    const mockExcel = Buffer.from('Mock Excel content for SPC Quote');
    return mockExcel;
  }
}
