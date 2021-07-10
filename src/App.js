import './reset.css';
import './main.css';
import { useState, useRef } from "react";
import { useQrScanner } from './use-qr-scanner';
import { Result } from "./result";

function App() {
  const [showMore, setShowMore] = useState(false);
  const { data, previewRef } = useQrScanner({});
  return (
    <div className="app">

      <header>
        <h1>Covid Pass Scanner</h1>
        <p>Hold code in middle of viewport.{" "}
          <button onClick={() => setShowMore(!showMore)}>Learn more...</button>
        </p>
        <p className={`show-more ${showMore ? "show-more--expanded" : ""}`}>
          This app acts as a QR code scanner for EU vaccination passports 
          and displays the results below. You can use this to verify the 
          validity of a given vaccine passport. 
        </p>
      </header>

      <Result data={data} />

      <div className="viewport">
        <video ref={previewRef} />
      </div>

    </div>
  );
}

export default App;
