'use client';

import { MessageMonitor } from '@/components/collaboration/MessageMonitor';

export default function MessageMonitorPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">ClaudeCode Message Monitor</h1>
          <p className="text-gray-600">
            실시간으로 ClaudeCode에서 보낸 메시지를 모니터링하고 알림을 받습니다.
          </p>
        </div>
        
        <MessageMonitor />
        
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">사용법</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Start Monitoring</strong> 버튼을 클릭하여 자동 모니터링을 시작합니다</li>
            <li>• 새로운 메시지가 오면 자동으로 알림이 표시됩니다</li>
            <li>• <strong>Critical</strong> 메시지는 즉시 확인이 필요합니다</li>
            <li>• <strong>High</strong> 우선순위 메시지는 빠른 확인이 필요합니다</li>
            <li>• 메시지 처리 완료 후 ✓ 버튼을 클릭하여 처리 완료 표시</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
