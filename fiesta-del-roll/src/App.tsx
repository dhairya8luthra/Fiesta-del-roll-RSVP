import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, PartyPopper } from 'lucide-react';

function App() {
  // States for QR scanning
  const [scanResult, setScanResult] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; scanCount: number } | null>(null);

  // States for CSV upload
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>('');

  // Set up the QR scanner when showScanner is true
  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(onScanSuccess, onScanError);

      async function onScanSuccess(result: string) {
        // Clear scanner and update state with the scanned token
        scanner.clear();
        setScanResult(result);
        setShowScanner(false);
        const token = JSON.parse(result).token;

        // Verify the scanned token by calling your backend /verify endpoint
        try {
          const response = await fetch('https://fiesta-del-roll-rsvp.onrender.com/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await response.json();
          setVerificationResult(data);
          console.log("Verification result:", data);
        } catch (err) {
          console.error("Verification error:", err);
        }
      }

      function onScanError(err: any) {
        console.warn(err);
      }

      return () => {
        scanner.clear();
      };
    }
  }, [showScanner]);

  // Handle file selection for CSV upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  // Upload the CSV file to your backend
  const handleUpload = async () => {
    if (!csvFile) {
      setUploadMessage("Please select a CSV file to upload.");
      return;
    }
    const formData = new FormData();
    formData.append("csvFile", csvFile);

    try {
      const response = await fetch('https://fiesta-del-roll-rsvp.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const text = await response.text();
      setUploadMessage(text);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadMessage("Error uploading file.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-yellow-100 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-pink-600 mb-2 flex items-center justify-center gap-2">
            <PartyPopper className="w-8 h-8" />
            Fiesta del Roll
            <PartyPopper className="w-8 h-8" />
          </h1>
          <p className="text-lg md:text-xl text-yellow-700">RSVP Scanner & CSV Upload</p>
        </div>

        {/* CSV Upload Section */}
        <div className="w-full sm:max-w-md md:max-w-lg mx-auto bg-black rounded-xl shadow-lg overflow-hidden p-8 mb-8">
          <h2 className="text-2xl font-semibold text-pink-600 mb-4">Upload CSV File</h2>
          <input type="file" accept=".csv" onChange={handleFileChange} className="mb-4" />
          <button
            onClick={handleUpload}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center gap-2 transition-colors"
          >
            Upload CSV
          </button>
          {uploadMessage && (
            <p className="mt-4 text-center text-gray-700">{uploadMessage}</p>
          )}
        </div>

        {/* QR Code Scanner & Verification Section */}
        <div className="w-full sm:max-w-md md:max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden p-8">
          <h2 className="text-2xl font-semibold text-pink-600 mb-4">Scan & Verify QR Code</h2>
          {/* Show scan button when not scanning and no result */}
          {!showScanner && !scanResult && (
            <div className="text-center">
              <button
                onClick={() => {
                  setShowScanner(true);
                  setScanResult('');
                  setVerificationResult(null);
                }}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Scan QR Code
              </button>
            </div>
          )}

          {/* Scanner container */}
          {showScanner && (
            <div className="p-4">
              <div id="reader" className="w-full"></div>
            </div>
          )}

          {/* Display scanned token */}
          {scanResult && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-pink-600">Scanned Token:</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-gray-800 break-words">{scanResult}</p>
              </div>
            </div>
          )}

          {/* Display verification result */}
          {verificationResult && (
            <div className="mt-4">
              <h3 className="text-xl font-semibold text-pink-600">Verification Result:</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {verificationResult.valid ? (
                  <p className="text-green-600">
                    Token is valid. Scan count: {verificationResult.scanCount}
                  </p>
                ) : (
                  <p className="text-red-600">Token is invalid.</p>
                )}
              </div>
              <button
                onClick={() => {
                  setScanResult('');
                  setVerificationResult(null);
                  setShowScanner(true);
                }}
                className="mt-6 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-full inline-flex items-center gap-2 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Scan Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
