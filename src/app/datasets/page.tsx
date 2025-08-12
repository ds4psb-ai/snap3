import DatasetPartitionBrowser from '@/components/DatasetPartitionBrowser';

export const metadata = {
  title: 'Dataset Browser - Snap3',
  description: 'Browse and export VDP dataset partitions',
};

export default function DatasetsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <DatasetPartitionBrowser />
      </div>
    </div>
  );
}