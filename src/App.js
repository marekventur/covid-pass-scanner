import './reset.css';
import './main.css';
import { useState } from "react";
import { useQrScanner } from './use-qr-scanner';
import { Result } from "./result";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaste, faUpload, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { InputTextButton, InputFileButton } from './input-button';
import { BrowserQRCodeReader } from '@zxing/browser';


function App() {
  const [showMore, setShowMore] = useState(false);
  const [data, setData] = useState(null);
  const { previewRef } = useQrScanner({ onData: setData });
  return (
    <div className="app">

      <header>
        <section className="bar">
          <h1>Covid Pass Scanner</h1>
          <button 
            className="more-info"
            onClick={() => setShowMore(!showMore)}
          >
            <FontAwesomeIcon icon={faInfoCircle} title="Open text input"/>
          </button>
          
          <p className={`show-more ${showMore ? "show-more--expanded" : ""}`}>
            This app acts as a QR code scanner for EU vaccination passports 
            and displays the results below. You can use this to verify the 
            validity of a given vaccine passport. 
          </p>
        </section>

        <section className="actions">
          <InputTextButton onValue={setData}>
            <FontAwesomeIcon icon={faPaste} title="Open text input"/>
          </InputTextButton>
          <InputFileButton
            onValue={url => void
              new BrowserQRCodeReader()
                .decodeFromImageUrl(url)
                .then(d => setData(d?.text))
            }
          >
            <FontAwesomeIcon icon={faUpload} title="Upload image" />
          </InputFileButton>
        </section>
      </header>

      

      <Result data={data} />

      <div className="viewport">
        <video ref={previewRef} />
      </div>

    </div>
  );
}

export default App;
