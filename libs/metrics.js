const { register, collectDefaultMetrics, Histogram } = require('prom-client');

collectDefaultMetrics(); // CPU/GC/이벤트루프 등 기본 메트릭

const httpLatency = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  buckets: [0.025, 0.05, 0.1, 0.2, 0.5, 1, 2],
  labelNames: ['method', 'route', 'status_code']
});

const vdpProcessingLatency = new Histogram({
  name: 'vdp_processing_duration_seconds',
  help: 'VDP processing step latency',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  labelNames: ['step', 'platform', 'status']
});

module.exports = {
  httpLatency,
  vdpProcessingLatency,
  registry: register
};