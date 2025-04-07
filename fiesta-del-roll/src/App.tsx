import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, PartyPopper, Upload } from 'lucide-react';

function App() {
  const [scanResult, setScanResult] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; scanCount: number } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );

      scanner.render(onScanSuccess, onScanError);

      async function onScanSuccess(result: string) {
        scanner.clear();
        setScanResult(result);
        setShowScanner(false);
        const token = JSON.parse(result).token;

        try {
          const response = await fetch('https://fiesta-del-roll-rsvp.onrender.com/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await response.json();
          setVerificationResult(data);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

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
    
    <div className="h-screen w-screen bg-gradient-to-br from-purple-800 via-indigo-700 to-blue-800 overflow-auto flex flex-col animate-gradient-x">
      
      {/* Header with floating animation */}
      <header className="text-center py-8 relative">
        {/* Subtle pulsing background overlay for the header */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 animate-pulse pointer-events-none"></div>
        <h1 className="relative text-4xl md:text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3 animate-float">
          <PartyPopper className="w-10 h-10 text-yellow-300" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-200 to-pink-300">
            Fiesta del Roll
          </span>
          <PartyPopper className="w-10 h-10 text-yellow-300" />
        </h1>
        <p className="relative text-lg text-blue-200 animate-fade-in">
          RSVP Scanner & CSV Upload
        </p>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 md:px-8 pb-8 w-full">
        {/* 
          A two-column grid on larger screens, single column on mobile.
          Removed max-w-7xl mx-auto so it can stretch across the entire screen.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          
          {/* CSV Upload Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Upload className="w-8 h-8 text-blue-300" />
              Upload CSV File
            </h2>
            <div className="space-y-6">
              <div className="flex items-center justify-center w-full">
                <label className="w-full flex flex-col items-center px-6 py-8 bg-white/5 text-blue-200 rounded-xl border-2 border-dashed border-blue-300/30 cursor-pointer hover:bg-white/10 hover:border-blue-300/50 transition-all duration-300">
                  <Upload className="w-10 h-10 mb-3" />
                  <span className="text-lg">Select CSV file</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {csvFile && (
                <p className="text-blue-200 text-center animate-fade-in">
                  Selected: {csvFile.name}
                </p>
              )}
              <button
                onClick={handleUpload}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
              >
                <Upload className="w-6 h-6" />
                Upload CSV
              </button>
              {uploadMessage && (
                <p className="text-center text-blue-200 bg-white/10 p-4 rounded-xl animate-fade-in">
                  {uploadMessage}
                </p>
              )}
            </div>
          </div>

          {/* QR Code Scanner & Verification Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <QrCode className="w-8 h-8 text-blue-300" />
              Scan & Verify QR Code
            </h2>
            
            {!showScanner && !scanResult && (
              <div className="text-center">
                <button
                  onClick={() => {
                    setShowScanner(true);
                    setScanResult('');
                    setVerificationResult(null);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
                >
                  <QrCode className="w-6 h-6" />
                  Scan QR Code
                </button>
              </div>
            )}

            {showScanner && (
              <div className="rounded-xl overflow-hidden mt-4 shadow-2xl animate-fade-in">
                <div id="reader" className="w-full"></div>
              </div>
            )}

            {scanResult && (
              <div className="mt-6 space-y-4 animate-fade-in">
                <h3 className="text-xl font-bold text-white">Scanned Token:</h3>
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-blue-200 break-words">{scanResult}</p>
                </div>
              </div>
            )}

            {verificationResult && (
              <div className="mt-6 space-y-4 animate-fade-in">
                <h3 className="text-xl font-bold text-white">Verification Result:</h3>
                <div
                  className={`rounded-xl p-6 ${
                    verificationResult.valid && verificationResult.scanCount === 1
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-300/30'
                      : 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-300/30'
                  }`}
                >
                  <p
                    className={`text-lg font-semibold ${
                      verificationResult.valid && verificationResult.scanCount === 1
                        ? 'text-green-300'
                        : 'text-red-300'
                    }`}
                  >
                    {verificationResult.valid 
                      ? verificationResult.scanCount === 1
                        ? "✓ Token is valid (First scan)"
                        : `⚠ Token has been scanned ${verificationResult.scanCount} times!`
                      : '✗ Token is invalid'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setScanResult('');
                    setVerificationResult(null);
                    setShowScanner(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-lg"
                >
                  <QrCode className="w-6 h-6" />
                  Scan Another
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
