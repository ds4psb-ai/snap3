#!/usr/bin/env ts-node

/**
 * URIS SLO Monitor - Real-time SLO compliance monitoring
 * Monitors URIS Agent Router SLO targets:
 * - Routing latency P95 < 50ms
 * - Context detection accuracy > 90%  
 * - Consensus success rate > 95%
 */

import { URISMetricsCollector } from '../ai-collab/universal/metrics/uris-collector';
import * as fs from 'fs';

interface AlertConfig {
  enabled: boolean;
  webhook_url?: string;
  alert_cooldown_minutes: number;
  severity_levels: {
    warn_threshold: number; // 1 SLO violation
    critical_threshold: number; // 2+ SLO violations
  };
}

interface SLOAlert {
  timestamp: string;
  severity: 'WARN' | 'CRITICAL';
  slo_status: 'PASS' | 'WARN' | 'FAIL';
  violations: string[];
  metrics: any;
  alert_id: string;
}

class URISLOMonitor {
  private collector: URISMetricsCollector;
  private alertConfig: AlertConfig;
  private lastAlertTime: Map<string, number> = new Map();
  private monitoringActive = false;

  constructor() {
    // Initialize with production SLO targets
    this.collector = new URISMetricsCollector({
      routing_latency_p95_ms: 50,
      context_detection_accuracy_pct: 90,
      consensus_success_rate_pct: 95,
    });

    this.alertConfig = {
      enabled: true,
      alert_cooldown_minutes: 5,
      severity_levels: {
        warn_threshold: 1,
        critical_threshold: 2,
      }
    };
  }

  /**
   * Start continuous SLO monitoring
   */
  async startMonitoring(intervalSeconds: number = 30): Promise<void> {
    console.log('🚀 URIS SLO Monitor starting...');
    console.log(`📊 Monitoring interval: ${intervalSeconds}s`);
    console.log(`🎯 SLO Targets:`);
    console.log(`   - Routing latency P95: <50ms`);
    console.log(`   - Context detection accuracy: >90%`);
    console.log(`   - Consensus success rate: >95%`);

    this.monitoringActive = true;

    while (this.monitoringActive) {
      try {
        await this.checkSLOCompliance();
        await this.updateDashboard();
        await this.sleep(intervalSeconds * 1000);
      } catch (error) {
        console.error('❌ SLO monitoring error:', error.message);
        await this.sleep(5000); // Retry in 5s on error
      }
    }
  }

  /**
   * Check current SLO compliance and trigger alerts
   */
  private async checkSLOCompliance(): Promise<void> {
    const sloStatus = await this.collector.getSLOStatus();
    
    console.log(`[${new Date().toISOString()}] SLO Status: ${sloStatus.status}`);
    
    if (sloStatus.status !== 'PASS') {
      await this.handleSLOViolation(sloStatus);
    } else {
      console.log('✅ All SLOs compliant');
    }

    // Log key metrics
    const metrics = sloStatus.metrics;
    console.log(`   P95 Latency: ${metrics.routing_performance.p95_latency_ms}ms (target: <50ms)`);
    console.log(`   Context Accuracy: ${metrics.context_detection.accuracy_rate.toFixed(1)}% (target: >90%)`);
    console.log(`   Consensus Rate: ${metrics.agent_coordination.consensus_rate.toFixed(1)}% (target: >95%)`);
  }

  /**
   * Handle SLO violations with alerting
   */
  private async handleSLOViolation(sloStatus: any): Promise<void> {
    const violationCount = sloStatus.violations.length;
    const severity: 'WARN' | 'CRITICAL' = violationCount >= this.alertConfig.severity_levels.critical_threshold ? 'CRITICAL' : 'WARN';
    
    const alertId = `${severity.toLowerCase()}-${Date.now()}`;
    const now = Date.now();
    const cooldownKey = `${severity}-slo-violation`;
    const lastAlert = this.lastAlertTime.get(cooldownKey) || 0;
    
    // Check cooldown period
    if (now - lastAlert < this.alertConfig.alert_cooldown_minutes * 60 * 1000) {
      console.log(`⏳ Alert cooldown active for ${cooldownKey}`);
      return;
    }

    const alert: SLOAlert = {
      timestamp: new Date().toISOString(),
      severity,
      slo_status: sloStatus.status,
      violations: sloStatus.violations,
      metrics: sloStatus.metrics,
      alert_id: alertId
    };

    console.log(`🚨 ${severity} SLO Alert [${alertId}]:`);
    sloStatus.violations.forEach((violation: string) => {
      console.log(`   ${violation}`);
    });

    // Log alert to file for dashboard integration
    await this.logAlert(alert);
    
    // Update last alert time
    this.lastAlertTime.set(cooldownKey, now);

    // Integration with T3 circuit breaker
    await this.notifyT3Integration(alert);
  }

