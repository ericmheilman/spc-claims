// Enhanced Logging System for Roof Adjustment Engine
// Provides detailed tracking of all rule applications and decisions

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: string;
  rule: string;
  message: string;
  data?: any;
}

interface RuleExecutionLog {
  ruleName: string;
  category: string;
  executed: boolean;
  itemsProcessed: number;
  adjustmentsMade: number;
  additionsMade: number;
  executionTime: number;
  details: LogEntry[];
}

export class RoofAdjustmentLogger {
  private logs: LogEntry[] = [];
  private ruleExecutions: RuleExecutionLog[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  private addLog(level: LogEntry['level'], category: string, rule: string, message: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      rule,
      message,
      data
    };
    this.logs.push(logEntry);
    
    // Also log to console with appropriate styling
    const emoji = level === 'INFO' ? 'ℹ️' : level === 'WARN' ? '⚠️' : level === 'ERROR' ? '❌' : '🔍';
    console.log(`${emoji} [${category}] ${rule}: ${message}`, data ? data : '');
  }

  public startRuleExecution(ruleName: string, category: string): RuleExecutionLog {
    const ruleLog: RuleExecutionLog = {
      ruleName,
      category,
      executed: false,
      itemsProcessed: 0,
      adjustmentsMade: 0,
      additionsMade: 0,
      executionTime: 0,
      details: []
    };
    
    this.ruleExecutions.push(ruleLog);
    this.addLog('INFO', category, ruleName, `Starting rule execution`);
    
    return ruleLog;
  }

  public endRuleExecution(ruleLog: RuleExecutionLog) {
    ruleLog.executed = true;
    ruleLog.executionTime = Date.now() - this.startTime;
    
    this.addLog('INFO', ruleLog.category, ruleLog.ruleName, 
      `Rule completed - ${ruleLog.adjustmentsMade} adjustments, ${ruleLog.additionsMade} additions, ${ruleLog.itemsProcessed} items processed`);
  }

  public logItemProcessing(ruleLog: RuleExecutionLog, itemDescription: string, action: string, details?: any) {
    ruleLog.itemsProcessed++;
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message: `Processing item: ${itemDescription} - ${action}`,
      data: details
    });
    
    this.addLog('DEBUG', ruleLog.category, ruleLog.ruleName, 
      `Processing: ${itemDescription} - ${action}`, details);
  }

  public logAdjustment(ruleLog: RuleExecutionLog, itemDescription: string, field: string, before: any, after: any, reason: string) {
    ruleLog.adjustmentsMade++;
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message: `Adjustment made: ${itemDescription} - ${field}: ${before} → ${after}`,
      data: { field, before, after, reason }
    });
    
    this.addLog('INFO', ruleLog.category, ruleLog.ruleName, 
      `ADJUSTMENT: ${itemDescription} - ${field}: ${before} → ${after}`, { reason });
  }

  public logAddition(ruleLog: RuleExecutionLog, itemDescription: string, quantity: number, reason: string) {
    ruleLog.additionsMade++;
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'INFO',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message: `Addition made: ${itemDescription} - Quantity: ${quantity}`,
      data: { quantity, reason }
    });
    
    this.addLog('INFO', ruleLog.category, ruleLog.ruleName, 
      `ADDITION: ${itemDescription} - Quantity: ${quantity}`, { reason });
  }

  public logWarning(ruleLog: RuleExecutionLog, message: string, data?: any) {
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'WARN',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message,
      data
    });
    
    this.addLog('WARN', ruleLog.category, ruleLog.ruleName, message, data);
  }

  public logError(ruleLog: RuleExecutionLog, message: string, error?: any) {
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message,
      data: error
    });
    
    this.addLog('ERROR', ruleLog.category, ruleLog.ruleName, message, error);
  }

  public logRuleDecision(ruleLog: RuleExecutionLog, decision: string, reasoning: string, data?: any) {
    ruleLog.details.push({
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      category: ruleLog.category,
      rule: ruleLog.ruleName,
      message: `Decision: ${decision} - ${reasoning}`,
      data
    });
    
    this.addLog('DEBUG', ruleLog.category, ruleLog.ruleName, 
      `DECISION: ${decision} - ${reasoning}`, data);
  }

  public getExecutionSummary(): {
    totalRules: number;
    executedRules: number;
    totalAdjustments: number;
    totalAdditions: number;
    totalItemsProcessed: number;
    executionTime: number;
    ruleBreakdown: Array<{
      rule: string;
      category: string;
      executed: boolean;
      adjustments: number;
      additions: number;
      itemsProcessed: number;
      executionTime: number;
    }>;
  } {
    const totalRules = this.ruleExecutions.length;
    const executedRules = this.ruleExecutions.filter(r => r.executed).length;
    const totalAdjustments = this.ruleExecutions.reduce((sum, r) => sum + r.adjustmentsMade, 0);
    const totalAdditions = this.ruleExecutions.reduce((sum, r) => sum + r.additionsMade, 0);
    const totalItemsProcessed = this.ruleExecutions.reduce((sum, r) => sum + r.itemsProcessed, 0);
    const executionTime = Date.now() - this.startTime;

    return {
      totalRules,
      executedRules,
      totalAdjustments,
      totalAdditions,
      totalItemsProcessed,
      executionTime,
      ruleBreakdown: this.ruleExecutions.map(r => ({
        rule: r.ruleName,
        category: r.category,
        executed: r.executed,
        adjustments: r.adjustmentsMade,
        additions: r.additionsMade,
        itemsProcessed: r.itemsProcessed,
        executionTime: r.executionTime
      }))
    };
  }

  public printExecutionSummary() {
    const summary = this.getExecutionSummary();
    
    console.log('\n📊 ROOF ADJUSTMENT ENGINE EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Total Execution Time: ${summary.executionTime}ms`);
    console.log(`🔧 Rules Executed: ${summary.executedRules}/${summary.totalRules}`);
    console.log(`📝 Total Adjustments: ${summary.totalAdjustments}`);
    console.log(`➕ Total Additions: ${summary.totalAdditions}`);
    console.log(`📋 Items Processed: ${summary.totalItemsProcessed}`);
    
    console.log('\n📋 RULE BREAKDOWN:');
    summary.ruleBreakdown.forEach((rule, index) => {
      const status = rule.executed ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${rule.category} - ${rule.rule}`);
      console.log(`   📝 Adjustments: ${rule.adjustments} | Additions: ${rule.additions} | Items: ${rule.itemsProcessed}`);
    });
    
    console.log('\n📝 DETAILED LOGS:');
    this.logs.forEach((log, index) => {
      const emoji = log.level === 'INFO' ? 'ℹ️' : log.level === 'WARN' ? '⚠️' : log.level === 'ERROR' ? '❌' : '🔍';
      console.log(`${index + 1}. ${emoji} [${log.category}] ${log.rule}: ${log.message}`);
      if (log.data) {
        console.log(`   📊 Data: ${JSON.stringify(log.data, null, 2)}`);
      }
    });
  }

  public exportLogs(): {
    summary: any;
    logs: LogEntry[];
    ruleExecutions: RuleExecutionLog[];
  } {
    return {
      summary: this.getExecutionSummary(),
      logs: this.logs,
      ruleExecutions: this.ruleExecutions
    };
  }
}

// Global logger instance
export const roofAdjustmentLogger = new RoofAdjustmentLogger();
