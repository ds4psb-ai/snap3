#!/usr/bin/env node

/**
 * Test script for the adaptive density and hook threshold system
 * Tests the new S/M/L mode classification and dynamic thresholds
 */

// Simulate the adaptive functions (extracted from server.js)
function classifyMode(duration) {
  if (!duration || duration <= 9) return 'S';
  if (duration <= 20) return 'M';
  return 'L';
}

const DENSITY = {
  S: { minScenes: 1, minShots: 1, minKfPerShot: 2, hookStartMaxFactor: 0.4 },
  M: { minScenes: 3, minShots: 5, minKfPerShot: 3, hookStartMaxFactor: 1.0 },
  L: { minScenes: 5, minShots: 8, minKfPerShot: 3, hookStartMaxFactor: 1.0 }
};

function needsRepair(vdp, mode) {
  const scenes = vdp.scenes || [];
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
  const d = DENSITY[mode];
  return scenes.length < d.minScenes || totalShots < d.minShots || totalKf < d.minShots*d.minKfPerShot;
}

function testAdaptiveSystem() {
  console.log("🧪 Testing Adaptive Density & Hook Threshold System");
  console.log("=" .repeat(60));
  
  // Test cases with different video durations
  const testCases = [
    { duration: 5, description: "Short video (5s)" },
    { duration: 8, description: "Short video at boundary (8s)" },
    { duration: 15, description: "Medium video (15s)" },
    { duration: 20, description: "Medium video at boundary (20s)" },
    { duration: 30, description: "Long video (30s)" },
    { duration: 60, description: "Long video (60s)" },
    { duration: null, description: "Unknown duration" }
  ];
  
  const HOOK_MAX_S = 3.0; // Same as server.js
  
  testCases.forEach(({ duration, description }, i) => {
    console.log(`\n${i + 1}. ${description}`);
    console.log("-".repeat(40));
    
    const mode = classifyMode(duration);
    const targets = DENSITY[mode];
    const hookLimit = Math.min(HOOK_MAX_S, (duration || 0) * targets.hookStartMaxFactor);
    
    console.log(`   Mode: ${mode}`);
    console.log(`   Density Requirements:`);
    console.log(`     - Scenes: ≥${targets.minScenes}`);
    console.log(`     - Shots: ≥${targets.minShots}`);
    console.log(`     - Keyframes: ≥${targets.minShots * targets.minKfPerShot}`);
    console.log(`   Hook Threshold: ≤${hookLimit.toFixed(1)}s (factor: ${targets.hookStartMaxFactor})`);
  });
  
  console.log("\n🔍 Testing needsRepair function:");
  console.log("-".repeat(40));
  
  // Test VDP scenarios
  const vdpScenarios = [
    {
      name: "Minimal VDP (1 scene, 1 shot, 1 keyframe)",
      vdp: {
        scenes: [
          { shots: [{ keyframes: [{ role: "start" }] }] }
        ]
      }
    },
    {
      name: "Medium VDP (3 scenes, 6 shots, 18 keyframes)",
      vdp: {
        scenes: [
          { shots: [{ keyframes: [{ role: "start" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "end" }] }] }
        ]
      }
    },
    {
      name: "Rich VDP (5 scenes, 10 shots, 30 keyframes)",  
      vdp: {
        scenes: [
          { shots: [{ keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }] },
          { shots: [{ keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }, { keyframes: [{ role: "start" }, { role: "mid" }, { role: "end" }] }] }
        ]
      }
    }
  ];
  
  ['S', 'M', 'L'].forEach(mode => {
    console.log(`\n   Mode ${mode} requirements:`);
    const d = DENSITY[mode];
    console.log(`     Scenes: ≥${d.minScenes}, Shots: ≥${d.minShots}, Keyframes: ≥${d.minShots * d.minKfPerShot}`);
    
    vdpScenarios.forEach(({ name, vdp }) => {
      const scenes = vdp.scenes.length;
      const shots = vdp.scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
      const keyframes = vdp.scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
      const needs = needsRepair(vdp, mode);
      
      console.log(`     ${name}: ${scenes}/${shots}/${keyframes} → ${needs ? '🔧 REPAIR' : '✅ OK'}`);
    });
  });
  
  console.log("\n✅ Adaptive System Test Complete!");
  console.log("\n📝 Summary:");
  console.log("   - S mode (≤9s): Minimal requirements, 40% hook factor");
  console.log("   - M mode (10-20s): Medium requirements, 100% hook factor"); 
  console.log("   - L mode (>20s): High requirements, 100% hook factor");
  console.log("   - Hook limits adapt to video duration and mode");
  console.log("   - Density repair only triggers when actually needed");
}

// Run the test
testAdaptiveSystem();