import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: 'vdp-storage-service',
  serviceVersion: '1.0.0'
});

sdk.start();
console.log('✅ OpenTelemetry tracing initialized');

export default sdk;