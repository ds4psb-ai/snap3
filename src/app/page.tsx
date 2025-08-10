'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  VideoIcon, 
  FileJsonIcon, 
  CheckCircleIcon, 
  ShieldCheckIcon,
  PlayCircleIcon,
  DownloadIcon,
  UploadIcon,
  BarChartIcon
} from 'lucide-react';

export default function HomePage() {
  const [digestId, setDigestId] = useState('C0008888');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Snap3
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              AI-Powered Video Content Analysis Platform
            </p>
            <div className="flex justify-center gap-4">
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <PlayCircleIcon size={20} />
                Get Started
              </button>
              <Link 
                href="/exports/C0008888"
                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <FileJsonIcon size={20} />
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          Core Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* VDP Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
              <VideoIcon className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              VDP Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Advanced video data package analysis with AI-powered insights
            </p>
          </div>

          {/* Evidence Processing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <ShieldCheckIcon className="text-green-600 dark:text-green-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Evidence Pack
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Secure evidence extraction with redaction pipeline
            </p>
          </div>

          {/* QA Validation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <CheckCircleIcon className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              QA Validation
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Comprehensive quality assurance with 8-second precision
            </p>
          </div>

          {/* Export System */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
              <DownloadIcon className="text-orange-600 dark:text-orange-400" size={24} />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              Export System
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              JSON and Brief exports with audit trail
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Section */}
      <div className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            Quick Access
          </h2>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter Digest ID
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={digestId}
                  onChange={(e) => setDigestId(e.target.value)}
                  placeholder="e.g., C0008888"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  pattern="[A-Z0-9]{8}"
                />
                <Link
                  href={`/exports/${digestId}`}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Export
                </Link>
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <Link
                  href={`/v/${digestId}`}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <PlayCircleIcon size={18} />
                  Video Preview
                </Link>
                <Link
                  href={`/api/export/json/${digestId}`}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <FileJsonIcon size={18} />
                  JSON Export
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Status Dashboard */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
          System Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* API Endpoints */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                API Endpoints
              </h3>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                Active
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Export APIs</span>
                <span className="text-gray-900 dark:text-white font-medium">2</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Input APIs</span>
                <span className="text-gray-900 dark:text-white font-medium">4</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Processing APIs</span>
                <span className="text-gray-900 dark:text-white font-medium">5</span>
              </div>
            </div>
          </div>

          {/* Schema Validation */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Schema Validation
              </h3>
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded-full">
                Passing
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Veo3 Prompt</span>
                <CheckCircleIcon className="text-green-500" size={16} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Error Schemas</span>
                <CheckCircleIcon className="text-green-500" size={16} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Evidence Pack</span>
                <CheckCircleIcon className="text-green-500" size={16} />
              </div>
            </div>
          </div>

          {/* Build Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Build Info
              </h3>
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                v0.4.0-rc.1
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Next.js</span>
                <span className="text-gray-900 dark:text-white font-medium">15.4.6</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">React</span>
                <span className="text-gray-900 dark:text-white font-medium">19.1.1</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">TypeScript</span>
                <span className="text-gray-900 dark:text-white font-medium">Strict</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-600 dark:text-gray-400 text-sm">
              © 2024 Snap3. AI-Powered Video Analysis Platform
            </div>
            <div className="flex gap-6 mt-4 md:mt-0">
              <Link href="/api/export/json/C0008888" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm">
                API Docs
              </Link>
              <Link href="/exports/C0008889" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm">
                Demo 2
              </Link>
              <a href="https://github.com" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}