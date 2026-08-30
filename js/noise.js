// Procedural seamless Simplex/Value Noise generator for WebGL textures
function createNoiseTexture(gl) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // Fast multi-frequency smooth value noise
    function smoothNoise(x, y, period) {
        const sampleX = (x % period) / period;
        const sampleY = (y % period) / period;
        return (Math.sin(sampleX * Math.PI * 2) + Math.cos(sampleY * Math.PI * 2)) * 0.5;
    }

    // Permutation table for Perlin-style noise
    const p = new Uint8Array(512);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = p[i]; p[i] = p[j]; p[j] = temp;
    }
    for (let i = 0; i < 256; i++) p[256 + i] = p[i];

    function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    function lerp(t, a, b) { return a + t * (b - a); }
    function grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    function perlin2D(x, y, repeat) {
        const X = Math.floor(x) % repeat;
        const Y = Math.floor(y) % repeat;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = fade(xf);
        const v = fade(yf);
        const n00 = grad(p[p[X] + Y], xf, yf);
        const n01 = grad(p[p[X] + (Y + 1) % repeat], xf, yf - 1);
        const n10 = grad(p[p[(X + 1) % repeat] + Y], xf - 1, yf);
        const n11 = grad(p[p[(X + 1) % repeat] + (Y + 1) % repeat], xf - 1, yf - 1);
        return lerp(v, lerp(u, n00, n10), lerp(u, n01, n11));
    }

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            
            // Seamless multi-octave noise across channels
            const scale1 = 8;
            const scale2 = 16;
            const scale3 = 32;

            const r1 = perlin2D(x * scale1 / size, y * scale1 / size, scale1);
            const r2 = perlin2D(x * scale2 / size, y * scale2 / size, scale2) * 0.5;
            const r = Math.min(255, Math.max(0, Math.floor(((r1 + r2) * 0.5 + 0.5) * 255)));

            const g1 = perlin2D((x + 64) * scale1 / size, (y + 64) * scale1 / size, scale1);
            const g2 = perlin2D((x + 64) * scale2 / size, (y + 64) * scale2 / size, scale2) * 0.5;
            const g = Math.min(255, Math.max(0, Math.floor(((g1 + g2) * 0.5 + 0.5) * 255)));

            const b1 = perlin2D((x + 128) * scale1 / size, (y + 128) * scale1 / size, scale1);
            const b = Math.min(255, Math.max(0, Math.floor((b1 * 0.5 + 0.5) * 255)));

            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
}

window.createNoiseTexture = createNoiseTexture;
