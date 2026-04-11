import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    clouzd_name: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;