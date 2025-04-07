import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, PartyPopper } from 'lucide-react';

function App() {
  const [scanResult, setScanResult] = useState<string>('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(success, error);

      function success(result: string) {
        scanner.clear();
        setScanResult(result);
        setShowScanner(false);
      }

      function error(err: any) {
        console.warn(err);
      }

      return () => {
        scanner.clear();
      };
    }
  }, [showScanner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-yellow-100 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-pink-600 mb-2 flex items-center justify-center gap-2">
            <PartyPopper className="w-8 h-8" />
            Fiesta del Roll
            <PartyPopper className="w-8 h-8" />
          </h1>
          <p className="text-lg md:text-xl text-yellow-700">RSVP Scanner</p>
        </div>

        <div className="w-full sm:max-w-md md:max-w-lg mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
          {!showScanner && !scanResult && (
            <div className="p-8 text-center">
              <button
                onClick={() => setShowScanner(true)}
                className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full inline-flex items-center gap-2 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                Scan QR Code
              </button>
            </div>
          )}

          {showScanner && (
            <div className="p-4">
              <div id="reader" className="w-full"></div>
            </div>
          )}

          {scanResult && (
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-pink-600 mb-4">Scan Result:</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-gray-800 break-words">{scanResult}</p>
              </div>
              <button
                onClick={() => {
                  setScanResult('');
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
