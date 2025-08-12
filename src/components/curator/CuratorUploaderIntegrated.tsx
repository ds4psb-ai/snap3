'use client';

import { useState, useCallback, useRef } from 'react';
import { UploadIcon, FileIcon, LinkIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from 'lucide-react';

interface UploadItem {
  id: string;
  name: string;
  type: 'csv' | 'tsv' | 'file' | 'url';
  size?: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  jobId?: string;
}

export function CuratorUploaderIntegrated() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState('');

  const updateUploadStatus = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, ...updates } : upload
    ));
  }, []);

  const processFile = async (file: File) => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const uploadItem: UploadItem = {
      id: uploadId,
      name: file.name,
      type: file.name.endsWith('.csv') ? 'csv' : file.name.endsWith('.tsv') ? 'tsv' : 'file',
      size: file.size,
      status: 'pending',
      progress: 0,
    };

    setUploads(prev => [...prev, uploadItem]);

    try {
      // 1. Get signed URL
      updateUploadStatus(uploadId, { status: 'uploading', progress: 10 });
      
      const signedUrlResponse = await fetch('/api/curator/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { uploadUrl, gcsPath } = await signedUrlResponse.json();
      updateUploadStatus(uploadId, { progress: 30 });

      // 2. Upload to GCS
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      updateUploadStatus(uploadId, { progress: 70 });

      // 3. Create processing job
      const jobResponse = await fetch('/api/curator/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          gcsPath,
          fileName: file.name,
          fileType: uploadItem.type,
        }),
      });

      if (!jobResponse.ok) {
        throw new Error('Failed to create processing job');
      }

      const { jobId } = await jobResponse.json();
      
      updateUploadStatus(uploadId, { 
        status: 'processing', 
        progress: 100,
        jobId 
      });

      // Start polling for job status
      pollJobStatus(uploadId, jobId);

    } catch (error) {
      updateUploadStatus(uploadId, { 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Upload failed',
        progress: 0 
      });
    }
  };

  const pollJobStatus = async (uploadId: string, jobId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/curator/jobs/${jobId}/status`);
        if (!response.ok) return;

        const { status, progress } = await response.json();
        
        updateUploadStatus(uploadId, { 
          status: status === 'completed' ? 'completed' : 'processing',
          progress: progress || 100 
        });

        if (status !== 'completed' && status !== 'failed') {
          setTimeout(poll, 2000); // Poll every 2 seconds
        }
      } catch (error) {
        console.error('Job polling error:', error);
      }
    };

    poll();
  };

  const processUrls = async (urls: string[]) => {
    for (const url of urls) {
      const uploadId = `url_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const uploadItem: UploadItem = {
        id: uploadId,
        name: url,
        type: 'url',
        status: 'pending',
        progress: 0,
      };

      setUploads(prev => [...prev, uploadItem]);

      try {
        updateUploadStatus(uploadId, { status: 'processing', progress: 50 });

        const response = await fetch('/api/curator/process-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, uploadId }),
        });

        if (!response.ok) {
          throw new Error('Failed to process URL');
        }

        const { jobId } = await response.json();
        
        updateUploadStatus(uploadId, { 
          status: 'processing', 
          progress: 100,
          jobId 
        });

        pollJobStatus(uploadId, jobId);

      } catch (error) {
        updateUploadStatus(uploadId, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'URL processing failed',
          progress: 0 
        });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const urls = urlInput.split('\n').filter(url => url.trim());
    processUrls(urls);
    setUrlInput('');
  };

  const getStatusIcon = (status: UploadItem['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="text-green-500" size={20} />;
      case 'failed':
        return <XCircleIcon className="text-red-500" size={20} />;
      case 'processing':
      case 'uploading':
        return <ClockIcon className="text-blue-500 animate-spin" size={20} />;
      default:
        return <ClockIcon className="text-gray-400" size={20} />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            대량 업로드
          </h3>
          
          {/* File Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              CSV/TSV 파일 또는 로컬 파일을 드롭하세요
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              또는 클릭해서 파일을 선택하세요
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
            >
              파일 선택
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.tsv,*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* URL Input */}
          <div className="mt-8">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              URL 대량 입력 (한 줄에 하나씩)
            </h4>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/video1&#10;https://example.com/video2&#10;..."
                className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              />
              <button type="submit" className="btn-primary">
                URL 처리 시작
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Upload List */}
      {uploads.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              업로드 현황 ({uploads.length}개)
            </h3>
            
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {upload.type === 'url' ? (
                        <LinkIcon className="text-blue-500" size={20} />
                      ) : (
                        <FileIcon className="text-gray-500" size={20} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {upload.name}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{upload.status}</span>
                        {upload.size && <span>{formatFileSize(upload.size)}</span>}
                        {upload.jobId && <span>Job: {upload.jobId.slice(-8)}</span>}
                      </div>
                      
                      {upload.error && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          {upload.error}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          upload.status === 'completed' ? 'bg-green-500' :
                          upload.status === 'failed' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    
                    <div className="flex-shrink-0">
                      {getStatusIcon(upload.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}