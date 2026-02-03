"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Constants
const CUBE_SIZE = 2.5;
const HALF = CUBE_SIZE / 2;

const OUTER_EDGE_PARTICLES = 3000;
const INNER_EDGE_PARTICLES = 1500;
const CORE_EDGE_PARTICLES = 800;
const VOLUME_PARTICLES = 9000;

const NODE_COUNT = 150;
const EDGE_STREAM_COUNT = 120;

// Short article labels for internal network nodes
const ARTICLE_LABELS = [
  "Art.4",
  "Art.6",
  "Art.9",
  "Art.12",
  "Art.15",
  "Art.18",
  "Art.22",
  "Art.27",
  "Art.29",
  "Art.31",
  "Art.33",
  "Art.38",
  "Art.41",
  "Art.45",
  "Art.48",
  "Art.52",
  "Art.55",
  "Art.62",
  "Art.67",
  "Art.71",
  "Art.74",
  "§27",
  "§31",
  "§45",
  "Annex II",
  "Annex IV",
  "COM(2025)335",
];

// 12 edges of a unit cube (start corner, end corner)
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

// 8 corners of unit cube
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

// Particle vertex shader
const particleVertexShader = `
  attribute float size;
  attribute vec3 customColor;
  attribute float opacity;

  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = customColor;
    vOpacity = opacity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (450.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = (1.0 - smoothstep(0.15, 0.5, dist)) * vOpacity;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

// Helper to create cube edge geometry at a given scale
function createCubeEdgeGeometry(
  particleCount: number,
  scale: number,
  cornerCount: number,
  edgeCount: number,
) {
  const positions = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const colors = new Float32Array(particleCount * 3);
  const opacities = new Float32Array(particleCount);

  const white = new THREE.Color("#FFFFFF");
  const blue = new THREE.Color("#AAC4FF");
  const color = scale === 1 ? white : blue;
  const baseOpacity = scale === 1 ? 0.8 : scale === 0.6 ? 0.5 : 0.3;

  let idx = 0;

  // Corner particles
  for (let i = 0; i < cornerCount; i++) {
    const cornerIdx = Math.floor(i / (cornerCount / 8));
    const corner = CUBE_CORNERS[cornerIdx % 8];
    const x = corner[0] * HALF * scale + (Math.random() - 0.5) * 0.02;
    const y = corner[1] * HALF * scale + (Math.random() - 0.5) * 0.02;
    const z = corner[2] * HALF * scale + (Math.random() - 0.5) * 0.02;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    sizes[idx] = 0.015 + Math.random() * 0.005;
    opacities[idx] = baseOpacity;
    colors[idx * 3] = color.r;
    colors[idx * 3 + 1] = color.g;
    colors[idx * 3 + 2] = color.b;
    idx++;
  }

  // Edge particles - PERFECTLY STRAIGHT
  const edgeParticles = particleCount - cornerCount;
  const perEdge = Math.floor(edgeParticles / 12);
  for (let i = 0; i < edgeParticles; i++) {
    const edgeIdx = Math.floor(i / perEdge);
    const edge = CUBE_EDGES[edgeIdx % 12];
    const t = Math.random();
    const x = (edge[0][0] + (edge[1][0] - edge[0][0]) * t) * HALF * scale;
    const y = (edge[0][1] + (edge[1][1] - edge[0][1]) * t) * HALF * scale;
    const z = (edge[0][2] + (edge[1][2] - edge[0][2]) * t) * HALF * scale;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    sizes[idx] = 0.012 + Math.random() * 0.004;
    opacities[idx] = baseOpacity;
    colors[idx * 3] = color.r;
    colors[idx * 3 + 1] = color.g;
    colors[idx * 3 + 2] = color.b;
    idx++;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));

  return geo;
}

// Outer Cube - rotates one direction
function OuterCube() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(
    () => createCubeEdgeGeometry(OUTER_EDGE_PARTICLES, 1, 400, 250),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Outer cube rotation
    groupRef.current.rotation.y += 0.0008;
    groupRef.current.rotation.x += 0.0003;
    // Breathing
    const scale = 1 + Math.sin(clock.elapsedTime * 0.4) * 0.015;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
}

// Inner Cube - COUNTER-ROTATION
function InnerCube() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(
    () => createCubeEdgeGeometry(INNER_EDGE_PARTICLES, 0.6, 200, 120),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Inner cube COUNTER-ROTATION (opposite direction)
    groupRef.current.rotation.y -= 0.0012;
    groupRef.current.rotation.x -= 0.0005;
    // Breathing
    const scale = 1 + Math.sin(clock.elapsedTime * 0.4) * 0.015;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
}

// Core Cube - DIFFERENT AXIS ROTATION
function CoreCube() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const geometry = useMemo(
    () => createCubeEdgeGeometry(CORE_EDGE_PARTICLES, 0.3, 100, 60),
    [],
  );

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    // Core cube - different axis rotation
    groupRef.current.rotation.y += 0.002;
    groupRef.current.rotation.z += 0.0008;
    // Breathing
    const scale = 1 + Math.sin(clock.elapsedTime * 0.4) * 0.015;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
}

// Volume Particles (inside the cube)
function VolumeParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, basePositions } = useMemo(() => {
    const positions = new Float32Array(VOLUME_PARTICLES * 3);
    const basePos = new Float32Array(VOLUME_PARTICLES * 3);
    const sizes = new Float32Array(VOLUME_PARTICLES);
    const colors = new Float32Array(VOLUME_PARTICLES * 3);
    const opacities = new Float32Array(VOLUME_PARTICLES);

    const white = new THREE.Color("#FFFFFF");
    const blue = new THREE.Color("#AAC4FF");
    const warm = new THREE.Color("#FFE8CC");

    for (let i = 0; i < VOLUME_PARTICLES; i++) {
      let x, y, z;
      if (Math.random() < 0.7) {
        x = (Math.random() - 0.5) * 1.4;
        y = (Math.random() - 0.5) * 1.4;
        z = (Math.random() - 0.5) * 1.4;
      } else {
        x = (Math.random() - 0.5) * 2.4;
        y = (Math.random() - 0.5) * 2.4;
        z = (Math.random() - 0.5) * 2.4;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      basePos[i * 3] = x;
      basePos[i * 3 + 1] = y;
      basePos[i * 3 + 2] = z;

      sizes[i] = 0.006 + Math.random() * 0.004;

      const colorRoll = Math.random();
      let color: THREE.Color;
      if (colorRoll < 0.8) color = white;
      else if (colorRoll < 0.95) color = blue;
      else color = warm;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      opacities[i] = 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("customColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));

    return { geometry: geo, basePositions: basePos };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!pointsRef.current || !groupRef.current) return;
    const time = clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    // Subtle drift for volume particles
    for (let i = 0; i < VOLUME_PARTICLES; i++) {
      const i3 = i * 3;
      const drift = 0.03;
      positions[i3] =
        basePositions[i3] + Math.sin(time * 0.3 + i * 0.1) * drift;
      positions[i3 + 1] =
        basePositions[i3 + 1] + Math.cos(time * 0.25 + i * 0.15) * drift;
      positions[i3 + 2] =
        basePositions[i3 + 2] + Math.sin(time * 0.35 + i * 0.12) * drift;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    groupRef.current.rotation.y += 0.0008;
    groupRef.current.rotation.x += 0.0003;
    const scale = 1 + Math.sin(time * 0.4) * 0.015;
    groupRef.current.scale.setScalar(scale);
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry} material={material} />
    </group>
  );
}

// Energy Stream Dots
function EdgeStreams() {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { geometry, streamData } = useMemo(() => {
    const positions = new Float32Array(EDGE_STREAM_COUNT * 3);
    const data: { edgeIndex: number; progress: number; speed: number }[] = [];

    for (let i = 0; i < EDGE_STREAM_COUNT; i++) {
      data.push({
        edgeIndex: i % 12,
        progress: Math.random(),
        speed: 0.006 + Math.random() * 0.006,
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, streamData: data };
  }, []);

  useFrame(() => {
    if (!pointsRef.current || !groupRef.current) return;
    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;

    streamData.forEach((dot, idx) => {
      dot.progress += dot.speed;
      if (dot.progress >= 1) {
        dot.progress = 0;
        dot.edgeIndex =
          (dot.edgeIndex + 1 + Math.floor(Math.random() * 3)) % 12;
      }

      const edge = CUBE_EDGES[dot.edgeIndex];
      const t = dot.progress;
      positions[idx * 3] = (edge[0][0] + (edge[1][0] - edge[0][0]) * t) * HALF;
      positions[idx * 3 + 1] =
        (edge[0][1] + (edge[1][1] - edge[0][1]) * t) * HALF;
      positions[idx * 3 + 2] =
        (edge[0][2] + (edge[1][2] - edge[0][2]) * t) * HALF;
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    groupRef.current.rotation.y += 0.0008;
    groupRef.current.rotation.x += 0.0003;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={geometry}>
        <pointsMaterial
          color="#ffffff"
          size={0.02}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

// Data Network
function DataNetwork() {
  const nodesRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const spritesRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  const waveOrigin = useRef<THREE.Vector3 | null>(null);
  const waveRadius = useRef(0);
  const waveActive = useRef(false);
  const lastWaveTime = useRef(0);

  const { nodeGeometry, nodePositions, connectionGeometry, connectionPairs } =
    useMemo(() => {
      const positions = new Float32Array(NODE_COUNT * 3);
      const nodePos: THREE.Vector3[] = [];

      for (let i = 0; i < NODE_COUNT; i++) {
        const x = (Math.random() - 0.5) * 2.2;
        const y = (Math.random() - 0.5) * 2.2;
        const z = (Math.random() - 0.5) * 2.2;
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        nodePos.push(new THREE.Vector3(x, y, z));
      }

      const nodeGeo = new THREE.BufferGeometry();
      nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const pairs: [number, number][] = [];
      const connected = new Set<string>();

      for (let i = 0; i < NODE_COUNT; i++) {
        const distances: { idx: number; dist: number }[] = [];
        for (let j = 0; j < NODE_COUNT; j++) {
          if (i !== j)
            distances.push({ idx: j, dist: nodePos[i].distanceTo(nodePos[j]) });
        }
        distances.sort((a, b) => a.dist - b.dist);

        for (let k = 0; k < Math.min(5, distances.length); k++) {
          if (distances[k].dist > 1.2) break;
          const j = distances[k].idx;
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (!connected.has(key)) {
            pairs.push([i, j]);
            connected.add(key);
          }
        }
      }

      const linePositions = new Float32Array(pairs.length * 6);
      const lineColors = new Float32Array(pairs.length * 6);
      pairs.forEach(([a, b], i) => {
        linePositions[i * 6] = nodePos[a].x;
        linePositions[i * 6 + 1] = nodePos[a].y;
        linePositions[i * 6 + 2] = nodePos[a].z;
        linePositions[i * 6 + 3] = nodePos[b].x;
        linePositions[i * 6 + 4] = nodePos[b].y;
        linePositions[i * 6 + 5] = nodePos[b].z;
        for (let c = 0; c < 6; c++) lineColors[i * 6 + c] = 0.4;
      });

      const connGeo = new THREE.BufferGeometry();
      connGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(linePositions, 3),
      );
      connGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));

      return {
        nodeGeometry: nodeGeo,
        nodePositions: nodePos,
        connectionGeometry: connGeo,
        connectionPairs: pairs,
      };
    }, []);

  const sprites = useMemo(
    () =>
      nodePositions.map((pos, i) => ({
        position: pos.clone(),
        label: ARTICLE_LABELS[i % ARTICLE_LABELS.length],
      })),
    [nodePositions],
  );

  const createTextTexture = (text: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 32, 20);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;

    if (time - lastWaveTime.current > 1.5) {
      lastWaveTime.current = time;
      waveActive.current = true;
      waveRadius.current = 0;
      waveOrigin.current =
        nodePositions[Math.floor(Math.random() * NODE_COUNT)].clone();
    }

    if (waveActive.current) {
      waveRadius.current += 0.06;
      if (waveRadius.current > 3.5) waveActive.current = false;
    }

    if (nodesRef.current) {
      const positions = nodesRef.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < NODE_COUNT; i++) {
        const basePos = nodePositions[i];
        positions[i * 3] = basePos.x + Math.sin(time * 0.3 + i * 0.7) * 0.04;
        positions[i * 3 + 1] =
          basePos.y + Math.cos(time * 0.25 + i * 0.5) * 0.04;
        positions[i * 3 + 2] =
          basePos.z + Math.sin(time * 0.35 + i * 0.3) * 0.04;
      }
      nodesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (linesRef.current && nodesRef.current) {
      const nodePos = nodesRef.current.geometry.attributes.position
        .array as Float32Array;
      const linePos = linesRef.current.geometry.attributes.position
        .array as Float32Array;
      const lineColors = linesRef.current.geometry.attributes.color
        .array as Float32Array;

      connectionPairs.forEach(([a, b], i) => {
        linePos[i * 6] = nodePos[a * 3];
        linePos[i * 6 + 1] = nodePos[a * 3 + 1];
        linePos[i * 6 + 2] = nodePos[a * 3 + 2];
        linePos[i * 6 + 3] = nodePos[b * 3];
        linePos[i * 6 + 4] = nodePos[b * 3 + 1];
        linePos[i * 6 + 5] = nodePos[b * 3 + 2];

        let brightness = 0.4;
        if (waveActive.current && waveOrigin.current) {
          const midX = (nodePos[a * 3] + nodePos[b * 3]) / 2;
          const midY = (nodePos[a * 3 + 1] + nodePos[b * 3 + 1]) / 2;
          const midZ = (nodePos[a * 3 + 2] + nodePos[b * 3 + 2]) / 2;
          const dist = Math.sqrt(
            Math.pow(midX - waveOrigin.current.x, 2) +
              Math.pow(midY - waveOrigin.current.y, 2) +
              Math.pow(midZ - waveOrigin.current.z, 2),
          );
          if (Math.abs(dist - waveRadius.current) < 0.5) brightness = 1.0;
        }
        if (Math.random() < 0.002) brightness = 1.0;
        for (let c = 0; c < 6; c++) lineColors[i * 6 + c] = brightness;
      });

      linesRef.current.geometry.attributes.position.needsUpdate = true;
      linesRef.current.geometry.attributes.color.needsUpdate = true;
    }

    if (spritesRef.current && nodesRef.current) {
      const nodePos = nodesRef.current.geometry.attributes.position
        .array as Float32Array;
      spritesRef.current.children.forEach((sprite, i) => {
        const mat = (sprite as THREE.Sprite).material as THREE.SpriteMaterial;
        if (waveActive.current && waveOrigin.current) {
          const dist = new THREE.Vector3(
            nodePos[i * 3],
            nodePos[i * 3 + 1],
            nodePos[i * 3 + 2],
          ).distanceTo(waveOrigin.current);
          mat.opacity =
            Math.abs(dist - waveRadius.current) < 0.3
              ? 0.5
              : Math.max(0.1, mat.opacity - 0.015);
        } else {
          mat.opacity = Math.max(0.1, mat.opacity - 0.01);
        }
        sprite.position.set(
          nodePos[i * 3],
          nodePos[i * 3 + 1] + 0.07,
          nodePos[i * 3 + 2],
        );
      });
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0008;
      groupRef.current.rotation.x += 0.0003;
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments ref={linesRef} geometry={connectionGeometry}>
        <lineBasicMaterial vertexColors transparent opacity={0.15} />
      </lineSegments>
      <points ref={nodesRef} geometry={nodeGeometry}>
        <pointsMaterial
          color="#ffffff"
          size={0.018}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <group ref={spritesRef}>
        {sprites.map((s, i) => (
          <sprite key={i} position={s.position} scale={[0.1, 0.05, 1]}>
            <spriteMaterial
              map={createTextTexture(s.label)}
              transparent
              opacity={0.15}
              depthWrite={false}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

// FULL EU SPACE ACT - ALL 118 ARTICLES + ANNEXES
const ALL_ARTICLES = [
  "Art. 1 — Subject matter and scope",
  "Art. 2 — Definitions",
  "Art. 3 — Objectives",
  "Art. 4 — Authorization of space activities",
  "Art. 5 — Scope of authorization requirement",
  "Art. 6 — Competent national authority",
  "Art. 7 — Application for authorization",
  "Art. 8 — Conditions for authorization",
  "Art. 9 — Obligations of operators",
  "Art. 10 — Transfer of authorization",
  "Art. 11 — Modification of activities",
  "Art. 12 — Supervision and monitoring",
  "Art. 13 — Suspension of authorization",
  "Art. 14 — Revocation of authorization",
  "Art. 15 — Simplified regime for low-risk missions",
  "Art. 16 — Notification procedure",
  "Art. 17 — Registration requirements",
  "Art. 18 — Space debris mitigation",
  "Art. 19 — End-of-life disposal",
  "Art. 20 — Collision avoidance",
  "Art. 21 — Trackability requirements",
  "Art. 22 — Notification of space objects",
  "Art. 23 — Long-term sustainability",
  "Art. 24 — Active debris removal",
  "Art. 25 — On-orbit servicing",
  "Art. 26 — Space situational awareness",
  "Art. 27 — Cybersecurity requirements",
  "Art. 28 — Supply chain security",
  "Art. 29 — Incident reporting",
  "Art. 30 — Vulnerability management",
  "Art. 31 — Space data governance",
  "Art. 32 — Data sharing obligations",
  "Art. 33 — Encryption standards",
  "Art. 34 — Ground segment security",
  "Art. 35 — Frequency management",
  "Art. 36 — Interference protection",
  "Art. 37 — Spectrum efficiency",
  "Art. 38 — Environmental footprint declaration",
  "Art. 39 — Life-cycle assessment",
  "Art. 40 — Light pollution mitigation",
  "Art. 41 — Atmospheric impact assessment",
  "Art. 42 — Sustainable design principles",
  "Art. 43 — Passivation requirements",
  "Art. 44 — Financial responsibility",
  "Art. 45 — Insurance and financial guarantees",
  "Art. 46 — Minimum coverage amounts",
  "Art. 47 — Third-party damage compensation",
  "Art. 48 — Liability framework",
  "Art. 49 — Joint and several liability",
  "Art. 50 — State liability backstop",
  "Art. 51 — Claims procedure",
  "Art. 52 — Spectrum coordination",
  "Art. 53 — ITU notification duties",
  "Art. 54 — Orbital slot management",
  "Art. 55 — International coordination",
  "Art. 56 — Bilateral agreements",
  "Art. 57 — UN treaty compliance",
  "Art. 58 — Third-country operators",
  "Art. 59 — Mutual recognition",
  "Art. 60 — Export control compliance",
  "Art. 61 — National space registries",
  "Art. 62 — European space registry",
  "Art. 63 — Information sharing between states",
  "Art. 64 — Public access to registry",
  "Art. 65 — Supervisory powers",
  "Art. 66 — Inspection rights",
  "Art. 67 — Penalties and enforcement",
  "Art. 68 — Administrative fines",
  "Art. 69 — Proportionality of sanctions",
  "Art. 70 — Appeal procedures",
  "Art. 71 — Fees and charges",
  "Art. 72 — Delegated acts",
  "Art. 73 — Implementing acts",
  "Art. 74 — Review and evaluation",
  "Art. 75 — Transitional provisions",
  "Art. 76 — Existing operators",
  "Art. 77 — Grace period",
  "Art. 78 — Constellation provisions",
  "Art. 79 — Mega-constellation requirements",
  "Art. 80 — Small satellite provisions",
  "Art. 81 — Technology demonstration missions",
  "Art. 82 — Scientific missions exemptions",
  "Art. 83 — Military and dual-use exclusions",
  "Art. 84 — Emergency provisions",
  "Art. 85 — Force majeure",
  "Art. 86 — SSA data requirements",
  "Art. 87 — Conjunction assessment",
  "Art. 88 — Space traffic management",
  "Art. 89 — Right of way rules",
  "Art. 90 — Priority mechanisms",
  "Art. 91 — Launch state obligations",
  "Art. 92 — Spaceport regulations",
  "Art. 93 — Launch safety requirements",
  "Art. 94 — Re-entry authorization",
  "Art. 95 — Casualty risk assessment",
  "Art. 96 — Recovery operations",
  "Art. 97 — Innovation sandboxes",
  "Art. 98 — Regulatory experimentation",
  "Art. 99 — Emerging technology provisions",
  "Art. 100 — In-space manufacturing",
  "Art. 101 — Space resource utilization",
  "Art. 102 — Interoperability standards",
  "Art. 103 — Technical standards body",
  "Art. 104 — Standardization mandate",
  "Art. 105 — European Space Agency coordination",
  "Art. 106 — EUSPA role and tasks",
  "Art. 107 — Committee procedure",
  "Art. 108 — Stakeholder consultation",
  "Art. 109 — Industry advisory group",
  "Art. 110 — Annual reporting",
  "Art. 111 — Statistics and data collection",
  "Art. 112 — Confidentiality",
  "Art. 113 — Personal data protection",
  "Art. 114 — Relationship with other EU law",
  "Art. 115 — Amendment of existing regulations",
  "Art. 116 — Repeal provisions",
  "Art. 117 — Entry into force",
  "Art. 118 — Application date",
  "Annex I — Authorization application form",
  "Annex II — Environmental impact categories",
  "Annex III — Debris mitigation plan template",
  "Annex IV — Technical standards reference",
  "Annex V — Insurance coverage matrix",
  "Annex VI — Fee schedule",
];

const TENDRIL_VERBS = [
  "Processing",
  "Mapping",
  "Analyzing",
  "Indexing",
  "Classifying",
  "Evaluating",
  "Parsing",
  "Resolving",
];

const TENDRIL_COUNT = 4;
const PARTICLES_PER_TENDRIL = 25;

interface TendrilState {
  active: boolean;
  phase: "extending" | "text_fadein" | "holding" | "retracting" | "waiting";
  progress: number;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  articleIndex: number;
  verbIndex: number;
  phaseTime: number;
  textOpacity: number;
  edgeIndex: number;
}

// FIXED canvas size for ALL labels - consistent appearance
function createLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 1024, 128);

  ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
  ctx.shadowBlur = 15;
  ctx.fillStyle = "white";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 20, 64);
  ctx.fillText(text, 20, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function DataTendrils() {
  const groupRef = useRef<THREE.Group>(null);
  const tendrilsRef = useRef<TendrilState[]>([]);
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const spritesRef = useRef<THREE.Group>(null);
  const globalArticleIndex = useRef(0);
  const globalVerbIndex = useRef(0);
  const lastSpawnTime = useRef(0);
  const texturesRef = useRef<THREE.CanvasTexture[]>([]);

  // Initialize tendrils
  useMemo(() => {
    tendrilsRef.current = [];
    texturesRef.current = [];
    for (let i = 0; i < TENDRIL_COUNT; i++) {
      const edgeIndex = (i * 3) % 12; // Distribute across edges
      const edge = CUBE_EDGES[edgeIndex];
      const t = 0.3 + Math.random() * 0.4;
      const startX = (edge[0][0] + (edge[1][0] - edge[0][0]) * t) * HALF;
      const startY = (edge[0][1] + (edge[1][1] - edge[0][1]) * t) * HALF;
      const startZ = (edge[0][2] + (edge[1][2] - edge[0][2]) * t) * HALF;
      const startPoint = new THREE.Vector3(startX, startY, startZ);
      const direction = startPoint.clone().normalize();
      const length = 2.2 + Math.random() * 0.6;
      const endPoint = startPoint.clone().add(direction.multiplyScalar(length));

      const articleIndex = i;
      const verbIndex = i % TENDRIL_VERBS.length;
      const text = `${TENDRIL_VERBS[verbIndex]}: ${ALL_ARTICLES[articleIndex]}`;
      texturesRef.current.push(createLabelTexture(text));

      tendrilsRef.current.push({
        active: i === 0,
        phase: i === 0 ? "extending" : "waiting",
        progress: 0,
        startPoint,
        endPoint,
        articleIndex,
        verbIndex,
        phaseTime: i * -0.4, // Stagger initial start
        textOpacity: 0,
        edgeIndex,
      });
    }
    globalArticleIndex.current = TENDRIL_COUNT;
    globalVerbIndex.current = TENDRIL_COUNT % TENDRIL_VERBS.length;
  }, []);

  const { pointsGeometry, linesGeometry } = useMemo(() => {
    const totalPoints = TENDRIL_COUNT * PARTICLES_PER_TENDRIL;
    const pointPositions = new Float32Array(totalPoints * 3);
    const linePositions = new Float32Array(
      TENDRIL_COUNT * (PARTICLES_PER_TENDRIL - 1) * 6,
    );

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));

    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

    return { pointsGeometry: pGeo, linesGeometry: lGeo };
  }, []);

  useFrame(({ clock }, delta) => {
    if (
      !pointsRef.current ||
      !linesRef.current ||
      !groupRef.current ||
      !spritesRef.current
    )
      return;

    const time = clock.elapsedTime;
    const positions = pointsRef.current.geometry.attributes.position
      .array as Float32Array;
    const linePositions = linesRef.current.geometry.attributes.position
      .array as Float32Array;

    // Spawn new tendril every 1.2s
    if (time - lastSpawnTime.current > 1.2) {
      lastSpawnTime.current = time;
      // Find a waiting tendril
      const waitingIdx = tendrilsRef.current.findIndex(
        (t) => t.phase === "waiting" && t.phaseTime > 0.5,
      );
      if (waitingIdx !== -1) {
        const tendril = tendrilsRef.current[waitingIdx];
        tendril.phase = "extending";
        tendril.progress = 0;
        tendril.phaseTime = 0;
        tendril.active = true;
        tendril.textOpacity = 0;

        // Pick different edge
        let newEdge;
        const usedEdges = tendrilsRef.current
          .filter((t) => t.active)
          .map((t) => t.edgeIndex);
        do {
          newEdge = Math.floor(Math.random() * 12);
        } while (usedEdges.includes(newEdge) && usedEdges.length < 12);
        tendril.edgeIndex = newEdge;

        const edge = CUBE_EDGES[newEdge];
        const t = 0.3 + Math.random() * 0.4;
        tendril.startPoint.set(
          (edge[0][0] + (edge[1][0] - edge[0][0]) * t) * HALF,
          (edge[0][1] + (edge[1][1] - edge[0][1]) * t) * HALF,
          (edge[0][2] + (edge[1][2] - edge[0][2]) * t) * HALF,
        );
        const direction = tendril.startPoint.clone().normalize();
        tendril.endPoint
          .copy(tendril.startPoint)
          .add(direction.multiplyScalar(2.2 + Math.random() * 0.6));

        tendril.articleIndex = globalArticleIndex.current;
        tendril.verbIndex = globalVerbIndex.current;
        globalArticleIndex.current =
          (globalArticleIndex.current + 1) % ALL_ARTICLES.length;
        globalVerbIndex.current =
          (globalVerbIndex.current + 1) % TENDRIL_VERBS.length;

        // Update texture
        const text = `${TENDRIL_VERBS[tendril.verbIndex]}: ${ALL_ARTICLES[tendril.articleIndex]}`;
        texturesRef.current[waitingIdx] = createLabelTexture(text);
        const sprite = spritesRef.current.children[waitingIdx] as THREE.Sprite;
        if (sprite) {
          (sprite.material as THREE.SpriteMaterial).map =
            texturesRef.current[waitingIdx];
          (sprite.material as THREE.SpriteMaterial).needsUpdate = true;
        }
      }
    }

    tendrilsRef.current.forEach((tendril, tIdx) => {
      tendril.phaseTime += delta;

      // FASTER lifecycle: extend 0.8s → text → hold 2.5s → retract 0.6s
      if (tendril.phase === "waiting") {
        // Wait handled by spawn logic above
      } else if (tendril.phase === "extending") {
        tendril.progress += delta / 0.8;
        if (tendril.progress >= 1) {
          tendril.progress = 1;
          tendril.phase = "text_fadein";
          tendril.phaseTime = 0;
        }
      } else if (tendril.phase === "text_fadein") {
        tendril.textOpacity = Math.min(0.6, tendril.textOpacity + delta / 0.2);
        if (tendril.phaseTime > 0.2) {
          tendril.phase = "holding";
          tendril.phaseTime = 0;
          tendril.textOpacity = 0.6;
        }
      } else if (tendril.phase === "holding") {
        tendril.textOpacity = 0.6;
        if (tendril.phaseTime > 2.5) {
          tendril.phase = "retracting";
          tendril.phaseTime = 0;
        }
      } else if (tendril.phase === "retracting") {
        tendril.progress -= delta / 0.6;
        tendril.textOpacity = Math.max(0, 0.6 * tendril.progress);
        if (tendril.progress <= 0) {
          tendril.progress = 0;
          tendril.phase = "waiting";
          tendril.phaseTime = 0;
          tendril.active = false;
          tendril.textOpacity = 0;
        }
      }

      // Update particles - STRAIGHT LINE
      const baseIdx = tIdx * PARTICLES_PER_TENDRIL;
      for (let p = 0; p < PARTICLES_PER_TENDRIL; p++) {
        const pProgress = (p / (PARTICLES_PER_TENDRIL - 1)) * tendril.progress;
        const idx = (baseIdx + p) * 3;

        if (tendril.active && tendril.progress > 0) {
          positions[idx] =
            tendril.startPoint.x +
            (tendril.endPoint.x - tendril.startPoint.x) * pProgress;
          positions[idx + 1] =
            tendril.startPoint.y +
            (tendril.endPoint.y - tendril.startPoint.y) * pProgress;
          positions[idx + 2] =
            tendril.startPoint.z +
            (tendril.endPoint.z - tendril.startPoint.z) * pProgress;
        } else {
          positions[idx] = 0;
          positions[idx + 1] = 0;
          positions[idx + 2] = 0;
        }
      }

      // Update lines - STRAIGHT
      const lineBase = tIdx * (PARTICLES_PER_TENDRIL - 1) * 6;
      for (let p = 0; p < PARTICLES_PER_TENDRIL - 1; p++) {
        const lineIdx = lineBase + p * 6;
        const p1Idx = (baseIdx + p) * 3;
        const p2Idx = (baseIdx + p + 1) * 3;

        linePositions[lineIdx] = positions[p1Idx];
        linePositions[lineIdx + 1] = positions[p1Idx + 1];
        linePositions[lineIdx + 2] = positions[p1Idx + 2];
        linePositions[lineIdx + 3] = positions[p2Idx];
        linePositions[lineIdx + 4] = positions[p2Idx + 1];
        linePositions[lineIdx + 5] = positions[p2Idx + 2];
      }

      // Update sprite
      if (!spritesRef.current) return;
      const sprite = spritesRef.current.children[tIdx] as THREE.Sprite;
      if (sprite) {
        const tipX =
          tendril.startPoint.x +
          (tendril.endPoint.x - tendril.startPoint.x) * tendril.progress;
        const tipY =
          tendril.startPoint.y +
          (tendril.endPoint.y - tendril.startPoint.y) * tendril.progress;
        const tipZ =
          tendril.startPoint.z +
          (tendril.endPoint.z - tendril.startPoint.z) * tendril.progress;
        const dir = tendril.endPoint
          .clone()
          .sub(tendril.startPoint)
          .normalize();
        sprite.position.set(
          tipX + dir.x * 0.3,
          tipY + dir.y * 0.3,
          tipZ + dir.z * 0.3,
        );
        (sprite.material as THREE.SpriteMaterial).opacity = tendril.textOpacity;
      }
    });

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    linesRef.current.geometry.attributes.position.needsUpdate = true;

    groupRef.current.rotation.y += 0.0008;
    groupRef.current.rotation.x += 0.0003;
  });

  return (
    <group ref={groupRef}>
      <points ref={pointsRef} geometry={pointsGeometry}>
        <pointsMaterial
          color="#ffffff"
          size={0.018}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
      <lineSegments ref={linesRef} geometry={linesGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.4} />
      </lineSegments>
      <group ref={spritesRef}>
        {Array.from({ length: TENDRIL_COUNT }, (_, i) => (
          <sprite key={i} scale={[2.5, 0.3, 1]}>
            <spriteMaterial
              map={texturesRef.current[i]}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight
        position={[0, 0, 0]}
        intensity={0.8}
        color="#8B9FFF"
        distance={6}
      />

      <OuterCube />
      <InnerCube />
      <CoreCube />
      <VolumeParticles />
      <EdgeStreams />
      <DataNetwork />
      <DataTendrils />
    </>
  );
}

export default function EntityScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 2.5,
      }}
      style={{ background: "transparent" }}
    >
      <Scene />
    </Canvas>
  );
}
