import "server-only";
import { spawn } from "node:child_process";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
  rm,
  cp,
  symlink,
  access,
} from "node:fs/promises";

/**
 * Server-side renderer that turns an uploaded GLB model into a short
 * "turntable" intro video (the car spins around its own axis and eases to a
 * 3/4 resting pose) plus a poster frame.
 *
 * Rendering happens in headless Chrome (via puppeteer) using three.js, frame
 * by frame and fully deterministic, then ffmpeg encodes the frames to MP4.
 * Both Chrome's WebGL (SwiftShader) and ffmpeg run without a GPU.
 */

export type RenderResult = { mp4: Buffer; poster: Buffer };

const WIDTH = Number(process.env.RENDER_W) || 768;
const HEIGHT = Number(process.env.RENDER_H) || 432;
const FPS = Number(process.env.RENDER_FPS) || 30;
const FRAMES = Number(process.env.RENDER_FRAMES) || 60; // 2.0s
const require = createRequire(import.meta.url);

/** three version-keyed cache of the browser assets we serve to the render page. */
let threeAssetsDir: string | null = null;

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy three's ESM build + the examples/jsm tree into a stable temp dir once,
 * so each render only has to write the model + HTML (the jsm tree is ~15MB).
 */
async function ensureThreeAssets(): Promise<string> {
  if (threeAssetsDir && (await exists(threeAssetsDir))) return threeAssetsDir;
  const revision = (await import("three")).REVISION;
  // require.resolve("three") -> <root>/build/three.cjs ; go up to the package root.
  const threeRoot = path.resolve(path.dirname(require.resolve("three")), "..");
  const dir = path.join(os.tmpdir(), `carlog-three-${revision}`);
  if (!(await exists(path.join(dir, "index-ready")))) {
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    // three.module.js imports sibling chunks (three.core.js) -> copy the whole build dir.
    await cp(path.join(threeRoot, "build"), path.join(dir, "build"), { recursive: true });
    await cp(path.join(threeRoot, "examples", "jsm"), path.join(dir, "jsm"), {
      recursive: true,
    });
    await writeFile(path.join(dir, "index-ready"), "ok");
  }
  threeAssetsDir = dir;
  return dir;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
  ".png": "image/png",
};

/** Tiny static server over a directory; ES modules need correct MIME + same-origin. */
function serveDir(rootDir: string): Promise<{ port: number; close: () => Promise<void> }> {
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, "");
      const filePath = path.join(rootDir, rel);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({
        port,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

/** The HTML + module script Chrome runs to render each frame deterministically. */
function renderPageHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#0b0f17;overflow:hidden}canvas{display:block}
  </style>
  <script type="importmap">{"imports":{"three":"/build/three.module.js","three/addons/":"/jsm/"}}</script>
  </head><body>
  <canvas id="c" width="${WIDTH}" height="${HEIGHT}"></canvas>
  <script type="module">
  import * as THREE from "three";
  import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
  import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
  import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
  import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

  const W = ${WIDTH}, H = ${HEIGHT};
  let pivot, renderer, scene, camera, START = 0, TOTAL = Math.PI * 2; // one full turn

  async function init() {
    const canvas = document.getElementById("c");
    // MSAA is very slow under software WebGL; render aliased and let the H.264
    // chroma subsampling + the small display size hide it.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0f17);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.bias = -0.0004;
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    pivot = new THREE.Group();
    scene.add(pivot);

    const loader = new GLTFLoader();
    const draco = new DRACOLoader().setDecoderPath("/jsm/libs/draco/");
    loader.setDRACOLoader(draco);
    loader.setMeshoptDecoder(MeshoptDecoder);

    const gltf = await loader.loadAsync("/model.glb");
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      // Transmission (glass) forces a costly extra render pass per frame and is
      // unusably slow under software WebGL — approximate it with cheap opacity.
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.transmission > 0) {
          m.transmission = 0;
          m.transparent = true;
          m.opacity = 0.35;
        }
      }
    });

    // Center on origin and scale to a consistent size.
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.2 / maxDim;
    pivot.add(model);
    pivot.scale.setScalar(scale);

    // Soft ground shadow at the model's base.
    const groundY = (box.min.y - center.y) * scale;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.4 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = groundY;
    ground.receiveShadow = true;
    scene.add(ground);
    key.target = pivot;

    // 3/4 elevated camera looking slightly above the base.
    const az = THREE.MathUtils.degToRad(35);
    const radius = 3.4;
    camera.position.set(Math.sin(az) * radius, 1.5, Math.cos(az) * radius);
    camera.lookAt(0, groundY + 0.45, 0);

    // Rest where the spin ends; spin starts a whole number of turns earlier.
    const FINAL_Y = THREE.MathUtils.degToRad(0);
    START = FINAL_Y - TOTAL;
    window.__ready = true;
  }

  window.__renderFrame = (t) => {
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    pivot.rotation.y = START + ease * TOTAL;
    renderer.render(scene, camera);
  };

  init().catch((e) => { window.__error = String(e && e.stack || e); });
  </script></body></html>`;
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(-500)}`))
    );
  });
}

