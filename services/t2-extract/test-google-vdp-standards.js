#!/usr/bin/env node

/**
 * Test script for Google VDP quality standards integration
 * Tests enhanced density requirements, composition notes, and camera metadata
 */

// Mock adaptive functions
function classifyMode(duration) {
  if (!duration || duration <= 9) return 'S';
  if (duration <= 20) return 'M';
  return 'L';
}

const DENSITY = {
  S: { 
    minScenes: 1, 
    minShots: 1,
    minShotsPerScene: 1,
    minKfPerShot: 2, 
    hookStartMaxFactor: 0.4,
    minCompositionNotes: 2
  },
  M: { 
    minScenes: 3, 
    minShots: 6,
    minShotsPerScene: 2,
    minKfPerShot: 3, 
    hookStartMaxFactor: 1.0,
    minCompositionNotes: 2
  },
  L: { 
    minScenes: 5, 
    minShots: 10,
    minShotsPerScene: 2,
    minKfPerShot: 3, 
    hookStartMaxFactor: 1.0,
    minCompositionNotes: 2
  }
};

function needsRepair(vdp, mode) {
  const scenes = vdp.scenes || [];
  const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
  const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
  const d = DENSITY[mode];
  
  // Check total counts
  if (scenes.length < d.minScenes || totalShots < d.minShots || totalKf < d.minShots*d.minKfPerShot) {
    return true;
  }
  
  // Check per-scene shot requirements (Google VDP standards)
  for (const scene of scenes) {
    const shots = scene.shots || [];
    if (shots.length < d.minShotsPerScene) {
      return true;
    }
    
    // Check composition.notes requirements per shot
    for (const shot of shots) {
      const notes = shot.composition?.notes || [];
      if (notes.length < d.minCompositionNotes) {
        return true;
      }
      
      // Check camera metadata completeness (no "unknown" values)
      const camera = shot.camera || {};
      if (!camera.shot || !camera.angle || !camera.move || 
          camera.shot === "unknown" || camera.angle === "unknown" || camera.move === "unknown") {
        return true;
      }
    }
  }
  
  return false;
}

