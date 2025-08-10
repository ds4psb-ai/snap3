'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface VDP {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export default function VDPPage() {
  const params = useParams();
  const [vdp, setVdp] = useState<VDP | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVDP = async () => {
      try {
        const response = await fetch(`/api/vdp/${params.id}`);
        const data = await response.json();
        setVdp(data.vdp);
      } catch (error) {
        console.error('Error fetching VDP:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchVDP();
    }
  }, [params.id]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!vdp) {
    return <div className="p-8">VDP not found</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">{vdp.title}</h1>
      <div className="prose max-w-none">
        <p>{vdp.content}</p>
      </div>
      <div className="mt-4 text-sm text-gray-500">
        Created: {new Date(vdp.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}


