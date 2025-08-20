'use client';

import { useState, useCallback } from 'react';
import { UploadIcon, VideoIcon, FileJsonIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { VDPStorageMetadata, VDPSidecar } from '@/lib/schemas/vdp.zod';

interface UploadResponse {
  uploadUrl: string;
  gcsPath: string;
  bucket: string;
  fileName: string;
  expiresAt: string;
  sidecarUploadUrl?: string;
  sidecarPath?: string;
}

export function VDPUploader() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMode, setUploadMode] = useState<'metadata' | 'sidecar'>('metadata');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  // VDP Metadata Form State
  const [vdpMetadata, setVdpMetadata] = useState<Partial<VDPStorageMetadata>>({
    'x-goog-meta-vdp-curator-id': 'ted',
  });

  // Sidecar JSON State
  const [sidecarData, setSidecarData] = useState<Partial<VDPSidecar>>({
    curatorId: 'ted',
    platform: 'tiktok',
    origin: 'real',
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      setSelectedFile(videoFile);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a video file (MP4, MOV, AVI)",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file type",
        description: "Please select a video file (MP4, MOV, AVI)",
        variant: "destructive",
      });
    }
  }, [toast]);

  const generateContentId = () => {
    const randomId = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `C${randomId}`;
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Auto-generate content ID if not provided
      if (uploadMode === 'metadata' && !vdpMetadata['x-goog-meta-vdp-content-id']) {
        setVdpMetadata(prev => ({
          ...prev,
          'x-goog-meta-vdp-content-id': generateContentId(),
        }));
      }

      if (uploadMode === 'sidecar' && !sidecarData.contentId) {
        setSidecarData(prev => ({
          ...prev,
          contentId: generateContentId(),
        }));
      }

      // Step 1: Get signed URLs
      const requestBody = {
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        ...(uploadMode === 'metadata' && { vdpMetadata }),
        generateSidecarUrl: uploadMode === 'sidecar',
      };

      const signedUrlResponse = await fetch('/api/curator/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!signedUrlResponse.ok) {
        throw new Error('Failed to get signed URL');
      }

      const { uploadUrl, sidecarUploadUrl }: UploadResponse = await signedUrlResponse.json();

      // Step 2: Upload video file
      const videoUploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type,
        },
      });

      if (!videoUploadResponse.ok) {
        throw new Error('Failed to upload video file');
      }

      // Step 3: Upload sidecar JSON if in sidecar mode
      if (uploadMode === 'sidecar' && sidecarUploadUrl) {
        const sidecarBlob = new Blob([JSON.stringify(sidecarData, null, 2)], {
          type: 'application/json',
        });

        const sidecarUploadResponse = await fetch(sidecarUploadUrl, {
          method: 'PUT',
          body: sidecarBlob,
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!sidecarUploadResponse.ok) {
          throw new Error('Failed to upload sidecar JSON');
        }
      }

      toast({
        title: "Upload successful",
        description: `Video and ${uploadMode === 'sidecar' ? 'sidecar JSON' : 'VDP metadata'} uploaded successfully`,
      });

      // Reset form
      setSelectedFile(null);
      setVdpMetadata({ 'x-goog-meta-vdp-curator-id': 'ted' });
      setSidecarData({ curatorId: 'ted', platform: 'tiktok', origin: 'real' });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>VDP 비디오 업로더</CardTitle>
          <CardDescription>
            VDP 메타데이터와 함께 비디오 파일을 업로드합니다. 
            스토리지에 저장된 메타데이터가 소스 오브 트루스가 됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <VideoIcon className="mx-auto h-12 w-12 text-green-500" />
                <p className="text-lg font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <>
                <UploadIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  비디오 파일을 드래그하거나 클릭하여 선택
                </p>
                <p className="text-sm text-gray-600">
                  MP4, MOV, AVI 파일 지원 (최대 100MB)
                </p>
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                >
                  파일 선택
                </label>
              </>
            )}
          </div>

          {/* Metadata Input */}
          <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as 'metadata' | 'sidecar')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metadata">헤더 메타데이터</TabsTrigger>
              <TabsTrigger value="sidecar">사이드카 JSON</TabsTrigger>
            </TabsList>

            {/* Header Metadata Mode */}
            <TabsContent value="metadata" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>콘텐츠 ID</Label>
                  <Input
                    placeholder="C000001"
                    value={vdpMetadata['x-goog-meta-vdp-content-id'] || ''}
                    onChange={(e) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-content-id': e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>플랫폼</Label>
                  <Select
                    value={vdpMetadata['x-goog-meta-vdp-platform'] || ''}
                    onValueChange={(value) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-platform': value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="플랫폼 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                      <SelectItem value="shorts">Shorts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>원본 URL</Label>
                  <Input
                    placeholder="https://www.tiktok.com/@.../video/123"
                    value={vdpMetadata['x-goog-meta-vdp-source-url'] || ''}
                    onChange={(e) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-source-url': e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>오리진</Label>
                  <Select
                    value={vdpMetadata['x-goog-meta-vdp-origin'] || ''}
                    onValueChange={(value) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-origin': value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="오리진 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="real">Real</SelectItem>
                      <SelectItem value="ai-generated">AI Generated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>캡션</Label>
                <Textarea
                  placeholder="훅 강한 POV 전환"
                  value={vdpMetadata['x-goog-meta-vdp-caption'] || ''}
                  onChange={(e) => setVdpMetadata(prev => ({
                    ...prev,
                    'x-goog-meta-vdp-caption': e.target.value
                  }))}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>조회수</Label>
                  <Input
                    type="number"
                    placeholder="1532000"
                    value={vdpMetadata['x-goog-meta-vdp-view-count'] || ''}
                    onChange={(e) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-view-count': e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>좋아요</Label>
                  <Input
                    type="number"
                    placeholder="10230"
                    value={vdpMetadata['x-goog-meta-vdp-like-count'] || ''}
                    onChange={(e) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-like-count': e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>댓글수</Label>
                  <Input
                    type="number"
                    placeholder="421"
                    value={vdpMetadata['x-goog-meta-vdp-comment-count'] || ''}
                    onChange={(e) => setVdpMetadata(prev => ({
                      ...prev,
                      'x-goog-meta-vdp-comment-count': e.target.value
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>태그 (쉼표로 구분)</Label>
                <Input
                  placeholder="패션,데일리,브이로그"
                  value={vdpMetadata['x-goog-meta-vdp-tags'] || ''}
                  onChange={(e) => setVdpMetadata(prev => ({
                    ...prev,
                    'x-goog-meta-vdp-tags': e.target.value
                  }))}
                />
              </div>
            </TabsContent>

            {/* Sidecar JSON Mode */}
            <TabsContent value="sidecar" className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileJsonIcon className="h-5 w-5 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    복잡한 메타데이터는 별도 JSON 파일로 저장됩니다 (.vdp.json)
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>콘텐츠 ID</Label>
                  <Input
                    placeholder="C000001"
                    value={sidecarData.contentId || ''}
                    onChange={(e) => setSidecarData(prev => ({
                      ...prev,
                      contentId: e.target.value
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>플랫폼</Label>
                  <Select
                    value={sidecarData.platform || ''}
                    onValueChange={(value) => setSidecarData(prev => ({
                      ...prev,
                      platform: value as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="플랫폼 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="reels">Reels</SelectItem>
                      <SelectItem value="shorts">Shorts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>원본 URL</Label>
                <Input
                  placeholder="https://www.tiktok.com/@.../video/123"
                  value={sidecarData.sourceUrl || ''}
                  onChange={(e) => setSidecarData(prev => ({
                    ...prev,
                    sourceUrl: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label>캡션</Label>
                <Textarea
                  placeholder="훅 강한 POV 전환"
                  value={sidecarData.caption || ''}
                  onChange={(e) => setSidecarData(prev => ({
                    ...prev,
                    caption: e.target.value
                  }))}
                />
              </div>

              <div className="space-y-4">
                <Label>인게이지먼트 메트릭스</Label>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>조회수</Label>
                    <Input
                      type="number"
                      placeholder="1532000"
                      value={sidecarData.engagement?.viewCount || ''}
                      onChange={(e) => setSidecarData(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          viewCount: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>좋아요</Label>
                    <Input
                      type="number"
                      placeholder="10230"
                      value={sidecarData.engagement?.likeCount || ''}
                      onChange={(e) => setSidecarData(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          likeCount: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>댓글수</Label>
                    <Input
                      type="number"
                      placeholder="421"
                      value={sidecarData.engagement?.commentCount || ''}
                      onChange={(e) => setSidecarData(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          commentCount: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>공유수</Label>
                    <Input
                      type="number"
                      placeholder="89"
                      value={sidecarData.engagement?.shareCount || ''}
                      onChange={(e) => setSidecarData(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          shareCount: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || isUploading}
            className="w-full"
            size="lg"
          >
            {isUploading ? '업로드 중...' : '업로드 시작'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}