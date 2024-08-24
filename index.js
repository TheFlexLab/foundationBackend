const dotenv = require("dotenv");
const app = require("./server");
const connectDB = require("./config/db");
const nodeHtmlToImage = require("node-html-to-image");
const { indexHTML } = require("./templates/indexHTML");
dotenv.config();

// Connect to database
connectDB();

let port = process.env.BASE_PORT;

app.get("/api/test/img", async (req, res) => {
  try {
    // Set Puppeteer options with --no-sandbox flag
    const puppeteerOptions = {
      args: ["--no-sandbox"],
    };

    const image = await nodeHtmlToImage({
      html: indexHTML(),
      puppeteerArgs: puppeteerOptions,
    });
    res.writeHead(200, { "Content-Type": "image/png" });
    res.end(image, "binary");
  } catch (error) {
    console.error("Error generating get image:", error);
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log("Server is listening on port: ", port);
});

app.get("/", (req, res) => {
  res.status(200).send("Everything is OK-v1");
});
