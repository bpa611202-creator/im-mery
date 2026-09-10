/**
 * VRM Loader Utility for MERY
 * Loads .vrm (and VRM-compliant .glb) files into Three.js with @pixiv/three-vrm
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';

export interface LoadedVRMResult {
  vrm: VRM;
  name: string;
  author?: string;
  version?: string;
}

/**
 * Loads a VRM from a Blob or URL
 */
export async function loadVRMFromSource(
  source: Blob | string,
  onProgress?: (progress: ProgressEvent<EventTarget>) => void
): Promise<LoadedVRMResult> {
  let url = '';
  let shouldRevoke = false;

  if (typeof source === 'string') {
    url = source;
  } else {
    url = URL.createObjectURL(source);
    shouldRevoke = true;
  }

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        if (shouldRevoke) {
          URL.revokeObjectURL(url);
        }

        const vrm: VRM | undefined = gltf.userData.vrm;
        if (!vrm) {
          reject(new Error('The loaded 3D file is not a valid VRM model.'));
          return;
        }

        // VRM 0.x models face backwards by default in Three.js coordinates
        VRMUtils.rotateVRM0(vrm);

        // Normalize model height and ground alignment
        const box = new THREE.Box3().setFromObject(vrm.scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Target height ~ 1.55m
        if (size.y > 0.1) {
          const targetHeight = 1.55;
          const scaleFactor = targetHeight / size.y;
          vrm.scene.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }

        // Enable shadows and disable frustum culling
        vrm.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.frustumCulled = false;
          }
        });

        // Extract metadata safely across VRM 0.x (title/author) and VRM 1.0 (name/authors)
        const meta = vrm.meta as any;
        const name = meta?.name || meta?.title || 'Custom VRM';
        const author = meta?.authors
          ? (Array.isArray(meta.authors) ? meta.authors.join(', ') : String(meta.authors))
          : meta?.author
          ? String(meta.author)
          : undefined;
        const version = meta?.version || undefined;

        resolve({
          vrm,
          name,
          author,
          version,
        });
      },
      onProgress,
      (error) => {
        if (shouldRevoke) {
          URL.revokeObjectURL(url);
        }
        reject(error);
      }
    );
  });
}
