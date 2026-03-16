"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Constants (lightweight version for 400px panel) ───────────────────────
const CUBE_SIZE = 2.5;
const HALF = CUBE_SIZE / 2;

const OUTER_PARTICLES = 600;
const INNER_PARTICLES = 300;
const CORE_PARTICLES = 150;
const VOLUME_PARTICLES = 1500;
const EDGE_STREAM_COUNT = 40;
const NODE_COUNT = 50;

const CUBE_EDGES: [number[], number[]][] = [
  [
    [-1, -1, -1],
    [1, -1, -1],
  ],
  [
    [1, -1, -1],
    [1, -1, 1],
  ],
  [
    [1, -1, 1],
    [-1, -1, 1],
  ],
  [
    [-1, -1, 1],
    [-1, -1, -1],
  ],
  [
    [-1, 1, -1],
    [1, 1, -1],
  ],
  [
    [1, 1, -1],
    [1, 1, 1],
  ],
  [
    [1, 1, 1],
    [-1, 1, 1],
  ],
  [
    [-1, 1, 1],
    [-1, 1, -1],
  ],
  [
    [-1, -1, -1],
    [-1, 1, -1],
  ],
  [
    [1, -1, -1],
    [1, 1, -1],
  ],
  [
    [1, -1, 1],
    [1, 1, 1],
  ],
  [
    [-1, -1, 1],
    [-1, 1, 1],
  ],
];

const CUBE_CORNERS = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, -1, 1],
  [-1, -1, 1],
  [-1, 1, -1],
  [1, 1, -1],
  [1, 1, 1],
  [-1, 1, 1],
];

const ARTICLE_LABELS = [
  "Art.4",
  "Art.9",
  "Art.12",
  "Art.18",
  "Art.27",
  "Art.31",
  "Art.45",
  "Art.52",
  "Art.67",
  "Art.74",
  "Annex II",
  "Annex IV",
];

// ─── Shaders ───────────────────────────────────────────────────────────────
const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float opacity;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = customColor;
    vOpacity = opacity;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (350.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float a = (1.0 - smoothstep(0.15, 0.5, d)) * vOpacity;
    gl_FragColor = vec4(vColor, a);
  }
