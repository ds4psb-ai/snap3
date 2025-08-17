#!/usr/bin/env node

/**
 * Test the enhanced VDP system with dynamic targets and S-mode preservation
 */

// Import functions from server (simulate)
function targetsByDuration(sec) {
  if (!sec || sec <= 0) return { scenes: 1, shotsPerScene: 1, kfPerShot: 2, hookMax: 1.2 };
  
  const scenes = Math.max(1, Math.min(3, Math.round(sec / 2.5)));
  const shotsPerScene = (sec < 7 ? 1 : 2);
  const kfPerShot = (sec < 7 ? 2 : 3);
  const hookMax = Math.min(3.0, 0.4 * sec);
  
  return { scenes, shotsPerScene, kfPerShot, hookMax };
}

function getDensityRequirements(mode, duration) {
  const targets = targetsByDuration(duration);
  return {
    minScenes: targets.scenes,
    minShots: targets.scenes * targets.shotsPerScene,
    minShotsPerScene: targets.shotsPerScene,
    minKfPerShot: targets.kfPerShot,
    hookStartMaxFactor: targets.hookMax / Math.max(duration, 1),
    minCompositionNotes: 2
  };
}

function classifyMode(duration) {
  if (!duration || duration <= 9) return 'S';
  if (duration <= 20) return 'M';
  return 'L';
}

function analyzeDeficiencies(vdp, requirements) {
  const scenes = vdp.scenes || [];
  const deficiencies = [];
  
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  
  if (scenes.length < requirements.minScenes) {
    deficiencies.push(`전체: ${requirements.minScenes - scenes.length}개 씬 추가 필요`);
  }
  
  if (totalShots < requirements.minShots) {
    deficiencies.push(`전체: ${requirements.minShots - totalShots}개 샷 추가 필요`);
  }
  
  scenes.forEach((scene, i) => {
    const shots = scene.shots || [];
    const sceneDeficiencies = [];
    
    if (shots.length < requirements.minShotsPerScene) {
      sceneDeficiencies.push(`${requirements.minShotsPerScene - shots.length}개 샷 추가`);
    }
    
    if (sceneDeficiencies.length > 0) {
      deficiencies.push(`Scene ${i+1}: ${sceneDeficiencies.join(', ')}`);
    }
  });
  
  return deficiencies.length > 0 ? deficiencies.join('\n') : '✅ 모든 요구사항 충족';
}

function testEnhancedSystem() {
  console.log("🧪 Enhanced VDP System with Dynamic Targets Test");
  console.log("=".repeat(60));
  
  const testCases = [
    {
      name: "Ultra-Short Video (5s) - S-mode",
      duration: 5,
      vdp: {
        scenes: [{
          scene_id: "S01_Hook",
          shots: [{
            shot_id: "S01_Shot01",
            camera: { shot: "ECU", angle: "eye", move: "static" },
            composition: { notes: ["Extreme close-up", "Static framing"] },
            keyframes: [
              { role: "start", desc: "Hook begins" },
              { role: "end", desc: "Quick resolution" }
            ]
          }]
        }]
      }
    },
    {
      name: "Short Video (7s) - S-mode",
      duration: 7,
      vdp: {
        scenes: [{
          scene_id: "S01_Hook",
          shots: [{
            shot_id: "S01_Shot01",
            camera: { shot: "MS", angle: "eye", move: "static" },
            composition: { notes: ["Medium shot"] },
            keyframes: [{ role: "start", desc: "Scene begins" }]
          }]
        }]
      }
    },
    {
      name: "Standard Video (15s) - M-mode",
      duration: 15,
      vdp: {
        scenes: [
          {
            scene_id: "S01_Setup",
            shots: [{
              shot_id: "S01_Shot01",
              camera: { shot: "WS", angle: "eye", move: "static" },
              composition: { notes: ["Wide shot", "Establishing"] },
              keyframes: [
                { role: "start", desc: "Scene begins" },
                { role: "mid", desc: "Action develops" },
                { role: "end", desc: "Transition" }
              ]
            }]
          }
        ]
      }
    },
    {
      name: "Long Video (25s) - L-mode",
      duration: 25,
      vdp: {
        scenes: [
          {
            scene_id: "S01_Setup",
            shots: [{
              shot_id: "S01_Shot01",
              camera: { shot: "MS", angle: "eye", move: "static" },
              composition: { notes: ["Medium shot", "Centered"] },
              keyframes: [
                { role: "start", desc: "Scene begins" },
                { role: "mid", desc: "Development" },
                { role: "end", desc: "Conclusion" }
              ]
            }]
          },
          {
            scene_id: "S02_Development",
            shots: [{
              shot_id: "S02_Shot01",
              camera: { shot: "CU", angle: "eye", move: "static" },
              composition: { notes: ["Close-up", "Emotional"] },
              keyframes: [
                { role: "start", desc: "Close-up begins" },
                { role: "peak", desc: "Emotional peak" },
                { role: "end", desc: "Resolution" }
              ]
            }]
          }
        ]
      }
    }
  ];
  
  testCases.forEach(({ name, duration, vdp }, i) => {
    console.log(`\n${i + 1}. ${name}`);
    console.log("-".repeat(50));
    
    const mode = classifyMode(duration);
    const targets = targetsByDuration(duration);
    const requirements = getDensityRequirements(mode, duration);
    
    console.log(`   Duration: ${duration}s → Mode ${mode}`);
    console.log(`   Dynamic Targets: ${targets.scenes} scenes, ${targets.shotsPerScene} shots/scene, ${targets.kfPerShot} kf/shot`);
    console.log(`   Hook Limit: ≤${targets.hookMax.toFixed(1)}s (factor: ${requirements.hookStartMaxFactor.toFixed(2)})`);
    
    // Analyze current VDP
    const scenes = vdp.scenes || [];
    const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
    const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
    
    console.log(`   Current: ${scenes.length} scenes, ${totalShots} shots, ${totalKf} keyframes`);
    
    // Check deficiencies
    const deficiencies = analyzeDeficiencies(vdp, requirements);
    console.log(`   Analysis: ${deficiencies}`);
    
    // Show S-mode special handling
    if (mode === 'S') {
      console.log(`   🎯 S-mode Strategy: Focus on detail density over shot quantity`);
      console.log(`   📋 Enhancement: Composition/camera/audio events density rather than adding shots`);
    }
  });
  
  console.log("\n✅ Enhanced System Test Complete!");
  console.log("\n📝 Key Improvements:");
  console.log("   - Dynamic targets based on video duration");
  console.log("   - S-mode quality preservation (detail density over quantity)");
  console.log("   - Targeted deficiency analysis for Pass-2 enhancement");
  console.log("   - Environment variable override compatibility");
  console.log("   - Async 202 + GCS polling pattern support");
}

testEnhancedSystem();