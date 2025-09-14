import { ExtractedClaimData, BundleLogicResponse, BundleLogic, Bundle, SPCRecommendation } from '@/types';

export class BundleLogicAgent {
  private agentId = 'bundle-logic';
  private agentName = 'Bundle Logic Agent';

  async optimizeBundles(extractedData: ExtractedClaimData): Promise<BundleLogicResponse> {
    const startTime = Date.now();
    
    try {
      const bundleLogic = await this.analyzeBundlingOpportunities(extractedData);
      const savings = this.calculateTotalSavings(bundleLogic);
      const efficiencyGains = this.calculateEfficiencyGains(bundleLogic);
      
      const processingTime = Date.now() - startTime;
      
      return {
        bundleLogic,
        savings,
        efficiencyGains,
        processingTime
      };
    } catch (error) {
      throw new Error(`Bundle logic analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async analyzeBundlingOpportunities(data: ExtractedClaimData): Promise<BundleLogic> {
    const bundles: Bundle[] = [];
    const lineItems = data.lineItems;

    // Analyze potential bundles based on categories and work types
    const categoryGroups = this.groupByCategory(lineItems);
    
    // Water damage repair bundle
    const waterDamageItems = lineItems.filter(item => 
      item.category.toLowerCase().includes('water') || 
      item.description.toLowerCase().includes('water damage')
    );
    
    if (waterDamageItems.length > 1) {
      bundles.push({
        id: 'bundle-water-damage',
        name: 'Water Damage Repair Bundle',
        lineItems: waterDamageItems.map(item => item.id),
        savings: this.calculateBundleSavings(waterDamageItems, 0.15), // 15% bundle discount
        reasoning: 'Grouping related water damage repairs reduces setup time and material waste'
      });
    }

    // Flooring bundle
    const flooringItems = lineItems.filter(item => 
      item.category.toLowerCase().includes('floor') ||
      item.description.toLowerCase().includes('carpet') ||
      item.description.toLowerCase().includes('flooring')
    );
    
    if (flooringItems.length > 1) {
      bundles.push({
        id: 'bundle-flooring',
        name: 'Flooring Installation Bundle',
        lineItems: flooringItems.map(item => item.id),
        savings: this.calculateBundleSavings(flooringItems, 0.12), // 12% bundle discount
        reasoning: 'Combining flooring work reduces material handling and installation time'
      });
    }

    // Painting bundle
    const paintingItems = lineItems.filter(item => 
      item.category.toLowerCase().includes('paint') ||
      item.description.toLowerCase().includes('painting')
    );
    
    if (paintingItems.length > 1) {
      bundles.push({
        id: 'bundle-painting',
        name: 'Interior Painting Bundle',
        lineItems: paintingItems.map(item => item.id),
        savings: this.calculateBundleSavings(paintingItems, 0.10), // 10% bundle discount
        reasoning: 'Painting multiple areas together reduces setup time and paint waste'
      });
    }

    // Drywall repair bundle
    const drywallItems = lineItems.filter(item => 
      item.description.toLowerCase().includes('drywall') ||
      item.description.toLowerCase().includes('wall repair')
    );
    
    if (drywallItems.length > 1) {
      bundles.push({
        id: 'bundle-drywall',
        name: 'Drywall Repair Bundle',
        lineItems: drywallItems.map(item => item.id),
        savings: this.calculateBundleSavings(drywallItems, 0.08), // 8% bundle discount
        reasoning: 'Grouping drywall work reduces material cuts and installation time'
      });
    }

    // Electrical work bundle
    const electricalItems = lineItems.filter(item => 
      item.category.toLowerCase().includes('electrical') ||
      item.description.toLowerCase().includes('electrical')
    );
    
    if (electricalItems.length > 1) {
      bundles.push({
        id: 'bundle-electrical',
        name: 'Electrical Work Bundle',
        lineItems: electricalItems.map(item => item.id),
        savings: this.calculateBundleSavings(electricalItems, 0.20), // 20% bundle discount
        reasoning: 'Electrical work often requires permits and specialized tools - bundling reduces costs'
      });
    }

    // Plumbing work bundle
    const plumbingItems = lineItems.filter(item => 
      item.category.toLowerCase().includes('plumb') ||
      item.description.toLowerCase().includes('plumb')
    );
    
    if (plumbingItems.length > 1) {
      bundles.push({
        id: 'bundle-plumbing',
        name: 'Plumbing Work Bundle',
        lineItems: plumbingItems.map(item => item.id),
        savings: this.calculateBundleSavings(plumbingItems, 0.18), // 18% bundle discount
        reasoning: 'Plumbing work often requires specialized tools and permits - bundling reduces costs'
      });
    }

    const totalSavings = bundles.reduce((sum, bundle) => sum + bundle.savings, 0);
    const efficiencyGains = this.calculateEfficiencyGains({ bundles, totalSavings, efficiencyGains: 0 });

    return {
      bundles,
      totalSavings,
      efficiencyGains
    };
  }

  private groupByCategory(lineItems: any[]): Record<string, any[]> {
    return lineItems.reduce((groups, item) => {
      const category = item.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  }

  private calculateBundleSavings(items: any[], discountRate: number): number {
    const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return totalValue * discountRate;
  }

  private calculateEfficiencyGains(bundleLogic: BundleLogic): number {
    // Calculate efficiency gains based on bundle complexity and potential time savings
    let efficiencyGains = 0;
    
    bundleLogic.bundles.forEach(bundle => {
      // More items in a bundle = higher efficiency gains
      const itemCount = bundle.lineItems.length;
      const baseEfficiency = Math.min(itemCount * 0.05, 0.3); // Max 30% efficiency gain
      efficiencyGains += baseEfficiency;
    });

    return Math.min(efficiencyGains, 1.0); // Cap at 100%
  }

  private calculateTotalSavings(bundleLogic: BundleLogic): number {
    return bundleLogic.bundles.reduce((sum, bundle) => sum + bundle.savings, 0);
  }

  generateSPCRecommendations(bundleLogic: BundleLogic): SPCRecommendation[] {
    const recommendations: SPCRecommendation[] = [];

    if (bundleLogic.bundles.length > 0) {
      recommendations.push({
        category: 'Cost Optimization',
        recommendation: 'Implement suggested bundles to reduce project costs',
        priority: 'High',
        reasoning: `Bundling related work items can save $${bundleLogic.totalSavings.toFixed(2)} and improve efficiency`,
        estimatedImpact: bundleLogic.totalSavings
      });
    }

    if (bundleLogic.efficiencyGains > 0.2) {
      recommendations.push({
        category: 'Project Efficiency',
        recommendation: 'Consider scheduling bundled work items together',
        priority: 'Medium',
        reasoning: `Bundling can improve project efficiency by ${(bundleLogic.efficiencyGains * 100).toFixed(1)}%`,
        estimatedImpact: bundleLogic.efficiencyGains * 1000 // Estimated time savings in hours
      });
    }

    if (bundleLogic.bundles.some(b => b.lineItems.length > 3)) {
      recommendations.push({
        category: 'Resource Management',
        recommendation: 'Assign dedicated team for complex bundled work',
        priority: 'Low',
        reasoning: 'Complex bundles may benefit from specialized team assignment',
        estimatedImpact: 500 // Estimated cost savings from better resource allocation
      });
    }

    return recommendations;
  }
}

