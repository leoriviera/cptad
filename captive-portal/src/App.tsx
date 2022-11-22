import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";

import "./App.css";

import { Storyteller } from "./Storyteller";

function App() {
    const terminal = new Terminal({
        convertEol: true,
        allowProposedApi: true,
    });

    const terminalRef = useRef(null);

    useEffect(() => {
        new Storyteller({
            t: terminal,
            ref: terminalRef,
        });
    }, []);

    return <div ref={terminalRef}></div>;
}

export default App;
