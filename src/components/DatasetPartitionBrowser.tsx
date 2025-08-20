'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarDays, 
  Download, 
  RefreshCw, 
  AlertCircle,
  Database,
  Search,
  FileJson,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

interface Partition {
  date: string;
  count?: number;
  size?: string;
}

interface SearchResult {
  content_id: string;
  platform: string;
  origin: string;
  created_at: string;
  view_count: number;
  like_count: number;
  trust_score: number;
  digest_id: string;
}

export default function DatasetPartitionBrowser() {
  const [selectedPartition, setSelectedPartition] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    platform: '',
    origin: '',
  });
  const [downloadProgress, setDownloadProgress] = useState<{ [key: string]: boolean }>({});
  const queryClient = useQueryClient();

  // Fetch partitions
  const { 
    data: partitionsData, 
    isLoading: partitionsLoading, 
    error: partitionsError,
    refetch: refetchPartitions 
  } = useQuery({
    queryKey: ['partitions'],
    queryFn: async () => {
      const response = await axios.get('/api/datasets/partitions');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Search datasets
  const { 
    data: searchResults, 
    isLoading: searchLoading,
    error: searchError,
    refetch: performSearch 
  } = useQuery({
    queryKey: ['search', searchFilters],
    queryFn: async () => {
      if (!searchFilters.platform && !searchFilters.origin && !searchQuery) {
        return null;
      }
      const response = await axios.post('/api/datasets/search', {
        ...(searchQuery && { contentId: searchQuery }),
        ...(searchFilters.platform && { platform: searchFilters.platform }),
        ...(searchFilters.origin && { origin: searchFilters.origin }),
      });
      return response.data;
    },
    enabled: false, // Manual trigger
  });

  // Download partition data
  const handleDownloadPartition = async (dt: string) => {
    setDownloadProgress({ ...downloadProgress, [dt]: true });
    
    try {
      const response = await axios.get(`/api/datasets/export/partition/${dt}`, {
        responseType: 'blob',
        headers: {
          'Accept': 'application/x-ndjson',
        },
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `partition-${dt}.jsonl`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setDownloadProgress({ ...downloadProgress, [dt]: false });
    }
  };

  // Empty state component
  const EmptyState = ({ message, icon: Icon }: { message: string; icon: any }) => (
    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
      <Icon className="h-12 w-12 mb-4 text-gray-400" />
      <p className="text-lg font-medium">{message}</p>
      <p className="text-sm mt-2">Try refreshing or check back later</p>
    </div>
  );

  // Error state component
  const ErrorState = ({ error, onRetry }: { error: any; onRetry: () => void }) => (
    <div className="flex flex-col items-center justify-center py-8 text-red-600">
      <AlertCircle className="h-12 w-12 mb-4" />
      <p className="text-lg font-medium">Error loading data</p>
      <p className="text-sm mt-2 text-gray-600">{error?.message || 'Something went wrong'}</p>
      <Button 
        onClick={onRetry} 
        variant="outline" 
        className="mt-4"
        size="sm"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Dataset Browser
              </CardTitle>
              <CardDescription>
                Browse and export VDP dataset partitions from GCS
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {partitionsData?.source === 'mock' ? 'Mock Data' : 'Live Data'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="partitions">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="partitions">
                <CalendarDays className="mr-2 h-4 w-4" />
                Partitions
              </TabsTrigger>
              <TabsTrigger value="search">
                <Search className="mr-2 h-4 w-4" />
                Search
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partitions" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  {partitionsData?.count || 0} partitions available
                </p>
                <Button
                  onClick={() => refetchPartitions()}
                  variant="outline"
                  size="sm"
                  disabled={partitionsLoading}
                >
                  {partitionsLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              </div>

              {partitionsError ? (
                <ErrorState error={partitionsError} onRetry={refetchPartitions} />
              ) : partitionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : partitionsData?.partitions?.length > 0 ? (
                <div className="grid gap-3">
                  {partitionsData.partitions.map((partition: string) => (
                    <div
                      key={partition}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarDays className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{partition}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(partition + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setSelectedPartition(partition)}
                          variant="outline"
                          size="sm"
                        >
                          <FileJson className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          onClick={() => handleDownloadPartition(partition)}
                          variant="default"
                          size="sm"
                          disabled={downloadProgress[partition]}
                        >
                          {downloadProgress[partition] ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Export JSONL
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No partitions found" icon={Database} />
              )}
            </TabsContent>

            <TabsContent value="search" className="space-y-4">
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by content ID..."
                    className="flex-1 px-3 py-2 border rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.platform}
                    onChange={(e) => setSearchFilters({ ...searchFilters, platform: e.target.value })}
                  >
                    <option value="">All Platforms</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube Shorts</option>
                  </select>
                  <select
                    className="px-3 py-2 border rounded-md"
                    value={searchFilters.origin}
                    onChange={(e) => setSearchFilters({ ...searchFilters, origin: e.target.value })}
                  >
                    <option value="">All Origins</option>
                    <option value="Real-Footage">Real Footage</option>
                    <option value="AI-Generated">AI Generated</option>
                  </select>
                  <Button 
                    onClick={() => performSearch()}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Search
                  </Button>
                </div>

                {searchError ? (
                  <ErrorState error={searchError} onRetry={performSearch} />
                ) : searchResults?.results?.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Found {searchResults.count} results
                    </p>
                    {searchResults.results.map((result: SearchResult) => (
                      <div
                        key={result.content_id}
                        className="p-4 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{result.content_id}</p>
                            <Badge variant="secondary">{result.platform}</Badge>
                            <Badge variant={result.origin === 'AI-Generated' ? 'destructive' : 'default'}>
                              {result.origin}
                            </Badge>
                          </div>
                          <Badge variant="outline">
                            Trust: {(result.trust_score * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>Views: {result.view_count.toLocaleString()} | Likes: {result.like_count.toLocaleString()}</p>
                          <p>Created: {format(new Date(result.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs mt-1">Digest: {result.digest_id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchResults ? (
                  <EmptyState message="No results found" icon={Search} />
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}