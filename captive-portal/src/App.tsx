import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import "./App.css";
import { attachListeners } from "./listeners";

type TerminalState = {
    terminal: Terminal;
    addons: {
        fit: FitAddon;
    };
};

function App() {
    const [state] = useState<TerminalState>({
        terminal: new Terminal(),
        addons: {
            fit: new FitAddon(),
        },
    });

    const terminalRef = useRef(null);

    useEffect(() => {
        const handleWindowResize = () => {
            if (state.terminal) {
                state.addons.fit.fit();
            }
        };

        window.addEventListener("resize", handleWindowResize);

        return () => {
            window.removeEventListener("resize", handleWindowResize);
        };
    }, [state.terminal, state.addons.fit]);

    useEffect(() => {
        if (!state.terminal.element && terminalRef.current) {
            state.terminal.open(terminalRef.current);
            state.terminal.loadAddon(state.addons.fit);
            state.addons.fit.fit();
            attachListeners(state.terminal);
        }
    }, [state.terminal, state.addons.fit]);

    return <div className='terminal-parent' ref={terminalRef}></div>;
}

export default App;
