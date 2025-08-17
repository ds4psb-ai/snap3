#!/usr/bin/env node

// 🏷️ Product Evidence Extractor (VDP → Rule-based Normalization)
// Purpose: Extract and normalize brand/product mentions from VDP using lexicon

import fs from 'fs'

// Load brand lexicon
const lex = JSON.parse(fs.readFileSync('./brand-lexicon.json', 'utf8'))

function norm(s) { 
  return (s || '').toLowerCase().replace(/\s+/g, '').trim() 
}

function hitAny(text, list) { 
  const t = norm(text)
  return list.find(a => t.includes(norm(a))) 
}

function harvestTexts(vdp) {
  const texts = []
  
  // OCR text extraction
  if (vdp?.overall_analysis?.ocr_text) {
    if (Array.isArray(vdp.overall_analysis.ocr_text)) {
      vdp.overall_analysis.ocr_text.forEach(o => o?.text && texts.push(o.text))
    } else if (typeof vdp.overall_analysis.ocr_text === 'string') {
      texts.push(vdp.overall_analysis.ocr_text)
    }
  }
  
  // Scene/shot descriptions
  vdp?.scenes?.forEach(sc => {
    sc?.shots?.forEach(sh => {
      sh?.keyframes?.forEach(kf => kf?.desc && texts.push(kf.desc))
      // Shot description
      sh?.description && texts.push(sh.description)
    })
    // Scene description
    sc?.description && texts.push(sc.description)
  })
  
  // Metadata title and description
  vdp?.metadata?.title && texts.push(vdp.metadata.title)
  vdp?.metadata?.description && texts.push(vdp.metadata.description)
  
  // Content summary
  vdp?.overall_analysis?.content_summary && texts.push(vdp.overall_analysis.content_summary)
  
  // ASR transcript
  vdp?.overall_analysis?.asr_transcript && texts.push(vdp.overall_analysis.asr_transcript)
  
  return texts
}

function scoreItem(src) { 
  // Simple scoring (MVP: OCR-centric, logo/object for future expansion)
  const base = { logo: 0, ocr: 0, object: 0 }
  base.ocr = 1.0
  
  // S = 0.5*logo + 0.35*ocr + 0.15*object (logo/object are future expansions)
  const S = 0.5 * base.logo + 0.35 * base.ocr + 0.15 * base.object
  return Math.min(1, Math.max(0, S))
}

export function buildEvidence(vdp) {
  const texts = harvestTexts(vdp)
  const brandHits = new Map()
  const prodHits = new Map()
  
  console.log(`🔍 Analyzing ${texts.length} text segments...`)
  
  texts.forEach((t, idx) => {
    // Brand detection
    lex.brands.forEach(b => {
      const alias = hitAny(t, b.aliases)
      if (alias) {
        const key = b.key
        if (!brandHits.has(key)) {
          brandHits.set(key, { brand: key, evidence: [] })
        }
        brandHits.get(key).evidence.push({
          type: 'ocr',
          text: t,
          pos: idx,
          matched_alias: alias
        })
      }
    })
    
    // Product detection
    lex.products.forEach(p => {
      const alias = hitAny(t, p.aliases)
      if (alias) {
        const key = p.key
        if (!prodHits.has(key)) {
          prodHits.set(key, { product_family: key, evidence: [] })
        }
        prodHits.get(key).evidence.push({
          type: 'ocr',
          text: t,
          pos: idx,
          matched_alias: alias
        })
      }
    })
  })
  
  const product_mentions = []
  
  // Process brand hits
  for (const [k, info] of brandHits) {
    product_mentions.push({
      brand: k,
      product_family: null,
      model: null,
      confidence: scoreItem(info),
      evidence: info.evidence.slice(0, 3), // Limit to top 3 evidences
      detection_method: 'lexicon_matching'
    })
  }
  
  // Process product hits
  for (const [k, info] of prodHits) {
    product_mentions.push({
      brand: null,
      product_family: k,
      model: null,
      confidence: scoreItem(info),
      evidence: info.evidence.slice(0, 3), // Limit to top 3 evidences
      detection_method: 'lexicon_matching'
    })
  }
  
  const metrics = {
    logo_hits: 0,
    ocr_hits: product_mentions.length,
    object_hits: 0,
    normalized_score: product_mentions.length > 0 ? 0.7 : 0.0,
    total_text_segments: texts.length,
    brand_mentions: brandHits.size,
    product_mentions: prodHits.size
  }
  
  console.log(`✅ Found ${brandHits.size} brands, ${prodHits.size} products`)
  
  return { 
    product_mentions, 
    brand_detection_metrics: metrics,
    processing_info: {
      lexicon_version: "1.0",
      extraction_method: "vdp_text_harvesting",
      confidence_algorithm: "ocr_weighted",
      processed_at: new Date().toISOString()
    }
  }
}

// CLI execution
if (process.argv[1].endsWith('product-evidence.mjs')) {
  if (process.argv.length < 4) {
    console.error('Usage: node product-evidence.mjs <input_vdp.json> <output_evidence.json>')
    console.error('')
    console.error('Examples:')
    console.error('  node product-evidence.mjs vdp.json evidence.json')
    console.error('  node product-evidence.mjs ~/snap3/out/vdp/C001.json ~/output/evidence.json')
    process.exit(1)
  }
  
  const inFile = process.argv[2]
  const outFile = process.argv[3]
  
  try {
    console.log('🏷️ Product Evidence Extractor')
    console.log('=============================')
    console.log(`📁 Input VDP: ${inFile}`)
    console.log(`📄 Output: ${outFile}`)
    console.log('')
    
    const vdp = JSON.parse(fs.readFileSync(inFile, 'utf8'))
    const ev = buildEvidence(vdp)
    
    // Ensure output directory exists
    const outDir = outFile.substring(0, outFile.lastIndexOf('/'))
    if (outDir && !fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }
    
    fs.writeFileSync(outFile, JSON.stringify(ev, null, 2))
    
    console.log('')
    console.log('📊 Evidence Summary:')
    console.log('===================')
    console.log(`🏷️ Total mentions: ${ev.product_mentions.length}`)
    console.log(`📈 Detection score: ${ev.brand_detection_metrics.normalized_score}`)
    console.log(`📝 Text segments: ${ev.brand_detection_metrics.total_text_segments}`)
    
    if (ev.product_mentions.length > 0) {
      console.log('')
      console.log('🔍 Detected Items:')
      ev.product_mentions.forEach((mention, idx) => {
        const item = mention.brand || mention.product_family
        console.log(`  ${idx + 1}. ${item} (confidence: ${mention.confidence.toFixed(2)})`)
      })
    }
    
    console.log('')
    console.log(`✅ Product evidence → ${outFile}`)
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}