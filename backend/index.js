const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = 3000;

// Configure multer for file upload (storing file on disk)
const upload = multer({ dest: 'uploads/' });

// Configure nodemailer transporter (Replace with your actual SMTP credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: 'fiestadelroll@gmail.com',       // Your email address
    pass: 'izdg iecx ttxw nxej'         // Your email password or app password
  }
});

// POST route to accept CSV file upload
app.post('/upload', upload.single('csvFile'), (req, res) => {
  const results = [];
  const filePath = req.file.path;

  // Parse the CSV file
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Process each record asynchronously
      for (const record of results) {
        const name = record.name;
        const email = record.email;

        // Generate a unique token
        const token = uuidv4();

        try {
          // Generate QR code as Data URL
          const qrDataUrl = await QRCode.toDataURL(token);
        console.log(`Generated QR code for ${name}: ${qrDataUrl}`);
        const base64Image = qrDataUrl.replace(/^data:image\/png;base64,/, "");
          // Compose the email
          const mailOptions = {
            from: '"Your Name" <your-email@gmail.com>',
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
                cid: 'qrCodeImage' // same as in the img src above
              }
            ]
          };

          // Send the email
          console.log(`Sending email to ${email}...`);
          await transporter.sendMail(mailOptions);
          console.log(`Email sent to ${email}`);
        } catch (error) {
          console.error(`Error processing record for ${email}:`, error);
        }
      }

      // Remove the CSV file after processing
      fs.unlink(filePath, (err) => {
        if (err) console.error('Error removing file:', err);
      });

      res.send('CSV processed and emails sent.');
    })
    .on('error', (error) => {
      console.error('Error reading CSV file:', error);
      res.status(500).send('Error processing CSV file.');
    });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
