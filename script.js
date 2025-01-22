// Cài đặt cấu hình hạt
const settings = {
  particles: {
    length: 2200,
    duration: 2,
    velocity: 100,
    effect: -1.2,
    size: 14,
  },
};

// Polyfill cho requestAnimationFrame
(function () {
  const vendors = ["ms", "moz", "webkit", "o"];
  for (let vendor of vendors) {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = window[`${vendor}RequestAnimationFrame`];
      window.cancelAnimationFrame =
        window[`${vendor}CancelAnimationFrame`] ||
        window[`${vendor}CancelRequestAnimationFrame`];
    }
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (callback) => {
      const currTime = performance.now();
      const timeToCall = Math.max(0, 16 - (currTime - lastTime));
      const id = setTimeout(() => callback(currTime + timeToCall), timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = clearTimeout;
  }
})();

// Lớp Point
class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // Phương thức set để thay đổi giá trị của x và y
  set(x, y) {
    this.x = x;
    this.y = y;
  }

  clone() {
    return new Point(this.x, this.y);
  }

  length(length) {
    if (length === undefined) {
      return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    this.normalize();
    this.x *= length;
    this.y *= length;
    return this;
  }

  normalize() {
    const len = this.length();
    this.x /= len;
    this.y /= len;
    return this;
  }
}

// Lớp Particle
class Particle {
  constructor() {
    this.position = new Point();
    this.velocity = new Point();
    this.acceleration = new Point();
    this.age = 0;
  }

  initialize(x, y, dx, dy) {
    this.position.set(x, y);
    this.velocity.set(dx, dy);
    this.acceleration.set(
      dx * settings.particles.effect,
      dy * settings.particles.effect
    );
    this.age = 0;
  }

  update(deltaTime) {
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.velocity.x += this.acceleration.x * deltaTime;
    this.velocity.y += this.acceleration.y * deltaTime;
    this.age += deltaTime;
  }

  draw(context, image) {
    const size =
      image.width * this.ease(this.age / settings.particles.duration);
    context.globalAlpha = 1 - this.age / settings.particles.duration;
    context.drawImage(
      image,
      this.position.x - size / 2,
      this.position.y - size / 2,
      size,
      size
    );
  }

  ease(t) {
    return --t * t * t + 1;
  }
}

// Lớp ParticlePool
class ParticlePool {
  constructor(length) {
    this.particles = Array.from({ length }, () => new Particle());
    this.firstActive = 0;
    this.firstFree = 0;
    this.duration = settings.particles.duration;
  }

  add(x, y, dx, dy) {
    const particle = this.particles[this.firstFree];
    particle.initialize(x, y, dx, dy);
    this.firstFree = (this.firstFree + 1) % this.particles.length;
    if (this.firstActive === this.firstFree) {
      this.firstActive = (this.firstActive + 1) % this.particles.length;
    }
  }

  update(deltaTime) {
    const particles = this.particles;
    const duration = this.duration;

    const updateRange = (start, end) => {
      for (let i = start; i < end; i++) {
        particles[i].update(deltaTime);
      }
    };

    if (this.firstActive < this.firstFree) {
      updateRange(this.firstActive, this.firstFree);
    } else {
      updateRange(this.firstActive, particles.length);
      updateRange(0, this.firstFree);
    }

    while (
      particles[this.firstActive].age >= duration &&
      this.firstActive !== this.firstFree
    ) {
      this.firstActive = (this.firstActive + 1) % particles.length;
    }
  }

  draw(context, image) {
    const particles = this.particles;

    const drawRange = (start, end) => {
      for (let i = start; i < end; i++) {
        particles[i].draw(context, image);
      }
    };

    if (this.firstActive < this.firstFree) {
      drawRange(this.firstActive, this.firstFree);
    } else {
      drawRange(this.firstActive, particles.length);
      drawRange(0, this.firstFree);
    }
  }
}

// Tạo hình trái tim
function pointOnHeart(t) {
  return new Point(
    160 * Math.pow(Math.sin(t), 3),
    130 * Math.cos(t) -
      50 * Math.cos(2 * t) -
      20 * Math.cos(3 * t) -
      10 * Math.cos(4 * t) +
      25
  );
}

// Tạo hình ảnh hạt
function createParticleImage() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  canvas.width = settings.particles.size;
  canvas.height = settings.particles.size;

  context.beginPath();
  let t = -Math.PI;
  let point = pointOnHeart(t);
  context.moveTo(point.x, point.y);
  while (t < Math.PI) {
    t += 0.01;
    point = pointOnHeart(t);
    context.lineTo(point.x, point.y);
  }
  context.closePath();
  context.fillStyle = "#ea80b0";
  context.fill();

  const image = new Image();
  image.src = canvas.toDataURL();
  return image;
}

// Hàm vẽ và cập nhật
(function (canvas) {
  const context = canvas.getContext("2d");
  const particles = new ParticlePool(settings.particles.length);
  const particleRate = settings.particles.length / settings.particles.duration;
  let time = performance.now();

  const image = createParticleImage();

  function render() {
    requestAnimationFrame(render);

    const newTime = performance.now();
    const deltaTime = (newTime - time) / 1000;
    time = newTime;

    context.clearRect(0, 0, canvas.width, canvas.height);

    const amount = particleRate * deltaTime;
    for (let i = 0; i < amount; i++) {
      const pos = pointOnHeart(Math.PI - 2 * Math.PI * Math.random());
      const dir = pos.clone().length(settings.particles.velocity);
      particles.add(
        canvas.width / 2 + pos.x,
        canvas.height / 2 - pos.y,
        dir.x,
        -dir.y
      );
    }

    particles.update(deltaTime);
    particles.draw(context, image);
  }

  function onResize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  window.onresize = onResize;

  setTimeout(() => {
    onResize();
    render();
  }, 10);
})(document.getElementById("pinkboard"));
