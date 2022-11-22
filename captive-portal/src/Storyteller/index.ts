import chalk from "chalk";
import { MutableRefObject } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";

export class Storyteller {
    static prompt = `${chalk.red("captive")}@${chalk.yellowBright(
        "portal"
    )}:~$ `;

    terminal: Terminal;
    options: {
        ref: MutableRefObject<HTMLElement | null>;
        addons: [FitAddon, WebLinksAddon];
    };

    history: string[] = [];
    command = "";

    listeners: {
        match: (code: number) => boolean;
        handler: (options: { e: KeyboardEvent }) => string | void;
    }[] = [
        {
            match: (code) => code === 9,
            handler: () => {
                // TODO - tab completion
                return undefined;
            },
        },
        {
            match: (code) => code === 13,
            handler: (_) => {
                if (this.command !== "") {
                    this.execute(this.command);
                    this.command = "";
                }

                return `\n${Storyteller.prompt}`;
            },
        },
        {
            // Match visible characters
            match: (code) => code >= 32 && code <= 126,
            handler: ({ e }) => {
                console.log(this.command);
                this.command += e.key;
                return e.key;
            },
        },
        {
            match: (code) => code === 127,
            handler: (_) => {
                if (this.command.length === 0) {
                    return undefined;
                }

                this.command = this.command.slice(0, -1);
                return "\b \b";
            },
        },
    ];

    handlers: Record<string, (args: string[]) => void> = {
        clear: () => {

        },
        whoami: () => {
            this.terminal.write(`\nyou are my ${chalk.red("captive")}`);
        },
        help: () => {
            this.terminal.write(
                "You've stupidly connected to my rogue wireless network, and I've taken your device [captive]."
            );
        },
    };

    autocompleters: Record<string, (args: string[]) => string | void> = {};

    constructor(args: {
        t: Terminal;
        ref: MutableRefObject<HTMLElement | null>;
    }) {
        this.terminal = args.t;

        this.options = {
            ref: args.ref,
            addons: [
                new FitAddon(),
                new WebLinksAddon(
                    (_, uri) => {
                        this.terminal.write(
                            "\b \b".repeat(this.command.length)
                        );

                        this.command = uri;
                        this.terminal.write(uri);
                    },
                    {
                        urlRegex: /\[([^\]]+)\]/,
                    }
                ),
            ],
        };

        if (!this.terminal.element && this.options.ref.current) {
            this.terminal.open(this.options.ref.current);

            this.options.addons.forEach((addon) => {
                this.terminal.loadAddon(addon);
            });
            this.options.addons[0].fit();
            this.attachListeners();

            const lines = [
                // "You look scared, you poor little thing. You should be.",
                // "There's no escape. You're mine now.",
                // "However, I'm feeling generous, so I'll let you run a few commands.",
                "You can't [help] yourself, can you?",
            ];

            this.terminal.write(lines.join("\n"));
            this.prompt();
        }
    }

    attachListeners() {
        this.terminal.onKey(({ key, domEvent }) => {
            const code = key.charCodeAt(0);

            const output = (
                this.listeners.find((listener) => listener.match(code)) ?? {
                    handler: () => {
                        console.debug("No listener for key at code", code);
                        return key;
                    },
                }
            ).handler({
                e: domEvent,
            });

            this.terminal.write(output ?? "");
        });
    }

    execute(command: string) {
        this.history.push(command);
        const [commandName, ...args] = command.split(" ");

        this.terminal.write("\n");

        (
            this.handlers[commandName] ??
            ((_) => {
                this.terminal.write(`psh: command not found: ${commandName}`);
            })
        )(args);
    }

    autocomplete(commandName: string, args: string[]) {
        const suggestions =
            this.autocompleters[commandName] ??
            ((a) => {
                if (a.length > 1) {
                    console.debug(
                        `No listener for input ${commandName} ${a.join(" ")}`
                    );
                    return undefined;
                }

                const possibleCommands = Object.keys(this.handlers).filter(
                    (handler) => handler.startsWith(commandName)
                );

                return possibleCommands;
            })(args);

        console.log(suggestions);
    }

    prompt() {
        this.terminal.write(`\n${Storyteller.prompt}`);
    }
}
