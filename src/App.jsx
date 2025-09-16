import React, { useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Effects, Float, Stars, Html, Text } from "@react-three/drei";
import { Physics, RigidBody, CylinderCollider, CuboidCollider, useRevoluteJoint, usePointToPointJoint } from "@react-three/rapier";
import * as THREE from 'three';

/**

BUCK: Browser Prototype (WebGL)

Stack: react-three-fiber + @react-three/rapier physics

Controls:

W/S: move forward/back (Buck intent)


A/D: steer


Shift: Pull (burst)


Ctrl: Brake


Q: Instinct Mode toggle


R: Rest (faster recovery)


This is a simplified demo that captures the feel: pulling a sled with friction zones,

a diegetic stamina/struggle meter, and an Instinct view that reveals safe paths. */


function useKeyboard() { const [keys, set] = useState({}); useEffect(() => { const down = (e) => set((k) => ({ ...k, [e.code]: true })); const up = (e) => set((k) => ({ ...k, [e.code]: false })); window.addEventListener("keydown", down); window.addEventListener("keyup", up); return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); }; }, []); return keys; }

// Surface zones with different resistance/turn control const ZONES = [ { pos: [0, 0, 0], size: [60, 1, 60], type: "packed", color: "#aaccee" },        // packed snow main lake { pos: [0, 0, -40], size: [20, 1, 30], type: "ice", color: "#dff6ff" },          // slippery ice patch { pos: [10, 0, 35], size: [35, 1, 25], type: "deep", color: "#e6f1f9" },         // deep snow { pos: [0, 0, 90], size: [18, 1, 90], type: "path", color: "#bcd6ff" },          // uphill path strip ];

function surfaceParams(type) { switch (type) { case "deep": return { drag: 18, turn: 1.2, brake: 1.6 }; case "packed": return { drag: 6, turn: 0.8, brake: 0.9 }; case "ice": return { drag: 2, turn: 0.35, brake: 0.25 }; case "path": return { drag: 4, turn: 0.9, brake: 0.9 }; default: return { drag: 8, turn: 1, brake: 1 }; } }

function Zone({ zone, instinct }) { // Subtle visual — brighter in Instinct mode return ( <mesh position={[zone.pos[0], -0.49, zone.pos[2]]} receiveShadow> <boxGeometry args={[zone.size[0], 0.02, zone.size[2]]} /> <meshStandardMaterial color={instinct ? zone.color : "#ffffff"} transparent opacity={instinct ? 0.5 : 0.08} /> </mesh> ); }

function Terrain() { return ( <group> {/* Ground /} <mesh rotation-x={-Math.PI / 2} receiveShadow> <planeGeometry args={[200, 200, 1, 1]} /> <meshStandardMaterial color="#ffffff" /> </mesh> {/ Snow mounds / rocks */} <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}> <group> {new Array(30).fill(0).map((_, i) => ( <mesh key={i} position={[Math.sin(i) * 60, 0.5, Math.cos(i * 1.7) * 60]} castShadow> <icosahedronGeometry args={[Math.random() * 1.4 + 0.6, 1]} /> <meshStandardMaterial roughness={1} metalness={0} color="#dfe7ef" /> </mesh> ))} </group> </Float> </group> ); }

