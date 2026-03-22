/**
 * KTI — IFC Viewer
 * Three.js + web-ifc (direct API) via esm.sh CDN
 * Controls: rotate + zoom only
 */

import * as THREE from 'https://esm.sh/three@0.150.0';
import { OrbitControls } from 'https://esm.sh/three@0.150.0/examples/jsm/controls/OrbitControls.js';
import * as WebIFC from 'https://esm.sh/web-ifc@0.0.51';

(async function initViewer() {
    const container = document.getElementById('ifc-viewer-container');
    if (!container) return;

    const w = () => container.clientWidth;
    const h = () => container.clientHeight;

    // ─── Scene ────────────────────────────────────────────────
    const scene = new THREE.Scene();
    // No scene.background — renderer is transparent so the site bg shows through

    // ─── Camera ───────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, w() / h(), 0.01, 3000);
    camera.position.set(40, 28, 40);

    // ─── Renderer (alpha: transparent background) ─────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w(), h());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // ─── Lighting ─────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xf0f6ff, 0.9));

    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(60, 100, 50);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x3a7fff, 0.4);
    fill.position.set(-40, 20, -40);
    scene.add(fill);

    const bounce = new THREE.DirectionalLight(0xffffff, 0.2);
    bounce.position.set(0, -30, 0);
    scene.add(bounce);

    // ─── Orbit Controls ───────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan  = false;
    controls.minDistance = 3;
    controls.maxDistance = 1200;
    controls.target.set(0, 8, 0);
    controls.update();

    // ─── Loading UI refs ──────────────────────────────────────
    const loadingEl   = document.getElementById('ifc-loading');
    const loadingText = document.getElementById('ifc-loading-text');
    const progressBar = document.getElementById('ifc-progress-bar');
    const hintEl      = document.getElementById('ifc-hint');

    function setProgress(pct, msg) {
        if (loadingText) loadingText.textContent = msg || `Učitavam BIM model... ${pct}%`;
        if (progressBar) progressBar.style.width = pct + '%';
    }

    function hideLoading() {
        if (loadingEl) {
            loadingEl.style.transition = 'opacity 0.5s ease';
            loadingEl.style.opacity = '0';
            setTimeout(() => { if (loadingEl.parentNode) loadingEl.remove(); }, 550);
        }
        if (hintEl) {
            hintEl.style.opacity = '1';
            setTimeout(() => {
                hintEl.style.transition = 'opacity 1.5s ease';
                hintEl.style.opacity = '0';
            }, 3500);
        }
    }

    function showError(msg) {
        if (loadingText) loadingText.textContent = msg;
        if (progressBar) progressBar.style.background = '#ff6b6b';
    }

    // ─── web-ifc API ──────────────────────────────────────────
    try {
        setProgress(5, 'Inicijaliziram IFC engine...');

        const ifcApi = new WebIFC.IfcAPI();
        ifcApi.SetWasmPath('https://unpkg.com/web-ifc@0.0.51/');
        await ifcApi.Init();

        setProgress(15, 'Dohvaćam IFC datoteku...');

        const response = await fetch('./ifc/STRUC_NordicLCA_Housing_Concrete_BuildingPermit.ifc');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        setProgress(30, 'Čitam IFC datoteku...');
        const buffer = await response.arrayBuffer();
        const data   = new Uint8Array(buffer);

        setProgress(50, 'Parsiram IFC model...');
        const modelID = ifcApi.OpenModel(data);

        setProgress(65, 'Gradim geometriju...');

        // LoadAllGeometry returns Vector<FlatMesh>
        // Each FlatMesh.geometries → Vector<PlacedGeometry>
        const flatMeshes = ifcApi.LoadAllGeometry(modelID);
        const meshGroup  = new THREE.Group();
        const matCache   = new Map();

        for (let i = 0; i < flatMeshes.size(); i++) {
            const flatMesh         = flatMeshes.get(i);
            const placedGeometries = flatMesh.geometries;

            for (let j = 0; j < placedGeometries.size(); j++) {
                const placedGeom = placedGeometries.get(j);
                const geomData   = ifcApi.GetGeometry(modelID, placedGeom.geometryExpressID);

                const verts   = ifcApi.GetVertexArray(geomData.GetVertexData(), geomData.GetVertexDataSize());
                const indices = ifcApi.GetIndexArray(geomData.GetIndexData(), geomData.GetIndexDataSize());

                if (!verts || verts.length === 0 || !indices || indices.length === 0) {
                    geomData.delete();
                    continue;
                }

                // Format: x,y,z,nx,ny,nz per vertex (6 floats)
                const stride    = 6;
                const numVerts  = verts.length / stride;
                const positions = new Float32Array(numVerts * 3);
                const normals   = new Float32Array(numVerts * 3);

                for (let v = 0; v < numVerts; v++) {
                    const base = v * stride;
                    positions[v * 3]     = verts[base];
                    positions[v * 3 + 1] = verts[base + 1];
                    positions[v * 3 + 2] = verts[base + 2];
                    normals[v * 3]       = verts[base + 3];
                    normals[v * 3 + 1]   = verts[base + 4];
                    normals[v * 3 + 2]   = verts[base + 5];
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('normal',   new THREE.BufferAttribute(normals,   3));
                geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

                // Uniform grey material for all elements
                const opacity = placedGeom.color.w;
                const key = opacity < 0.99 ? 'transparent' : 'solid';
                let mat = matCache.get(key);
                if (!mat) {
                    mat = new THREE.MeshPhongMaterial({
                        color:       new THREE.Color(0x3a4a5c),
                        specular:    new THREE.Color(0x8aaabb),
                        shininess:   50,
                        opacity:     opacity < 0.99 ? 0.25 : 1,
                        transparent: opacity < 0.99,
                        side:        THREE.DoubleSide,
                    });
                    matCache.set(key, mat);
                }

                const mesh = new THREE.Mesh(geometry, mat);

                // flatTransformation is a plain JS array (column-major 4×4)
                mesh.matrixAutoUpdate = false;
                mesh.matrix.fromArray(placedGeom.flatTransformation);

                meshGroup.add(mesh);
                geomData.delete();
            }
        }

        flatMeshes.delete();
        ifcApi.CloseModel(modelID);

        scene.add(meshGroup);
        meshGroup.updateMatrixWorld(true);

        // Auto-frame
        const box    = new THREE.Box3().setFromObject(meshGroup);
        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const d      = Math.max(size.x, size.y, size.z);

        camera.position.set(
            center.x + d * 1.1,
            center.y + d * 0.75,
            center.z + d * 1.1
        );
        controls.target.copy(center);
        controls.update();

        setProgress(100, 'Model učitan!');
        hideLoading();

    } catch (err) {
        console.error('IFC Viewer error:', err);
        showError('Greška pri učitavanju modela.');
    }

    // ─── Responsive resize ────────────────────────────────────
    new ResizeObserver(() => {
        camera.aspect = w() / h();
        camera.updateProjectionMatrix();
        renderer.setSize(w(), h());
    }).observe(container);

    // ─── Render loop ──────────────────────────────────────────
    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    })();

})();
