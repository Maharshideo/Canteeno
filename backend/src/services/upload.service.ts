import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

const isCloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
}

export const uploadImage = async (
  fileBuffer: Buffer,
  folder = "canteeno/food"
): Promise<string> => {
  if (!isCloudinaryConfigured) {
    // If Cloudinary is not configured, we return a fallback placeholder or base64 data URI
    const base64Data = fileBuffer.toString("base64");
    return `data:image/jpeg;base64,${base64Data}`;
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};
