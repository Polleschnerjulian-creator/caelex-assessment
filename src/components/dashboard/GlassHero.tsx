"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function createNoiseTexture(size = 256): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const v = Math.random() * 255;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

function createBackgroundTexture(
  width: number,
  height: number,
): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;

      // Match --glass-bg-gradient: navy at center-left fading to near-black
      const dx = nx - 0.2;
      const dy = ny - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const grad = Math.max(0, 1 - dist * 1.4);

      // Cyan accent glow at top-right
      const cx = nx - 0.8;
      const cy = ny - 0.15;
      const cyanDist = Math.sqrt(cx * cx + cy * cy);
      const cyan = Math.max(0, 1 - cyanDist * 2) * 0.025;

      // Purple glow at bottom-center
      const px = nx - 0.5;
      const py = ny - 0.9;
      const purpDist = Math.sqrt(px * px + py * py);
      const purp = Math.max(0, 1 - purpDist * 2) * 0.012;

      const baseR = 6 + grad * 9;
      const baseG = 8 + grad * 15;
      const baseB = 15 + grad * 27;

      data[i] = Math.min(255, baseR + cyan * 56 * 255 + purp * 99);
      data[i + 1] = Math.min(255, baseG + cyan * 189 * 255 + purp * 50);
      data[i + 2] = Math.min(255, baseB + cyan * 248 * 255 + purp * 180);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

const VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

const FRAG = `
uniform sampler2D uSceneTexture;
uniform sampler2D uNoiseTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uRefractionStrength;
uniform float uFresnelBias;
uniform float uFresnelScale;
uniform float uFresnelPower;
uniform float uChromaticAberration;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform vec2 uMouse;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

float fresnel(vec3 viewDir, vec3 normal) {
  return uFresnelBias + uFresnelScale * pow(1.0 - dot(viewDir, normal), uFresnelPower);
}

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec2 screenUv = gl_FragCoord.xy / uResolution;

  vec2 noiseUv = vUv * uNoiseScale + vec2(uTime * uNoiseSpeed * 0.1);
  vec3 noiseVal = texture2D(uNoiseTexture, noiseUv).rgb;
  vec2 noiseOffset = (noiseVal.rg - 0.5) * 0.005;

  vec2 refractOffset = vNormal.xy * uRefractionStrength + noiseOffset;
  vec2 mouseInfluence = (uMouse - 0.5) * 0.003;
  refractOffset += mouseInfluence;

  float aberration = uChromaticAberration;
  float r = texture2D(uSceneTexture, screenUv + refractOffset * (1.0 + aberration)).r;
  float g = texture2D(uSceneTexture, screenUv + refractOffset).g;
  float b = texture2D(uSceneTexture, screenUv + refractOffset * (1.0 - aberration)).b;
  vec3 refractedColor = vec3(r, g, b);

  float f = fresnel(viewDir, vNormal);
  vec3 edgeGlow = vec3(0.38, 0.74, 0.97) * f * 0.15;

  vec3 glassTint = vec3(1.0) * 0.02;
  vec3 finalColor = refractedColor + glassTint + edgeGlow;

  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  float specular = pow(max(dot(reflect(-lightDir, vNormal), viewDir), 0.0), 32.0);
  finalColor += specular * 0.08;

  gl_FragColor = vec4(finalColor, 0.92);
}
`;

export default function GlassHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Feature detection
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const el = containerRef.current;
    const rect = el.getBoundingClientRect();

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const cvs = renderer.domElement;
    cvs.style.position = "absolute";
    cvs.style.inset = "0";
    cvs.style.zIndex = "0";
    cvs.style.borderRadius = "inherit";
    cvs.style.pointerEvents = "none";
    el.style.position = "relative";
    el.prepend(cvs);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const bgTex = createBackgroundTexture(512, 512);
    const noiseTex = createNoiseTexture(256);

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uSceneTexture: { value: bgTex },
        uNoiseTexture: { value: noiseTex },
        uResolution: { value: new THREE.Vector2(rect.width, rect.height) },
        uTime: { value: 0 },
        uRefractionStrength: { value: 0.03 },
        uFresnelBias: { value: 0.1 },
        uFresnelScale: { value: 1.0 },
        uFresnelPower: { value: 2.0 },
        uChromaticAberration: { value: 0.003 },
        uNoiseScale: { value: 0.5 },
        uNoiseSpeed: { value: 0.3 },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let animId: number;
    function animate() {
      material.uniforms.uTime.value = performance.now() * 0.001;
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    }
    animate();

    const onMouseMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      material.uniforms.uMouse.value.set(
        (e.clientX - r.left) / r.width,
        1.0 - (e.clientY - r.top) / r.height,
      );
    };
    el.addEventListener("mousemove", onMouseMove, { passive: true });

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
    });
    ro.observe(el);

    return () => {
      cancelAnimationFrame(animId);
      el.removeEventListener("mousemove", onMouseMove);
      ro.disconnect();
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      bgTex.dispose();
      noiseTex.dispose();
      cvs.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="glass"
      style={{
        borderRadius: "var(--glass-radius-lg)",
        minHeight: 80,
        marginBottom: 24,
      }}
    />
  );
}
