import "./input-button.css";

import { useState, useRef } from "react";


export function InputTextButton({ children, onValue }) {
    const [visible, setVisible] = useState(false);
    const [value, setValue] = useState("");
    const inputRef = useRef();
    const onConfirm = () => {
        if (value) {
          onValue(value);
        }
        setVisible(false);
        setValue("");
        inputRef.current?.blur();
    }
    return <div className={`input-button ${visible ? "input-button--visible": ""}`}>
      <input 
        ref={inputRef}
        value={value}
        onChange={({target}) => setValue(target.value)}
        onBlur={onConfirm}
        onKeyPress={({ charCode }) => {
          if (charCode === 13) {
            onConfirm()
          }
        }}
        placeholder="HC1:6BFOXN+TSMAHN-HO.PG:MCU62$"
      />
      <button onClick={() => {
        if (!visible && inputRef.current) {
          inputRef.current.focus();
          setVisible(true);
        }
      }}>{children}</button>
    </div>
}

export function InputFileButton({ children, onValue }) {
  const inputRef = useRef();

  return <div className="input-button">
    <input 
      className="upload-file-button"
      type="file" 
      ref={inputRef}
      onChange={e => {
        const file = inputRef.current.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function (evt) {
              onValue(reader.result);
            }
            reader.onerror = console.error;
        }
      }}
    />
    <button onClick={() => {
      inputRef.current?.click();
    }}>{children}</button>
  </div>
}