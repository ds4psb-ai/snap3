'use client';

import { useState, useEffect } from 'react';
import { 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  DatabaseIcon,
  TrendingUpIcon,
  FileIcon
} from 'lucide-react';

interface JobStatus {
  jobId: string;
  uploadId: string;
  fileName: string;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  updatedAt: string;
  gcsPath?: string;
  error?: string;
}

export function StatusBoard() {
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [isPolling, setIsPolling] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');

  // Mock data for demonstration
  const mockJobs: JobStatus[] = [
    {
      jobId: 'job_1702123456_abc123',
      uploadId: 'upload_1702123456_abc123',
      fileName: 'dataset_batch_001.csv',
      fileType: 'csv',
      status: 'completed',
      progress: 100,
      createdAt: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      updatedAt: new Date(Date.now() - 120000).toISOString(), // 2 min ago
      gcsPath: 'uploads/dataset_batch_001.csv',
    },
    {
      jobId: 'job_1702123457_def456',
      uploadId: 'upload_1702123457_def456',
      fileName: 'video_links_batch_002.tsv',
      fileType: 'tsv',
      status: 'processing',
      progress: 67,
      createdAt: new Date(Date.now() - 180000).toISOString(), // 3 min ago
      updatedAt: new Date(Date.now() - 30000).toISOString(),  // 30 sec ago
      gcsPath: 'uploads/video_links_batch_002.tsv',
    },
    {
      jobId: 'job_1702123458_ghi789',
      uploadId: 'upload_1702123458_ghi789',
      fileName: 'content_urls.csv',
      fileType: 'csv',
      status: 'pending',
      progress: 0,
      createdAt: new Date(Date.now() - 60000).toISOString(),   // 1 min ago
      updatedAt: new Date(Date.now() - 60000).toISOString(),   // 1 min ago
      gcsPath: 'uploads/content_urls.csv',
    },
    {
      jobId: 'job_1702123459_jkl012',
      uploadId: 'upload_1702123459_jkl012',
      fileName: 'failed_batch.csv',
      fileType: 'csv',
      status: 'failed',
      progress: 0,
      createdAt: new Date(Date.now() - 900000).toISOString(),  // 15 min ago
      updatedAt: new Date(Date.now() - 840000).toISOString(),  // 14 min ago
      gcsPath: 'uploads/failed_batch.csv',
      error: 'Invalid CSV format: missing required columns',
    },
  ];

  useEffect(() => {
    // Initialize with mock data
    setJobs(mockJobs);
  }, []);

  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(async () => {
      try {
        // In production, this would fetch real job statuses
        // For now, simulate progress updates
        setJobs(prevJobs => 
          prevJobs.map(job => {
            if (job.status === 'processing' && job.progress < 100) {
              const newProgress = Math.min(100, job.progress + Math.random() * 10);
              return {
                ...job,
                progress: Math.floor(newProgress),
                updatedAt: new Date().toISOString(),
                status: newProgress >= 100 ? 'completed' : 'processing',
              };
            }
            return job;
          })
        );
        
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to update job statuses:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling]);

  const getStatusIcon = (status: JobStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="text-green-500" size={20} />;
      case 'failed':
        return <XCircleIcon className="text-red-500" size={20} />;
      case 'processing':
        return <ClockIcon className="text-blue-500 animate-spin" size={20} />;
      default:
        return <ClockIcon className="text-gray-400" size={20} />;
    }
  };

  const getStatusColor = (status: JobStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const filteredJobs = filter === 'all' ? jobs : jobs.filter(job => job.status === filter);

  const stats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <DatabaseIcon className="text-gray-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <ClockIcon className="text-gray-400" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-gray-500">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <ClockIcon className="text-blue-500 animate-spin" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <CheckCircleIcon className="text-green-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <XCircleIcon className="text-red-500" size={24} />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setIsPolling(!isPolling)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                isPolling 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {isPolling ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
              <span>{isPolling ? 'Pause' : 'Resume'} Polling</span>
            </button>

            <div className="flex space-x-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
              {['all', 'pending', 'processing', 'completed', 'failed'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-3 py-1 text-sm rounded-md capitalize ${
                    filter === status
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
            <RefreshCwIcon className={`${isPolling ? 'animate-spin' : ''}`} size={16} />
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Processing Jobs ({filteredJobs.length})
          </h3>
          
          <div className="space-y-4">
            {filteredJobs.map((job) => (
              <div
                key={job.jobId}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileIcon className="text-gray-400" size={20} />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {job.fileName}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>ID: {job.jobId.slice(-8)}</span>
                        <span>Type: {job.fileType.toUpperCase()}</span>
                        <span>Created: {new Date(job.createdAt).toLocaleTimeString()}</span>
                        <span>Updated: {new Date(job.updatedAt).toLocaleTimeString()}</span>
                      </div>
                      {job.gcsPath && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Path: {job.gcsPath}
                        </div>
                      )}
                      {job.error && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Error: {job.error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                    
                    <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          job.status === 'completed' ? 'bg-green-500' :
                          job.status === 'failed' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-10 text-right">
                      {job.progress}%
                    </span>
                    
                    <div className="flex-shrink-0">
                      {getStatusIcon(job.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredJobs.length === 0 && (
              <div className="text-center py-8">
                <DatabaseIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  No jobs found
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {filter === 'all' 
                    ? 'Upload some files to see processing jobs here.'
                    : `No jobs with status "${filter}" found.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}