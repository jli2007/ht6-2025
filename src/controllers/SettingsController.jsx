import React from "react";
import ReactDOM from "react-dom";
import { Settings } from "../components/Settings.jsx";

const _id = Symbol("_id");
const _root = Symbol("_root");
const _Component = Symbol("_Component");
const _dialogOpts = Symbol("_dialogOpts");

export class SettingsController {
    
    constructor({ id, ...dialogOpts } = {}) {
        this[_id] = null;
        this[_root] = null;
        this[_Component] = null;
        this[_dialogOpts] = {};

        this[_Component] = Settings;
        this[_id] = id || "settings";
        this[_dialogOpts] = Object.assign({}, {
            title: "CSS to Photoshop Settings",
            resize: "none",
            size: {
                width: 600,
                height: 500
            }
        }, dialogOpts);
        ["run"].forEach(fn => this[fn] = this[fn].bind(this));
    }

    async run() {
        if (!this[_root]) {
            this[_root] = document.createElement("dialog");
            const Component = this[_Component];
            ReactDOM.render(
                React.createElement(Component, { 
                    dialog: this[_root], 
                    onClose: () => this.close() 
                }), 
                this[_root]
            );
        }
        document.body.appendChild(this[_root]);

        await this[_root].showModal(this[_dialogOpts]);
        this[_root].remove();
    }

    close() {
        if (this[_root]) {
            this[_root].close();
        }
    }
} 