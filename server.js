const fs = require("fs");
const path = require("path");
const { exec, execFile } = require("child_process");
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const os = require("os");
require("dotenv").config();

const app = express();
const upload = multer();
const memoryUpload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 5000;

console.log(".env", process.env.PORT);

// Utility to generate 20-digit filename
function generate20DigitNumber() {
  let number = "";
  while (number.length < 20) {
    number += Math.floor(Math.random() * 10);
  }
  return number;
}

function getCompressionSetting(level) {
  switch (level) {
    case "low":
      return "/screen";
    case "high":
      return "/printer";
    case "medium":
    default:
      return "/ebook";
  }
}

/**
 * 📄 PDF to Word (DOCX) Conversion using LibreOffice
 */
app.post("/api/pdf-to-word", memoryUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const tempDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const originalName = path.parse(req.file.originalname).name;
  const inputPath = path.join(tempDir, `${originalName}_${Date.now()}.pdf`);
  const outputPath = inputPath.replace(/\.pdf$/i, ".docx");

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    await new Promise((resolve, reject) => {
      // execFile(
      //   "python",
      //   ["convert_pdf_to_docx.py", inputPath, outputPath],
      const pythonCmd = os.platform() === "win32" ? "python" : "python3";
      execFile(
        pythonCmd,
        [path.join(__dirname, "convert_pdf_to_docx.py"), inputPath, outputPath],
        (error) => {
          if (error) return reject(error);
          resolve();
        }
      );
    });

    if (!fs.existsSync(outputPath))
      return res.status(500).send("DOCX not created.");

    const docxBuffer = fs.readFileSync(outputPath);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${originalName}.docx"`
    );
    res.send(docxBuffer);
  } catch (err) {
    console.error("❌ PDF to Word conversion failed:", err);
    res.status(500).send("Conversion failed.");
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    } catch { }
    try {
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch { }
  }
});

/**
 * 📝 Word to PDF Conversion using LibreOffice
 */
app.post("/api/word-to-pdf", memoryUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const tempDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const originalBaseName = path.parse(req.file.originalname).name;
  const extension = path.extname(req.file.originalname);
  const uniqueInputFileName = `${originalBaseName}_${Date.now()}${extension}`;
  const inputPath = path.join(tempDir, uniqueInputFileName);

  try {
    fs.writeFileSync(inputPath, req.file.buffer);

    // const librePath = "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
    const librePath = os.platform() === "win32"
      ? "C:\\Program Files\\LibreOffice\\program\\soffice.exe"
      : "libreoffice";

    await new Promise((resolve, reject) => {
      execFile(
        librePath,
        ["--headless", "--convert-to", "pdf", "--outdir", tempDir, inputPath],
        (error) => {
          if (error) return reject(error);
          resolve();
        }
      );
    });

    const allFiles = fs.readdirSync(tempDir);
    const generatedPdfFile = allFiles.find(
      (f) =>
        f.endsWith(".pdf") &&
        f.toLowerCase().includes(originalBaseName.toLowerCase())
    );

    if (!generatedPdfFile) return res.status(500).send("PDF not created");

    const generatedPdfPath = path.join(tempDir, generatedPdfFile);
    const finalFilename = `${originalBaseName}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${finalFilename}"`
    );
    res.send(fs.readFileSync(generatedPdfPath));
  } catch (err) {
    console.error("❌ Word to PDF conversion failed:", err);
    res.status(500).send("Conversion failed");
  } finally {
    try {
      fs.readdirSync(tempDir).forEach((file) => {
        fs.unlinkSync(path.join(tempDir, file));
      });
    } catch { }
  }
});

/**
 * 🖼️ Image format converter
 */
