/**
 * VRM Model Storage Utility
 * Uses IndexedDB to store and retrieve custom user-uploaded .vrm / .glb models
 * so they persist across page refreshes.
 */

const DB_NAME = 'mery_vrm_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_models';
const MODEL_KEY = 'active_vrm';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CustomVRMMetadata {
  name: string;
  size: number;
  uploadedAt: number;
  modelTitle?: string;
  modelAuthor?: string;
}

/**
 * Saves a VRM file (Blob or File) into IndexedDB
 */
export async function saveCustomVRM(
  file: Blob | File,
  name: string,
  extraMeta?: { modelTitle?: string; modelAuthor?: string }
): Promise<CustomVRMMetadata> {
  const db = await openDB();
  const metadata: CustomVRMMetadata = {
    name,
    size: file.size,
    uploadedAt: Date.now(),
    modelTitle: extraMeta?.modelTitle || name,
    modelAuthor: extraMeta?.modelAuthor,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Save model blob and metadata
    store.put(file, `${MODEL_KEY}_blob`);
    store.put(metadata, `${MODEL_KEY}_meta`);

    tx.oncomplete = () => resolve(metadata);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Loads the active custom VRM Blob from IndexedDB
 */
export async function getCustomVRMBlob(): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(`${MODEL_KEY}_blob`);

      request.onsuccess = () => resolve((request.result as Blob) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load custom VRM from IndexedDB:', err);
    return null;
  }
}

/**
 * Loads custom VRM metadata from IndexedDB
 */
export async function getCustomVRMMeta(): Promise<CustomVRMMetadata | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(`${MODEL_KEY}_meta`);

      request.onsuccess = () => resolve((request.result as CustomVRMMetadata) || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get custom VRM meta:', err);
    return null;
  }
}

/**
 * Deletes custom VRM from IndexedDB to revert to default procedural MERY
 */
export async function deleteCustomVRM(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${MODEL_KEY}_blob`);
      store.delete(`${MODEL_KEY}_meta`);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete custom VRM from IndexedDB:', err);
  }
}
