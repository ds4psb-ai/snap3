import http from 'k6/http';
import { check } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.01'],          // 에러율 < 1%
    http_req_duration: ['p(95)<200'],        // p95 < 200ms
  },
  scenarios: {
    warm: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 40
    },
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/health`);
  check(res, { ok: (r) => r.status === 200 });
}
