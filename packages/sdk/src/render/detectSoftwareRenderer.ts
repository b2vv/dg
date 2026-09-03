/**
 * The renderer string, when we recognised it as a software rasteriser — or
 * `null` when we learned nothing.
 *
 * `null` is not a weak "hardware": it means the question went unanswered, and
 * every caller must treat it as "leave today's behaviour alone". The one thing
 * this module must never do is demote a machine it failed to recognise.
 *
 * The driver's own string comes back rather than the marker that matched it:
 * the host's question is "what is my renderer?", and answering with a fragment
 * of our own list ("microsoft basic render") describes our matching instead of
 * their machine.
 *
 * Answers once per instance; see {@link createSoftwareRendererDetector}.
 */
export type RendererDetector = () => string | null;

/**
 * Names that mean "a CPU is rasterising this", each with why it is here.
 *
 * Deliberately a list of *software* rasterisers rather than a judgement about
 * speed: the question is "is this a GPU at all", which a name can answer, and
 * not "is this GPU fast enough", which would need a threshold measured on the
 * customer's own hardware.
 */
const SOFTWARE_RENDERER_MARKERS = [
  // Chromium's bundled software rasteriser — the default in headless and on
  // machines where the GPU is blocklisted.
  'swiftshader',
  // Mesa's software pipes: Linux thin clients, containers, VMs without passthrough.
  'llvmpipe',
  'softpipe',
  // What Windows reports for the WARP software driver, including RDP sessions.
  'microsoft basic render',
  // ANGLE's own wording for the same class of adapter on Windows.
  'software adapter',
  // Generic wording seen across drivers when no hardware path exists.
  'software rasterizer',
  'apple software renderer',
] as const satisfies readonly string[];

/**
 * Asks a throwaway WebGL context who is drawing.
 *
 * The canvas is never appended, so nothing flickers: at the point this runs the
 * diagram has not put anything on screen yet. Taking a context and handing it
 * straight back is what Pixi itself does in `isWebGLSupported`, so this is not
 * a new trick in this application — it is the same one, asked a different
 * question.
 *
 * Returns `null` for every way of not knowing: no context, no extension, a
 * driver that throws. The caller turns that into "leave today's behaviour
 * alone".
 */
export function readUnmaskedRendererFromDom(): string | null {
  let gl: WebGLRenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;

    const info = gl.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    // Hidden on purpose by privacy-hardened browsers. That is a legitimate
    // answer, not a failure: those users keep the behaviour they have today.
    if (!info) return null;

    const value: unknown = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  } finally {
    // Without the extension the context lives until GC. That is a known limit,
    // not a release, and it is why the caller only ever does this once.
    try {
      const lose = gl?.getExtension('WEBGL_lose_context') as { loseContext(): void } | null;
      lose?.loseContext();
    } catch {
      /* releasing is best-effort; failing to release must not fail the mount */
    }
  }
}

function classify(value: unknown): string | null {
  // `getParameter` is typed loosely and the driver sits on the far side of our
  // boundary: a non-string here must be a quiet `null`, not a throw from
  // `String.prototype.includes` on the least noisy path in the design.
  if (typeof value !== 'string' || value === '') return null;
  const haystack = value.toLowerCase();
  return SOFTWARE_RENDERER_MARKERS.some((marker) => haystack.includes(marker)) ? value : null;
}

/**
 * Wraps a reader so the renderer string is read at most once.
 *
 * The reader is captured here rather than passed to each call, so one detector
 * cannot be asked with two different readers and silently answer with the first
 * verdict. Tests build their own detector; no process-wide reset is exported,
 * and nothing new reaches the package barrel.
 */
export function createSoftwareRendererDetector(read: () => string | null): RendererDetector {
  let memo: string | null | undefined;
  return () => {
    if (memo !== undefined) return memo;
    let value: unknown = null;
    try {
      value = read();
    } catch {
      // A driver that refuses to say who it is has told us nothing, which is a
      // verdict like any other — and it must not escape: this path runs on the
      // default mount, where a throw would take the whole diagram down over a
      // question we only asked out of curiosity.
      value = null;
    }
    memo = classify(value);
    return memo;
  };
}
