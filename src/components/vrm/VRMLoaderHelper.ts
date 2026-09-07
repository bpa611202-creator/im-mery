/**
 * VRM 3D Model Loader and Rig Controller
 * Integrates @pixiv/three-vrm and GLTFLoader for loading anime avatars
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

export interface VRMController {
  vrm: VRM;
  scene: THREE.Group;
  setBlink: (amount: number) => void;
  setVisemes: (visemes: { aa: number; ih: number; ou: number; ee: number; oh: number }) => void;
  setExpression: (name: string, value: number) => void;
  getBone: (name: string) => THREE.Object3D | null;
  update: (delta: number) => void;
  dispose: () => void;
}

export async function loadVRMModel(
  url: string,
  onProgress?: (percent: number) => void
): Promise<VRMController> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  return new Promise<VRMController>((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        if (!vrm) {
          reject(new Error('Loaded GLTF is not a valid VRM model'));
          return;
        }

        // Optimize VRM performance for mobile
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.removeUnnecessaryJoints(gltf.scene);

        // Rotate model to face camera if VRM 0.0
        VRMUtils.rotateVRM0(vrm);

        // Enable shadows and frustum culling on all meshes
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = true;
          }
        });

        const controller: VRMController = {
          vrm,
          scene: gltf.scene,
          setBlink: (amount: number) => {
            if (vrm.expressionManager) {
              vrm.expressionManager.setValue('blink', amount);
            }
          },
          setVisemes: (visemes) => {
            if (vrm.expressionManager) {
              vrm.expressionManager.setValue('aa', visemes.aa);
              vrm.expressionManager.setValue('ih', visemes.ih);
              vrm.expressionManager.setValue('ou', visemes.ou);
              vrm.expressionManager.setValue('ee', visemes.ee);
              vrm.expressionManager.setValue('oh', visemes.oh);
            }
          },
          setExpression: (name: string, value: number) => {
            if (vrm.expressionManager) {
              vrm.expressionManager.setValue(name, value);
            }
          },
          getBone: (name: string) => {
            if (vrm.humanoid) {
              const bone = vrm.humanoid.getNormalizedBoneNode(name as any);
              return bone || null;
            }
            return null;
          },
          update: (delta: number) => {
            vrm.update(delta);
          },
          dispose: () => {
            VRMUtils.deepDispose(gltf.scene);
          },
        };

        resolve(controller);
      },
      (progress) => {
        if (progress.total > 0 && onProgress) {
          onProgress((progress.loaded / progress.total) * 100);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}
