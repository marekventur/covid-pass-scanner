import { useEffect, useState } from "react";
import { BrowserQRCodeReader } from '@zxing/browser';

export const useQrScanner = ({
  onError = console.error,
  onData
} = {}) => {
  const [previewElement, setPreviewElement] = useState(null);

  useEffect(() => {
    if (!previewElement) {
      return 
    }
    try {
      let reader = undefined;
      new BrowserQRCodeReader().decodeFromConstraints({ video: { facingMode: "environment" } }, previewElement, (result, error, controls) => {
        if (result) {
          onData(result.text);
        }
      }).then(r => reader = r)
      return () => reader?.stop();
    } catch (error) {
      onError(error);
    }
  }, [previewElement, onError, onData]);

  return { previewRef: setPreviewElement };
}
