export function createCanvas() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';

  document.body.appendChild(canvas);

  function resize() {
    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', resize);

  resize();

  return {
    canvas,
    ctx,

    get width() {
      return window.innerWidth;
    },

    get height() {
      return window.innerHeight;
    }
  };
}