  /**
   * Update real-time dashboard data
   */
  private async updateDashboard(): Promise<void> {
    try {
      const t3Integration = await this.collector.getT3Integration();
      const sloStatus = await this.collector.getSLOStatus();

      const dashboardData = {
        timestamp: new Date().toISOString(),
        uris_slo_monitor: {
          status: sloStatus.status,
          current_violations: sloStatus.violations.length,
          p95_latency_ms: t3Integration.current_p95_ms,
          slo_aligned: t3Integration.slo_aligned,
          circuit_breaker_compatible: t3Integration.circuit_breaker_compatible,
        },
        integration_status: {
          t3_circuit_breaker: 'active',
          live_monitoring: 'active',
          alert_system: this.alertConfig.enabled ? 'active' : 'disabled',
        }
      };

      // Write dashboard data for T3 integration
      const dashboardPath = '/Users/ted/snap3/services/t2-extract/uris-dashboard-live.json';
      fs.writeFileSync(dashboardPath, JSON.stringify(dashboardData, null, 2));

    } catch (error) {
      console.error('⚠️ Failed to update dashboard:', error.message);
    }
  }

  /**
   * Log alert to file for persistence and dashboard integration
   */
  private async logAlert(alert: SLOAlert): Promise<void> {
    const logPath = '/Users/ted/snap3/services/t2-extract/uris-slo-alerts.log';
    const logEntry = `${alert.timestamp} [${alert.severity}] ${alert.alert_id}: ${alert.violations.join(', ')}\\n`;
    
    fs.appendFileSync(logPath, logEntry);
  }

  /**
   * Notify T3 circuit breaker system of SLO violations
   */
  private async notifyT3Integration(alert: SLOAlert): Promise<void> {
    try {
      // Read current T3 circuit breaker data
      const t3Path = '/Users/ted/snap3/services/t2-extract/t3-circuit-breaker-live.json';
      const t3Data = JSON.parse(fs.readFileSync(t3Path, 'utf8'));

      // Add URIS alert context to T3 data
      const enhanced = {
        ...t3Data,
        uris_integration: {
          slo_alert: alert,
          routing_p95_ms: alert.metrics.routing_performance.p95_latency_ms,
          slo_compliance: alert.metrics.slo_compliance.overall_slo_status,
          alert_severity: alert.severity,
          last_updated: alert.timestamp,
        }
      };

      // Write enhanced T3 data
      const enhancedPath = '/Users/ted/snap3/services/t2-extract/t3-uris-enhanced.json';
      fs.writeFileSync(enhancedPath, JSON.stringify(enhanced, null, 2));

      console.log(`🔗 T3 integration notified: ${alert.severity} alert`);

    } catch (error) {
      console.error('⚠️ Failed to notify T3 integration:', error.message);
    }
  }

  /**
   * Generate performance report for a specific time period
   */
  async generatePerformanceReport(periodMinutes: number = 60): Promise<void> {
    console.log(`📊 Generating ${periodMinutes}-minute performance report...`);
    
    try {
      const report = await this.collector.generateMetricsReport(periodMinutes);
      
      console.log('\\n=== URIS Performance Report ===');
      console.log(`Period: ${periodMinutes} minutes`);
      console.log(`Generated: ${report.timestamp}`);
      console.log('');
      
      console.log('🚀 Routing Performance:');
      console.log(`   P95 Latency: ${report.routing_performance.p95_latency_ms}ms (target: <50ms) ${report.slo_compliance.routing_latency_slo ? '✅' : '❌'}`);
      console.log(`   P99 Latency: ${report.routing_performance.p99_latency_ms}ms`);
      console.log(`   Avg Latency: ${report.routing_performance.avg_latency_ms.toFixed(2)}ms`);
      console.log(`   Total Decisions: ${report.routing_performance.total_decisions}`);
      console.log('');
      
      console.log('🎯 Context Detection:');
      console.log(`   Accuracy Rate: ${report.context_detection.accuracy_rate.toFixed(1)}% (target: >90%) ${report.slo_compliance.context_accuracy_slo ? '✅' : '❌'}`);
      console.log(`   Total Contexts: ${report.context_detection.total_contexts}`);
      console.log('');
      
      console.log('🤝 Agent Coordination:');
      console.log(`   Success Rate: ${report.agent_coordination.success_rate.toFixed(1)}%`);
      console.log(`   Consensus Rate: ${report.agent_coordination.consensus_rate.toFixed(1)}% (target: >95%) ${report.slo_compliance.consensus_success_slo ? '✅' : '❌'}`);
      console.log(`   Coordination Failures: ${report.agent_coordination.coordination_failures}`);
      console.log('');
      
      console.log('📋 SLO Compliance:');
      console.log(`   Overall Status: ${report.slo_compliance.overall_slo_status} ${report.slo_compliance.overall_slo_status === 'PASS' ? '✅' : '❌'}`);
      
      // Save report to file
      const reportPath = `/Users/ted/snap3/services/t2-extract/uris-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\\n📁 Report saved: ${reportPath}`);
      
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.monitoringActive = false;
    console.log('🛑 URIS SLO Monitor stopped');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new URISLOMonitor();
  const args = process.argv.slice(2);
  
  if (args.includes('--report')) {
    const periodMinutes = parseInt(args[args.indexOf('--report') + 1]) || 60;
    monitor.generatePerformanceReport(periodMinutes);
  } else if (args.includes('--once')) {
    monitor.checkSLOCompliance();
  } else {
    const intervalSeconds = parseInt(args[0]) || 30;
    monitor.startMonitoring(intervalSeconds);
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      monitor.stopMonitoring();
      process.exit(0);
    });
  }
}

export default URISLOMonitor;