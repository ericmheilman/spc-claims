import { ExtractedClaimData, TrustLayerResponse, SPCQuote } from '@/types';

export class TrustLayerAgent {
  private agentId = 'trust-layer';
  private agentName = 'Trust Layer Agent';

  async assessTrust(extractedData: ExtractedClaimData, spcQuote?: SPCQuote): Promise<TrustLayerResponse> {
    const startTime = Date.now();
    
    try {
      const trustScore = await this.calculateTrustScore(extractedData, spcQuote);
      const riskFactors = this.identifyRiskFactors(extractedData, spcQuote);
      const recommendations = this.generateTrustRecommendations(trustScore, riskFactors);
      const auditTrail = this.generateAuditTrail(extractedData, spcQuote);
      
      const processingTime = Date.now() - startTime;
      
      return {
        trustScore,
        riskFactors,
        recommendations,
        auditTrail,
        processingTime
      };
    } catch (error) {
      throw new Error(`Trust assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async calculateTrustScore(data: ExtractedClaimData, spcQuote?: SPCQuote): Promise<number> {
    let score = 0.5; // Base trust score

    // Data completeness factors
    if (data.propertyInfo.address && data.propertyInfo.city && data.propertyInfo.state) {
      score += 0.1;
    }

    if (data.claimDetails.claimNumber && data.claimDetails.dateOfLoss && data.claimDetails.causeOfLoss) {
      score += 0.1;
    }

    if (data.claimDetails.adjusterName && data.claimDetails.adjusterContact) {
      score += 0.05;
    }

    if (data.claimDetails.contractorName && data.claimDetails.contractorContact) {
      score += 0.05;
    }

    // Data consistency factors
    const calculatedSubtotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(data.totals.subtotal - calculatedSubtotal) < 0.01) {
      score += 0.1;
    }

    // Line item quality factors
    const hasDetailedNotes = data.lineItems.filter(item => item.notes && item.notes.length > 10).length;
    const notesRatio = hasDetailedNotes / data.lineItems.length;
    score += notesRatio * 0.1;

    // Pricing reasonableness factors
    const averageUnitPrice = data.lineItems.reduce((sum, item) => sum + item.unitPrice, 0) / data.lineItems.length;
    const priceVariance = data.lineItems.reduce((sum, item) => sum + Math.pow(item.unitPrice - averageUnitPrice, 2), 0) / data.lineItems.length;
    const priceConsistency = Math.max(0, 1 - (priceVariance / (averageUnitPrice * averageUnitPrice)));
    score += priceConsistency * 0.1;

    // Claim size factors
    if (data.totals.total > 10000) {
      score += 0.05; // Large claims often have more scrutiny
    }

    // Historical consistency (if SPC quote exists)
    if (spcQuote) {
      const originalTotal = data.totals.total;
      const spcTotal = spcQuote.quoteData.totals.total;
      const variance = Math.abs(originalTotal - spcTotal) / originalTotal;
      
      if (variance < 0.1) {
        score += 0.1; // Very close to original
      } else if (variance < 0.2) {
        score += 0.05; // Reasonable variance
      } else {
        score -= 0.1; // Significant variance
      }
    }

    // Metadata confidence
    if (data.metadata.confidenceScore > 0.9) {
      score += 0.05;
    } else if (data.metadata.confidenceScore < 0.7) {
      score -= 0.05;
    }

    return Math.min(Math.max(score, 0), 1); // Clamp between 0 and 1
  }

  private identifyRiskFactors(data: ExtractedClaimData, spcQuote?: SPCQuote): string[] {
    const riskFactors: string[] = [];

    // Data completeness risks
    if (!data.propertyInfo.address) {
      riskFactors.push('Missing property address');
    }

    if (!data.claimDetails.claimNumber) {
      riskFactors.push('Missing claim number');
    }

    if (!data.claimDetails.contractorName) {
      riskFactors.push('Missing contractor information');
    }

    // Data consistency risks
    const calculatedSubtotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(data.totals.subtotal - calculatedSubtotal) > 0.01) {
      riskFactors.push('Subtotal calculation mismatch');
    }

    // Pricing risks
    const averageUnitPrice = data.lineItems.reduce((sum, item) => sum + item.unitPrice, 0) / data.lineItems.length;
    const highPriceItems = data.lineItems.filter(item => item.unitPrice > averageUnitPrice * 2);
    if (highPriceItems.length > 0) {
      riskFactors.push('Unusually high unit prices detected');
    }

    // Claim size risks
    if (data.totals.total > 50000) {
      riskFactors.push('High-value claim requires additional scrutiny');
    }

    if (data.totals.total < 1000) {
      riskFactors.push('Low-value claim may not justify processing costs');
    }

    // Line item risks
    const itemsWithoutNotes = data.lineItems.filter(item => !item.notes || item.notes.length < 5);
    if (itemsWithoutNotes.length > data.lineItems.length * 0.5) {
      riskFactors.push('Insufficient documentation on line items');
    }

    // Historical comparison risks
    if (spcQuote) {
      const originalTotal = data.totals.total;
      const spcTotal = spcQuote.quoteData.totals.total;
      const variance = Math.abs(originalTotal - spcTotal) / originalTotal;
      
      if (variance > 0.3) {
        riskFactors.push('Significant variance from original claim');
      }
    }

    // Processing confidence risks
    if (data.metadata.confidenceScore < 0.8) {
      riskFactors.push('Low confidence in data extraction');
    }

    return riskFactors;
  }

  private generateTrustRecommendations(trustScore: number, riskFactors: string[]): string[] {
    const recommendations: string[] = [];

    if (trustScore < 0.7) {
      recommendations.push('Trust score is below acceptable threshold - manual review recommended');
    }

    if (riskFactors.length > 3) {
      recommendations.push('Multiple risk factors identified - additional validation required');
    }

    if (riskFactors.some(factor => factor.includes('calculation'))) {
      recommendations.push('Verify all calculations and totals for accuracy');
    }

    if (riskFactors.some(factor => factor.includes('pricing'))) {
      recommendations.push('Review unit prices against market rates');
    }

    if (riskFactors.some(factor => factor.includes('documentation'))) {
      recommendations.push('Improve documentation quality for better traceability');
    }

    if (trustScore > 0.9) {
      recommendations.push('High trust score - proceed with confidence');
    }

    return recommendations;
  }

  private generateAuditTrail(data: ExtractedClaimData, spcQuote?: SPCQuote): string[] {
    const auditTrail: string[] = [];

    auditTrail.push(`Claim processed at ${new Date().toISOString()}`);
    auditTrail.push(`Property: ${data.propertyInfo.address}, ${data.propertyInfo.city}, ${data.propertyInfo.state}`);
    auditTrail.push(`Claim Number: ${data.claimDetails.claimNumber}`);
    auditTrail.push(`Date of Loss: ${data.claimDetails.dateOfLoss.toISOString().split('T')[0]}`);
    auditTrail.push(`Cause of Loss: ${data.claimDetails.causeOfLoss}`);
    auditTrail.push(`Total Claim Value: $${data.totals.total.toFixed(2)}`);
    auditTrail.push(`Number of Line Items: ${data.lineItems.length}`);
    auditTrail.push(`Data Extraction Confidence: ${(data.metadata.confidenceScore * 100).toFixed(1)}%`);

    if (data.claimDetails.adjusterName) {
      auditTrail.push(`Adjuster: ${data.claimDetails.adjusterName}`);
    }

    if (data.claimDetails.contractorName) {
      auditTrail.push(`Contractor: ${data.claimDetails.contractorName}`);
    }

    if (spcQuote) {
      auditTrail.push(`SPC Quote Generated: ${spcQuote.generatedAt.toISOString()}`);
      auditTrail.push(`SPC Quote Status: ${spcQuote.status.status}`);
      auditTrail.push(`SPC Quote Value: $${spcQuote.quoteData.totals.total.toFixed(2)}`);
    }

    return auditTrail;
  }
}

