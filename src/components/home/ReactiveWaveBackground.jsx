import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ReactiveWaveBackground({
  children,
  className = "",
  style = {},
  interactive = true,
  intensity = 1,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return undefined;

    let renderer;
    let animationFrame = 0;
    let resizeObserver;
    let intersectionObserver;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    let disposed = false;
    const isMobileDevice = window.matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const isStaticFrame = isMobileDevice || prefersReducedMotion;

    const pointer = new THREE.Vector2(0.5, 0.5);
    const pointerTarget = new THREE.Vector2(0.5, 0.5);
    const pointerVelocity = new THREE.Vector2(0, 0);
    const previousPointer = new THREE.Vector2(0.5, 0.5);
    let hasPointer = false;
    let lastPointerTime = 0;

    const vertexShader = /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;

      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform vec2 uVelocity;
      uniform float uTime;
      uniform float uIntensity;
      uniform float uPointerActive;

      varying vec2 vUv;

      vec3 sceneColor(vec2 p, float t) {
        float phase = p.x + t;
        float sine = sin(phase);
        float cosine = cos(phase);
        float phaseOffset = p.x * length(p) * 0.050;
        float offsetSquared = phaseOffset * phaseOffset;
        float sineOffset = phaseOffset * (1.0 - offsetSquared / 6.0);
        float cosineOffset = 1.0 - offsetSquared * 0.5;

        float baseWave = p.y + sine * 0.5;
        float redDistance = abs(baseWave + (sine * (cosineOffset - 1.0) + cosine * sineOffset) * 0.5);
        float greenDistance = abs(baseWave);
        float blueDistance = abs(baseWave + (sine * (cosineOffset - 1.0) - cosine * sineOffset) * 0.5);

        float red = 0.05 / max(redDistance, 0.001);
        float green = 0.05 / max(greenDistance, 0.001);
        float blue = 0.05 / max(blueDistance, 0.001);
        return min(vec3(red, green, blue), vec3(1.0));
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 p = (uv - 0.5) * vec2(2.0 * aspect, 2.0) / 1.2;

        float cursorGlow = 0.0;
        if (uPointerActive > 0.5) {
          vec2 mouse = (vec2(uMouse.x, 1.0 - uMouse.y) - 0.5) * vec2(2.0 * aspect, 2.0) / 1.2;
          vec2 fromMouse = p - mouse;
          float distanceSquared = dot(fromMouse, fromMouse);
          float inverseDistance = inversesqrt(max(distanceSquared, 0.000001));
          float mouseDistance = distanceSquared * inverseDistance;
          float cursorField = exp(-mouseDistance * 3.2);

          p += fromMouse * inverseDistance * cursorField * 0.055 * uIntensity;
          p += uVelocity * cursorField * 0.08 * uIntensity;
          p.y += cursorField * 0.016 * sin(uTime * 1.2);
          cursorGlow = exp(-mouseDistance * 4.2);
        }

        vec3 color = sceneColor(p, uTime);
        color += vec3(0.12, 0.15, 0.19) * cursorGlow * uIntensity;
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
        depth: false,
        stencil: false,
      });
    } catch (error) {
      console.warn("ReactiveWaveBackground: WebGL is unavailable.", error);
      return undefined;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x050505, 1);

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: pointer.clone() },
      uVelocity: { value: pointerVelocity.clone() },
      uTime: { value: isStaticFrame ? Math.PI / 2 : 0 },
      uIntensity: { value: Math.max(0, Number(intensity) || 0) },
      uPointerActive: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const resize = () => {
      if (disposed) return;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      renderer.setSize(width, height, false);
      uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
      if (isStaticFrame) startAnimation();
    };

    const updatePointer = (event) => {
      if (!interactive || isStaticFrame) return;
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      ) {
        handlePointerLeave();
        return;
      }
      const x = THREE.MathUtils.clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const y = THREE.MathUtils.clamp((event.clientY - rect.top) / rect.height, 0, 1);
      const now = performance.now();
      const elapsed = Math.max(8, now - lastPointerTime);
      pointerTarget.set(x, y);
      uniforms.uPointerActive.value = 1;
      if (hasPointer) {
        pointerVelocity.set(
          THREE.MathUtils.clamp((x - previousPointer.x) * (16 / elapsed), -1, 1),
          THREE.MathUtils.clamp((y - previousPointer.y) * (16 / elapsed), -1, 1)
        );
      }
      previousPointer.set(x, y);
      lastPointerTime = now;
      hasPointer = true;
    };

    const handlePointerLeave = () => {
      hasPointer = false;
      uniforms.uPointerActive.value = 0;
      pointerVelocity.set(0, 0);
      pointerTarget.set(0.5, 0.5);
    };

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible && isVisible && !disposed) startAnimation();
    };

    let lastFrame = 0;
    const targetFrameInterval = 1000 / 30;

    const renderFrame = (timestamp) => {
      if (disposed || !renderer) return;
      const elapsed = lastFrame ? timestamp - lastFrame : targetFrameInterval;
      if (!isStaticFrame && lastFrame && elapsed < targetFrameInterval) {
        animationFrame = window.requestAnimationFrame(renderFrame);
        return;
      }

      animationFrame = 0;
      const delta = Math.min(elapsed / 1000, 0.1);
      lastFrame = timestamp;

      pointer.lerp(pointerTarget, 0.08);
      pointerVelocity.multiplyScalar(0.90);
      uniforms.uMouse.value.copy(pointer);
      uniforms.uVelocity.value.copy(pointerVelocity);
      if (!isStaticFrame) uniforms.uTime.value += delta * 0.42;
      renderer.render(scene, camera);

      if (!isStaticFrame && isVisible && isPageVisible) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    function startAnimation() {
      if (!animationFrame && isVisible && isPageVisible && !disposed) {
        lastFrame = 0;
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    }

    resize();
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener("resize", resize, { passive: true });
    }

    if (interactive && !isStaticFrame) {
      window.addEventListener("pointermove", updatePointer, { passive: true });
      document.documentElement.addEventListener("pointerleave", handlePointerLeave);
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) startAnimation();
        else if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      });
      intersectionObserver.observe(container);
    }

    startAnimation();

    return () => {
      disposed = true;
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("resize", resize);
      container.removeEventListener("pointermove", updatePointer);
      container.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("pointermove", updatePointer);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [interactive, intensity]);

  return (
    <div
      ref={containerRef}
      className={`reactive-wave-background ${className}`.trim()}
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        minHeight: "420px",
        background: "#050505",
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "block",
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {children ? (
        <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
