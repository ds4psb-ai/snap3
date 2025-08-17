/**
 * Simple test handler for debugging form submission
 */

const { v4: uuidv4 } = require('uuid');

const multer = require('multer');
const upload = multer();

// Simple test handler that just returns success
const handleSimpleTest = [upload.any(), async (req, res) => {
  console.log('📝 Test submission received:');
  console.log('Body:', req.body);
  console.log('Files:', req.files ? req.files.map(f => f.fieldname) : 'none');
  
  const { platform, url } = req.body;
  
  // Create mock job
  const jobId = `test_job_${Date.now()}`;
  
  res.status(202).json({
    status: 'accepted',
    job_id: jobId,
    platform: platform || 'youtube',
    content_id: url ? url.split('/').pop() : 'test_content',
    estimated_duration: '5-10 seconds (test mode)',
    progress_url: `/api/jobs/${jobId}`,
    test_mode: true
  });
  
  // Simulate progress updates
  setTimeout(() => {
    console.log(`✅ Mock job ${jobId} completed`);
  }, 2000);
}];

// Simple job status that returns completed immediately
const getSimpleJobStatus = (req, res) => {
  const { jobId } = req.params;
  
  console.log(`📊 Job status requested: ${jobId}`);
  
  res.json({
    job_id: jobId,
    status: 'completed',
    platform: 'youtube',
    content_id: 'test_content',
    progress: 100,
    current_step: 'Test completed!',
    steps_completed: ['Test validation', 'Mock processing', 'Test finished'],
    result: {
      hook_analysis: {
        start_sec: 1.2,
        strength_score: 0.85,
        pattern_code: 'test_pattern'
      },
      processing_time: 3
    }
  });
};

module.exports = {
  handleSimpleTest,
  getSimpleJobStatus
};