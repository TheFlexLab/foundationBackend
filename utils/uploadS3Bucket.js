const AWS = require("aws-sdk");
const {
  AWS_S3_ACCESS_KEY,
  AWS_S3_SECRET_ACCESS_KEY,
  AWS_S3_REGION,
  AWS_S3_BUCKET_NAME,
} = require("../config/env");

AWS.config.update({
  accessKeyId: AWS_S3_ACCESS_KEY,
  secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  region: AWS_S3_REGION,
});

const s3 = new AWS.S3();

const bucketName = AWS_S3_BUCKET_NAME;
const region = AWS_S3_REGION;
const accessKeyId = AWS_S3_ACCESS_KEY;
const secretAccessKey = AWS_S3_SECRET_ACCESS_KEY;

const s3Client = new AWS.S3({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const s3ImageUpload = async ({ fileBuffer, fileName }) => {
  // Specify the folder name within the S3 bucket
  const folderName = "dynamicImages";

  // Construct the key with the folder name
  const key = `${folderName}/${fileName}`;

  // Configure parameters for uploading to S3
  const params = {
    Bucket: bucketName,
    Key: key, // File name in S3
    Body: fileBuffer, // File data in S3 Object
  };

  try {
    const data = await s3Client.upload(params).promise(); // Use promise-based API
    return {
      imageName: fileName,
      s3Url: `https://${bucketName}.s3.amazonaws.com/${folderName}/${fileName}`,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error; // Re-throw the error for handling in the calling function
  }
};

const uploadS3Bucket = async ({ fileName, description, route, title }) => {
  console.log(fileName, description, route, title);
  const metaTags = {
    // title: "Foundation",
    type: "website",
    url: "https://on.foundation",
    image: "https://foundation-seo.s3.amazonaws.com/seo-logo-v2.png",
  };
  const { type, url, image } = metaTags;
  const params = {
    Bucket: "foundation-seo",
    Key: `${route}/${fileName}.html`,
    Body: `
        <\!DOCTYPE html>
        <html lang="en">
        <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <meta name="title" content="${title}" />
                <meta name="description" content="${description}" />
        
                <!-- Open Graph / Facebook -->
                <meta property="og:type" content="${type}" />
                <!-- <meta property="og:url" content="${url}" /> -->
                <meta property="og:title" content="${title}" />
                <meta property="og:description" content="${description}" />
                <meta property="og:image" content="${image}" />
        
                <!-- Twitter -->
                <meta property="twitter:card" content="${type}" />
                <meta property="twitter:url" content="${url}" />
                <meta name="twitter:title" content="${title}" />
                <meta name="twitter:description" content="${description}" />
                <meta name="twitter:image" content="${image}" />
        </head>
        <body>
            <p>Hello from Lambda@Edge!</p>
        </body>
        </html>
        `,
    ContentType: "text/html",
  };
  try {
    s3.upload(params, (err, data) => {
      if (err) {
        console.error("Error uploading HTML to S3:", err);
      } else {
        //console.log('HTML uploaded successfully:', data.Location);
        return true;
      }
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  uploadS3Bucket,
  s3ImageUpload,
};
