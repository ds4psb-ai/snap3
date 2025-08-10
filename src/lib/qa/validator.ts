import { QAInput, QAReport, QAIssue } from './types';
import { hookMax, durationEq8, fpsMin, bitrateMin, contrastAA } from './rules';

export function evaluateQA(input: QAInput): QAReport {
  const issues: QAIssue[] = [];
  
  // Run all rules
  issues.push(...hookMax(input));
  issues.push(...durationEq8(input));
  issues.push(...fpsMin(input));
  issues.push(...bitrateMin(input));
  issues.push(...contrastAA(input));
  
  // Calculate penalties
  let totalPenalty = 0;
  issues.forEach(issue => {
    if (issue.severity === 'MAJOR') {
      totalPenalty += 20;
    } else if (issue.severity === 'WARN') {
      totalPenalty += 5;
    }
  });
  
  const score = Math.max(0, 100 - totalPenalty);
  // Pass if no MAJOR issues (WARN is acceptable)
  const pass = !issues.some(issue => issue.severity === 'MAJOR');
  
  return {
    pass,
    score,
    issues,
  };
}