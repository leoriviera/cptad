import { Terminal } from "xterm";

export const attachListeners = (t: Terminal): void => {
    const listeners: Record<
        string,
        (t: Terminal, options: { e: KeyboardEvent }) => void
    > = {};

    t.onKey(({ key, domEvent }) => {
        listeners[key] ??
            ((terminal, _o) => {
                terminal.write(key);
            })(t, { e: domEvent });
    });
};
