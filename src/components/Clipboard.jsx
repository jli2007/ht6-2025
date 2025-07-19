import { useEffect } from 'react';
import './Clipboard.css';

function Clipboard({ show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="clipboard-popup">
      Copied to clipboard!
    </div>
  );
}

export default Clipboard;