const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies for the /verify endpoint
app.use(express.json());

// Configure multer for file upload (storing file on disk)
const upload = multer({ dest: 'uploads/' });

// Configure nodemailer transporter (Replace with your actual SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'fiestadelroll@gmail.com',       // Your email address
    pass: 'izdg iecx ttxw nxej'             // Your email password or app password
  }
});

// Define the file path for the scans CSV that stores token, name, and scan count.
const scansCsvPath = path.join(__dirname, 'scans.csv');

// Create scans.csv with header if it doesn't exist.
if (!fs.existsSync(scansCsvPath)) {
  fs.writeFileSync(scansCsvPath, 'token,name,scanCount\n');
}

// POST /upload endpoint to process CSV file upload
app.post('/upload', upload.single('csvFile'), (req, res) => {
  const results = [];
  const filePath = req.file.path;

  // Parse the uploaded CSV file
  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Process each record from the CSV
      for (const record of results) {
        const name = record.name;
        const email = record.email;

        // Validate that email exists. If not, skip the record.
        if (!email) {
          console.warn(`Skipping record for ${name || "unknown"}: email missing.`);
          continue;
        }

        // Generate a unique token for the person.
        const token = uuidv4();

        // Build the QR code payload with token and name.
        const qrPayload = JSON.stringify({ token, name });

        try {
          // Generate the QR code as a Data URL.
          const qrDataUrl = await QRCode.toDataURL(qrPayload);
          console.log(`Generated QR code for ${name}: ${qrDataUrl}`);

          // Remove the prefix to extract the Base64 string.
          const base64Image = qrDataUrl.replace(/^data:image\/png;base64,/, "");

          // Compose the email with the inline QR code attachment.
          const mailOptions = {
            from: '"Fiesta-del-roll" <fiestadelroll@gmail.com>',
            to: email,
            subject: 'Your Unique QR Code',
            html: `
              <p>Hi ${name},</p>
              <p>Here is your unique token and QR code:</p>
              <p><strong>Token:</strong> ${token}</p>
              <p>
                <img src="cid:qrCodeImage" alt="QR Code" />
              </p>
              <p>Thanks!</p>
            `,
            attachments: [
              {
                filename: 'qrcode.png',
                content: base64Image,
                encoding: 'base64',
                cid: 'qrCodeImage' // Reference for inline image
              }
            ]
          };

          console.log(`Sending email to ${email}...`);
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${email}`);
        } catch (error) {
          console.error(`Error processing record for ${email}:`, error);
        }

        // Append the token information to scans.csv with an initial scanCount of 0.
        const row = `"${token}","${name}",0\n`;
        fs.appendFileSync(scansCsvPath, row);
      }

      // Remove the temporary uploaded CSV file.
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err);
      });

      res.send('CSV processed, emails sent, and scan data stored.');
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error);
      res.status(500).send('Error processing CSV file.');
    });
});

// POST /verify endpoint to verify token and update scan count
app.post('/verify', (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token is required.' });
  }

  // Read the scans.csv file into an array of records.
  const records = [];
  fs.createReadStream(scansCsvPath)
    .pipe(csvParser())
    .on('data', (data) => records.push(data))
    .on('end', () => {
      // Find the record that matches the token.
      const record = records.find(r => r.token === token);
      if (!record) {
        return res.status(404).json({ valid: false, message: 'Token not found.' });
      }

      // Increment the scan count.
      let scanCount = parseInt(record.scanCount, 10) || 0;
      scanCount++;
      record.scanCount = scanCount;

      // Rewrite the entire CSV file with updated scan counts.
      const header = 'token,name,scanCount\n';
      const rows = records.map(r => `"${r.token}","${r.name}",${r.scanCount}`).join('\n');
      const csvContent = header + rows + '\n';
      fs.writeFile(scansCsvPath, csvContent, (err) => {
        if (err) {
          console.error('Error updating scans CSV:', err);
          return res.status(500).json({ valid: false, message: 'Failed to update scan count.' });
        }
        // Respond with token validation, the person’s name, and updated scan count.
        res.json({ valid: true, token, name: record.name, scanCount });
      });
    })
    .on('error', (error) => {
      console.error('Error reading scans CSV:', error);
      res.status(500).json({ valid: false, message: 'Error reading scan data.' });
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
