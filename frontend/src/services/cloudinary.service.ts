import { message } from 'antd';

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface UploadOptions {
  folder?: string;
  transformation?: string;
  quality?: number;
  width?: number;
  height?: number;
}

class CloudinaryService {
  private cloudName: string;
  private uploadPreset: string;

  constructor() {
    this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
    this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

    if (!this.cloudName || !this.uploadPreset) {
      console.warn('Cloudinary configuration missing. Please set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET environment variables.');
    }
  }

  async uploadFile(file: File, options: UploadOptions = {}): Promise<CloudinaryUploadResult | null> {
    if (!this.cloudName || !this.uploadPreset) {
      message.error('Cloudinary not configured');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.transformation) {
      formData.append('transformation', options.transformation);
    }

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const result: CloudinaryUploadResult = await response.json();
      return result;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      message.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async uploadMultipleFiles(files: File[], options: UploadOptions = {}): Promise<(CloudinaryUploadResult | null)[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  getImageUrl(publicId: string, options: { width?: number; height?: number; quality?: number; crop?: string } = {}): string {
    let url = `https://res.cloudinary.com/${this.cloudName}/image/upload/`;

    const transformations: string[] = [];

    if (options.width) transformations.push(`w_${options.width}`);
    if (options.height) transformations.push(`h_${options.height}`);
    if (options.quality) transformations.push(`q_${options.quality}`);
    if (options.crop) transformations.push(`c_${options.crop}`);

    if (transformations.length > 0) {
      url += transformations.join(',') + '/';
    }

    url += publicId;
    return url;
  }

  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    if (file.size > maxSize) {
      return { valid: false, error: 'Image size must be less than 5MB' };
    }

    return { valid: true };
  }
}

export const cloudinaryService = new CloudinaryService();
