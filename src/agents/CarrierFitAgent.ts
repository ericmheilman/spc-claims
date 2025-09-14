import { ExtractedClaimData, CarrierFitResponse, CarrierFit, CarrierPreference, SPCQuote } from '@/types';

export class CarrierFitAgent {
  private agentId = 'carrier-fit';
  private agentName = 'Carrier Fit Agent';

  // Mock carrier database - in production this would be a real database
  private carriers = [
    {
      id: 'carrier-001',
      name: 'State Farm Insurance',
      preferences: [
        { category: 'pricing', preference: 'competitive', weight: 0.3 },
        { category: 'documentation', preference: 'detailed', weight: 0.25 },
        { category: 'contractor', preference: 'certified', weight: 0.2 },
        { category: 'timeline', preference: 'fast', weight: 0.15 },
        { category: 'quality', preference: 'high', weight: 0.1 }
      ]
    },
    {
      id: 'carrier-002',
      name: 'Allstate Insurance',
      preferences: [
        { category: 'pricing', preference: 'moderate', weight: 0.25 },
        { category: 'documentation', preference: 'comprehensive', weight: 0.3 },
        { category: 'contractor', preference: 'licensed', weight: 0.25 },
        { category: 'timeline', preference: 'standard', weight: 0.1 },
        { category: 'quality', preference: 'premium', weight: 0.1 }
      ]
    },
    {
      id: 'carrier-003',
      name: 'Progressive Insurance',
      preferences: [
        { category: 'pricing', preference: 'budget', weight: 0.4 },
        { category: 'documentation', preference: 'standard', weight: 0.2 },
        { category: 'contractor', preference: 'any', weight: 0.15 },
        { category: 'timeline', preference: 'fast', weight: 0.15 },
        { category: 'quality', preference: 'adequate', weight: 0.1 }
      ]
    },
    {
      id: 'carrier-004',
      name: 'USAA Insurance',
      preferences: [
        { category: 'pricing', preference: 'premium', weight: 0.2 },
        { category: 'documentation', preference: 'military-grade', weight: 0.3 },
        { category: 'contractor', preference: 'veteran-owned', weight: 0.25 },
        { category: 'timeline', preference: 'flexible', weight: 0.1 },
        { category: 'quality', preference: 'excellent', weight: 0.15 }
      ]
    }
  ];