function Harness({ a, b }) { // simple visual rope between Buck (a) and sled (b) const line = useRef(); useFrame(() => { if (!a.current || !b.current || !line.current) return; const pa = a.current.translation(); const pb = b.current.translation(); line.current.geometry.setFromPoints([ new THREE.Vector3(pa.x, pa.y + 0.6, pa.z), new THREE.Vector3(pb.x, pb.y + 0.5, pb.z) ]); }); return ( <line ref={line}> <bufferGeometry /> <lineBasicMaterial linewidth={2} /> </line> ); }

function BuckAndSled({ instinct, setInstinct, ui }) { const keys = useKeyboard(); const buck = useRef(); const sled = useRef(); const [stamina, setStamina] = useState(1); const [fatigue, setFatigue] = useState(0); const [cargoKg, setCargoKg] = useState(80); const [snag, setSnag] = useState(false);

// Revolute (hinge) joint to simulate the tug connection usePointToPointJoint(buck, sled, { pivotA: { x: 0, y: 0.6, z: -0.5 }, pivotB: { x: 0, y: 0.5, z: 1.2 } });

// Utility: compute which zone Buck is on const zoneAt = (p) => { for (const z of ZONES) { if (Math.abs(p.x - z.pos[0]) <= z.size[0] / 2 && Math.abs(p.z - z.pos[2]) <= z.size[2] / 2) return z; } return null; };

useFrame((state, dt) => { if (!buck.current || !sled.current) return; const pBuck = buck.current.translation(); const zone = zoneAt(pBuck) || { type: "default" }; const surf = surfaceParams(zone.type);

// Input
const forward = (keys["KeyW"] ? 1 : 0) + (keys["KeyS"] ? -1 : 0);
const steer = (keys["KeyA"] ? 1 : 0) + (keys["KeyD"] ? -1 : 0);
const pulling = keys["ShiftLeft"] || keys["ShiftRight"]; // Pull burst
const braking = keys["ControlLeft"] || keys["ControlRight"]; // Brake

if (keys["KeyQ"]) setInstinct(true);
if (!keys["KeyQ"]) setInstinct(false);

// Orientation: face move direction smoothly
const cam = state.camera;
const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), fwd).normalize();
const moveDir = new THREE.Vector3().addScaledVector(fwd, forward).addScaledVector(right, -steer).normalize();

// Exertion affects stamina drain; fatigue reduces force
const exert = (pulling ? 1.0 : 0.6) * Math.max(0, forward);
const drain = (0.1 + surf.drag * 0.02) * exert * (1 + fatigue * 0.6);
const recovering = (!pulling && forward <= 0 && !braking) || keys["KeyR"]; // Rest
const recRate = keys["KeyR"] ? 0.6 : 0.22;

const newStamina = THREE.MathUtils.clamp(stamina + (recovering ? recRate : -drain) * dt, 0, 1);
const newFatigue = 1 - newStamina;
setStamina(newStamina);
setFatigue(newFatigue);

// Apply forces
const effective = THREE.MathUtils.lerp(1, 0.3, newFatigue); // fatigue reduces output
const basePull = 95; // N
const pullForce = basePull * effective * (pulling ? 1.7 : 1.0);

// Buck moves kinematically by applying impulse to own body for traction feel
if (moveDir.lengthSq() > 0.01) {
  buck.current.applyImpulse({ x: moveDir.x * pullForce * dt, y: 0, z: moveDir.z * pullForce * dt }, true);
  // Face direction
  const targetYaw = Math.atan2(moveDir.x, moveDir.z);
  const cur = buck.current.rotation();
  const yaw = THREE.MathUtils.lerp(cur.y, targetYaw, 0.15);
  buck.current.setRotation({ x: 0, y: yaw, z: 0 }, true);
}

// Sled: drag resists motion based on surface; brake increases resistance
const vel = sled.current.linvel();
const speed = Math.hypot(vel.x, vel.z);
const dirVel = new THREE.Vector3(vel.x, 0, vel.z).normalize();
const drag = (surf.drag + (braking ? surf.brake * 6 : 0)) * speed;
sled.current.applyImpulse({ x: -dirVel.x * drag * dt, y: 0, z: -dirVel.z * drag * dt }, true);

// Steering torque (harder on ice)
const steerTorque = 30 * (1 - (surf.turn - 0.5));
if (steer !== 0 && speed > 0.2) sled.current.applyTorqueImpulse({ x: 0, y: -steer * steerTorque * dt, z: 0 }, true);

// Simple snag chance if grazing obstacles: monitor lateral velocity spikes
const latVel = Math.abs(new THREE.Vector3(-dirVel.z, 0, dirVel.x).dot(new THREE.Vector3(vel.x, 0, vel.z)));
setSnag(latVel > 6 && speed < 2);

// Simulate gentle uphill beyond z>70
if (sled.current.translation().z > 70) {
  sled.current.applyImpulse({ x: 0, y: 0, z: -15 * dt }, true); // gravity-like pull back
}

// Cargo mass affects inertia
sled.current.setAdditionalMass(cargoKg);

// UI hooks
ui.current = { stamina: newStamina, fatigue: newFatigue, speed, zone: zone.type, snag };

});

