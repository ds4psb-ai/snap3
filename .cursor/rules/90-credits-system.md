# Credits System & Flux Kontext Integration

## Credits (CR) Currency
- **Single currency**: CR for all generation operations
- **Consumption**: Veo3 previews + Flux Kontext image generation/edits
- **Free operations**: Analysis (Snap3/Hook/Evidence) is free
- **Runtime pricing**: Resolved from provider_rates at runtime

## Flux Kontext Integration
- **Purpose**: In-context image generation & editing
- **Use cases**: First-frame generation, product image editing, masks
- **Tiers**: dev|pro|max via multiple vendors
- **Pricing anchors**: $0.04/image [pro], $0.08/image [max]
- **CR consumption**: All image generations/edits consume CR

## Veo3 + Kontext Workflow
- **Text→Video**: Veo3 prompt compilation (8s, 16:9, 720p/1080p)
- **Image→Video**: Kontext first-frame → Veo3 image→video motion
- **Product scenes**: Automatically trigger Kontext first-frame generation
- **CR debits**: Both operations consume credits

## Credit Metering & UX
- **Pre-submit estimate**: Show estimated CR before generation
- **Post-submit receipt**: Exact CR consumption with breakdown
- **Provider tracking**: veo3.preview, kontext.<tier> SKUs
- **Hold management**: Credits held during job processing
- **Error handling**: Keep hold on quota/rate errors, retry/backoff

## Wallet Display
- **Available**: Current CR balance
- **On-Hold**: Credits reserved for active jobs
- **Spent**: Total CR consumed
- **Real-time updates**: Balance updates after job completion

## Error Handling
- **PROVIDER_QUOTA_EXCEEDED**: Honor Retry-After, reduce batch size
- **RATE_LIMITED**: Backoff per headers
- **CREDIT_INSUFFICIENT**: Prevent job submission, show top-up CTA
- **PROVIDER_POLICY_BLOCKED**: Remove flagged params, resubmit

## Auto-attach Triggers
This rule auto-attaches when working on:
- Credit system implementation
- Flux Kontext integration
- Veo3 + Kontext workflows
- Billing and metering logic
- Wallet UI components
- Provider rate management
- Error handling for credit operations
