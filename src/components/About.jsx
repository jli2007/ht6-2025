import React from "react";
import { versions } from "uxp";
import os from "os";
import "./About.css";

export const About = (props) => {
    return (
        <form method="dialog" className="aboutDialog">
            <sp-heading>Chroma</sp-heading>
            <sp-divider size="large" />

            <sp-body>
                <strong>Chroma</strong> lets you extract the visual style of any image — including colors, contrast,
                and effects — and apply it to layers inside Photoshop using CSS-like styling rules.
                Paste in a visual "theme" and instantly recreate that look across your own assets.
            </sp-body>

            <webview
                id="webview"
                width="100%"
                height="360px"
                src="image.html"
            ></webview>

            <sp-body class="well">
                <sp-icon name="ui:InfoSmall" size="s"></sp-icon>
                Features include a smart code editor, AI-powered style extraction, and direct Photoshop layer styling
                based on modular style sheets — no manual tweaking required.
            </sp-body>

            <sp-detail>VERSIONS</sp-detail>
            <div className="table">
                <div>
                    <sp-detail>PLUGIN:</sp-detail>
                    <sp-body>{versions.plugin}</sp-body>
                </div>
                <div>
                    <sp-detail>OPERATING SYSTEM:</sp-detail>
                    <sp-body>{os.platform()} {os.release()}</sp-body>
                </div>
                <div>
                    <sp-detail>UXP PLATFORM:</sp-detail>
                    <sp-body>{versions.uxp}</sp-body>
                </div>
            </div>

            <sp-button-group>
                <sp-button
                    tabIndex={0}
                    variant="secondary"
                    quiet
                    onClick={() => props.dialog.close("cancel")}
                >
                    Cancel
                </sp-button>
                <sp-button
                    tabIndex={0}
                    autoFocus
                    variant="primary"
                    onClick={() => props.dialog.close("ok")}
                >
                    OK
                </sp-button>
            </sp-button-group>
        </form>
    );
};
