'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { limitedAutoMode } from '@/lib/recursive-improvement/limited-auto-mode';

export function LimitedAutoModePanel() {
  const [status, setStatus] = useState(limitedAutoMode.getStatus());
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(limitedAutoMode.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleReset = () => {
    limitedAutoMode.reset();
    setStatus(limitedAutoMode.getStatus());
  };

  const handleEmergencyStop = () => {
    limitedAutoMode.reset();
    setIsActive(false);
    setStatus(limitedAutoMode.getStatus());
  };

  const progressPercentage = (status.currentOperations / status.maxOperations) * 100;
  const timeProgressPercentage = (status.elapsedTime / status.maxExecutionTime) * 100;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛡️ 제한된 자동 모드
          <Badge variant={status.needsUserApproval ? "destructive" : "default"}>
            {status.needsUserApproval ? "승인 필요" : "자동 실행"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 작업 진행률 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>작업 진행률</span>
            <span>{status.currentOperations}/{status.maxOperations}</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* 시간 진행률 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>실행 시간</span>
            <span>{Math.round(status.elapsedTime / 1000)}s/{Math.round(status.maxExecutionTime / 1000)}s</span>
          </div>
          <Progress value={timeProgressPercentage} className="h-2" />
        </div>

        {/* 활성 작업 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">활성 작업</div>
          <div className="space-y-1">
            {status.activeTasks.length > 0 ? (
              status.activeTasks.map((task, index) => (
                <div key={index} className="text-xs bg-blue-50 p-2 rounded">
                  🔄 {task}
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-500">대기 중</div>
            )}
          </div>
        </div>

        {/* 경고 메시지 */}
        {status.needsUserApproval && (
          <Alert>
            <AlertDescription>
              ⚠️ {status.userApprovalThreshold}개 작업 완료. 추가 작업을 위해 사용자 승인이 필요합니다.
            </AlertDescription>
          </Alert>
        )}

        {/* 제어 버튼 */}
        <div className="flex gap-2">
          <Button 
            onClick={handleReset} 
            variant="outline" 
            size="sm"
            className="flex-1"
          >
            🔄 리셋
          </Button>
          <Button 
            onClick={handleEmergencyStop} 
            variant="destructive" 
            size="sm"
            className="flex-1"
          >
            🛑 긴급 정지
          </Button>
        </div>

        {/* 상태 정보 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>최대 동시 작업: {status.maxConcurrentTasks}개</div>
          <div>승인 임계값: {status.userApprovalThreshold}개 작업</div>
        </div>
      </CardContent>
    </Card>
  );
}
