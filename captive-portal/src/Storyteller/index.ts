import chalk from "chalk";
import { MutableRefObject } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { Item } from "./types";

// TODO - fix backspace on left scroll

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
    currentHistory: string[] = ["", ...this.history];

    input = {
        cursorPosition: 0,
        historyIndex: 0,
    };

    listeners: {
        match: (e: KeyboardEvent) => boolean;
        handler: (options: { e: KeyboardEvent }) => string | void;
    }[] = [
        {
            // Match [Tab] character
            match: ({ key }) => key === "Tab",
            handler: () => {
                const [commandName, ...args] = this.command.split(" ");

                if (args.length === 0) {
                    const commands = Object.keys(this.commands);

                    const matches = commands.filter((command) =>
                        command.startsWith(commandName)
                    );

                    if (matches.length === 1) {
                        this.command = matches[0];
                        return `\r\x1b[K${Storyteller.prompt}${this.command}`;
                    }
                }

                // TODO - tab completion
                return undefined;
            },
        },
        {
            // Match [Enter] character
            match: ({ key }) => key === "Enter",
            handler: (_) => {
                if (this.command !== "") {
                    this.execute(this.command);
                    this.currentHistory = ["", ...this.history];
                    this.setHistoryIndex();

                    console.log(this.currentHistory);
                }

                return `\n${Storyteller.prompt}`;
            },
        },
        {
            // Match up arrow key
            match: ({ key }) => key === "ArrowUp" || key === "Up",
            handler: (_) => {
                if (this.history.length === 0) {
                    return undefined;
                }

                const nextIndex = this.input.historyIndex + 1;

                if (nextIndex >= this.history.length + 1) {
                    return undefined;
                }

                this.setHistoryIndex(nextIndex);

                return `\r\x1b[K${Storyteller.prompt}${this.command}`;
            },
        },
        // {
        //     // Match left arrow key
        //     match: ({ key }) => key === "ArrowLeft" || key === "Left",
        //     handler: (_) => {},
        // },
        {
            // Match down arrow key
            match: ({ key }) => key === "ArrowDown" || key === "Down",
            handler: (_) => {
                if (this.history.length === 0) {
                    return undefined;
                }

                const nextIndex = this.input.historyIndex - 1;

                if (nextIndex < 0) {
                    this.setHistoryIndex();
                } else {
                    this.setHistoryIndex(nextIndex);
                }

                return `\r\x1b[K${Storyteller.prompt}${this.command}`;
            },
        },
        {
            // Match visible characters
            match: ({ key }) => key.length === 1,
            handler: ({ e }) => {
                this.command = this.command + e.key;
                return e.key;
            },
        },
        {
            // Match backspace
            match: ({ key }) => key === "Backspace",
            handler: (_) => {
                if (this.command.length === 0) {
                    return undefined;
                }

                this.command = this.command.slice(0, -1);
                return "\b \b";
            },
        },
    ];

    commands: Record<
        string,
        {
            handler: (args: string[]) => void;
            helpText?: string;
        }
    > = {
        exit: {
            handler: () => {
                this.terminal.write("Nice try! There's no escape!");
            },
        },
        clear: {
            handler: () => {},
        },
        whoami: {
            handler: () => {
                this.terminal.write(`\nyou are my ${chalk.red("captive")}`);
            },
        },
        help: {
            handler: (args) => {
                const [commandName] = args;

                const helpText =
                    this.commands[commandName ?? "help"]?.helpText ??
                    `No help text for "${
                        commandName ?? "undefined command"
                    }". Guess this isn't so helpful.`;

                this.terminal.write(helpText);
            },
            helpText:
                "Use [help] with another command to figure out what it does. For example, [help about].",
        },
        inventory: {
            handler: (args) => {
                const items =
                    this.inventory.length === 0
                        ? `You dig around in your pockets, and find absolutely nothing. "Maybe I'll find something if I look around a bit more," you think to yourself.`
                        : `You turn out your pockets and find\n${this.inventory
                              .map((i) => i.name)
                              .join("\n")}`;

                this.terminal.write(items);
            },
        },
        get: {
            handler: (args) => {
                const [itemName] = args;
                this.addItem(itemName);
            },
        },
        about: {
            handler: (args) => {
                const [itemName] = args;
                const item = this.inventory.find(
                    (item) => item.name === itemName.toLowerCase()
                );

                if (!item) {
                    this.terminal.write(
                        "You don't have that item! Try looking around a bit more."
                    );
                    return;
                }

                this.terminal.write(item.description);
            },
        },
        history: {
            helpText:
                "Prints the last 10 commands by default. Use [history <n>] to print the last <n> commands.",
            handler: (args) => {
                const [nString] = args;
                const n = parseInt(nString) || 10;

                const history = this.history
                    .slice(1, n + 1)
                    .reverse()
                    .map((c) => `[${c}]`)
                    .join("\n");

                this.terminal.write(history);
            },
        },
    };

    worldItems: Item[] = [
        {
            name: "soap",
            description:
                "You squint at the wrapper's tiny text. \"It's a bar of soap. What more do you want?\". Bit passive aggressive, especially for some soap found in a dingy dungeon.",
        },
    ];

    setHistoryIndex(index = 0) {
        this.input.historyIndex = index;
    }

    inventory: Item[] = [];

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
                // "You can't [help] yourself, can you?",
                "You [look] scared. You should be.",
                "You've stupidly connected to my rogue wireless network, and I've taken your device captive.",
                "Good luck escaping! MwahahHAhHAhahAhAh *cough*",
            ];

            this.wrapPrint(lines.join("\n"));

            this.prompt();
        }
    }

    wrapPrint(data: string) {
        const { cols } = this.terminal;

        const lines = data.split("\n");

        const wrappedLines = lines
            .map((line) => {
                const segments = line
                    .split(" ")
                    .reduce<string[]>((acc, word) => {
                        if (acc.length === 0) {
                            return [word];
                        }

                        const s = [...acc];

                        const currentSegment = s.pop() as string;

                        if (
                            !currentSegment.startsWith("[") ||
                            (currentSegment.startsWith("[") &&
                                currentSegment.endsWith("]"))
                        ) {
                            return [...s, currentSegment, word];
                        }

                        if (currentSegment.startsWith("[")) {
                            return [...s, `${currentSegment} ${word}`];
                        }

                        return [...acc, word];
                    }, []);

                return segments
                    .reduce(
                        (acc, word) => {
                            const lines = [...acc];

                            const currentLine = lines.pop() as string;

                            if (currentLine.length + word.length < cols) {
                                return [
                                    ...lines,
                                    `${currentLine} ${word}`.trim(),
                                ];
                            } else {
                                return [...lines, currentLine, word];
                            }
                        },
                        [""]
                    )
                    .join("\n");
            })
            .join("\n");

        this.terminal.write(wrappedLines);
    }

    attachListeners() {
        this.terminal.onKey(({ key, domEvent }) => {
            console.log(this.currentHistory);
            const output = (
                this.listeners.find((listener) => listener.match(domEvent)) ?? {
                    handler: () => {
                        console.debug("No listener for key at code", key);
                        return key;
                    },
                }
            ).handler({
                e: domEvent,
            });

            this.terminal.write(output ?? "");
        });
    }

    addItem(name: string) {
        const item = this.worldItems.find(
            (item) => item.name === name.toLowerCase()
        );

        if (!item) {
            console.error("No item with name", name);
            return;
        }

        this.terminal.write(`You now have ${chalk.green(item.name)}!`);
        this.inventory.push(item);
    }

    execute(command: string) {
        this.history = [command, ...this.history];

        const [commandName, ...args] = command.split(" ");

        this.terminal.write("\n");

        const { handler } = this.commands[commandName] || {
            handler: (_) => {
                this.terminal.write(`psh: command not found: ${commandName}`);
            },
        };

        handler(args);
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

                const possibleCommands = Object.keys(this.commands).filter(
                    (handler) => handler.startsWith(commandName)
                );

                return possibleCommands;
            })(args);

        console.log(suggestions);
    }

    prompt() {
        this.terminal.write(`\n${Storyteller.prompt}`);
    }

    get command() {
        return this.currentHistory[this.input.historyIndex];
    }

    set command(command: string) {
        this.currentHistory[this.input.historyIndex] = command;
        this.input.cursorPosition = command.length;
    }
}
