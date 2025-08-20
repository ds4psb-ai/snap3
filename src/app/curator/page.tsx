'use client';

import { useState } from 'react';
import { CuratorUploaderIntegrated } from '@/components/curator/CuratorUploaderIntegrated';
import { StatusBoard } from '@/components/curator/StatusBoard';
import { UploadIcon, DatabaseIcon, TrendingUpIcon } from 'lucide-react';

export default function CuratorPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'status' | 'analytics'>('upload');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Curator Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                대량 링크 업로드 및 처리 현황 관리
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                VDP Project: tough-variety-466003-c5
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'upload'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UploadIcon size={16} />
                <span>대량 업로드</span>
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('status')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'status'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <DatabaseIcon size={16} />
                <span>상태 보드</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <TrendingUpIcon size={16} />
                <span>분석</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <CuratorUploaderIntegrated />
          </div>
        )}

        {activeTab === 'status' && (
          <div className="space-y-8">
            <StatusBoard />
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="text-center">
              <TrendingUpIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                분석 기능
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                업로드 통계 및 처리 성능 분석 기능이 곧 추가될 예정입니다.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}