`;

// ─── Helpers ───────────────────────────────────────────────────────────────
function createCubeGeo(count: number, scale: number, corners: number) {
  const pos = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);

  // Use greens/teals for Caelex brand instead of white/blue
  const primary = new THREE.Color("#10B981"); // emerald
  const secondary = new THREE.Color("#0D9488"); // teal
  const white = new THREE.Color("#FFFFFF");
  const baseOpacity = scale === 1 ? 0.7 : scale === 0.6 ? 0.45 : 0.25;

  let idx = 0;
  for (let i = 0; i < corners; i++) {
    const c = CUBE_CORNERS[Math.floor(i / (corners / 8)) % 8];
    pos[idx * 3] = c[0] * HALF * scale + (Math.random() - 0.5) * 0.02;
    pos[idx * 3 + 1] = c[1] * HALF * scale + (Math.random() - 0.5) * 0.02;
    pos[idx * 3 + 2] = c[2] * HALF * scale + (Math.random() - 0.5) * 0.02;
    sizes[idx] = 0.015 + Math.random() * 0.005;
    opacities[idx] = baseOpacity;
    const cl = Math.random() < 0.3 ? primary : white;
    colors[idx * 3] = cl.r;
    colors[idx * 3 + 1] = cl.g;
    colors[idx * 3 + 2] = cl.b;
    idx++;
  }

  const perEdge = Math.floor((count - corners) / 12);
  for (let i = 0; i < count - corners; i++) {
    const e = CUBE_EDGES[Math.floor(i / perEdge) % 12];
    const t = Math.random();
    pos[idx * 3] = (e[0][0] + (e[1][0] - e[0][0]) * t) * HALF * scale;
    pos[idx * 3 + 1] = (e[0][1] + (e[1][1] - e[0][1]) * t) * HALF * scale;
    pos[idx * 3 + 2] = (e[0][2] + (e[1][2] - e[0][2]) * t) * HALF * scale;
    sizes[idx] = 0.012 + Math.random() * 0.004;
    opacities[idx] = baseOpacity;
    const cl = Math.random() < 0.2 ? secondary : white;
    colors[idx * 3] = cl.r;
    colors[idx * 3 + 1] = cl.g;
    colors[idx * 3 + 2] = cl.b;
    idx++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
  return geo;
}

function makeShaderMat() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// ─── Cube layers ───────────────────────────────────────────────────────────
function OuterCube() {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => createCubeGeo(OUTER_PARTICLES, 1, 100), []);
  const mat = useMemo(makeShaderMat, []);

  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y += 0.0008;
    g.current.rotation.x += 0.0003;
    g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.4) * 0.015);
  });

  return (
    <group ref={g}>
      <points geometry={geo} material={mat} />
    </group>
  );
}

function InnerCube() {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => createCubeGeo(INNER_PARTICLES, 0.6, 50), []);
  const mat = useMemo(makeShaderMat, []);

  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y -= 0.0012;
    g.current.rotation.x -= 0.0005;
    g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.4) * 0.015);
  });

  return (
    <group ref={g}>
      <points geometry={geo} material={mat} />
    </group>
  );
}

function CoreCube() {
  const g = useRef<THREE.Group>(null);
  const geo = useMemo(() => createCubeGeo(CORE_PARTICLES, 0.3, 30), []);
  const mat = useMemo(makeShaderMat, []);

  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y += 0.002;
    g.current.rotation.z += 0.0008;
    g.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 0.4) * 0.015);
  });

  return (
    <group ref={g}>
      <points geometry={geo} material={mat} />
    </group>
  );
}

// ─── Volume particles ──────────────────────────────────────────────────────
function VolumeCloud() {
  const pts = useRef<THREE.Points>(null);
  const g = useRef<THREE.Group>(null);

  const { geo, base } = useMemo(() => {
    const p = new Float32Array(VOLUME_PARTICLES * 3);
    const b = new Float32Array(VOLUME_PARTICLES * 3);
    const s = new Float32Array(VOLUME_PARTICLES);
    const c = new Float32Array(VOLUME_PARTICLES * 3);
    const o = new Float32Array(VOLUME_PARTICLES);
    const white = new THREE.Color("#FFFFFF");
    const emerald = new THREE.Color("#10B981");
    const teal = new THREE.Color("#0D9488");

    for (let i = 0; i < VOLUME_PARTICLES; i++) {
      const spread = Math.random() < 0.7 ? 1.4 : 2.4;
      const x = (Math.random() - 0.5) * spread;
      const y = (Math.random() - 0.5) * spread;
      const z = (Math.random() - 0.5) * spread;
      p[i * 3] = x;
      p[i * 3 + 1] = y;
      p[i * 3 + 2] = z;
      b[i * 3] = x;
      b[i * 3 + 1] = y;
      b[i * 3 + 2] = z;
      s[i] = 0.006 + Math.random() * 0.004;
      const r = Math.random();
      const col = r < 0.75 ? white : r < 0.9 ? emerald : teal;
      c[i * 3] = col.r;
      c[i * 3 + 1] = col.g;
      c[i * 3 + 2] = col.b;
      o[i] = 0.35;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("size", new THREE.BufferAttribute(s, 1));
    g.setAttribute("customColor", new THREE.BufferAttribute(c, 3));
    g.setAttribute("opacity", new THREE.BufferAttribute(o, 1));
    return { geo: g, base: b };
  }, []);

  const mat = useMemo(makeShaderMat, []);

  useFrame(({ clock }) => {
    if (!pts.current || !g.current) return;
    const t = clock.elapsedTime;
    const pos = pts.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < VOLUME_PARTICLES; i++) {
      const i3 = i * 3;
      pos[i3] = base[i3] + Math.sin(t * 0.3 + i * 0.1) * 0.03;
      pos[i3 + 1] = base[i3 + 1] + Math.cos(t * 0.25 + i * 0.15) * 0.03;
      pos[i3 + 2] = base[i3 + 2] + Math.sin(t * 0.35 + i * 0.12) * 0.03;
    }
    pts.current.geometry.attributes.position.needsUpdate = true;
    g.current.rotation.y += 0.0008;
    g.current.rotation.x += 0.0003;
    g.current.scale.setScalar(1 + Math.sin(t * 0.4) * 0.015);
  });

  return (
    <group ref={g}>
      <points ref={pts} geometry={geo} material={mat} />
    </group>
  );
}

// ─── Edge streams ──────────────────────────────────────────────────────────
function EdgeStreams() {
  const pts = useRef<THREE.Points>(null);
  const g = useRef<THREE.Group>(null);

  const { geo, data } = useMemo(() => {
    const p = new Float32Array(EDGE_STREAM_COUNT * 3);
    const d: { ei: number; prog: number; spd: number }[] = [];
    for (let i = 0; i < EDGE_STREAM_COUNT; i++) {
      d.push({
        ei: i % 12,
        prog: Math.random(),
        spd: 0.006 + Math.random() * 0.006,
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return { geo: g, data: d };
  }, []);

  useFrame(() => {
    if (!pts.current || !g.current) return;
    const pos = pts.current.geometry.attributes.position.array as Float32Array;
    data.forEach((dot, i) => {
      dot.prog += dot.spd;
      if (dot.prog >= 1) {
        dot.prog = 0;
        dot.ei = (dot.ei + 1 + Math.floor(Math.random() * 3)) % 12;
      }
      const e = CUBE_EDGES[dot.ei];
      const t = dot.prog;
      pos[i * 3] = (e[0][0] + (e[1][0] - e[0][0]) * t) * HALF;
      pos[i * 3 + 1] = (e[0][1] + (e[1][1] - e[0][1]) * t) * HALF;
      pos[i * 3 + 2] = (e[0][2] + (e[1][2] - e[0][2]) * t) * HALF;
    });
    pts.current.geometry.attributes.position.needsUpdate = true;
    g.current.rotation.y += 0.0008;
    g.current.rotation.x += 0.0003;
  });

  return (
    <group ref={g}>
      <points ref={pts} geometry={geo}>
        <pointsMaterial
          color="#10B981"
          size={0.02}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ─── Data network ──────────────────────────────────────────────────────────
function DataNetwork() {
  const nodesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const groupRef = useRef<THREE.Group>(null);
  const waveOrigin = useRef<THREE.Vector3 | null>(null);
  const waveRadius = useRef(0);
  const waveActive = useRef(false);
  const lastWave = useRef(0);

  const { nodeGeo, nodePos, connGeo, pairs } = useMemo(() => {
    const positions = new Float32Array(NODE_COUNT * 3);
    const nPos: THREE.Vector3[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 2.2;
      const y = (Math.random() - 0.5) * 2.2;
      const z = (Math.random() - 0.5) * 2.2;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      nPos.push(new THREE.Vector3(x, y, z));
    }
    const ng = new THREE.BufferGeometry();
    ng.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const ps: [number, number][] = [];
    const seen = new Set<string>();
    for (let i = 0; i < NODE_COUNT; i++) {
      const dists: { j: number; d: number }[] = [];
      for (let j = 0; j < NODE_COUNT; j++) {
        if (i !== j) dists.push({ j, d: nPos[i].distanceTo(nPos[j]) });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < Math.min(4, dists.length); k++) {
        if (dists[k].d > 1.4) break;
        const j = dists[k].j;
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          ps.push([i, j]);
          seen.add(key);
        }
      }
    }

    const lp = new Float32Array(ps.length * 6);
    const lc = new Float32Array(ps.length * 6);
    ps.forEach(([a, b], i) => {
      lp[i * 6] = nPos[a].x;
      lp[i * 6 + 1] = nPos[a].y;
      lp[i * 6 + 2] = nPos[a].z;
      lp[i * 6 + 3] = nPos[b].x;
      lp[i * 6 + 4] = nPos[b].y;
      lp[i * 6 + 5] = nPos[b].z;
      for (let c = 0; c < 6; c++) lc[i * 6 + c] = 0.4;
    });
    const cg = new THREE.BufferGeometry();
    cg.setAttribute("position", new THREE.BufferAttribute(lp, 3));
    cg.setAttribute("color", new THREE.BufferAttribute(lc, 3));

    return { nodeGeo: ng, nodePos: nPos, connGeo: cg, pairs: ps };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - lastWave.current > 2) {
      lastWave.current = t;
      waveActive.current = true;
      waveRadius.current = 0;
      waveOrigin.current =
        nodePos[Math.floor(Math.random() * NODE_COUNT)].clone();
    }
    if (waveActive.current) {
      waveRadius.current += 0.06;
      if (waveRadius.current > 3.5) waveActive.current = false;
    }

    if (nodesRef.current) {
      const pos = nodesRef.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < NODE_COUNT; i++) {
        const bp = nodePos[i];
        pos[i * 3] = bp.x + Math.sin(t * 0.3 + i * 0.7) * 0.04;
        pos[i * 3 + 1] = bp.y + Math.cos(t * 0.25 + i * 0.5) * 0.04;
        pos[i * 3 + 2] = bp.z + Math.sin(t * 0.35 + i * 0.3) * 0.04;
      }
      nodesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (linesRef.current && nodesRef.current) {
      const np = nodesRef.current.geometry.attributes.position
        .array as Float32Array;
      const lp = linesRef.current.geometry.attributes.position
        .array as Float32Array;
      const lc = linesRef.current.geometry.attributes.color
        .array as Float32Array;
      pairs.forEach(([a, b], i) => {
        lp[i * 6] = np[a * 3];
        lp[i * 6 + 1] = np[a * 3 + 1];
        lp[i * 6 + 2] = np[a * 3 + 2];
        lp[i * 6 + 3] = np[b * 3];
        lp[i * 6 + 4] = np[b * 3 + 1];
        lp[i * 6 + 5] = np[b * 3 + 2];
        let br = 0.4;
        if (waveActive.current && waveOrigin.current) {
          const mx = (np[a * 3] + np[b * 3]) / 2,
            my = (np[a * 3 + 1] + np[b * 3 + 1]) / 2,
            mz = (np[a * 3 + 2] + np[b * 3 + 2]) / 2;
          const d = Math.sqrt(
            (mx - waveOrigin.current.x) ** 2 +
              (my - waveOrigin.current.y) ** 2 +
              (mz - waveOrigin.current.z) ** 2,
          );
          if (Math.abs(d - waveRadius.current) < 0.5) br = 1.0;
        }
        if (Math.random() < 0.002) br = 1.0;
        for (let c = 0; c < 6; c++) lc[i * 6 + c] = br;
      });
      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0008;
      groupRef.current.rotation.x += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments ref={linesRef} geometry={connGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.12} />
      </lineSegments>
      <points ref={nodesRef} geometry={nodeGeo}>
        <pointsMaterial
          color="#10B981"
          size={0.018}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// ─── Scene ─────────────────────────────────────────────────────────────────
function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight
        position={[0, 0, 0]}
        intensity={0.6}
        color="#10B981"
        distance={6}
      />
      <OuterCube />
      <InnerCube />
      <CoreCube />
      <VolumeCloud />
      <EdgeStreams />
      <DataNetwork />
    </>
  );
}

export default function AstraEntityScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{
        alpha: true,
        antialias: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 2.2,
      }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
