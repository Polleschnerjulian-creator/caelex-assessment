"use client";

import { useEffect, useRef } from "react";
import type * as THREE_TYPES from "three";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrbitalTwinGlobeProps {
  fleet: Array<{
    noradId: string;
    satelliteName: string;
    operatorType?: string;
    overallScore: number;
    altitudeKm?: number;
    activeAlerts: Array<{ severity: string }>;
  }>;
  onEntityClick?: (noradId: string) => void;
}

// ─── Score → Color ───────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#30E8A0";
  if (score >= 60) return "#E8A838";
  if (score >= 40) return "#E89038";
  return "#E84848";
}

// ─── Operator type labels ────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SCO: "Spacecraft Operator",
  LO: "Launch Operator",
  LSO: "Launch Service Operator",
  ISOS: "In-orbit Service Operator",
  CAP: "Capability Provider",
  PDP: "Payload Data Provider",
  TCO: "TT&C Operator",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrbitalTwinGlobe({
  fleet,
  onEntityClick,
}: OrbitalTwinGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const fleetRef = useRef(fleet);
  const onEntityClickRef = useRef(onEntityClick);

  // Keep refs up to date without re-creating the scene
  useEffect(() => {
    fleetRef.current = fleet;
  }, [fleet]);
  useEffect(() => {
    onEntityClickRef.current = onEntityClick;
  }, [onEntityClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    let disposed = false;
    let animId = 0;

    import("three").then((THREE) => {
      if (disposed) return;

      // ═══════════════════════════════════════════════════════════════════════
      // MASK IMAGE → isLand
      // ═══════════════════════════════════════════════════════════════════════
      const mi = new Image();
      mi.crossOrigin = "anonymous";
      mi.onload = () => {
        if (disposed) return;
        const cv = document.createElement("canvas");
        cv.width = mi.width;
        cv.height = mi.height;
        const cx = cv.getContext("2d")!;
        cx.drawImage(mi, 0, 0);
        const id = cx.getImageData(0, 0, cv.width, cv.height).data;
        function isLand(la: number, lo: number): boolean {
          const x = Math.floor(((lo + 180) / 360) * cv.width);
          const y = Math.floor(((90 - la) / 180) * cv.height);
          if (x < 0 || x >= cv.width || y < 0 || y >= cv.height) return false;
          return id[(y * cv.width + x) * 4] > 128;
        }
        initGlobe(isLand);
      };
      mi.src = "/images/earth-land-mask.png";

      // ═══════════════════════════════════════════════════════════════════════
      // INIT GLOBE
      // ═══════════════════════════════════════════════════════════════════════
      function initGlobe(isLand: (la: number, lo: number) => boolean) {
        if (disposed) return;

        const R = 5.5;

        // ─── Scene, Camera, Renderer ─────────────────────────────────
        const scene = new THREE.Scene();
        const w = container.clientWidth;
        const h = container.clientHeight;
        const cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 1000);
        const ren = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        ren.setSize(w, h);
        ren.setPixelRatio(Math.min(devicePixelRatio, 2));
        ren.setClearColor(0x030810);
        container.appendChild(ren.domElement);
        ren.domElement.style.borderRadius = "16px";

        // ─── Helper: lat/lon → Vector3 ──────────────────────────────
        function ll(la: number, lo: number, r: number): THREE_TYPES.Vector3 {
          const p = ((90 - la) * Math.PI) / 180;
          const t = ((lo + 180) * Math.PI) / 180;
          return new THREE.Vector3(
            -r * Math.sin(p) * Math.cos(t),
            r * Math.cos(p),
            r * Math.sin(p) * Math.sin(t),
          );
        }

        // ─── Earth Body ─────────────────────────────────────────────
        const earthGeo = new THREE.SphereGeometry(R, 128, 128);
        const earthMat = new THREE.MeshPhongMaterial({
          color: 0x030a12,
          emissive: 0x010406,
          shininess: 4,
        });
        scene.add(new THREE.Mesh(earthGeo, earthMat));

        // ─── Grid Lines ─────────────────────────────────────────────
        const gM = new THREE.LineBasicMaterial({
          color: 0x20c888,
          transparent: true,
          opacity: 0.045,
        });
        const gF = new THREE.LineBasicMaterial({
          color: 0x20c888,
          transparent: true,
          opacity: 0.02,
        });
        for (let la = -45; la <= 45; la += 15) {
          const p: THREE_TYPES.Vector3[] = [];
          for (let lo = 0; lo <= 360; lo += 1) p.push(ll(la, lo, R + 0.005));
          scene.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(p),
              la % 30 === 0 ? gM : gF,
            ),
          );
        }
        for (let lo = 0; lo < 360; lo += 15) {
          const p: THREE_TYPES.Vector3[] = [];
          for (let la = -65; la <= 65; la += 1) p.push(ll(la, lo, R + 0.005));
          scene.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(p),
              lo % 30 === 0 ? gM : gF,
            ),
          );
        }
        // Equator
        const eP: THREE_TYPES.Vector3[] = [];
        for (let lo = 0; lo <= 360; lo += 0.5) eP.push(ll(0, lo, R + 0.008));
        scene.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(eP),
            new THREE.LineBasicMaterial({
              color: 0x20c888,
              transparent: true,
              opacity: 0.07,
            }),
          ),
        );

        // ═══ CONTINENT DOTS ═══
        const d1: number[] = [];
        const d2: number[] = [];
        const d3: number[] = [];
        const d4: number[] = [];
        for (let lat = -85; lat <= 85; lat += 0.3) {
          const cosLat = Math.cos((lat * Math.PI) / 180);
          const lonStep = Math.max(0.3, 0.3 / Math.max(cosLat, 0.1));
          const rowJitter = (Math.random() - 0.5) * 0.25;
          for (let lon = -180; lon <= 180; lon += lonStep) {
            const sLat = lat + rowJitter + (Math.random() - 0.5) * 0.3;
            const sLon = lon + (Math.random() - 0.5) * lonStep * 0.8;
            if (!isLand(sLat, sLon)) continue;
            const jla = sLat + (Math.random() - 0.5) * 0.2;
            const jlo = sLon + (Math.random() - 0.5) * 0.2;
            const v1 = ll(jla, jlo, R + 0.008);
            d1.push(v1.x, v1.y, v1.z);
            if (Math.random() < 0.5) {
              const v1b = ll(
                sLat + (Math.random() - 0.5) * 0.3,
                sLon + (Math.random() - 0.5) * 0.3,
                R + 0.01,
              );
              d1.push(v1b.x, v1b.y, v1b.z);
            }
            if (Math.random() < 0.2) {
              const v2 = ll(
                sLat + (Math.random() - 0.5) * 0.15,
                sLon + (Math.random() - 0.5) * 0.15,
                R + 0.015,
              );
              d2.push(v2.x, v2.y, v2.z);
            }
            if (Math.random() < 0.05) {
              const v3 = ll(sLat, sLon, R + 0.02);
              d3.push(v3.x, v3.y, v3.z);
            }
            if (Math.random() < 0.008) {
              const v4 = ll(sLat, sLon, R + 0.025);
              d4.push(v4.x, v4.y, v4.z);
            }
          }
        }

        // Layer 1: dense green base
        const g1 = new THREE.BufferGeometry();
        g1.setAttribute("position", new THREE.Float32BufferAttribute(d1, 3));
        scene.add(
          new THREE.Points(
            g1,
            new THREE.PointsMaterial({
              color: 0x30d890,
              size: 0.022,
              transparent: true,
              opacity: 0.55,
              sizeAttenuation: true,
            }),
          ),
        );

        // Layer 2: brighter green
        const g2 = new THREE.BufferGeometry();
        g2.setAttribute("position", new THREE.Float32BufferAttribute(d2, 3));
        scene.add(
          new THREE.Points(
            g2,
            new THREE.PointsMaterial({
              color: 0x40f0a0,
              size: 0.038,
              transparent: true,
              opacity: 0.75,
              sizeAttenuation: true,
            }),
          ),
        );

        // Layer 3: bright glow
        const g3 = new THREE.BufferGeometry();
        g3.setAttribute("position", new THREE.Float32BufferAttribute(d3, 3));
        scene.add(
          new THREE.Points(
            g3,
            new THREE.PointsMaterial({
              color: 0x60ffbb,
              size: 0.055,
              transparent: true,
              opacity: 0.88,
              sizeAttenuation: true,
            }),
          ),
        );

        // Layer 4: super bright city dots
        const g4 = new THREE.BufferGeometry();
        g4.setAttribute("position", new THREE.Float32BufferAttribute(d4, 3));
        scene.add(
          new THREE.Points(
            g4,
            new THREE.PointsMaterial({
              color: 0x90ffd0,
              size: 0.075,
              transparent: true,
              opacity: 0.95,
              sizeAttenuation: true,
            }),
          ),
        );

        // ═══ ATMOSPHERE — green tinted ═══
        const avs = `varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
        function addA(
          r: number,
          pw: number,
          inten: number,
          side: THREE_TYPES.Side,
        ) {
          scene.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(r, 96, 96),
              new THREE.ShaderMaterial({
                vertexShader: avs,
                fragmentShader: `varying vec3 vN;void main(){float rim=1.-dot(vN,vec3(0,0,1));float i=pow(rim,${pw.toFixed(1)})*${inten.toFixed(3)};gl_FragColor=vec4(0.19,0.91,0.63,i);}`,
                blending: THREE.AdditiveBlending,
                side: side,
                transparent: true,
                depthWrite: false,
              }),
            ),
          );
        }
        addA(R + 0.04, 2.5, 0.6, THREE.FrontSide);
        addA(R + 0.12, 2.0, 0.35, THREE.FrontSide);
        addA(R + 0.5, 1.8, 0.18, THREE.BackSide);
        addA(R + 1.2, 1.5, 0.07, THREE.BackSide);

        // ═══ ORBITAL RINGS ═══
        function mkO(
          r: number,
          rx: number,
          ry: number,
          rz: number,
          n: number,
          sz: number,
          op: number,
        ) {
          const p: number[] = [];
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            p.push(r * Math.cos(a), 0, r * Math.sin(a));
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
          const m = new THREE.Points(
            g,
            new THREE.PointsMaterial({
              color: 0x30e8a0,
              size: sz,
              transparent: true,
              opacity: op,
              sizeAttenuation: true,
            }),
          );
          m.rotation.set(rx, ry, rz);
          scene.add(m);
        }
        mkO(R + 1.2, 0.35, 0, 0.1, 300, 0.016, 0.18);
        mkO(R + 1.6, -0.15, 0.5, 0, 350, 0.014, 0.14);
        mkO(R + 2.2, 0.5, -0.2, 0.15, 400, 0.014, 0.11);
        mkO(R + 2.9, -0.3, 0.3, -0.1, 400, 0.012, 0.09);
        mkO(R + 3.8, 0.1, 0, 0.05, 500, 0.011, 0.07);
        mkO(R + 4.8, -0.05, 0.2, 0, 550, 0.01, 0.05);
        mkO(R + 6.0, 0.25, -0.15, 0.08, 600, 0.009, 0.035);

        // ═══ SATELLITES FROM FLEET DATA ═══
        const sats: Array<{
          mesh: THREE_TYPES.Group;
          alt: number;
          inc: number;
          ph: number;
          spd: number;
          raan: number;
          label: HTMLDivElement;
          noradId: string;
          color: THREE_TYPES.Color;
        }> = [];
        const sG = new THREE.Group();
        scene.add(sG);

        // Label container
        const lbD = document.createElement("div");
        lbD.style.cssText =
          "position:absolute;inset:0;pointer-events:none;overflow:hidden";
        container.appendChild(lbD);

        // Connection lines
        const cMat = new THREE.LineBasicMaterial({
          color: 0xc8a832,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        const cns: Array<{
          line: THREE_TYPES.Line;
          i: number;
          j?: number;
          tgt?: boolean;
        }> = [];

        function hC(h: string): THREE_TYPES.Color {
          return new THREE.Color(
            parseInt(h.slice(1, 3), 16) / 255,
            parseInt(h.slice(3, 5), 16) / 255,
            parseInt(h.slice(5, 7), 16) / 255,
          );
        }

        function mkS(col: THREE_TYPES.Color): THREE_TYPES.Group {
          const g = new THREE.Group();
          g.add(
            new THREE.Mesh(
              new THREE.BoxGeometry(0.09, 0.09, 0.2),
              new THREE.MeshPhongMaterial({
                color: 0xcccccc,
                emissive: 0x444444,
                shininess: 80,
              }),
            ),
          );
          const pm = new THREE.MeshPhongMaterial({
            color: 0x1a3a5a,
            emissive: 0x0a1a2a,
          });
          const a = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.005, 0.12),
            pm,
          );
          a.position.x = 0.25;
          const b = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.005, 0.12),
            pm,
          );
          b.position.x = -0.25;
          g.add(a, b);
          g.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(0.1, 8, 8),
              new THREE.MeshBasicMaterial({
                color: col,
                transparent: true,
                opacity: 0.18,
                depthWrite: false,
              }),
            ),
          );
          return g;
        }

        function spawnSatellites() {
          // Clear existing
          sats.forEach((s) => {
            sG.remove(s.mesh);
            s.label.remove();
          });
          sats.length = 0;
          cns.forEach((c) => scene.remove(c.line));
          cns.length = 0;

          const currentFleet = fleetRef.current;

          currentFleet.forEach((entity, idx) => {
            const col = hC(scoreColor(entity.overallScore));
            // Altitude scaling: map altitudeKm to orbital radius
            // LEO ~200-2000km → R+1.2 to R+3.0
            // MEO ~2000-35786km → R+3.0 to R+5.0
            // GEO ~35786km → R+5.0+
            const altKm = entity.altitudeKm ?? 550;
            let alt: number;
            if (altKm <= 2000) {
              alt = R + 1.2 + (altKm / 2000) * 1.8;
            } else if (altKm <= 35786) {
              alt = R + 3.0 + ((altKm - 2000) / 33786) * 2.0;
            } else {
              alt = R + 5.0 + Math.min((altKm - 35786) / 10000, 1.0);
            }

            // Deterministic but varied orbital parameters based on noradId
            const seed = parseInt(entity.noradId || String(idx), 10) || idx;
            const inc = ((((seed * 137.5) % 360) - 180) * Math.PI) / 360;
            const ph = ((seed * 73.7) % 360) * (Math.PI / 180);
            const spd = 0.00015 + ((seed * 31.3) % 100) * 0.000005;
            const raan = ((seed * 53.1) % 360) * (Math.PI / 180);

            const m = mkS(col);
            sG.add(m);

            const l = document.createElement("div");
            l.style.cssText =
              "position:absolute;font-size:8px;letter-spacing:1.5px;color:rgba(255,255,255,0.3);white-space:nowrap;font-family:monospace;pointer-events:auto;cursor:pointer";
            l.textContent = entity.satelliteName.substring(0, 16).toUpperCase();
            l.addEventListener("click", () => {
              onEntityClickRef.current?.(entity.noradId);
            });
            lbD.appendChild(l);

            sats.push({
              mesh: m,
              alt,
              inc,
              ph,
              spd,
              raan,
              label: l,
              noradId: entity.noradId,
              color: col,
            });
          });

          // Rebuild connections
          for (let i = 0; i < sats.length; i++) {
            for (let j = i + 1; j < sats.length; j++) {
              if (Math.random() > 0.35) continue;
              const g = new THREE.BufferGeometry();
              g.setAttribute(
                "position",
                new THREE.BufferAttribute(new Float32Array(6), 3),
              );
              const l = new THREE.Line(g, cMat);
              scene.add(l);
              cns.push({ line: l, i, j });
            }
          }

          // Update HUD entity count
          const scEl = container.querySelector<HTMLElement>(
            "[data-entity-count]",
          );
          if (scEl) {
            scEl.textContent = sats.length + " ENTITIES";
          }
        }

        spawnSatellites();

        // ═══ STARS ═══
        const sP: number[] = [];
        for (let i = 0; i < 5000; i++) {
          const r = 60 + Math.random() * 160;
          const t = Math.random() * Math.PI * 2;
          const p = Math.acos(2 * Math.random() - 1);
          sP.push(
            r * Math.sin(p) * Math.cos(t),
            r * Math.sin(p) * Math.sin(t),
            r * Math.cos(p),
          );
        }
        const sg = new THREE.BufferGeometry();
        sg.setAttribute("position", new THREE.Float32BufferAttribute(sP, 3));
        scene.add(
          new THREE.Points(
            sg,
            new THREE.PointsMaterial({
              color: 0xffffff,
              size: 0.1,
              transparent: true,
              opacity: 0.3,
            }),
          ),
        );

        // ═══ LIGHTS ═══
        scene.add(new THREE.AmbientLight(0x1a3a2a, 0.5));
        const dl = new THREE.DirectionalLight(0x30e8a0, 0.4);
        dl.position.set(8, 6, 10);
        scene.add(dl);
        const d2l = new THREE.DirectionalLight(0x208060, 0.2);
        d2l.position.set(-6, -2, -8);
        scene.add(d2l);
        const d3l = new THREE.DirectionalLight(0x30e8a0, 0.25);
        d3l.position.set(-4, 8, -6);
        scene.add(d3l);

        // ═══ CONTROLS ═══
        let drag = false;
        let pmx = 0;
        let pmy = 0;
        let ryTarget = 0.3;
        let rxTarget = 0.15;
        let ry = 0.3;
        let rx = 0.15;
        let zmTarget = 18;
        let zm = 18;

        const onMouseDown = (e: MouseEvent) => {
          drag = true;
          pmx = e.clientX;
          pmy = e.clientY;
          container.style.cursor = "grabbing";
        };
        const onMouseUp = () => {
          drag = false;
          container.style.cursor = "grab";
        };
        const onMouseMove = (e: MouseEvent) => {
          if (!drag) return;
          ryTarget += (e.clientX - pmx) * 0.004;
          rxTarget = Math.max(
            -1.2,
            Math.min(1.2, rxTarget + (e.clientY - pmy) * 0.004),
          );
          pmx = e.clientX;
          pmy = e.clientY;
        };
        const onWheel = (e: WheelEvent) => {
          e.preventDefault();
          zmTarget = Math.max(10, Math.min(35, zmTarget + e.deltaY * 0.01));
        };
        const onTouchStart = (e: TouchEvent) => {
          if (e.touches.length === 1) {
            drag = true;
            pmx = e.touches[0].clientX;
            pmy = e.touches[0].clientY;
          }
        };
        const onTouchMove = (e: TouchEvent) => {
          if (!drag || e.touches.length !== 1) return;
          ryTarget += (e.touches[0].clientX - pmx) * 0.004;
          rxTarget = Math.max(
            -1.2,
            Math.min(1.2, rxTarget + (e.touches[0].clientY - pmy) * 0.004),
          );
          pmx = e.touches[0].clientX;
          pmy = e.touches[0].clientY;
        };
        const onTouchEnd = () => {
          drag = false;
        };

        ren.domElement.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mousemove", onMouseMove);
        ren.domElement.addEventListener("wheel", onWheel, { passive: false });
        ren.domElement.addEventListener("touchstart", onTouchStart);
        ren.domElement.addEventListener("touchmove", onTouchMove);
        ren.domElement.addEventListener("touchend", onTouchEnd);

        // ─── Screen projection helper ──────────────────────────────
        function scr(p: THREE_TYPES.Vector3): {
          x: number;
          y: number;
          z: number;
        } {
          const v = p.clone().project(cam);
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          return {
            x: (v.x * 0.5 + 0.5) * cw,
            y: (-v.y * 0.5 + 0.5) * ch,
            z: v.z,
          };
        }

        // ═══ ANIMATION LOOP ═══
        let t = 0;
        function anim() {
          if (disposed) return;
          animId = requestAnimationFrame(anim);
          t += 0.016;
          ryTarget += 0.0005; // Auto-rotate

          ry += (ryTarget - ry) * 0.05;
          rx += (rxTarget - rx) * 0.05;
          zm += (zmTarget - zm) * 0.05;

          cam.position.set(
            zm * Math.sin(ry) * Math.cos(rx),
            zm * Math.sin(rx),
            zm * Math.cos(ry) * Math.cos(rx),
          );
          cam.lookAt(0, 0, 0);

          // Animate satellites
          sats.forEach((s) => {
            s.ph += s.spd;
            const a = s.ph;
            const ic = s.inc;
            const ra = s.raan;
            const r = s.alt;
            s.mesh.position.set(
              r *
                (Math.cos(ra) * Math.cos(a) -
                  Math.sin(ra) * Math.sin(a) * Math.cos(ic)),
              r * Math.sin(a) * Math.sin(ic),
              r *
                (Math.sin(ra) * Math.cos(a) +
                  Math.cos(ra) * Math.sin(a) * Math.cos(ic)),
            );
            s.mesh.lookAt(0, 0, 0);

            const sc = scr(s.mesh.position);
            if (sc.z > 0 && sc.z < 1) {
              s.label.style.left = sc.x + 14 + "px";
              s.label.style.top = sc.y - 8 + "px";
              s.label.style.display = "block";
            } else {
              s.label.style.display = "none";
            }
          });

          // Update connection lines
          cns.forEach((c) => {
            const pa = (c.line.geometry as THREE_TYPES.BufferGeometry)
              .attributes.position.array as Float32Array;
            const p1 = sats[c.i]?.mesh.position;
            const p2 = c.j !== undefined ? sats[c.j]?.mesh.position : null;
            if (p1 && p2) {
              pa[0] = p1.x;
              pa[1] = p1.y;
              pa[2] = p1.z;
              pa[3] = p2.x;
              pa[4] = p2.y;
              pa[5] = p2.z;
            }
            (
              c.line.geometry as THREE_TYPES.BufferGeometry
            ).attributes.position.needsUpdate = true;
          });

          ren.render(scene, cam);
        }
        anim();

        // ═══ RESIZE OBSERVER ═══
        const ro = new ResizeObserver(() => {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          if (cw > 0 && ch > 0) {
            cam.aspect = cw / ch;
            cam.updateProjectionMatrix();
            ren.setSize(cw, ch);
          }
        });
        ro.observe(container);

        // ═══ RE-SPAWN ON FLEET CHANGE ═══
        // We use a MutationObserver-like pattern via an interval
        // that checks if fleet ref has changed
        let lastFleetLen = fleetRef.current.length;
        const fleetCheck = setInterval(() => {
          if (fleetRef.current.length !== lastFleetLen) {
            lastFleetLen = fleetRef.current.length;
            spawnSatellites();
          }
        }, 1000);

        // ═══ CLEANUP ═══
        cleanupRef.current = () => {
          disposed = true;
          cancelAnimationFrame(animId);
          clearInterval(fleetCheck);
          ro.disconnect();

          ren.domElement.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mouseup", onMouseUp);
          window.removeEventListener("mousemove", onMouseMove);
          ren.domElement.removeEventListener("wheel", onWheel);
          ren.domElement.removeEventListener("touchstart", onTouchStart);
          ren.domElement.removeEventListener("touchmove", onTouchMove);
          ren.domElement.removeEventListener("touchend", onTouchEnd);

          // Dispose Three.js objects
          scene.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.geometry?.dispose();
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m) => m.dispose());
              } else {
                obj.material?.dispose();
              }
            }
            if (obj instanceof THREE.Points) {
              obj.geometry?.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
            if (obj instanceof THREE.Line) {
              obj.geometry?.dispose();
              if (obj.material instanceof THREE.Material) {
                obj.material.dispose();
              }
            }
          });
          ren.dispose();

          // Remove DOM elements
          if (ren.domElement.parentNode) {
            ren.domElement.parentNode.removeChild(ren.domElement);
          }
          if (lbD.parentNode) {
            lbD.parentNode.removeChild(lbD);
          }
        };
      }
    });

    return () => {
      disposed = true;
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Build operator panel data ─────────────────────────────────────────────
  const grouped: Record<string, typeof fleet> = {};
  fleet.forEach((entity) => {
    const type = entity.operatorType ?? "SCO";
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(entity);
  });

  // Summary stats
  const nominalCount = fleet.filter((f) => f.overallScore >= 80).length;
  const watchCount = fleet.filter(
    (f) => f.overallScore >= 60 && f.overallScore < 80,
  ).length;
  const warningCount = fleet.filter(
    (f) => f.overallScore >= 40 && f.overallScore < 60,
  ).length;
  const criticalCount = fleet.filter((f) => f.overallScore < 40).length;
  const avgScore =
    fleet.length > 0
      ? Math.round(fleet.reduce((s, f) => s + f.overallScore, 0) / fleet.length)
      : 0;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 420,
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        cursor: "grab",
        background: "#030810",
      }}
    >
      {/* ─── Vignette ─────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,0.55)100%)",
          pointerEvents: "none",
          zIndex: 2,
          borderRadius: 16,
        }}
      />

      {/* ─── HUD: Top-Right — Entity Count ────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          textAlign: "right",
          fontSize: 10,
          letterSpacing: "1.5px",
          color: "rgba(255,255,255,0.25)",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "monospace",
        }}
      >
        <div>ENTITIES TRACKED</div>
        <div style={{ color: "#30E8A0" }} data-entity-count>
          {fleet.length} ENTITIES
        </div>
        <div style={{ marginTop: 6 }}>FLEET SCORE</div>
        <div style={{ color: "#30E8A0" }}>{avgScore}</div>
        <div style={{ marginTop: 6 }}>STATUS</div>
        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: "flex-end",
            marginTop: 2,
          }}
        >
          {nominalCount > 0 && (
            <span style={{ color: "#30E8A0", fontSize: 9 }}>
              {nominalCount} NOM
            </span>
          )}
          {watchCount > 0 && (
            <span style={{ color: "#E8A838", fontSize: 9 }}>
              {watchCount} WTC
            </span>
          )}
          {warningCount > 0 && (
            <span style={{ color: "#E89038", fontSize: 9 }}>
              {warningCount} WRN
            </span>
          )}
          {criticalCount > 0 && (
            <span style={{ color: "#E84848", fontSize: 9 }}>
              {criticalCount} CRT
            </span>
          )}
        </div>
      </div>

      {/* ─── HUD: Bottom-Left — Branding ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          fontSize: 9,
          letterSpacing: "3px",
          color: "rgba(48,232,160,0.3)",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "monospace",
        }}
      >
        <div style={{ fontFamily: "sans-serif", fontWeight: 500 }}>
          CAELEX &middot; EPHEMERIS &middot; v2.4
        </div>
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "1px",
            marginTop: 4,
          }}
        >
          {new Date().toISOString().replace(/\.\d+/, "")}
        </div>
      </div>

      {/* ─── Operator Panel — Right Side ──────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: 16,
          transform: "translateY(-50%)",
          zIndex: 10,
          pointerEvents: "auto",
          maxHeight: "60%",
          overflowY: "auto",
        }}
      >
        {Object.entries(grouped).map(([type, entities]) => (
          <div
            key={type}
            style={{
              width: 180,
              padding: "8px 12px",
              marginBottom: 3,
              background: "rgba(48,232,160,0.07)",
              border: "1px solid rgba(48,232,160,0.18)",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.3s",
              position: "relative",
              borderLeft: `2px solid ${scoreColor(
                Math.round(
                  entities.reduce((s, e) => s + e.overallScore, 0) /
                    entities.length,
                ),
              )}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: "0.5px",
                fontFamily: "sans-serif",
              }}
            >
              {TYPE_LABELS[type] ?? type}
            </div>
            <div
              style={{
                fontSize: 8,
                color: "rgba(255,255,255,0.25)",
                letterSpacing: "1px",
                marginTop: 2,
                fontFamily: "monospace",
              }}
            >
              {entities.length} ENTITIES
            </div>
            {/* Entity list */}
            <div style={{ marginTop: 6 }}>
              {entities.map((entity) => (
                <div
                  key={entity.noradId}
                  onClick={() => onEntityClick?.(entity.noradId)}
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.45)",
                    letterSpacing: "0.5px",
                    padding: "2px 0",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontFamily: "monospace",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: scoreColor(entity.overallScore),
                      boxShadow: `0 0 6px ${scoreColor(entity.overallScore)}`,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entity.satelliteName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Legend ────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          display: "flex",
          gap: 10,
          fontSize: 9,
          letterSpacing: "1px",
          color: "rgba(255,255,255,0.25)",
          zIndex: 10,
          pointerEvents: "none",
          fontFamily: "monospace",
        }}
      >
        {[
          { color: "#30E8A0", label: "NOM" },
          { color: "#E8A838", label: "WTC" },
          { color: "#E89038", label: "WRN" },
          { color: "#E84848", label: "CRT" },
        ].map((item) => (
          <span
            key={item.label}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: item.color,
                boxShadow: `0 0 4px ${item.color}`,
                display: "inline-block",
              }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
