// ═══════════════════════════════════════════════════════════
// ReactShaderToy — Generic WebGL fragment shader renderer
//
// Renders a ShaderToy-compatible fragment shader on a canvas.
// Provides iTime and iResolution uniforms automatically.
// Custom uniforms can be passed and updated each frame.
// ═══════════════════════════════════════════════════════════

import { useRef, useEffect, useCallback } from 'react';

export interface ShaderUniform {
  type: '1f' | '3fv';
  value: number | number[];
}

export interface ReactShaderToyProps {
  /** Fragment shader source (ShaderToy mainImage style) */
  fragmentShader: string;
  /** Custom uniforms to pass to the shader */
  uniforms: Record<string, ShaderUniform>;
  /** Canvas width in CSS pixels */
  width?: number;
  /** Canvas height in CSS pixels */
  height?: number;
  /** Additional CSS class */
  className?: string;
}

// Vertex shader — full-screen quad
const VERTEX_SHADER = `attribute vec3 a;void main(){gl_Position=vec4(a,1.0);}`;

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[ShaderToy] Compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ReactShaderToy({
  fragmentShader,
  uniforms,
  width = 220,
  height = 220,
  className,
}: ReactShaderToyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const locationsRef = useRef<Record<string, WebGLUniformLocation | null>>({});
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(Date.now());
  const uniformsRef = useRef(uniforms);

  // Keep uniforms ref in sync without causing re-init
  uniformsRef.current = uniforms;

  // ── Initialize WebGL ──
  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
    });
    if (!gl) {
      console.error('[ShaderToy] WebGL not available');
      return;
    }

    // Build uniform declarations
    let uniformDecl = 'precision highp float;\nuniform float iTime;\nuniform vec2 iResolution;\n';
    for (const [name, u] of Object.entries(uniformsRef.current)) {
      const glslType = u.type === '1f' ? 'float' : 'vec3';
      uniformDecl += `uniform ${glslType} ${name};\n`;
    }

    // Assemble full fragment shader
    const fullFrag =
      uniformDecl +
      fragmentShader +
      '\nvoid main(){vec4 c=vec4(0.0);mainImage(c,gl_FragCoord.xy);gl_FragColor=c;}';

    // Compile shaders
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fullFrag);
    if (!vs || !fs) return;

    // Link program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ShaderToy] Link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full-screen quad
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0]),
      gl.STATIC_DRAW
    );
    const attr = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(attr);
    gl.vertexAttribPointer(attr, 3, gl.FLOAT, false, 0, 0);

    gl.clearColor(0, 0, 0, 0);

    // Cache uniform locations
    const locs: Record<string, WebGLUniformLocation | null> = {
      iTime: gl.getUniformLocation(program, 'iTime'),
      iResolution: gl.getUniformLocation(program, 'iResolution'),
    };
    for (const name of Object.keys(uniformsRef.current)) {
      locs[name] = gl.getUniformLocation(program, name);
    }

    glRef.current = gl;
    programRef.current = program;
    locationsRef.current = locs;
    startTimeRef.current = Date.now();
  }, [fragmentShader, width, height]);

  // ── Render loop ──
  const render = useCallback(() => {
    const gl = glRef.current;
    const locs = locationsRef.current;
    if (!gl) {
      frameRef.current = requestAnimationFrame(render);
      return;
    }

    const time = (Date.now() - startTimeRef.current) / 1000;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Built-in uniforms
    if (locs.iTime) gl.uniform1f(locs.iTime, time);
    if (locs.iResolution) {
      gl.uniform2fv(locs.iResolution, [gl.canvas.width, gl.canvas.height]);
    }

    // Custom uniforms
    const currentUniforms = uniformsRef.current;
    for (const [name, u] of Object.entries(currentUniforms)) {
      const loc = locs[name];
      if (!loc) continue;
      if (u.type === '1f') {
        gl.uniform1f(loc, u.value as number);
      } else if (u.type === '3fv') {
        gl.uniform3fv(loc, u.value as number[]);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    frameRef.current = requestAnimationFrame(render);
  }, []);

  // ── Lifecycle ──
  useEffect(() => {
    initGL();
    frameRef.current = requestAnimationFrame(render);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      // Clean up WebGL resources to prevent context leak
      const gl = glRef.current;
      if (gl && programRef.current) {
        gl.deleteProgram(programRef.current);
        programRef.current = null;
      }
      glRef.current = null;
    };
  }, [initGL, render]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height, borderRadius: '50%' }}
    />
  );
}
