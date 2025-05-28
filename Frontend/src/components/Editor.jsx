import React from 'react';
import { Editor as CodeEditor } from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import 'prismjs/themes/prism.css';
import './Editor.css';

const Editor = ({ file, onChange }) => {
    const handleChange = (code) => {
        onChange(code);
    };

    return (
        <div className="editor">
            <div className="editor-header">
                <span className="file-name">{file.name}</span>
            </div>
            <CodeEditor
                value={file.content}
                onValueChange={handleChange}
                highlight={code => highlight(code, languages[file.language] || languages.javascript, file.language)}
                padding={10}
                style={{
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 14,
                }}
            />
        </div>
    );
};

export default Editor; 