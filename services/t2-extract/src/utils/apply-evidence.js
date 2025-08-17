export function applyEvidencePack(vdp, packs) {
  const out = structuredClone(vdp);

  // 1) 오디오 지문 병합
  if (packs.audio?.audio) {
    out.audio = { ...(out.audio || {}), ...packs.audio.audio };
  }

  // 2) 제품/브랜드 evidence → product_mentions & metrics 병합(덮어쓰기)
  if (packs.product?.product_mentions) {
    out.product_mentions = packs.product.product_mentions;
  }
  if (packs.product?.brand_detection_metrics) {
    out.brand_detection_metrics = packs.product.brand_detection_metrics;
  }

  // 최소 보호 장치
  if (!out.processing_metadata) out.processing_metadata = {};
  out.processing_metadata.evidence_packs = {
    audio_fp: !!packs.audio,
    product_evidence: !!packs.product
  };
  
  return out;
}