import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism-tomorrow.css';
import './CodeEditor.css';

const CodeEditor = ({ value, language = 'javascript', onValueChange }) => {
  return (
    <div className="code-editor-container">
      <div className="editor-content">
        <Editor
          value={value}
          onValueChange={onValueChange}
          highlight={code => highlight(code, languages[language], language)}
          padding={10}
          style={{
            fontFamily: '"Fira Code", monospace',
            fontSize: 14,
            backgroundColor: '#1e1e1e',
            minHeight: '300px',
            borderRadius: '4px'
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditor; 