import { ExtractedClaimData, QuoteValidatorResponse, ValidationResults, ValidationError, ValidationWarning } from '@/types';

export class QuoteValidatorAgent {
  private agentId = 'quote-validator';
  private agentName = 'Quote Validator Agent';

  async validateQuote(extractedData: ExtractedClaimData): Promise<QuoteValidatorResponse> {
    const startTime = Date.now();
    
    try {
      const validationResults = await this.performValidation(extractedData);
      const recommendations = this.generateRecommendations(validationResults);
      const complianceScore = this.calculateComplianceScore(validationResults);
      
      const processingTime = Date.now() - startTime;
      
      return {
        validationResults,
        recommendations,
        complianceScore,
        processingTime
      };
    } catch (error) {
      throw new Error(`Quote validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performValidation(data: ExtractedClaimData): Promise<ValidationResults> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate property information
    if (!data.propertyInfo.address) {
      errors.push({
        field: 'propertyInfo.address',
        message: 'Property address is required',
        severity: 'Critical'
      });
    }

    if (!data.propertyInfo.city || !data.propertyInfo.state || !data.propertyInfo.zipCode) {
      errors.push({
        field: 'propertyInfo.location',
        message: 'Complete property location information is required',
        severity: 'High'
      });
    }

    // Validate claim details
    if (!data.claimDetails.claimNumber) {
      errors.push({
        field: 'claimDetails.claimNumber',
        message: 'Claim number is required',
        severity: 'Critical'
      });
    }

    if (!data.claimDetails.dateOfLoss) {
      errors.push({
        field: 'claimDetails.dateOfLoss',
        message: 'Date of loss is required',
        severity: 'Critical'
      });
    }

    if (!data.claimDetails.causeOfLoss) {
      errors.push({
        field: 'claimDetails.causeOfLoss',
        message: 'Cause of loss is required',
        severity: 'High'
      });
    }

    // Validate line items
    if (data.lineItems.length === 0) {
      errors.push({
        field: 'lineItems',
        message: 'At least one line item is required',
        severity: 'Critical'
      });
    }

    // Check for pricing inconsistencies
    data.lineItems.forEach((item, index) => {
      const calculatedTotal = item.quantity * item.unitPrice;
      if (Math.abs(item.totalPrice - calculatedTotal) > 0.01) {
        errors.push({
          field: `lineItems[${index}].totalPrice`,
          message: `Total price (${item.totalPrice}) does not match calculated value (${calculatedTotal})`,
          severity: 'High'
        });
      }
    });

    // Validate totals
    const calculatedSubtotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(data.totals.subtotal - calculatedSubtotal) > 0.01) {
      errors.push({
        field: 'totals.subtotal',
        message: `Subtotal (${data.totals.subtotal}) does not match sum of line items (${calculatedSubtotal})`,
        severity: 'High'
      });
    }

    // Check for missing contractor information
    if (!data.claimDetails.contractorName) {
      warnings.push({
        field: 'claimDetails.contractorName',
        message: 'Contractor information is missing',
        suggestion: 'Add contractor name and contact information for better tracking'
      });
    }

    // Check for unusual pricing patterns
    const averageUnitPrice = data.lineItems.reduce((sum, item) => sum + item.unitPrice, 0) / data.lineItems.length;
    data.lineItems.forEach((item, index) => {
      if (item.unitPrice > averageUnitPrice * 3) {
        warnings.push({
          field: `lineItems[${index}].unitPrice`,
          message: `Unit price (${item.unitPrice}) is significantly higher than average`,
          suggestion: 'Review pricing for accuracy and market rates'
        });
      }
    });

    // Check for missing notes on high-value items
    data.lineItems.forEach((item, index) => {
      if (item.totalPrice > 1000 && !item.notes) {
        warnings.push({
          field: `lineItems[${index}].notes`,
          message: 'High-value item missing detailed notes',
          suggestion: 'Add detailed notes explaining the work and materials'
        });
      }
    });

    const isValid = errors.length === 0;
    const complianceScore = this.calculateComplianceScore({ errors, warnings, isValid, complianceScore: 0 });

    return {
      errors,
      warnings,
      isValid,
      complianceScore
    };
  }

  private generateRecommendations(validationResults: ValidationResults): string[] {
    const recommendations: string[] = [];

    if (validationResults.errors.length > 0) {
      recommendations.push('Address all validation errors before proceeding with quote generation');
    }

    if (validationResults.warnings.length > 0) {
      recommendations.push('Review warnings and consider addressing them for improved quote quality');
    }

    if (validationResults.complianceScore < 0.8) {
      recommendations.push('Improve data completeness to increase compliance score');
    }

    if (validationResults.errors.some(e => e.field.includes('totals'))) {
      recommendations.push('Verify all calculations and totals for accuracy');
    }

    if (validationResults.warnings.some(w => w.field.includes('contractorName'))) {
      recommendations.push('Add contractor information for better project tracking');
    }

    return recommendations;
  }

  private calculateComplianceScore(validationResults: ValidationResults): number {
    let score = 1.0;

    // Deduct points for errors
    validationResults.errors.forEach(error => {
      switch (error.severity) {
        case 'Critical':
          score -= 0.3;
          break;
        case 'High':
          score -= 0.2;
          break;
        case 'Medium':
          score -= 0.1;
          break;
        case 'Low':
          score -= 0.05;
          break;
      }
    });

    // Deduct points for warnings
    validationResults.warnings.forEach(() => {
      score -= 0.02;
    });

    return Math.max(score, 0);
  }
}

