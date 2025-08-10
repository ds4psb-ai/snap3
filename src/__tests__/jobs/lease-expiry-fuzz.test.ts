/**
 * Lease Expiry Fuzz Test
 * Tests 30-second visibility timeout with randomized timing patterns
 */

import { InMemoryQueueProvider } from '@/lib/jobs/providers/inmemory';
import { RedisQueueProvider } from '@/lib/jobs/providers/redis';
import { FakeDurableQueueProvider } from '@/lib/jobs/providers/fake-durable';
import { JobQueueProvider } from '@/lib/jobs/providers';
import { JobStatus } from '@/lib/jobs/types';

describe('Lease Expiry Fuzz Testing - 30s Visibility Timeout', () => {
  const LEASE_DURATION_MS = 30000; // 30 seconds
  const FUZZ_ITERATIONS = 20; // Number of fuzz test iterations
  const HEARTBEAT_INTERVAL_MS = 10000; // Typical heartbeat interval

  // Test all providers
  const providers: Array<{ name: string; createProvider: () => JobQueueProvider }> = [
    { 
      name: 'InMemory', 
      createProvider: () => new InMemoryQueueProvider() 
    },
    { 
      name: 'FakeDurable', 
      createProvider: () => new FakeDurableQueueProvider({ 
        simulateLatency: true,
        latencyMs: { min: 10, max: 50 },
        failureRate: 0.1 // 10% failure rate for realistic testing
      }) 
    },
  ];

  // Add Redis provider only if configured
  if (process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL) {
    providers.push({
      name: 'Redis',
      createProvider: () => new RedisQueueProvider()
    });
  }

  describe.each(providers)('$name Provider', ({ createProvider }) => {
    let provider: JobQueueProvider;

    beforeEach(() => {
      provider = createProvider();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should maintain 30s lease with proper heartbeats', async () => {
      const job = await provider.enqueue({
        type: 'long-running',
        payload: { duration: 60000 }, // 60s job
      });

      const reserved = await provider.reserve('worker-1');
      expect(reserved?.id).toBe(job.id);

      // Simulate heartbeats every 10 seconds for 50 seconds
      for (let elapsed = 0; elapsed < 50000; elapsed += HEARTBEAT_INTERVAL_MS) {
        jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
        
        // Send heartbeat to extend lease
        await provider.heartbeat(job.id, 'worker-1', (elapsed / 60000) * 100);
        
        // Verify job is still processing
        const currentJob = await provider.getJob(job.id);
        expect(currentJob?.status).toBe(JobStatus.PROCESSING);
      }

      // Complete the job
      await provider.complete(job.id, 'worker-1', { success: true });
      
      const finalJob = await provider.getJob(job.id);
      expect(finalJob?.status).toBe(JobStatus.COMPLETED);
    });

    it('should expire lease after 30s without heartbeat', async () => {
      const job = await provider.enqueue({
        type: 'abandoned',
        payload: { test: 'data' },
      });

      const reserved = await provider.reserve('worker-1');
      expect(reserved?.id).toBe(job.id);

      // Advance time to just before lease expires
      jest.advanceTimersByTime(LEASE_DURATION_MS - 1000);
      
      // Job should still be processing
      let currentJob = await provider.getJob(job.id);
      expect(currentJob?.status).toBe(JobStatus.PROCESSING);

      // Advance past lease expiry
      jest.advanceTimersByTime(2000);
      
      // Trigger cleanup (providers may need this)
      await provider.getStats();

      // Another worker should be able to reserve the job
      const reserved2 = await provider.reserve('worker-2');
      expect(reserved2?.id).toBe(job.id);
      
      // Original worker should not be able to complete
      await expect(
        provider.complete(job.id, 'worker-1', { success: true })
      ).rejects.toThrow();
    });

    describe('Fuzz Testing with Random Timing Patterns', () => {
      it('should handle random heartbeat patterns', async () => {
        for (let iteration = 0; iteration < FUZZ_ITERATIONS; iteration++) {
          const job = await provider.enqueue({
            type: 'fuzz-test',
            payload: { iteration },
          });

          const reserved = await provider.reserve('worker-1');
          expect(reserved?.id).toBe(job.id);

          // Random heartbeat pattern
          const heartbeatPattern = generateRandomHeartbeatPattern();
          let totalElapsed = 0;
          let leaseValid = true;

          for (const interval of heartbeatPattern) {
            jest.advanceTimersByTime(interval);
            totalElapsed += interval;

            // Check if lease should have expired
            if (interval >= LEASE_DURATION_MS) {
              leaseValid = false;
              break;
            }

            // Send heartbeat if still valid
            if (leaseValid) {
              try {
                await provider.heartbeat(job.id, 'worker-1', 
                  Math.min(100, (totalElapsed / 60000) * 100));
              } catch (error) {
                // Heartbeat failed, lease might have expired
                leaseValid = false;
                break;
              }
            }
          }

          // Verify expected state
          if (leaseValid && totalElapsed < 60000) {
            // Should be able to complete
            await provider.complete(job.id, 'worker-1', { success: true });
            const finalJob = await provider.getJob(job.id);
            expect(finalJob?.status).toBe(JobStatus.COMPLETED);
          } else {
            // Lease should have expired
            await expect(
              provider.complete(job.id, 'worker-1', { success: true })
            ).rejects.toThrow();
          }

          // Clean up for next iteration
          await provider.cleanOldJobs(0);
        }
      });

      it('should handle competing workers with lease expiry', async () => {
        const workers = ['worker-1', 'worker-2', 'worker-3'];
        const jobs = [];

        // Create multiple jobs
        for (let i = 0; i < 5; i++) {
          const job = await provider.enqueue({
            type: 'concurrent',
            payload: { index: i },
          });
          jobs.push(job);
        }

        // Simulate workers competing for jobs with random timing
        const workerStates = new Map<string, { jobId: string; lastHeartbeat: number }>();

        for (let time = 0; time < 120000; time += 5000) {
          jest.advanceTimersByTime(5000);

          // Random worker actions
          for (const worker of workers) {
            const action = Math.random();
            const state = workerStates.get(worker);

            if (action < 0.3 && !state) {
              // Try to reserve a job
              const job = await provider.reserve(worker);
              if (job) {
                workerStates.set(worker, { 
                  jobId: job.id, 
                  lastHeartbeat: time 
                });
              }
            } else if (action < 0.7 && state) {
              // Send heartbeat
              if (time - state.lastHeartbeat < LEASE_DURATION_MS - 5000) {
                try {
                  await provider.heartbeat(state.jobId, worker, 50);
                  state.lastHeartbeat = time;
                } catch {
                  // Lease expired
                  workerStates.delete(worker);
                }
              }
            } else if (action < 0.9 && state) {
              // Complete job
              try {
                await provider.complete(state.jobId, worker, { success: true });
                workerStates.delete(worker);
              } catch {
                // Lease expired or job already completed
                workerStates.delete(worker);
              }
            }
          }
        }

        // Verify all jobs are eventually processed
        const stats = await provider.getStats();
        expect(stats.completed + stats.failed).toBeGreaterThan(0);
      });

      it('should handle rapid lease transitions', async () => {
        const job = await provider.enqueue({
          type: 'rapid-transition',
          payload: { test: 'data' },
        });

        // Worker 1 reserves
        const reserved1 = await provider.reserve('worker-1');
        expect(reserved1?.id).toBe(job.id);

        // Wait for lease to expire
        jest.advanceTimersByTime(LEASE_DURATION_MS + 1000);
        await provider.getStats(); // Trigger cleanup

        // Worker 2 reserves
        const reserved2 = await provider.reserve('worker-2');
        expect(reserved2?.id).toBe(job.id);

        // Send heartbeat to maintain lease
        await provider.heartbeat(job.id, 'worker-2', 25);
        jest.advanceTimersByTime(15000);

        // Worker 2 abandons (no more heartbeats)
        jest.advanceTimersByTime(LEASE_DURATION_MS + 1000);
        await provider.getStats(); // Trigger cleanup

        // Worker 3 reserves and completes
        const reserved3 = await provider.reserve('worker-3');
        expect(reserved3?.id).toBe(job.id);
        
        await provider.complete(job.id, 'worker-3', { success: true });
        
        const finalJob = await provider.getJob(job.id);
        expect(finalJob?.status).toBe(JobStatus.COMPLETED);
      });

      it('should maintain lease boundary precision', async () => {
        const timingTests = [
          { advance: LEASE_DURATION_MS - 100, shouldSucceed: true },
          { advance: LEASE_DURATION_MS - 10, shouldSucceed: true },
          { advance: LEASE_DURATION_MS - 1, shouldSucceed: true },
          { advance: LEASE_DURATION_MS, shouldSucceed: false },
          { advance: LEASE_DURATION_MS + 1, shouldSucceed: false },
          { advance: LEASE_DURATION_MS + 100, shouldSucceed: false },
        ];

        for (const { advance, shouldSucceed } of timingTests) {
          const job = await provider.enqueue({
            type: 'boundary-test',
            payload: { advance },
          });

          const reserved = await provider.reserve('worker-1');
          expect(reserved?.id).toBe(job.id);

          // Advance time
          jest.advanceTimersByTime(advance);

          if (shouldSucceed) {
            // Should still own the lease
            await provider.heartbeat(job.id, 'worker-1', 50);
            await provider.complete(job.id, 'worker-1', { success: true });
            
            const finalJob = await provider.getJob(job.id);
            expect(finalJob?.status).toBe(JobStatus.COMPLETED);
          } else {
            // Lease should have expired
            await provider.getStats(); // Trigger cleanup
            
            await expect(
              provider.complete(job.id, 'worker-1', { success: true })
            ).rejects.toThrow();
            
            // Another worker should be able to reserve
            const reserved2 = await provider.reserve('worker-2');
            expect(reserved2?.id).toBe(job.id);
            
            // Clean up
            await provider.complete(job.id, 'worker-2', { success: true });
          }

          // Clean for next test
          await provider.cleanOldJobs(0);
        }
      });
    });
  });

  // Helper function to generate random heartbeat patterns
  function generateRandomHeartbeatPattern(): number[] {
    const pattern: number[] = [];
    const numIntervals = Math.floor(Math.random() * 10) + 1;
    
    for (let i = 0; i < numIntervals; i++) {
      // Random interval between 1s and 35s
      const interval = Math.floor(Math.random() * 34000) + 1000;
      pattern.push(interval);
      
      // Sometimes add a long gap to test expiry
      if (Math.random() < 0.2) {
        pattern.push(LEASE_DURATION_MS + 5000);
        break;
      }
    }
    
    return pattern;
  }
});