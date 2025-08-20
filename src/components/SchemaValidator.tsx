'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface ValidationError {
  instancePath: string;
  message: string;
  keyword: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  schema: string;
  timestamp: string;
}

interface SchemaValidatorProps {
  vdpData: any;
  onValidationChange?: (result: ValidationResult) => void;
  showDetails?: boolean;
}

export default function SchemaValidator({ 
  vdpData, 
  onValidationChange,
  showDetails = true 
}: SchemaValidatorProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateSchema = async (data: any) => {
    if (!data) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/schema/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data, 
          schema: 'vdp',
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: ValidationResult = await response.json();
      setValidation(result);
      onValidationChange?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '검증 중 오류가 발생했습니다.');
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vdpData) {
      validateSchema(vdpData);
    }
  }, [vdpData]);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-blue-800">VDP 스키마 검증 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span className="text-red-800">검증 오류: {error}</span>
        </div>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-gray-600" />
          <span className="text-gray-800">검증 데이터가 없습니다.</span>
        </div>
      </div>
    );
  }

  if (validation.valid) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <h4 className="font-medium text-green-800">✅ VDP 스키마 검증 통과</h4>
            <p className="text-sm text-green-700 mt-1">
              VDP 데이터가 스키마 요구사항을 만족합니다.
            </p>
            {showDetails && (
              <div className="mt-2 text-xs text-green-600">
                <p>스키마: {validation.schema}</p>
                <p>검증 시간: {new Date(validation.timestamp).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800">❌ VDP 스키마 검증 실패</h4>
          <p className="text-sm text-red-700 mt-1 mb-3">
            VDP 데이터가 스키마 요구사항을 만족하지 않습니다.
          </p>
          
          {showDetails && validation.errors.length > 0 && (
            <div className="mt-3">
              <h5 className="text-sm font-medium text-red-800 mb-2">검증 오류 ({validation.errors.length}개):</h5>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {validation.errors.slice(0, 10).map((error, index) => (
                  <li key={index} className="text-xs text-red-700 bg-red-100 p-2 rounded">
                    <span className="font-medium">{error.instancePath || 'root'}:</span> {error.message}
                    {error.keyword && (
                      <span className="text-red-500 ml-2">({error.keyword})</span>
                    )}
                  </li>
                ))}
                {validation.errors.length > 10 && (
                  <li className="text-xs text-red-600 italic">
                    ... 및 {validation.errors.length - 10}개 더
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {showDetails && (
            <div className="mt-3 text-xs text-red-600">
              <p>스키마: {validation.schema}</p>
              <p>검증 시간: {new Date(validation.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
