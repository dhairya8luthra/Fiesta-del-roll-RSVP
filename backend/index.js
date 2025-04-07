const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');
const { google } = require('googleapis');

const app = express();
const port = 3000;

// Allow requests from both localhost:3000 and your deployed Vercel app.
app.use(cors({ origin: ['http://localhost:3000', 'https://fiesta-del-roll-rsvp.vercel.app'] }));
// Middleware to parse JSON bodies for the /verify endpoint.
app.use(express.json());

// Configure multer for file upload (files are stored temporarily on disk)
const upload = multer({ dest: 'uploads/' });

// Configure nodemailer transporter (Replace with your actual SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'fiestadelroll@gmail.com',       // Your email address
    pass: 'izdg iecx ttxw nxej'             // Your email password or app-specific password
  }
});

// ----------------------
// Google Sheets Setup
// ----------------------
// Replace with the path to your credentials JSON file and your spreadsheet ID.
const GOOGLE_CREDENTIALS_FILE = 'credentials.json';
const SPREADSHEET_ID = '1JR3D8Xkn2TFmEtK0EMjGwXVlnK8rcX45pVDVfdJLC54'; // <-- update with your sheet ID
const SHEET_RANGE = 'Sheet1!A:C'; // Assuming your sheet is named "Sheet1" and has columns: token, name, scanCount.

const googleAuth = new google.auth.GoogleAuth({
  keyFile: GOOGLE_CREDENTIALS_FILE,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: googleAuth });

// ----------------------
// POST /upload endpoint
// ----------------------
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

          // Remove the data URL prefix to extract the Base64 string.
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
                cid: 'qrCodeImage' // Reference used in the HTML img tag.
              }
            ]
          };

          console.log(`Sending email to ${email}...`);
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${email}`);
        } catch (error) {
          console.error(`Error processing record for ${email}:`, error);
        }

        // Append the token information into your Google Sheet with an initial scanCount of 0.
        try {
          const authClient = await googleAuth.getClient();
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[token, name, 0]]
            },
            auth: authClient
          });
          console.log(`Appended record for ${name} to Google Sheet.`);
        } catch (error) {
          console.error(`Error appending record for ${name} to Google Sheet:`, error);
        }
      }

      // Remove the temporary uploaded CSV file.
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err);
      });

      res.send('CSV processed, emails sent, and scan data stored in Google Sheet.');
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error);
      res.status(500).send('Error processing CSV file.');
    });
});

// ----------------------
// POST /verify endpoint
// ----------------------
app.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) {
    console.error('Token is required.');
    return res.status(400).json({ valid: false, message: 'Token is required.' });
  }

  try {
    const authClient = await googleAuth.getClient();
    // Get the current values from the Google Sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
      auth: authClient
    });
    const rows = response.data.values; // rows is an array of arrays

    if (!rows || rows.length < 2) {
      return res.status(404).json({ valid: false, message: 'No data found in sheet.' });
    }
    // Assuming the first row is a header, search subsequent rows for the token.
    let foundRowIndex = -1;
    let currentRow;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === token) {
        foundRowIndex = i;
        currentRow = rows[i];
        break;
      }
    }
    if (foundRowIndex === -1) {
      console.error('Token not found:', token);
      return res.status(404).json({ valid: false, message: 'Token not found.' });
    }

    // The row structure is [token, name, scanCount]. Increment scanCount.
    let scanCount = parseInt(currentRow[2], 10) || 0;
    scanCount++;
    currentRow[2] = scanCount.toString();

    // Update the row in Google Sheets.
    // Note: Google Sheets rows are 1-indexed. The header row is row 1, so the row to update is foundRowIndex+1.
    const updateRange = `Sheet1!C${foundRowIndex + 1}`;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[scanCount]]
      },
      auth: authClient
    });

    // Respond with the updated data: token is valid, provide the name and the updated scan count.
    res.json({ valid: true, token, name: currentRow[1], scanCount });
  } catch (error) {
    console.error('Error during verification:', error);
    res.status(500).json({ valid: false, message: 'Error verifying token.' });
  }
});

// ----------------------
// Start the server
// ----------------------
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