return ( <> {/* Buck (dog placeholder) */} <RigidBody ref={buck} colliders={false} position={[0, 0.6, -10]} linearDamping={0.6} angularDamping={1} mass={30}> <mesh castShadow> <capsuleGeometry args={[0.4, 0.8, 8, 16]} /> <meshStandardMaterial color={instinct ? "#dddddd" : "#c7a27c"} /> </mesh> <CylinderCollider args={[0.4, 0.3]} position={[0, 0, 0]} /> </RigidBody>

{/* Sled */}
  <RigidBody ref={sled} position={[0, 0.5, -12]} linearDamping={0.35} angularDamping={0.6}>
    <group>
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.3, 2.2]} />
        <meshStandardMaterial color={instinct ? "#f2f2f2" : "#8b9299"} />
      </mesh>
      {/* runners */}
      <mesh position={[-0.45, -0.25, 0]} castShadow>
        <boxGeometry args={[0.1, 0.05, 2.4]} />
        <meshStandardMaterial color="#6d747a" />
      </mesh>
      <mesh position={[0.45, -0.25, 0]} castShadow>
        <boxGeometry args={[0.1, 0.05, 2.4]} />
        <meshStandardMaterial color="#6d747a" />
      </mesh>
    </group>
    <CuboidCollider args={[0.6, 0.15, 1.1]} />
  </RigidBody>

  {/* Harness line (visual only) */}
  {/* Implemented via <line> in Harness component above; replaced with simple cylinder for stability */}
</>

); }

function UIOverlay({ uiRef, instinct }) { const [state, setState] = useState({ stamina: 1, fatigue: 0, speed: 0, zone: "packed", snag: false }); useFrame(() => { if (uiRef.current) setState(uiRef.current); }); return ( <Html position={[0, 0, 0]} center style={{ pointerEvents: "none" }}> <div className="fixed left-4 bottom-4 min-w-[260px] p-3 rounded-2xl shadow-lg bg-white/70 backdrop-blur"> <div className="text-sm font-medium">Struggle</div> <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-1"> <div className="h-full bg-blue-500" style={{ width: `${Math.round(state.stamina * 100)}%` }} /> </div> <div className="mt-2 flex items-center justify-between text-xs text-gray-700"> <span>Zone: {state.zone}</span> <span>Speed: {state.speed.toFixed(1)} m/s</span> </div> {state.snag && <div className="mt-2 text-xs text-red-600">Snag! Angle and yank.</div>} {instinct && <div className="mt-2 text-xs text-indigo-700">Instinct Mode</div>} </div>

<div className="fixed right-4 bottom-4 p-3 rounded-2xl shadow bg-white/70 backdrop-blur text-xs leading-5">
    <div className="font-semibold mb-1">Controls</div>
    <div>W/S: move • A/D: steer</div>
    <div>Shift: Pull • Ctrl: Brake</div>
    <div>Q: Instinct • R: Rest</div>
  </div>
</Html>

); }

export default function App() { const [instinct, setInstinct] = useState(false); const uiRef = useRef({}); return ( <div className="w-full h-full"> <Canvas shadows camera={{ position: [8, 7, 12], fov: 55 }}> <color attach="background" args={[instinct ? "#dfe6ef" : "#eef5ff"]} /> <hemisphereLight intensity={0.6} /> <directionalLight castShadow position={[6, 8, 4]} intensity={1.1} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />

<Physics gravity={[0, -9.81, 0]}>
      <Terrain />
      {ZONES.map((z, i) => (
        <Zone key={i} zone={z} instinct={instinct} />
      ))}
      <BuckAndSled instinct={instinct} setInstinct={setInstinct} ui={uiRef} />
    </Physics>

    {/* Instinct Post FX: simple desaturation via color/lighting bias */}
    <Effects disableGamma>
      {/* keep effects minimal for compatibility */}
    </Effects>

    <OrbitControls enablePan={false} minDistance={6} maxDistance={24} target={[0, 0.6, -6]} />
    <Stars radius={120} depth={20} count={2000} factor={4} fade />
    <Environment preset="snow" />
    <UIOverlay uiRef={uiRef} instinct={instinct} />

    {/* Goal marker (cabin stand-in) */}
    <mesh position={[0, 1.2, 110]} castShadow>
      <boxGeometry args={[3, 2, 3]} />
      <meshStandardMaterial color={instinct ? "#ffffff" : "#9f947e"} />
    </mesh>
    <Text position={[0, 2.6, 110]} fontSize={0.5} color="#333">Cabin</Text>
  </Canvas>
</div>

); }
