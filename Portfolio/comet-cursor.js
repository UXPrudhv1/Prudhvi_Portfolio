(() => {
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!finePointer.matches || reducedMotion.matches) return;

  const glowCanvas = document.querySelector('.comet-cursor__glow');
  const coreCanvas = document.querySelector('.comet-cursor__core');
  const glow = glowCanvas?.getContext('2d');
  const core = coreCanvas?.getContext('2d');
  if (!glowCanvas || !coreCanvas || !glow || !core) return;

  const trailColor = { r: 255, g: 93, b: 0 };
  const coreColor = { r: 255, g: 217, b: 184 };
  const trailLength = 28;
  const smoothing = 0.32;
  const points = [];
  const target = { x: -400, y: -400 };
  const leader = { x: -400, y: -400 };
  const cursor = { x: -400, y: -400 };
  let width = 0;
  let height = 0;
  let frame = 0;
  let idleFrames = 0;
  let initialized = false;

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    [glowCanvas, coreCanvas].forEach(canvas => {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    });
    glow.setTransform(ratio, 0, 0, ratio, 0, 0);
    core.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const smoothPath = path => {
    if (path.length < 3) return path;
    const result = [path[0]];
    for (let index = 1; index < path.length - 1; index++) {
      const previous = path[index - 1];
      const current = path[index];
      const next = path[index + 1];
      result.push({
        start: {
          x: (previous.x + current.x) / 2,
          y: (previous.y + current.y) / 2
        },
        control: current,
        end: {
          x: (current.x + next.x) / 2,
          y: (current.y + next.y) / 2
        },
        width: 14 * (1 - index / path.length)
      });
    }
    result.push(path[path.length - 1]);
    return result;
  };

  const colorWithAlpha = (color, alpha) =>
    `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0, Math.min(1, alpha))})`;

  const drawTrail = (context, path, color, widthScale, alphaScale, headScale) => {
    context.clearRect(0, 0, width, height);
    if (path.length < 3) return;

    context.globalCompositeOperation = color === trailColor ? 'lighter' : 'source-over';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const first = path[0];
    const second = path[1];
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(second.start.x, second.start.y);
    context.lineWidth = 14 * widthScale;
    context.strokeStyle = colorWithAlpha(color, alphaScale);
    context.stroke();

    for (let index = 1; index < path.length - 1; index++) {
      const segment = path[index];
      context.beginPath();
      context.moveTo(segment.start.x, segment.start.y);
      context.quadraticCurveTo(
        segment.control.x,
        segment.control.y,
        segment.end.x,
        segment.end.y
      );
      context.lineWidth = Math.max(0.15, segment.width * widthScale);
      context.strokeStyle = colorWithAlpha(
        color,
        (1 - index / path.length) * alphaScale
      );
      context.stroke();
    }

    const head = path[0];
    const radius = 10 * headScale;
    if (radius > 0.6) {
      const gradient = context.createRadialGradient(head.x, head.y, 0, head.x, head.y, radius);
      gradient.addColorStop(0, colorWithAlpha(color, alphaScale));
      gradient.addColorStop(1, colorWithAlpha(color, 0));
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(head.x, head.y, radius, 0, Math.PI * 2);
      context.fill();
    }
  };

  const clear = () => {
    glow.clearRect(0, 0, width, height);
    core.clearRect(0, 0, width, height);
  };

  const stop = () => {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    points.length = 0;
    idleFrames = 0;
    initialized = false;
    clear();
  };

  const animate = () => {
    frame = 0;
    if (document.hidden) return;

    leader.x += (target.x - leader.x) * smoothing;
    leader.y += (target.y - leader.y) * smoothing;
    cursor.x += (leader.x - cursor.x) * smoothing;
    cursor.y += (leader.y - cursor.y) * smoothing;
    points.unshift({ x: cursor.x, y: cursor.y });
    if (points.length > trailLength) points.pop();

    const path = smoothPath(points);
    drawTrail(glow, path, trailColor, 1, 0.5, 1);
    drawTrail(core, path, coreColor, 0.34, 1, 0.38);

    idleFrames++;
    const settled = Math.hypot(target.x - cursor.x, target.y - cursor.y) < 0.2;
    if (settled && idleFrames > trailLength + 12) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(animate);
  };

  const onPointerMove = event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    target.x = event.clientX;
    target.y = event.clientY;
    if (!initialized) {
      initialized = true;
      cursor.x = leader.x = event.clientX;
      cursor.y = leader.y = event.clientY;
    }
    idleFrames = 0;
    if (!frame) frame = window.requestAnimationFrame(animate);
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('blur', stop);
  document.addEventListener('visibilitychange', onVisibilityChange);
})();
