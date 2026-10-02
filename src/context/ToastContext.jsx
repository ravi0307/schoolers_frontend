import { createContext, useContext, useState, useCallback, useRef } from "react";
import Toast from "../components/ui/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 2500);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && <Toast>{message}</Toast>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
