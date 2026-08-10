import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase/client';

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadImage(
  file: File,
  storagePath: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // 1. Client-side resize and compress
  const processedBlob = await compressImage(file, { maxWidth: 2048, maxHeight: 2048, quality: 0.8 });

  // 2. Upload to Firebase Storage
  const storageRef = ref(storage, storagePath);
  
  const uploadTask = uploadBytesResumable(storageRef, processedBlob, {
    contentType: 'image/jpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadURL, path: storagePath });
        } catch (error) {
          reject(error);
        }
      }
    );
  });
}

function compressImage(
  file: File,
  options: { maxWidth: number; maxHeight: number; quality: number }
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > options.maxWidth) {
            height = Math.round((height * options.maxWidth) / width);
            width = options.maxWidth;
          }
        } else {
          if (height > options.maxHeight) {
            width = Math.round((width * options.maxHeight) / height);
            height = options.maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Fill background with white in case of transparent PNG to JPEG conversion
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/jpeg',
          options.quality
        );
      };
      img.onerror = (error) => {
        reject(error);
      };
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}
