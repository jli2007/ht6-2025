// panels/CSSEditorPanel.jsx
import React from 'react';
import { WC } from "../components/WC.jsx";
import { CSSEditor } from "../components/CSSEditor.jsx";

export const CSSEditorPanel = () => {
    return (
        <WC>
            <CSSEditor />
        </WC>
    );
};

export default CSSEditorPanel;