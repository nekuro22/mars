import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#marsCanvas");
const slider = document.querySelector("#terraformSlider");

const stageTitle = document.querySelector("#stageTitle");
const stageKicker = document.querySelector("#stageKicker");
const stageYear = document.querySelector("#stageYear");
const stageName = document.querySelector("#stageName");
const stageText = document.querySelector("#stageText");
const atmoValue = document.querySelector("#atmoValue");
const waterValue = document.querySelector("#waterValue");
const fieldValue = document.querySelector("#fieldValue");

const stages = [
    {
        title: "Mars aktuell",
        year: "Sol 0",
        text: "Dunne CO2-Atmosphare, Staubstuerme, Eis an den Polen und kein globales Magnetfeld. Der Planet verliert Schutz und Warme direkt an den Sonnenwind."
    },
    {
        title: "Ozeane und Luft",
        year: "Jahr 220",
        text: "Spiegel und Reaktoren erwarmen Eis- und Gesteinslager. Flache Meere sammeln sich in alten Becken, eine dichtere Atmosphare legt einen blauen Saum um den Mars."
    },
    {
        title: "Plasmaring aktiv",
        year: "Jahr 410",
        text: "Ein geladener Plasmaring kreist stabil um den Planeten. Er lenkt Sonnenwind ab und ersetzt das fehlende innere Magnetfeld durch einen technischen Schutzschild."
    },
    {
        title: "Terraformiert",
        year: "Jahr 900+",
        text: "Ozeane, Wolken und erste Biospharen stabilisieren das Klima. Gruene Korridore breiten sich an Kuesten und Aequatorzonen aus."
    }
];

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x080807, 0.025);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0.24, 6.4);

const root = new THREE.Group();
scene.add(root);

const keyLight = new THREE.DirectionalLight(0xffd49d, 3.2);
keyLight.position.set(-4, 2.4, 5);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x48d5ff, 1.5);
rimLight.position.set(5, 0.2, -3);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0x4c3427, 0.85));

function seededRandom(seed) {
    let value = seed;
    return () => {
        value = (value * 16807) % 2147483647;
        return (value - 1) / 2147483646;
    };
}

function makePlanetTexture() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size / 2;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(c.width, c.height);
    const rand = seededRandom(42);
    const basins = Array.from({ length: 34 }, () => ({
        x: rand(),
        y: rand(),
        r: 0.025 + rand() * 0.12,
        tone: rand()
    }));

    for (let y = 0; y < c.height; y++) {
        const v = y / c.height;
        for (let x = 0; x < c.width; x++) {
            const u = x / c.width;
            let heat = Math.sin(u * 34.0) * 0.08 + Math.sin((u + v) * 79.0) * 0.05;
            let dark = 0;

            for (const b of basins) {
                const dx = Math.min(Math.abs(u - b.x), 1 - Math.abs(u - b.x));
                const dy = v - b.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < b.r) {
                    dark += (1 - d / b.r) * (0.35 + b.tone * 0.3);
                }
            }

            const polar = Math.max(0, Math.abs(v - 0.5) - 0.39) * 5.5;
            const idx = (y * c.width + x) * 4;
            img.data[idx] = 154 + heat * 120 - dark * 95 + polar * 70;
            img.data[idx + 1] = 70 + heat * 48 - dark * 42 + polar * 76;
            img.data[idx + 2] = 38 + heat * 24 - dark * 24 + polar * 86;
            img.data[idx + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#e6b67a";
    for (let i = 0; i < 220; i++) {
        const x = rand() * c.width;
        const y = rand() * c.height;
        const r = 1 + rand() * 6;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

function makeAlphaTexture(color, seed, count, minRadius, maxRadius) {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size / 2;
    const ctx = c.getContext("2d");
    const rand = seededRandom(seed);
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = 0; i < count; i++) {
        const x = rand() * c.width;
        const y = rand() * c.height;
        const r = minRadius + rand() * (maxRadius - minRadius);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function smoothstep(edge0, edge1, x) {
    const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

function mix(a, b, t) {
    return a + (b - a) * t;
}

const sphere = new THREE.SphereGeometry(1.7, 128, 128);
const marsMaterial = new THREE.MeshStandardMaterial({
    map: makePlanetTexture(),
    roughness: 0.92,
    metalness: 0.0
});
const mars = new THREE.Mesh(sphere, marsMaterial);
root.add(mars);

const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(1.706, 128, 128),
    new THREE.MeshPhysicalMaterial({
        color: 0x0f8eaa,
        transparent: true,
        opacity: 0,
        roughness: 0.18,
        metalness: 0.0,
        transmission: 0.08
    })
);
root.add(ocean);

const green = new THREE.Mesh(
    new THREE.SphereGeometry(1.715, 128, 128),
    new THREE.MeshStandardMaterial({
        map: makeAlphaTexture("rgba(64,160,82,0.78)", 123, 90, 18, 86),
        color: 0x76c46b,
        transparent: true,
        opacity: 0,
        roughness: 0.74,
        alphaTest: 0.02
    })
);
root.add(green);

const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.77, 96, 96),
    new THREE.MeshBasicMaterial({
        map: makeAlphaTexture("rgba(255,255,255,0.54)", 321, 130, 16, 78),
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        depthWrite: false
    })
);
root.add(clouds);

const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.86, 96, 96),
    new THREE.MeshBasicMaterial({
        color: 0x45cbff,
        transparent: true,
        opacity: 0.02,
        side: THREE.BackSide,
        depthWrite: false
    })
);
root.add(atmosphere);

const plasmaRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.35, 0.025, 18, 240),
    new THREE.MeshBasicMaterial({
        color: 0xff3b7d,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);
plasmaRing.rotation.x = Math.PI / 2.8;
plasmaRing.rotation.y = Math.PI / 8;
root.add(plasmaRing);

const fieldShell = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.006, 10, 220),
    new THREE.MeshBasicMaterial({
        color: 0x50e6ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);
fieldShell.rotation.x = Math.PI / 2;
fieldShell.scale.set(1, 1, 1.35);
root.add(fieldShell);

const particleCount = 900;
const particlePositions = new Float32Array(particleCount * 3);
for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 2.35 + (Math.random() - 0.5) * 0.18;
    particlePositions[i * 3] = Math.cos(angle) * radius;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius;
}

const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
const plasmaParticles = new THREE.Points(
    particleGeo,
    new THREE.PointsMaterial({
        color: 0xff7aa4,
        size: 0.035,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);
plasmaParticles.rotation.copy(plasmaRing.rotation);
root.add(plasmaParticles);

function makeStars() {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const rand = seededRandom(808);
    for (let i = 0; i < count; i++) {
        const radius = 22 + rand() * 22;
        const theta = rand() * Math.PI * 2;
        const phi = Math.acos(2 * rand() - 1);
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xffecd4,
        size: 0.055,
        transparent: true,
        opacity: 0.72
    }));
}
scene.add(makeStars());

let terraformValue = 0;
let targetRotationX = -0.16;
let targetRotationY = 0.34;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };

function updateStage(value) {
    const oceanT = smoothstep(0.45, 1.35, value);
    const fieldT = smoothstep(1.68, 2.22, value);
    const finalT = smoothstep(2.35, 3, value);
    const airT = smoothstep(0.18, 1.55, value);
    const stageIndex = Math.min(3, Math.max(0, Math.round(value)));
    const stage = stages[stageIndex];

    ocean.material.opacity = mix(0, 0.5, oceanT) * (1 - finalT * 0.12);
    atmosphere.material.opacity = mix(0.02, 0.23, airT);
    clouds.material.opacity = mix(0, 0.46, smoothstep(0.75, 3, value));
    green.material.opacity = mix(0, 0.74, finalT);
    plasmaRing.material.opacity = mix(0, 0.94, fieldT) * (1 - finalT * 0.18);
    plasmaParticles.material.opacity = mix(0, 0.82, fieldT);
    fieldShell.material.opacity = mix(0, 0.28, fieldT);
    marsMaterial.color.setRGB(
        mix(1, 0.72, oceanT * 0.35 + finalT * 0.2),
        mix(1, 0.86, finalT * 0.36),
        mix(1, 0.9, oceanT * 0.18)
    );

    stageKicker.textContent = `Phase ${String(stageIndex + 1).padStart(2, "0")}`;
    stageTitle.textContent = stage.title;
    stageYear.textContent = stage.year;
    stageName.textContent = stage.title;
    stageText.textContent = stage.text;
    atmoValue.textContent = `${Math.round(mix(1, 92, airT * 0.7 + finalT * 0.3))}%`;
    waterValue.textContent = `${Math.round(mix(0, 71, oceanT))}%`;
    fieldValue.textContent = `${Math.round(mix(0, 100, fieldT))}%`;
}

function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = width < 720 ? 7.5 : 6.4;
    camera.updateProjectionMatrix();
}

slider.addEventListener("input", (event) => {
    terraformValue = Number(event.target.value);
    updateStage(terraformValue);
});

canvas.addEventListener("pointerdown", (event) => {
    isDragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    targetRotationY += dx * 0.006;
    targetRotationX += dy * 0.004;
    targetRotationX = Math.max(-0.75, Math.min(0.75, targetRotationX));
    lastPointer = { x: event.clientX, y: event.clientY };
});

canvas.addEventListener("pointerup", (event) => {
    isDragging = false;
    canvas.releasePointerCapture(event.pointerId);
});

window.addEventListener("resize", resize);

const clock = new THREE.Clock();

function animate() {
    const elapsed = clock.getElapsedTime();
    root.rotation.x += (targetRotationX - root.rotation.x) * 0.06;
    root.rotation.y += (targetRotationY - root.rotation.y) * 0.06;
    mars.rotation.y += 0.0012;
    ocean.rotation.y += 0.0012;
    green.rotation.y += 0.0012;
    clouds.rotation.y += 0.0019;
    plasmaRing.rotation.z = elapsed * 0.16;
    plasmaParticles.rotation.z = elapsed * 0.38;
    fieldShell.rotation.z = elapsed * -0.08;
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

resize();
updateStage(0);
animate();
