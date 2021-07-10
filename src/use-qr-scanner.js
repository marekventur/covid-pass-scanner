import React, { useEffect, useState } from "react";

export function useQrScanner({
    id
  }) {
    const [data, setData] = useState(null);
    const instance = React.useRef(null);
  
    useEffect(() => {
      try {
        setData(null);
        // eslint-disable-next-line
        const scanner = new Html5Qrcode(id);
        instance.current = scanner;
        scanner
          .start(
            { facingMode: "environment" },
            { formatsToSupport: [ /*Html5QrcodeSupportedFormats.QR_CODE*/ 0 ] },
            data => {
              setData(data)
            },
            error => { /* this happens if no code is found */ }
          )
          .catch(console.error);

          // unmount
          return () => scanner.stop();
      } catch (error) {
        console.error(error)
      }
    }, [id]);
  
    return { data };
  }