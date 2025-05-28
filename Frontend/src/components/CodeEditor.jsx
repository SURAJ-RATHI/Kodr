import React, { useState, useEffect } from 'react';
import Editor from 'react-simple-code-editor';
import Prism, { highlight } from 'prismjs';

import 'prismjs/themes/prism.css';
import './CodeEditor.css';

const CodeEditor = ({ initialValue, onChange, language }) => {
    const [code, setCode] = useState(initialValue || '');
    const [lineNumbers, setLineNumbers] = useState([]);

    useEffect(() => {
        // Update line numbers when code changes
        const lines = code.split('\n');
        setLineNumbers(lines.map((_, i) => i + 1));
    }, [code]);

    const handleChange = (newCode) => {
        setCode(newCode);
        onChange(newCode);
    };

    const highlightCode = (code) => {
        // Use Prism.languages directly
        const languageGrammar = Prism.languages[language] || Prism.languages.javascript;
        return highlight(code, languageGrammar, language);
    };

    return (
        <div className="code-editor-container">
            <div className="line-numbers">
                {lineNumbers.map(num => (
                    <div key={num} className="line-number">{num}</div>
                ))}
            </div>
            <Editor
                value={code}
                onValueChange={handleChange}
                highlight={highlightCode}
                padding={10}
                style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 14,
                    lineHeight: 1.5,
                }}
                textareaId="code-editor"
                className="code-editor"
                preClassName="code-editor-pre"
            />
        </div>
    );
};

export default CodeEditor;