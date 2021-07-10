import { useEffect, useState } from "react";
import { BrowserQRCodeReader } from '@zxing/browser';

export const useQrScanner = ({
    onError = console.error,
  }) => {
    const [data, setData] = useState(null);
    const [previewElement, setPreviewElement] = useState(null);

    useEffect(() => {
      if (!previewElement) {
        return 
      }
      try {
        setData(null);
        let stop = () => {};
        new BrowserQRCodeReader().decodeFromConstraints({ video: { facingMode: "environment" } }, previewElement, (result, error, controls) => {
          if (result) {
            setData(result.text);
          }
        }).then(reader => console.log(reader))
        return () => stop();
      } catch (error) {
        onError(error);
      }
    }, [previewElement]);
    return { data, previewRef: setPreviewElement };
  }