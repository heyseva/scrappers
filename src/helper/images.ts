import path from "path";
import fs from "fs";
import axios from "axios";
import AWS from "aws-sdk";
import {
  AWS_ACCESS_KEY_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
} from "../utils/env";

export async function downloadImage(
  url: string,
  filename: string,
  bucketName: string // Add the bucket name as a parameter
) {
  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION,
  });

  const s3 = new AWS.S3();

  try {
    console.log(`Downloading image from: ${url}, filename: ${filename}`);

    // Stream the image directly to S3
    const response = await axios.get(url, { responseType: "stream" });
    const uploadParams = {
      Bucket: bucketName,
      Key: filename, // The name of the file in S3
      Body: response.data,
      ContentType: "image/jpeg", // Adjust the content type as necessary
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    console.log(`Image uploaded to S3: ${uploadResult.Location}`);
    return uploadResult.Location;
  } catch (error) {
    console.error("Error downloading or uploading the image:", error);
  }
}

export async function downloadImageLocal(
  url: string,
  filename: string,
  filePath: string = "../downloads"
) {
  try {
    console.log(`Downloading image from: ${url}, filename: ${filename}`);
    const downloadDirectory = path.join(__dirname, filePath);
    const imageFileName = path.basename(filename);

    // Full path to save the image
    const imagePath = path.join(downloadDirectory, imageFileName);
    console.log("imagePath", imagePath);
    const response = await axios.get(url, { responseType: "arraybuffer" });

    fs.writeFileSync(imagePath, response.data);

    console.log(`Image downloaded and saved to: ${imagePath}`);
  } catch (error) {
    console.error("Error downloading the image:", error);
  }
}
