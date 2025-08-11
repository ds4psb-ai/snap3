import { supabase } from '../src/lib/supabase';

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Seed trends
    const trends = [
      {
        id: '1',
        title: 'AI Content Analysis',
        description: 'Growing trend in automated content analysis and insights generation',
        category: 'Technology',
        popularity: 85,
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Real-time Collaboration',
        description: 'Increased demand for real-time collaborative content creation tools',
        category: 'Productivity',
        popularity: 72,
        created_at: new Date().toISOString(),
      },
      {
        id: '3',
        title: 'Data Visualization',
        description: 'Rising interest in interactive data visualization and analytics',
        category: 'Analytics',
        popularity: 68,
        created_at: new Date().toISOString(),
      },
    ];

    const { data: trendsData, error: trendsError } = await supabase
      .from('trends')
      .insert(trends)
      .select();

    if (trendsError) {
      console.error('❌ Error seeding trends:', trendsError);
    } else {
      console.log('✅ Trends seeded successfully:', trendsData?.length);
    }

    // Seed sample VDPs
    const vdps = [
      {
        id: '1',
        title: 'Sample VDP 1',
        content: 'This is a sample VDP content for testing purposes.',
        metadata: {
          description: 'A sample VDP for demonstration',
          keywords: ['sample', 'test', 'demo'],
          category: 'Technology',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Sample VDP 2',
        content: 'Another sample VDP with different content.',
        metadata: {
          description: 'Another sample VDP for demonstration',
          keywords: ['sample', 'content', 'analysis'],
          category: 'Analytics',
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const { data: vdpsData, error: vdpsError } = await supabase
      .from('vdps')
      .insert(vdps)
      .select();

    if (vdpsError) {
      console.error('❌ Error seeding VDPs:', vdpsError);
    } else {
      console.log('✅ VDPs seeded successfully:', vdpsData?.length);
    }

    console.log('🎉 Database seeding completed!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };






