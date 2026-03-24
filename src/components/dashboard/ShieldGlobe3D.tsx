"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ShieldGlobe3D() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      el.clientWidth / el.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0.15, 2.8);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Orbit controls ──
    const orbit = {
      rotX: 0.15,
      rotY: -0.3,
      targetRotX: 0.15,
      targetRotY: -0.3,
      isDragging: false,
      prevX: 0,
      prevY: 0,
      autoSpeed: 0.0003,
      damping: 0.05,
      zoom: 2.8,
      targetZoom: 2.8,
    };

    const onMouseDown = (e: MouseEvent) => {
      orbit.isDragging = true;
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
    };
    const onMouseUp = () => {
      orbit.isDragging = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!orbit.isDragging) return;
      orbit.targetRotY += (e.clientX - orbit.prevX) * 0.004;
      orbit.targetRotX += (e.clientY - orbit.prevY) * 0.004;
      orbit.targetRotX = Math.max(-1.3, Math.min(1.3, orbit.targetRotX));
      orbit.prevX = e.clientX;
      orbit.prevY = e.clientY;
    };
    const onWheel = (e: WheelEvent) => {
      orbit.targetZoom += e.deltaY * 0.0008;
      orbit.targetZoom = Math.max(1.8, Math.min(5, orbit.targetZoom));
      e.preventDefault();
    };

    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Touch support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        orbit.isDragging = true;
        orbit.prevX = e.touches[0].clientX;
        orbit.prevY = e.touches[0].clientY;
      }
    };
    const onTouchEnd = () => {
      orbit.isDragging = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!orbit.isDragging || e.touches.length !== 1) return;
      orbit.targetRotY += (e.touches[0].clientX - orbit.prevX) * 0.004;
      orbit.targetRotX += (e.touches[0].clientY - orbit.prevY) * 0.004;
      orbit.targetRotX = Math.max(-1.3, Math.min(1.3, orbit.targetRotX));
      orbit.prevX = e.touches[0].clientX;
      orbit.prevY = e.touches[0].clientY;
    };

    renderer.domElement.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchmove", onTouchMove);

    // ── Earth — dark cinematic look with cyan city lights ──
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    const dayMap = textureLoader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg",
    );
    dayMap.anisotropy = 16;

    // Load night lights texture for cyan glow
    const nightMap = textureLoader.load(
      "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
    );
    nightMap.anisotropy = 16;

    const earthVert = `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const earthFrag = `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;

      void main() {
        vec3 day = texture2D(dayMap, vUv).rgb;
        vec3 night = texture2D(nightMap, vUv).rgb;

        // Convert day texture to dark desaturated base
        float lum = dot(day, vec3(0.299, 0.587, 0.114));
        // Dark teal-tinted land, very dark ocean
        vec3 darkBase = vec3(lum * 0.15, lum * 0.2, lum * 0.25);

        // City lights in cyan/teal
        float lightIntensity = dot(night, vec3(0.299, 0.587, 0.114));
        vec3 cityGlow = vec3(0.1, 0.7, 0.9) * lightIntensity * 1.5;

        // Fresnel edge glow (atmosphere)
        vec3 viewDir = normalize(-vPosition);
        float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
        vec3 atmosphere = vec3(0.15, 0.4, 0.55) * fresnel * 0.6;

        vec3 finalColor = darkBase + cityGlow + atmosphere;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 200, 200),
      new THREE.ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
        },
      }),
    );
    scene.add(earth);

    // ── Grid overlay ──
    const gridGroup = new THREE.Group();
    const gridMat = (opacity: number) =>
      new THREE.LineBasicMaterial({
        color: 0x8aafbf,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

    [-66.5, -45, -23.5, 0, 23.5, 45, 66.5].forEach((lat) => {
      const r = Math.cos((lat * Math.PI) / 180) * 1.002;
      const y = Math.sin((lat * Math.PI) / 180) * 1.002;
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) {
        const a = (i / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      gridGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          gridMat(lat === 0 ? 0.08 : 0.035),
        ),
      );
    });

    for (let lon = 0; lon < 360; lon += 30) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 256; i++) {
        const latA = (i / 256) * Math.PI - Math.PI / 2;
        pts.push(
          new THREE.Vector3(
            Math.cos(latA) * Math.cos((lon * Math.PI) / 180) * 1.002,
            Math.sin(latA) * 1.002,
            Math.cos(latA) * Math.sin((lon * Math.PI) / 180) * 1.002,
          ),
        );
      }
      gridGroup.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          gridMat(0.035),
        ),
      );
    }
    scene.add(gridGroup);

    // ── Scan line ──
    const scanPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const lat = (i / 128) * Math.PI - Math.PI / 2;
      scanPts.push(
        new THREE.Vector3(Math.cos(lat) * 1.003, Math.sin(lat) * 1.003, 0),
      );
    }
    const scanLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(scanPts),
      new THREE.LineBasicMaterial({
        color: 0x5a9aaa,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    scene.add(scanLine);

    // ── Stars ──
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 80;
      sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
      sp[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      sp[i * 3 + 2] = r * Math.cos(ph);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({
          color: 0x667788,
          size: 0.04,
          transparent: true,
          opacity: 0.35,
          sizeAttenuation: true,
        }),
      ),
    );

    // ── Animate ──
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      if (!orbit.isDragging) orbit.targetRotY += orbit.autoSpeed;
      orbit.rotX += (orbit.targetRotX - orbit.rotX) * orbit.damping;
      orbit.rotY += (orbit.targetRotY - orbit.rotY) * orbit.damping;
      orbit.zoom += (orbit.targetZoom - orbit.zoom) * orbit.damping;
      camera.position.x =
        orbit.zoom * Math.sin(orbit.rotY) * Math.cos(orbit.rotX);
      camera.position.y = orbit.zoom * Math.sin(orbit.rotX);
      camera.position.z =
        orbit.zoom * Math.cos(orbit.rotY) * Math.cos(orbit.rotX);
      camera.lookAt(0, 0, 0);
      scanLine.rotation.y += 0.002;
      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(el);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchmove", onTouchMove);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: "grab" }}
    />
  );
}
