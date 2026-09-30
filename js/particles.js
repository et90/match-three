/**
 * Particle & Visual Effects Engine for Match 3 Game using Canvas
 */

class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.floatingTexts = [];
    this.lasers = [];
    this.confetti = [];
    this.animationId = null;

    // Color definitions for particle palettes
    this.colorMap = [
      { main: '#ff4b72', glow: '#ef4444', light: '#fecdd3' }, // 0: Red Ruby
      { main: '#34d399', glow: '#10b981', light: '#a7f3d0' }, // 1: Emerald
      { main: '#60a5fa', glow: '#3b82f6', light: '#bfdbfe' }, // 2: Sapphire
      { main: '#facc15', glow: '#f59e0b', light: '#fef08a' }, // 3: Amber
      { main: '#c084fc', glow: '#a855f7', light: '#f3e8ff' }, // 4: Amethyst
      { main: '#22d3ee', glow: '#06b6d4', light: '#cffafe' }, // 5: Cyan
      { main: '#f472b6', glow: '#ec4899', light: '#fce7f3' }, // 6: Pink
      { main: '#fb923c', glow: '#f97316', light: '#ffedd5' }  // 7: Orange
    ];

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.startLoop();
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  startLoop() {
    const loop = () => {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  // Explode chip into gem shards & sparks
  emitChipExplosion(x, y, colorIndex) {
    const palette = this.colorMap[colorIndex] || this.colorMap[0];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2.5 + Math.random() * 4.5;
      const size = 3 + Math.random() * 5;
      const isSpark = Math.random() > 0.4;

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size: size,
        color: isSpark ? palette.light : palette.main,
        glow: palette.glow,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.025,
        gravity: 0.15,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.5 ? 'circle' : 'shard'
      });
    }
  }

  // Golden shards for backdrop removal
  emitBackdropShatter(x, y) {
    const count = 14;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 3.5;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: 2.5 + Math.random() * 4.5,
        color: Math.random() > 0.5 ? '#fef08a' : '#fbbf24',
        glow: '#f59e0b',
        alpha: 1,
        decay: 0.025 + Math.random() * 0.02,
        gravity: 0.12,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        shape: 'shard'
      });
    }
  }

  // Laser beam sweep for 4-in-a-row match
  emitLaser(type, index, startX, startY, endX, endY) {
    this.lasers.push({
      type, // 'row' or 'col'
      startX,
      startY,
      endX,
      endY,
      progress: 0,
      alpha: 1,
      width: 14,
      color: '#38bdf8',
      coreColor: '#ffffff',
      life: 0.4, // duration in seconds
      age: 0
    });

    // Add trailing sparkles along the laser beam
    const steps = 15;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = startX + (endX - startX) * t;
      const py = startY + (endY - startY) * t;
      
      for (let s = 0; s < 3; s++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3.5;
        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 4,
          color: '#e0f2fe',
          glow: '#38bdf8',
          alpha: 1,
          decay: 0.03 + Math.random() * 0.03,
          gravity: 0.05,
          shape: 'circle'
        });
      }
    }
  }

  // Floating text like "+100", "КОМБО x2!"
  emitFloatingText(text, x, y, color = '#fbbf24', size = 20) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.8,
      alpha: 1,
      size,
      color,
      decay: 0.02
    });
  }

  // Confetti for level victory
  emitVictoryConfetti() {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    const count = 100;
    
    for (let i = 0; i < count; i++) {
      this.confetti.push({
        x: this.width * 0.5 + (Math.random() - 0.5) * 40,
        y: this.height * 0.4,
        vx: (Math.random() - 0.5) * 12,
        vy: -6 - Math.random() * 8,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.008 + Math.random() * 0.008,
        gravity: 0.22,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        widthRatio: Math.random()
      });
    }
  }

  update() {
    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      if (p.rotSpeed) p.rotation += p.rotSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.alpha -= ft.decay;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.age += 0.016;
      l.alpha = 1 - l.age / l.life;
      if (l.alpha <= 0) {
        this.lasers.splice(i, 1);
      }
    }

    // Update Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += c.gravity;
      c.vx *= 0.99;
      c.rotation += c.rotSpeed;
      c.alpha -= c.decay;

      if (c.alpha <= 0 || c.y > this.height + 50) {
        this.confetti.splice(i, 1);
      }
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. Render Lasers
    for (const l of this.lasers) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, l.alpha);
      this.ctx.lineCap = 'round';

      // Outer glow
      this.ctx.strokeStyle = l.color;
      this.ctx.shadowColor = l.color;
      this.ctx.shadowBlur = 20;
      this.ctx.lineWidth = l.width * l.alpha;
      this.ctx.beginPath();
      this.ctx.moveTo(l.startX, l.startY);
      this.ctx.lineTo(l.endX, l.endY);
      this.ctx.stroke();

      // Inner white core
      this.ctx.strokeStyle = l.coreColor;
      this.ctx.shadowBlur = 8;
      this.ctx.lineWidth = (l.width * 0.45) * l.alpha;
      this.ctx.beginPath();
      this.ctx.moveTo(l.startX, l.startY);
      this.ctx.lineTo(l.endX, l.endY);
      this.ctx.stroke();

      this.ctx.restore();
    }

    // 2. Render Particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      if (p.rotation) this.ctx.rotate(p.rotation);

      if (p.glow) {
        this.ctx.shadowColor = p.glow;
        this.ctx.shadowBlur = 8;
      }
      this.ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.shape === 'shard') {
        this.ctx.beginPath();
        this.ctx.moveTo(-p.size, -p.size * 0.6);
        this.ctx.lineTo(p.size, 0);
        this.ctx.lineTo(0, p.size);
        this.ctx.closePath();
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 3. Render Floating Texts
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.font = `900 ${ft.size}px 'Nunito', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = ft.color;
      this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
      this.ctx.shadowBlur = 6;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    // 4. Render Confetti
    for (const c of this.confetti) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, c.alpha);
      this.ctx.translate(c.x, c.y);
      this.ctx.rotate(c.rotation);
      this.ctx.fillStyle = c.color;
      this.ctx.fillRect(-c.size * 0.5, -c.size * 0.3 * Math.cos(c.rotation), c.size, c.size * 0.6);
      this.ctx.restore();
    }
  }
}

window.ParticleEngine = ParticleEngine;
