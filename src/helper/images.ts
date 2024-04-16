import path from "path";
import fs from "fs";
import axios from "axios";
import AWS from "aws-sdk";

export async function downloadImage(
  url: string,
  filename: string,
  bucketName: string // Add the bucket name as a parameter
) {
  // Configure AWS SDK
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
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
  } catch (error) {
    console.error("Error downloading or uploading the image:", error);
  }
}
