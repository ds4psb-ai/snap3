import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ExportPanel } from '@/components/ExportPanel';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  
  // Validate ID format
  if (!id.match(/^[A-Z0-9]{8}$/)) {
    return {
      title: 'Invalid Export',
      description: 'Invalid export ID format',
    };
  }
  
  return {
    title: `Export ${id} - Snap3 Turbo`,
    description: `View and download export data for ${id}`,
  };
}

async function fetchExportMetadata(id: string) {
  try {
    // Server-side fetch for metadata
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/export/brief/${id}`, {
      cache: 'force-cache',
      next: { revalidate: 3600 }, // Revalidate every hour
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch export metadata:', error);
    return null;
  }
}

export default async function ExportPage({ params }: PageProps) {
  const { id } = await params;
  
  // Validate ID format
  if (!id.match(/^[A-Z0-9]{8}$/)) {
    notFound();
  }
  
  // Fetch initial metadata server-side
  const metadata = await fetchExportMetadata(id);
  
  if (!metadata) {
    notFound();
  }
  
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          Export: {id}
        </h1>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Export Details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Digest ID</dt>
                <dd className="mt-1 text-gray-900">{id}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Trust Score</dt>
                <dd className="mt-1 text-gray-900">
                  {metadata.evidencePack?.trustScore 
                    ? `${(metadata.evidencePack.trustScore * 100).toFixed(0)}%`
                    : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">AI Generated</dt>
                <dd className="mt-1 text-gray-900">
                  {metadata.evidencePack?.synthIdDetected ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Evidence Chips</dt>
                <dd className="mt-1 text-gray-900">
                  {metadata.evidencePack?.evidenceChips?.length || 0} items
                </dd>
              </div>
            </dl>
          </div>
          
          {/* Client component for interactive features */}
          <ExportPanel 
            exportId={id}
            initialData={metadata}
          />
        </div>
      </div>
    </main>
  );
}