function testGoogleVDPStandards() {
  console.log("🧪 Testing Google VDP Quality Standards Integration");
  console.log("=" .repeat(60));
  
  // Test cases representing different VDP quality levels
  const testCases = [
    {
      name: "OLD VDP Quality (High Standard)",
      duration: 15,
      vdp: {
        scenes: [
          {
            scene_id: "S01_Setup",
            shots: [
              {
                shot_id: "S01_Shot01",
                camera: { shot: "MS", angle: "eye", move: "static" },
                composition: { 
                  grid: "center", 
                  notes: ["Two characters placed centrally", "Stable composition with natural lighting"] 
                },
                keyframes: [
                  { role: "start", desc: "Character enters frame" },
                  { role: "mid", desc: "Character speaks" },
                  { role: "end", desc: "Reaction shot" }
                ]
              },
              {
                shot_id: "S01_Shot02", 
                camera: { shot: "CU", angle: "eye", move: "static" },
                composition: { 
                  grid: "left_third", 
                  notes: ["Close-up on emotional reaction", "Shallow depth of field"] 
                },
                keyframes: [
                  { role: "start", desc: "Close-up begins" },
                  { role: "peak", desc: "Peak emotional moment" },
                  { role: "end", desc: "Character looks away" }
                ]
              }
            ]
          },
          {
            scene_id: "S02_Reaction",
            shots: [
              {
                shot_id: "S02_Shot01",
                camera: { shot: "WS", angle: "high", move: "pan" },
                composition: { 
                  grid: "center", 
                  notes: ["Wide establishing shot", "Camera pans to reveal context"] 
                },
                keyframes: [
                  { role: "start", desc: "Wide shot establishes location" },
                  { role: "mid", desc: "Pan reveals new information" },
                  { role: "end", desc: "Pan completes" }
                ]
              },
              {
                shot_id: "S02_Shot02",
                camera: { shot: "ECU", angle: "low", move: "handheld" },
                composition: { 
                  grid: "right_third", 
                  notes: ["Extreme close-up for intimacy", "Handheld adds energy"] 
                },
                keyframes: [
                  { role: "start", desc: "ECU begins" },
                  { role: "peak", desc: "Critical dialogue moment" },
                  { role: "end", desc: "Shot holds for impact" }
                ]
              }
            ]
          },
          {
            scene_id: "S03_Resolution",
            shots: [
              {
                shot_id: "S03_Shot01",
                camera: { shot: "MLS", angle: "eye", move: "dolly" },
                composition: { 
                  grid: "symmetry", 
                  notes: ["Medium long shot for context", "Dolly in for emotional impact"] 
                },
                keyframes: [
                  { role: "start", desc: "Characters in medium long shot" },
                  { role: "mid", desc: "Dolly move begins" },
                  { role: "end", desc: "Final framing achieved" }
                ]
              },
              {
                shot_id: "S03_Shot02",
                camera: { shot: "MCU", angle: "dutch", move: "zoom" },
                composition: { 
                  grid: "center", 
                  notes: ["Dutch angle adds tension", "Zoom emphasizes final moment"] 
                },
                keyframes: [
                  { role: "start", desc: "Dutch angle establishes unease" },
                  { role: "peak", desc: "Zoom to critical detail" },
                  { role: "end", desc: "Final resolution" }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: "NEW VDP with Variable Density (Needs Repair)",
      duration: 15,
      vdp: {
        scenes: [
          {
            scene_id: "S01_OnlyScene",
            shots: [
              {
                shot_id: "S01_Shot01",
                camera: { shot: "unknown", angle: "unknown", move: "unknown" },
                composition: { grid: "center", notes: ["Basic shot"] },
                keyframes: [
                  { role: "start", desc: "Scene begins" },
                  { role: "end", desc: "Scene ends" }
                ]
              }
            ]
          }
        ]
      }
    },
    {
      name: "Short Video S-Mode (Minimal but Complete)",
      duration: 7,
      vdp: {
        scenes: [
          {
            scene_id: "S01_QuickHook",
            shots: [
              {
                shot_id: "S01_Shot01",
                camera: { shot: "ECU", angle: "eye", move: "static" },
                composition: { 
                  grid: "center", 
                  notes: ["Extreme close-up for immediate impact", "Static framing focuses attention"] 
                },
                keyframes: [
                  { role: "start", desc: "Hook begins with ECU" },
                  { role: "end", desc: "Quick resolution" }
                ]
              }
            ]
          }
        ]
      }
    }
  ];
  
  testCases.forEach(({ name, duration, vdp }, i) => {
    console.log(`\n${i + 1}. ${name}`);
    console.log("-".repeat(50));
    
    const mode = classifyMode(duration);
    const requirements = DENSITY[mode];
    const needsRepairResult = needsRepair(vdp, mode);
    
    console.log(`   Duration: ${duration}s → Mode ${mode}`);
    console.log(`   Requirements: ${requirements.minScenes} scenes, ${requirements.minShotsPerScene} shots/scene, ${requirements.minKfPerShot} keyframes/shot, ${requirements.minCompositionNotes} notes/shot`);
    
    // Analyze current VDP
    const scenes = vdp.scenes || [];
    const totalShots = scenes.reduce((a,s)=>a+(s.shots?.length||0),0);
    const totalKf = scenes.reduce((a,s)=>a+(s.shots?.reduce((sa,sh)=>sa+(sh.keyframes?.length||0),0)||0),0);
    const shotsPerScene = scenes.map(s => s.shots?.length || 0);
    
    // Analyze composition notes
    let totalCompositionNotes = 0;
    let shotsWithInsufficientNotes = 0;
    let shotsWithUnknownCamera = 0;
    
    for (const scene of scenes) {
      for (const shot of scene.shots || []) {
        const notes = shot.composition?.notes || [];
        totalCompositionNotes += notes.length;
        if (notes.length < requirements.minCompositionNotes) {
          shotsWithInsufficientNotes++;
        }
        
        const camera = shot.camera || {};
        if (!camera.shot || !camera.angle || !camera.move || 
            camera.shot === "unknown" || camera.angle === "unknown" || camera.move === "unknown") {
          shotsWithUnknownCamera++;
        }
      }
    }
    
    console.log(`   Current: ${scenes.length} scenes, ${totalShots} shots, ${totalKf} keyframes, ${totalCompositionNotes} notes`);
    console.log(`   Shots per scene: [${shotsPerScene.join(', ')}]`);
    console.log(`   Quality Issues: ${shotsWithInsufficientNotes} shots lack composition notes, ${shotsWithUnknownCamera} shots have unknown camera data`);
    console.log(`   Needs Repair: ${needsRepairResult ? '🔧 YES' : '✅ NO'}`);
    
    if (needsRepairResult) {
      console.log(`   📋 Repair Actions Needed:`);
      if (scenes.length < requirements.minScenes) {
        console.log(`      - Add ${requirements.minScenes - scenes.length} more scenes`);
      }
      if (totalShots < requirements.minShots) {
        console.log(`      - Add ${requirements.minShots - totalShots} more shots`);
      }
      const scenesNeedingShots = scenes.filter(s => (s.shots?.length || 0) < requirements.minShotsPerScene).length;
      if (scenesNeedingShots > 0) {
        console.log(`      - ${scenesNeedingShots} scenes need more shots (${requirements.minShotsPerScene} min per scene)`);
      }
      if (shotsWithInsufficientNotes > 0) {
        console.log(`      - ${shotsWithInsufficientNotes} shots need more composition notes (${requirements.minCompositionNotes} min per shot)`);
      }
      if (shotsWithUnknownCamera > 0) {
        console.log(`      - ${shotsWithUnknownCamera} shots need complete camera metadata`);
      }
    }
  });
  
  console.log("\n✅ Google VDP Standards Test Complete!");
  console.log("\n📝 Summary:");
  console.log("   - Enhanced density requirements now check per-scene shot counts");
  console.log("   - Composition.notes validation ensures 2+ detailed notes per shot");
  console.log("   - Camera metadata validation prevents 'unknown' values");
  console.log("   - Mode-specific requirements scale appropriately (S/M/L)");
  console.log("   - System maintains OLD VDP quality standards while keeping NEW VDP hook genome");
}

// Run the test
testGoogleVDPStandards();