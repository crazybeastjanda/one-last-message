// Pure Live Wallpaper Controller
document.addEventListener('DOMContentLoaded', async () => {
    const webglCanvas = document.getElementById('webgl-canvas');
    const particleCanvas = document.getElementById('particle-canvas');

    // Initialize WebGL, Particles, and Audio
    const renderer = new WallpaperRenderer(webglCanvas);
    const particles = new ParticleEngine(particleCanvas);
    const audio = new AudioController();
    window.audioInstance = audio;

    // 2.5D Parallax configuration
    const parallax = {
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        intensity: 0.015
    };

    // Resize Handler
    function handleResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.resize(w, h);
        particles.resize(w, h);
    }
    window.addEventListener('resize', handleResize);
    handleResize();

    // Ensure audio starts immediately
    audio.play();

    // Mouse Interaction for Parallax and Fireflies
    window.addEventListener('mousemove', (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;

        parallax.targetX = -nx * parallax.intensity;
        parallax.targetY = ny * parallax.intensity;

        particles.mouse.x = e.clientX;
        particles.mouse.y = e.clientY;
        particles.mouse.active = true;
    });

    window.addEventListener('mouseleave', () => {
        parallax.targetX = 0;
        parallax.targetY = 0;
        particles.mouse.active = false;
    });

    window.addEventListener('click', (e) => {
        particles.addSparkBurst(e.clientX, e.clientY, 20);
    });

    // Load Wallpaper Assets
    try {
        await renderer.loadAssets();
        audio.play();
    } catch (err) {
        console.error('Error loading wallpaper assets:', err);
    }

    // Animation Loop
    let lastTime = performance.now();
    function animate(currentTime) {
        requestAnimationFrame(animate);

        const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
        lastTime = currentTime;
        const timeSec = currentTime * 0.001;

        // Smooth parallax damping
        parallax.currentX += (parallax.targetX - parallax.currentX) * 0.08;
        parallax.currentY += (parallax.targetY - parallax.currentY) * 0.08;
        renderer.params.parallaxX = parallax.currentX;
        renderer.params.parallaxY = parallax.currentY;

        // Audio reactivity sync with shader
        const audioBass = audio.update();
        renderer.params.audioPulse = audioBass;

        // Render WebGL Foliage Sway & Pulse
        renderer.render(timeSec);

        // Update and render light shafts & fireflies
        particles.update(dt, timeSec);
        particles.render(timeSec);
    }

    requestAnimationFrame(animate);
});
