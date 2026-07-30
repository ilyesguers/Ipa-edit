/**
 * Lightweight Canvas Confetti
 * No external dependencies - pure canvas animation
 */

const COLORS = ['#00ff88', '#00cfff', '#ff3b5c', '#f0b90b', '#a855f7', '#ff6b6b', '#4ecdc4'];
const PARTICLE_COUNT = 80;
const ANIMATION_DURATION = 2500;

class Particle {
  constructor(canvas) {
    this.canvas = canvas;
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.canvas.width;
    this.y = -10 - Math.random() * 40;
    this.size = 4 + Math.random() * 6;
    this.speedX = (Math.random() - 0.5) * 4;
    this.speedY = 2 + Math.random() * 3;
    this.gravity = 0.08 + Math.random() * 0.04;
    this.friction = 0.98;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.15;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.opacity = 1;
    this.decay = 0.003 + Math.random() * 0.003;
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    this.wobble = Math.random() * 10;
    this.wobbleSpeed = 0.03 + Math.random() * 0.05;
  }

  update() {
    this.speedY += this.gravity;
    this.speedX *= this.friction;
    this.x += this.speedX + Math.sin(this.wobble) * 0.5;
    this.y += this.speedY;
    this.rotation += this.rotationSpeed;
    this.wobble += this.wobbleSpeed;
    this.opacity -= this.decay;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.opacity);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.fillStyle = this.color;

    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  isAlive() {
    return this.opacity > 0 && this.y < this.canvas.height + 50;
  }
}

/**
 * Fire confetti on a canvas element
 * @param {HTMLCanvasElement} canvas
 */
export function fireConfetti(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new Particle(canvas);
    // Stagger start positions
    p.y = -10 - Math.random() * 100;
    p.speedY = 1 + Math.random() * 2;
    particles.push(p);
  }

  let startTime = performance.now();
  let animationId;

  function animate(currentTime) {
    const elapsed = currentTime - startTime;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Add second wave at 300ms
    if (elapsed > 300 && particles.length < PARTICLE_COUNT * 1.5) {
      for (let i = 0; i < 20; i++) {
        const p = new Particle(canvas);
        p.y = -10;
        p.speedX = (Math.random() - 0.5) * 8;
        p.speedY = 3 + Math.random() * 4;
        particles.push(p);
      }
    }

    // Update and draw
    let aliveCount = 0;
    for (const particle of particles) {
      particle.update();
      if (particle.isAlive()) {
        particle.draw(ctx);
        aliveCount++;
      }
    }

    // Continue animation if particles are alive or within duration
    if (aliveCount > 0 && elapsed < ANIMATION_DURATION) {
      animationId = requestAnimationFrame(animate);
    } else {
      // Cleanup
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationId);
    }
  }

  animationId = requestAnimationFrame(animate);
}

export default fireConfetti;
