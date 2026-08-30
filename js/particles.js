// High Performance 2D Particle Engine for Volumetric Light Shafts and Fireflies
class ParticleEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.fireflies = [];
        this.lightShafts = [];
        this.sparks = [];
        this.mouse = { x: -1000, y: -1000, active: false, radius: 160 };

        this.settings = {
            firefliesEnabled: true,
            fireflyCount: 45,
            fireflySpeed: 1.0,
            fireflySize: 1.2,
            lightShaftsEnabled: true,
            lightShaftIntensity: 0.6,
            mouseInteraction: true
        };

        this.init();
    }

    init() {
        this.resize(this.canvas.width, this.canvas.height);
        this.initLightShafts();
        this.initFireflies();
    }

    resize(w, h) {
        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;
    }

    initLightShafts() {
        this.lightShafts = [];
        const count = 7;
        for (let i = 0; i < count; i++) {
            this.lightShafts.push({
                x: (i / count) * this.width * 0.8 - this.width * 0.1,
                width: 120 + Math.random() * 240,
                angle: 0.28 + (Math.random() - 0.5) * 0.08, // ~16 deg
                speed: 0.05 + Math.random() * 0.08,
                phase: Math.random() * Math.PI * 2,
                opacityBase: 0.06 + Math.random() * 0.08,
                length: Math.hypot(this.width, this.height) * 1.4
            });
        }
    }

    initFireflies() {
        this.fireflies = [];
        for (let i = 0; i < this.settings.fireflyCount; i++) {
            this.fireflies.push(this.createFirefly(true));
        }
    }

    createFirefly(randomStart = false) {
        return {
            x: Math.random() * this.width,
            y: randomStart ? Math.random() * this.height : this.height + 20,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -0.3 - Math.random() * 0.8,
            baseRadius: 2.0 + Math.random() * 3.5,
            radius: 2.5,
            colorHue: 48 + Math.random() * 25, // Warm gold to gentle yellow-green (Demon Slayer Nezuko aesthetics)
            alpha: Math.random() * 0.8,
            targetAlpha: 0.3 + Math.random() * 0.7,
            pulseSpeed: 1.5 + Math.random() * 2.5,
            pulsePhase: Math.random() * Math.PI * 2,
            noiseOffset: Math.random() * 1000,
            trail: []
        };
    }

    addSparkBurst(x, y, count = 18) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 4.5;
            this.sparks.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 2.5,
                colorHue: 35 + Math.random() * 35,
                alpha: 1.0,
                decay: 0.015 + Math.random() * 0.025
            });
        }
    }

    update(dt, time) {
        // Adjust firefly count if setting changed
        while (this.fireflies.length < this.settings.fireflyCount) {
            this.fireflies.push(this.createFirefly(true));
        }
        while (this.fireflies.length > this.settings.fireflyCount) {
            this.fireflies.pop();
        }

        // Update Light Shafts
        for (const shaft of this.lightShafts) {
            shaft.x += shaft.speed * dt * 20;
            if (shaft.x > this.width * 1.1) {
                shaft.x = -shaft.width - this.width * 0.1;
            }
        }

        // Update Fireflies
        for (const f of this.fireflies) {
            f.noiseOffset += dt * 0.5 * this.settings.fireflySpeed;
            
            // Organic wave movement
            const angleNoise = Math.sin(f.noiseOffset * 2.0) * 1.2 + Math.cos(f.noiseOffset * 1.3) * 0.8;
            f.vx += Math.cos(angleNoise) * 0.15 * dt * this.settings.fireflySpeed;
            f.vy += (Math.sin(angleNoise) * 0.15 - 0.05) * dt * this.settings.fireflySpeed;

            // Damping
            f.vx *= 0.96;
            f.vy = Math.max(-1.8, Math.min(1.2, f.vy * 0.96));

            // Mouse interaction
            if (this.settings.mouseInteraction && this.mouse.active) {
                const dx = f.x - this.mouse.x;
                const dy = f.y - this.mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < this.mouse.radius && dist > 1) {
                    const force = (1.0 - dist / this.mouse.radius) * 3.5;
                    f.vx += (dx / dist) * force;
                    f.vy += (dy / dist) * force;
                }
            }

            f.x += f.vx * dt * 60;
            f.y += f.vy * dt * 60;

            // Glow breathing pulse
            f.pulsePhase += dt * f.pulseSpeed;
            f.alpha = Math.max(0.1, Math.sin(f.pulsePhase) * 0.5 + 0.5) * f.targetAlpha;
            f.radius = f.baseRadius * this.settings.fireflySize * (0.85 + Math.sin(f.pulsePhase * 0.8) * 0.25);

            // Record trail
            if (Math.random() < 0.4) {
                f.trail.push({ x: f.x, y: f.y, alpha: f.alpha * 0.6, radius: f.radius * 0.6 });
                if (f.trail.length > 6) f.trail.shift();
            }

            // Respawn bounds check
            if (f.y < -30 || f.x < -40 || f.x > this.width + 40 || f.y > this.height + 40) {
                Object.assign(f, this.createFirefly(false));
            }
        }

        // Update trail fade
        for (const f of this.fireflies) {
            for (let i = f.trail.length - 1; i >= 0; i--) {
                f.trail[i].alpha -= dt * 0.8;
                if (f.trail[i].alpha <= 0) f.trail.splice(i, 1);
            }
        }

        // Update Sparks
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            s.x += s.vx * dt * 60;
            s.y += s.vy * dt * 60;
            s.vy += 0.08 * dt * 60; // gravity
            s.alpha -= s.decay * dt * 60;
            if (s.alpha <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }

    render(time) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw Volumetric Light Shafts
        if (this.settings.lightShaftsEnabled && this.settings.lightShaftIntensity > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            for (const shaft of this.lightShafts) {
                const pulse = Math.sin(time * 0.8 + shaft.phase) * 0.25 + 0.75;
                const alpha = shaft.opacityBase * this.settings.lightShaftIntensity * pulse;
                if (alpha <= 0) continue;

                ctx.save();
                ctx.translate(shaft.x, -50);
                ctx.rotate(shaft.angle);

                const grad = ctx.createLinearGradient(0, 0, shaft.width, shaft.length);
                grad.addColorStop(0.0, `rgba(255, 245, 210, ${alpha * 1.5})`);
                grad.addColorStop(0.3, `rgba(255, 235, 180, ${alpha * 0.9})`);
                grad.addColorStop(0.7, `rgba(255, 220, 160, ${alpha * 0.4})`);
                grad.addColorStop(1.0, `rgba(255, 210, 140, 0)`);

                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, shaft.width, shaft.length);
                ctx.restore();
            }
            ctx.restore();
        }

        // 2. Draw Fireflies & Trails
        if (this.settings.firefliesEnabled) {
            ctx.save();
            ctx.globalCompositeOperation = 'screen';

            for (const f of this.fireflies) {
                // Draw trail particles
                for (const t of f.trail) {
                    ctx.beginPath();
                    ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `hsla(${f.colorHue}, 100%, 75%, ${t.alpha * 0.4})`;
                    ctx.fill();
                }

                // Draw outer soft glow halo
                const glowRadius = f.radius * 5.5;
                const glowGrad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, glowRadius);
                glowGrad.addColorStop(0, `hsla(${f.colorHue}, 100%, 80%, ${f.alpha * 0.9})`);
                glowGrad.addColorStop(0.3, `hsla(${f.colorHue}, 100%, 65%, ${f.alpha * 0.4})`);
                glowGrad.addColorStop(1, `hsla(${f.colorHue}, 100%, 50%, 0)`);

                ctx.beginPath();
                ctx.arc(f.x, f.y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = glowGrad;
                ctx.fill();

                // Draw bright inner core
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.radius * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${f.colorHue - 10}, 100%, 95%, ${f.alpha})`;
                ctx.fill();
            }

            // Draw Sparks
            for (const s of this.sparks) {
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${s.colorHue}, 100%, 85%, ${s.alpha})`;
                ctx.shadowColor = `hsla(${s.colorHue}, 100%, 60%, ${s.alpha})`;
                ctx.shadowBlur = 8;
                ctx.fill();
            }

            ctx.restore();
        }
    }
}

window.ParticleEngine = ParticleEngine;
