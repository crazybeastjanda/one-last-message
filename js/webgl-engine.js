// WebGL Engine for Wallpaper Engine Shader Recreation
class WallpaperRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: false, antialias: true }) ||
                  canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.gl.clearColor(0.1, 0.1, 0.1, 1.0);
        this.init();
    }

    init() {
        const gl = this.gl;

        const vsSource = `
            attribute vec2 a_position;
            varying vec2 v_texCoord;
            uniform vec2 u_parallax;

            void main() {
                // Apply slight parallax shifting to UV coordinates
                vec2 pos = a_position;
                v_texCoord = (pos + 1.0) * 0.5;
                v_texCoord.y = 1.0 - v_texCoord.y; // Flip Y for WebGL texture coords
                v_texCoord += u_parallax;
                gl_Position = vec4(pos, 0.0, 1.0);
            }
        `;

        const fsSource = `
            precision highp float;
            varying vec2 v_texCoord;

            uniform sampler2D u_mainTex;
            uniform sampler2D u_foliageMask;
            uniform sampler2D u_pulseSoftMask;
            uniform sampler2D u_pulseEyesMask;
            uniform sampler2D u_noiseTex;

            uniform float u_time;
            uniform float u_swaySpeed;
            uniform float u_swayStrength;
            uniform float u_swayEnabled;

            uniform float u_pulseSpeed;
            uniform float u_pulseStrength;
            uniform float u_pulseEnabled;
            uniform float u_audioPulse;

            uniform vec3 u_tint1;
            uniform vec3 u_tint2;

            uniform float u_brightness;
            uniform float u_contrast;
            uniform float u_saturation;
            uniform vec3 u_colorFilter;

            vec3 blendScreen(vec3 base, vec3 blend) {
                return 1.0 - (1.0 - base) * (1.0 - blend);
            }

            vec3 adjustSaturation(vec3 color, float sat) {
                float gray = dot(color, vec3(0.299, 0.587, 0.114));
                return mix(vec3(gray), color, sat);
            }

            void main() {
                vec2 uv = v_texCoord;

                // 1. Foliage Sway Effect (Recreated from Wallpaper Engine GLSL)
                if (u_swayEnabled > 0.5) {
                    vec2 noiseCoord = uv * 0.05;
                    vec3 noise = texture2D(u_noiseTex, noiseCoord).rgb;
                    float foliageMask = texture2D(u_foliageMask, uv).r;

                    float amp = u_swayStrength * u_swayStrength * 0.005 * foliageMask;
                    float phase = (noise.g * 6.2831853 + uv.x * 10.0 + uv.y * 5.0) * 0.5;

                    vec4 sines = phase + u_swaySpeed * u_time * vec4(1.0, -0.16161616, 0.0083333, -0.00019841);
                    sines = sin(sines);
                    vec4 csines = 0.4 + phase + u_swaySpeed * u_time * vec4(-0.5, 0.041666666, -0.0013888889, 0.000024801587);
                    csines = sin(csines);

                    sines = pow(abs(sines), vec4(1.0)) * sign(sines);
                    csines = pow(abs(csines), vec4(1.0)) * sign(csines);

                    vec2 swayOffset;
                    swayOffset.x = dot(sines, vec4(amp));
                    swayOffset.y = dot(csines, vec4(amp));

                    uv += swayOffset;
                }

                // Sample base image
                vec4 baseColor = texture2D(u_mainTex, uv);
                vec3 finalColor = baseColor.rgb;

                // 2. Pulse / Glowing Effects
                if (u_pulseEnabled > 0.5) {
                    float pulseTime = u_time * u_pulseSpeed;
                    float basePulse = (sin(pulseTime) * 0.5 + 0.5) * u_pulseStrength;
                    
                    vec2 noiseUv = vec2(u_time * 0.1, u_time * 0.033);
                    float noiseVal = texture2D(u_noiseTex, noiseUv).r * 0.15;
                    float pulse = clamp(basePulse + noiseVal + (u_audioPulse * 0.4), 0.0, 2.0);

                    // Soft aura pulse
                    float maskSoft = texture2D(u_pulseSoftMask, uv).r;
                    vec3 glowSoft = finalColor * u_tint1 * 1.8;
                    finalColor = mix(finalColor, blendScreen(finalColor, glowSoft), maskSoft * pulse);

                    // Eye & highlight pulse
                    float maskEyes = texture2D(u_pulseEyesMask, uv).r;
                    float eyePulse = (sin(pulseTime * 1.5) * 0.5 + 0.5) * u_pulseStrength;
                    vec3 glowEyes = finalColor * u_tint2 * 2.5;
                    finalColor = mix(finalColor, blendScreen(finalColor, glowEyes), maskEyes * eyePulse);
                }

                // 3. Post-Processing / Color Grading
                finalColor *= u_colorFilter;
                finalColor = (finalColor - 0.5) * u_contrast + 0.5;
                finalColor *= u_brightness;
                finalColor = adjustSaturation(finalColor, u_saturation);

                gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), baseColor.a);
            }
        `;

        this.program = this.createProgram(vsSource, fsSource);
        gl.useProgram(this.program);

        // Quad geometry
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

        const aPosition = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

        // Uniform locations
        this.uniforms = {
            mainTex: gl.getUniformLocation(this.program, 'u_mainTex'),
            foliageMask: gl.getUniformLocation(this.program, 'u_foliageMask'),
            pulseSoftMask: gl.getUniformLocation(this.program, 'u_pulseSoftMask'),
            pulseEyesMask: gl.getUniformLocation(this.program, 'u_pulseEyesMask'),
            noiseTex: gl.getUniformLocation(this.program, 'u_noiseTex'),
            time: gl.getUniformLocation(this.program, 'u_time'),
            parallax: gl.getUniformLocation(this.program, 'u_parallax'),
            swaySpeed: gl.getUniformLocation(this.program, 'u_swaySpeed'),
            swayStrength: gl.getUniformLocation(this.program, 'u_swayStrength'),
            swayEnabled: gl.getUniformLocation(this.program, 'u_swayEnabled'),
            pulseSpeed: gl.getUniformLocation(this.program, 'u_pulseSpeed'),
            pulseStrength: gl.getUniformLocation(this.program, 'u_pulseStrength'),
            pulseEnabled: gl.getUniformLocation(this.program, 'u_pulseEnabled'),
            audioPulse: gl.getUniformLocation(this.program, 'u_audioPulse'),
            tint1: gl.getUniformLocation(this.program, 'u_tint1'),
            tint2: gl.getUniformLocation(this.program, 'u_tint2'),
            brightness: gl.getUniformLocation(this.program, 'u_brightness'),
            contrast: gl.getUniformLocation(this.program, 'u_contrast'),
            saturation: gl.getUniformLocation(this.program, 'u_saturation'),
            colorFilter: gl.getUniformLocation(this.program, 'u_colorFilter'),
        };

        // Generate noise texture
        this.noiseTexture = window.createNoiseTexture(gl);

        // Create 1x1 placeholder white textures while real ones load
        this.mainTex = this.createSolidTexture(255, 255, 255, 255);
        this.foliageMask = this.createSolidTexture(0, 0, 0, 255);
        this.pulseSoftMask = this.createSolidTexture(0, 0, 0, 255);
        this.pulseEyesMask = this.createSolidTexture(0, 0, 0, 255);

        // State parameters
        this.params = {
            swaySpeed: 4.5,
            swayStrength: 0.18,
            swayEnabled: true,
            pulseSpeed: 2.8,
            pulseStrength: 1.0,
            pulseEnabled: true,
            audioPulse: 0.0,
            tint1: [0.529, 0.518, 0.518],
            tint2: [0.35, 0.3, 0.3],
            brightness: 1.0,
            contrast: 1.0,
            saturation: 1.0,
            colorFilter: [1.0, 1.0, 1.0],
            parallaxX: 0.0,
            parallaxY: 0.0
        };
    }

    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vs = this.createShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    createSolidTexture(r, g, b, a) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([r, g, b, a]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return tex;
    }

    loadTexture(url, callback) {
        const gl = this.gl;
        const texture = gl.createTexture();
        const img = new Image();
        img.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            if (callback) callback(texture, img);
        };
        img.onerror = (e) => console.error('Failed to load image:', url, e);
        img.src = url;
        return texture;
    }

    loadAssets() {
        return Promise.all([
            new Promise(res => {
                this.mainTex = this.loadTexture('assets/nezuko.png', (tex, img) => {
                    this.imageAspect = img.width / img.height;
                    res();
                });
            }),
            new Promise(res => {
                this.foliageMask = this.loadTexture('assets/masks/foliagesway.png', () => res());
            }),
            new Promise(res => {
                this.pulseSoftMask = this.loadTexture('assets/masks/pulse_soft.png', () => res());
            }),
            new Promise(res => {
                this.pulseEyesMask = this.loadTexture('assets/masks/pulse_eyes.png', () => res());
            })
        ]);
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }

    render(time) {
        const gl = this.gl;
        gl.useProgram(this.program);

        // Bind Textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.mainTex);
        gl.uniform1i(this.uniforms.mainTex, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.foliageMask);
        gl.uniform1i(this.uniforms.foliageMask, 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.pulseSoftMask);
        gl.uniform1i(this.uniforms.pulseSoftMask, 2);

        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.pulseEyesMask);
        gl.uniform1i(this.uniforms.pulseEyesMask, 3);

        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.noiseTexture);
        gl.uniform1i(this.uniforms.noiseTex, 4);

        // Set Uniforms
        gl.uniform1f(this.uniforms.time, time);
        gl.uniform2f(this.uniforms.parallax, this.params.parallaxX, this.params.parallaxY);
        gl.uniform1f(this.uniforms.swaySpeed, this.params.swaySpeed);
        gl.uniform1f(this.uniforms.swayStrength, this.params.swayStrength);
        gl.uniform1f(this.uniforms.swayEnabled, this.params.swayEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uniforms.pulseSpeed, this.params.pulseSpeed);
        gl.uniform1f(this.uniforms.pulseStrength, this.params.pulseStrength);
        gl.uniform1f(this.uniforms.pulseEnabled, this.params.pulseEnabled ? 1.0 : 0.0);
        gl.uniform1f(this.uniforms.audioPulse, this.params.audioPulse);
        gl.uniform3fv(this.uniforms.tint1, this.params.tint1);
        gl.uniform3fv(this.uniforms.tint2, this.params.tint2);
        gl.uniform1f(this.uniforms.brightness, this.params.brightness);
        gl.uniform1f(this.uniforms.contrast, this.params.contrast);
        gl.uniform1f(this.uniforms.saturation, this.params.saturation);
        gl.uniform3fv(this.uniforms.colorFilter, this.params.colorFilter);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

window.WallpaperRenderer = WallpaperRenderer;
