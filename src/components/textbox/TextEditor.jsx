import { useState } from 'react';
import './TextEditor.css';

function TextEditor() {
  const [text, setText] = useState('');

  return (
    <div className="text-editor">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type here..."
        className="text-area"
      />
    </div>
  );
}

export default TextEditor;