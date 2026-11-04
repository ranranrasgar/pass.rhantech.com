// Bunyi singkat via Web Audio (tanpa file aset). Berhasil = 1 nada tinggi, lainnya = 2 nada rendah.
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = "square";
  gain.gain.setValueAtTime(0.15, ctx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur);
}

export function playScanSound(success: boolean) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    if (success) tone(1320, 0, 0.18);
    else {
      tone(220, 0, 0.18);
      tone(220, 0.24, 0.18);
    }
  } catch {
    // Browser tanpa Web Audio: diam saja.
  }
}