app.post("/api/convert-image", upload.single("file"), async (req, res) => {
  try {
    const { format, quality } = req.body;
    if (!req.file) return res.status(400).send("No file uploaded");

    const validFormats = {
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      bmp: "image/bmp",
      tiff: "image/tiff",
    };

    if (!validFormats[format])
      return res.status(400).send("Unsupported format");

    const sharpImage = sharp(req.file.buffer);
    let converted;
    const filename = req.file.originalname.split(".")[0] + "." + format;

    switch (format) {
      case "jpg":
        converted = await sharpImage
          .jpeg({ quality: parseInt(quality) || 90 })
          .toBuffer();
        break;
      case "png":
        converted = await sharpImage.png().toBuffer();
        break;
      case "webp":
        converted = await sharpImage
          .webp({ quality: parseInt(quality) || 90 })
          .toBuffer();
        break;
      case "bmp":
        converted = await sharpImage.bmp().toBuffer();
        break;
      case "tiff":
        converted = await sharpImage.tiff().toBuffer();
        break;
    }

    res.setHeader("Content-Type", validFormats[format]);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(converted);
  } catch (err) {
    console.error("❌ Image conversion failed:", err);
    res.status(500).send("Image conversion failed");
  }
});

/**
 * 🖼️➡️📄 Image(s) to PDF
 */
app.post("/api/image-to-pdf", upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).send("No files uploaded");

    const doc = new PDFDocument({ autoFirstPage: false });
    const filename = `${generate20DigitNumber()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    for (const file of req.files) {
      try {
        const sharpInstance = sharp(file.buffer);
        const metadata = await sharpInstance.metadata();
        const width = metadata.width || 595;
        const height = metadata.height || 842;
        const pngBuffer = await sharpInstance.png().toBuffer();
        doc.addPage({ size: [width, height] });
        doc.image(pngBuffer, 0, 0, { width, height });
      } catch (imgErr) {
        console.error("⚠️ Skipping invalid image:", imgErr);
        continue;
      }
    }

    doc.end();
  } catch (err) {
    console.error("❌ Image to PDF failed:", err);
    res.status(500).send("Image to PDF conversion failed");
  }
});

/**
 * 📦 PDF Compressor
 */
app.post("/api/compress-pdf", memoryUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const compressionLevel = req.body.compressionLevel || "medium";

  const tempDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const timestamp = Date.now();
  const inputPath = path.join(tempDir, `input_${timestamp}.pdf`);
  const outputPath = path.join(tempDir, `compressed_${timestamp}.pdf`);

  // Write uploaded PDF to disk
  fs.writeFileSync(inputPath, req.file.buffer);

  // Ghostscript compression quality settings
  const qualitySettings = {
    low: "/screen",
    medium: "/ebook",
    high: "/printer",
  };

  const gsCommand = os.platform() === "win32" ? "gswin64c" : "gs";

  try {
    await new Promise((resolve, reject) => {
      execFile(
        gsCommand,
        [
          "-sDEVICE=pdfwrite",
          "-dCompatibilityLevel=1.4",
          `-dPDFSETTINGS=${qualitySettings[compressionLevel] || "/ebook"}`,
          "-dNOPAUSE",
          "-dQUIET",
          "-dBATCH",
          `-sOutputFile=${outputPath}`,
          inputPath,
        ],
        (error, stdout, stderr) => {
          if (error) {
            console.error("Ghostscript error:", error);
            return reject(error);
          }
          resolve();
        }
      );
    });

    const compressedBuffer = fs.readFileSync(outputPath);
    const randomName =
      Math.floor(Math.random() * 1e10)
        .toString()
        .padStart(10, "0") +
      Math.floor(Math.random() * 1e10)
        .toString()
        .padStart(10, "0");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${randomName}.pdf"`
    );
    res.send(compressedBuffer);
  } catch (err) {
    console.error("❌ Compression failed:", err);
    res.status(500).send("PDF compression failed");
  } finally {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch { }
  }
});

app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

/**
 * ✅ Start the Server
 */
// const PORT = 5000;
// app.listen(PORT, '192.168.29.6', () => {
//   console.log(`🚀 Server running at http://192.168.29.6:${PORT}`);
// });


app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