/**
 * Render a GLB to an MP4 turntable intro + poster JPEG.
 * Throws if the model can't be loaded or the tools are unavailable.
 */
export async function renderVehicleAnimation(glb: Buffer): Promise<RenderResult> {
  const puppeteer = (await import("puppeteer")).default;
  const assets = await ensureThreeAssets();
  const work = await mkdtemp(path.join(os.tmpdir(), "carlog-render-"));
  const framesDir = path.join(work, "frames");

  const server = await serveDir(work);
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    await mkdir(framesDir, { recursive: true });
    await writeFile(path.join(work, "model.glb"), glb);
    await writeFile(path.join(work, "index.html"), renderPageHtml());
    // Serve the shared three assets without copying them per render.
    await symlink(path.join(assets, "build"), path.join(work, "build"));
    await symlink(path.join(assets, "jsm"), path.join(work, "jsm"));

    browser = await puppeteer.launch({
      headless: true,
      // In Docker we use the distro Chromium (PUPPETEER_EXECUTABLE_PATH); locally
      // puppeteer's own download is used when the env var is unset.
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swift-shader",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT });
    await page.goto(`http://127.0.0.1:${server.port}/index.html`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await page.waitForFunction("window.__ready === true || window.__error", { timeout: 60000 });
    const err = await page.evaluate(() => (window as unknown as { __error?: string }).__error);
    if (err) throw new Error(`Modell konnte nicht geladen werden: ${err}`);

    for (let i = 0; i < FRAMES; i++) {
      const t = FRAMES === 1 ? 1 : i / (FRAMES - 1);
      const dataUrl = (await page.evaluate((tt) => {
        (window as unknown as { __renderFrame: (t: number) => void }).__renderFrame(tt);
        return (document.getElementById("c") as HTMLCanvasElement).toDataURL("image/png");
      }, t)) as string;
      const png = Buffer.from(dataUrl.split(",")[1], "base64");
      await writeFile(path.join(framesDir, `f_${String(i).padStart(4, "0")}.png`), png);
      if (process.env.RENDER_DEBUG) console.error(`frame ${i + 1}/${FRAMES}`);
    }

    const mp4Path = path.join(work, "out.mp4");
    const posterPath = path.join(work, "poster.jpg");
    await run("ffmpeg", [
      "-y", "-framerate", String(FPS),
      "-i", path.join(framesDir, "f_%04d.png"),
      "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "23",
      "-movflags", "+faststart", mp4Path,
    ]);
    await run("ffmpeg", [
      "-y", "-i", path.join(framesDir, `f_${String(FRAMES - 1).padStart(4, "0")}.png`),
      "-q:v", "3", posterPath,
    ]);

    const [mp4, poster] = await Promise.all([readFile(mp4Path), readFile(posterPath)]);
    return { mp4, poster };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await server.close().catch(() => {});
    await rm(work, { recursive: true, force: true }).catch(() => {});
  }
}