  async assessCarrierFit(extractedData: ExtractedClaimData, spcQuote?: SPCQuote): Promise<CarrierFitResponse> {
    const startTime = Date.now();
    
    try {
      const carrierFit = await this.findBestCarrierMatch(extractedData, spcQuote);
      const fitScore = this.calculateFitScore(extractedData, carrierFit);
      const recommendations = this.generateCarrierRecommendations(carrierFit, fitScore);
      
      const processingTime = Date.now() - startTime;
      
      return {
        carrierFit,
        fitScore,
        recommendations,
        processingTime
      };
    } catch (error) {
      throw new Error(`Carrier fit assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findBestCarrierMatch(data: ExtractedClaimData, spcQuote?: SPCQuote): Promise<CarrierFit> {
    let bestCarrier = this.carriers[0];
    let bestScore = 0;

    for (const carrier of this.carriers) {
      const score = this.calculateCarrierScore(data, carrier, spcQuote);
      if (score > bestScore) {
        bestScore = score;
        bestCarrier = carrier;
      }
    }

    return {
      carrierId: bestCarrier.id,
      carrierName: bestCarrier.name,
      fitScore: bestScore,
      preferences: bestCarrier.preferences,
      recommendations: this.generateCarrierSpecificRecommendations(data, bestCarrier, spcQuote)
    };
  }

  private calculateCarrierScore(data: ExtractedClaimData, carrier: any, spcQuote?: SPCQuote): number {
    let score = 0;

    // Pricing fit
    const pricingPreference = carrier.preferences.find((p: CarrierPreference) => p.category === 'pricing');
    if (pricingPreference) {
      const claimValue = data.totals.total;
      let pricingScore = 0;
      
      switch (pricingPreference.preference) {
        case 'budget':
          pricingScore = claimValue < 5000 ? 1.0 : claimValue < 10000 ? 0.8 : 0.5;
          break;
        case 'competitive':
          pricingScore = claimValue >= 5000 && claimValue <= 25000 ? 1.0 : 0.7;
          break;
        case 'moderate':
          pricingScore = claimValue >= 10000 && claimValue <= 50000 ? 1.0 : 0.8;
          break;
        case 'premium':
          pricingScore = claimValue > 25000 ? 1.0 : 0.6;
          break;
      }
      
      score += pricingScore * pricingPreference.weight;
    }

    // Documentation fit
    const docPreference = carrier.preferences.find((p: CarrierPreference) => p.category === 'documentation');
    if (docPreference) {
      let docScore = 0;
      const hasDetailedNotes = data.lineItems.filter(item => item.notes && item.notes.length > 20).length;
      const notesRatio = hasDetailedNotes / data.lineItems.length;
      
      switch (docPreference.preference) {
        case 'standard':
          docScore = notesRatio > 0.3 ? 1.0 : 0.7;
          break;
        case 'detailed':
          docScore = notesRatio > 0.6 ? 1.0 : notesRatio > 0.3 ? 0.8 : 0.5;
          break;
        case 'comprehensive':
          docScore = notesRatio > 0.8 ? 1.0 : notesRatio > 0.5 ? 0.8 : 0.4;
          break;
        case 'military-grade':
          docScore = notesRatio > 0.9 && data.claimDetails.contractorName ? 1.0 : 0.6;
          break;
      }
      
      score += docScore * docPreference.weight;
    }

    // Contractor fit
    const contractorPreference = carrier.preferences.find((p: CarrierPreference) => p.category === 'contractor');
    if (contractorPreference) {
      let contractorScore = 0;
      
      switch (contractorPreference.preference) {
        case 'any':
          contractorScore = 1.0;
          break;
        case 'licensed':
          contractorScore = data.claimDetails.contractorName ? 0.8 : 0.3;
          break;
        case 'certified':
          contractorScore = data.claimDetails.contractorName ? 0.9 : 0.2;
          break;
        case 'veteran-owned':
          contractorScore = data.claimDetails.contractorName ? 0.7 : 0.1;
          break;
      }
      
      score += contractorScore * contractorPreference.weight;
    }

    // Timeline fit
    const timelinePreference = carrier.preferences.find((p: CarrierPreference) => p.category === 'timeline');
    if (timelinePreference) {
      let timelineScore = 0;
      const daysSinceLoss = Math.floor((Date.now() - data.claimDetails.dateOfLoss.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (timelinePreference.preference) {
        case 'fast':
          timelineScore = daysSinceLoss < 7 ? 1.0 : daysSinceLoss < 14 ? 0.8 : 0.5;
          break;
        case 'standard':
          timelineScore = daysSinceLoss < 30 ? 1.0 : daysSinceLoss < 60 ? 0.8 : 0.6;
          break;
        case 'flexible':
          timelineScore = 1.0;
          break;
      }
      
      score += timelineScore * timelinePreference.weight;
    }

    // Quality fit
    const qualityPreference = carrier.preferences.find((p: CarrierPreference) => p.category === 'quality');
    if (qualityPreference) {
      let qualityScore = 0;
      const avgUnitPrice = data.lineItems.reduce((sum, item) => sum + item.unitPrice, 0) / data.lineItems.length;
      const hasHighQualityItems = data.lineItems.some(item => item.unitPrice > avgUnitPrice * 1.5);
      
      switch (qualityPreference.preference) {
        case 'adequate':
          qualityScore = 1.0;
          break;
        case 'high':
          qualityScore = hasHighQualityItems ? 1.0 : 0.7;
          break;
        case 'premium':
          qualityScore = hasHighQualityItems ? 1.0 : 0.5;
          break;
        case 'excellent':
          qualityScore = hasHighQualityItems && data.lineItems.every(item => item.notes && item.notes.length > 10) ? 1.0 : 0.6;
          break;
      }
      
      score += qualityScore * qualityPreference.weight;
    }

    return Math.min(score, 1.0);
  }

  private calculateFitScore(data: ExtractedClaimData, carrierFit: CarrierFit): number {
    return carrierFit.fitScore;
  }

  private generateCarrierRecommendations(carrierFit: CarrierFit, fitScore: number): string[] {
    const recommendations: string[] = [];

    if (fitScore > 0.8) {
      recommendations.push(`Excellent fit with ${carrierFit.carrierName} - proceed with confidence`);
    } else if (fitScore > 0.6) {
      recommendations.push(`Good fit with ${carrierFit.carrierName} - minor adjustments may be needed`);
    } else if (fitScore > 0.4) {
      recommendations.push(`Moderate fit with ${carrierFit.carrierName} - consider alternative carriers`);
    } else {
      recommendations.push(`Poor fit with ${carrierFit.carrierName} - strongly consider alternative carriers`);
    }

    // Add specific recommendations based on carrier preferences
    const pricingPref = carrierFit.preferences.find(p => p.category === 'pricing');
    if (pricingPref && pricingPref.preference === 'budget') {
      recommendations.push('Consider reducing costs to better match carrier preferences');
    }

    const docPref = carrierFit.preferences.find(p => p.category === 'documentation');
    if (docPref && docPref.preference === 'detailed') {
      recommendations.push('Enhance documentation quality to meet carrier standards');
    }

    const contractorPref = carrierFit.preferences.find(p => p.category === 'contractor');
    if (contractorPref && contractorPref.preference === 'certified') {
      recommendations.push('Ensure contractor is properly certified for this carrier');
    }

    return recommendations;
  }

  private generateCarrierSpecificRecommendations(data: ExtractedClaimData, carrier: any, spcQuote?: SPCQuote): string[] {
    const recommendations: string[] = [];

    // State Farm specific recommendations
    if (carrier.id === 'carrier-001') {
      recommendations.push('State Farm prefers competitive pricing and detailed documentation');
      recommendations.push('Ensure all line items have clear descriptions and justifications');
      recommendations.push('Consider bundling related work items for efficiency');
    }

    // Allstate specific recommendations
    if (carrier.id === 'carrier-002') {
      recommendations.push('Allstate requires comprehensive documentation and licensed contractors');
      recommendations.push('Include detailed photos and measurements where applicable');
      recommendations.push('Ensure all permits and inspections are properly documented');
    }

    // Progressive specific recommendations
    if (carrier.id === 'carrier-003') {
      recommendations.push('Progressive focuses on budget-friendly solutions');
      recommendations.push('Consider alternative materials or methods to reduce costs');
      recommendations.push('Emphasize value and efficiency in your proposal');
    }

    // USAA specific recommendations
    if (carrier.id === 'carrier-004') {
      recommendations.push('USAA values veteran-owned contractors and military families');
      recommendations.push('Ensure all documentation meets military-grade standards');
      recommendations.push('Consider the unique needs of military families in your approach');
    }

    return recommendations;
  }
}

