import chalk from "chalk";
import { MutableRefObject } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { Command, Item, Room, StoryPoint } from "./types";

export class Storyteller {
    static prompt = `${chalk.red("captive")}@${chalk.yellowBright(
        "portal"
    )}:~$ `;
    static strippedPrompt = Storyteller.prompt.replace(
        // eslint-disable-next-line no-control-regex
        /\x1B[[(?);]{0,2}(;?\d)*./g,
        ""
    );

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
                    const commands = Object.keys(this.availableCommands);

                    const matches = commands.filter((command) =>
                        command.startsWith(commandName)
                    );

                    if (matches.length === 0) {
                        return undefined;
                    }

                    if (matches.length === 1) {
                        this.command = matches[0];
                        return `\r\x1b[K${Storyteller.prompt}${this.command}`;
                    }

                    return [
                        "\r\n\x1b[K",
                        matches.map((m) => `[${m}]`).join("\n"),
                        `\r\x1b[${matches.length}A`,
                        `\x1b[${
                            Storyteller.strippedPrompt.length +
                            this.input.cursorPosition +
                            1
                        }G`,
                    ].join("");
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
                    this.historyIndex = 0;
                }

                return `\x1b[0J\n${Storyteller.prompt}`;
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

                this.historyIndex = nextIndex;

                return `\r\x1b[K${Storyteller.prompt}${this.command}`;
            },
        },
        {
            // Match left arrow key
            match: ({ key }) => key === "ArrowLeft" || key === "Left",
            handler: (_) => {
                if (this.input.cursorPosition === 0) {
                    return undefined;
                }

                this.input.cursorPosition -= 1;

                return "\x1b[D";
            },
        },
        {
            // Match right arrow key
            match: ({ key }) => key === "ArrowRight" || key === "Right",
            handler: (_) => {
                if (this.input.cursorPosition === this.command.length) {
                    return undefined;
                }

                this.input.cursorPosition += 1;

                return "\x1b[C";
            },
        },
        {
            // Match down arrow key
            match: ({ key }) => key === "ArrowDown" || key === "Down",
            handler: (_) => {
                if (this.history.length === 0) {
                    return undefined;
                }

                const nextIndex = this.input.historyIndex - 1;

                if (nextIndex < 0) {
                    this.historyIndex = 0;
                } else {
                    this.historyIndex = nextIndex;
                }

                return `\r\x1b[K${Storyteller.prompt}${this.command}`;
            },
        },
        {
            // Match visible characters
            match: ({ key }) => key.length === 1,
            handler: ({ e }) => {
                this.command = this.command + e.key;

                return [
                    "\r\x1b[K",
                    `${Storyteller.prompt}${this.command}`,
                    `\x1b[${
                        Storyteller.strippedPrompt.length +
                        this.input.cursorPosition +
                        1
                    }G`,
                ].join("");
            },
        },
        {
            // Match backspace
            match: ({ key }) => key === "Backspace",
            handler: (_) => {
                const newPosition = this.input.cursorPosition - 1;

                if (
                    this.command.length === 0 ||
                    this.input.cursorPosition === 0
                ) {
                    return undefined;
                }

                // Remove character at cursor position
                this.command =
                    this.command.slice(0, newPosition) +
                    this.command.slice(newPosition + 1);

                this.input.cursorPosition = newPosition;

                return [
                    "\r\x1b[K",
                    `${Storyteller.prompt}${this.command}`,
                    `\x1b[${
                        Storyteller.strippedPrompt.length +
                        this.input.cursorPosition +
                        1
                    }G`,
                ].join("");
            },
        },
    ];

    rooms: Record<string, Room> = {
        cell: {
            storyPoints: {
                start: {
                    text: ["Finally [awake], I see."],
                    commands: {
                        awake: {
                            handler: () => {
                                const lines = [
                                    "You stir slowly.",
                                    "You look around. You're in a damp, cold cell.",
                                    "Your head is thumping. The floor is cold.",
                                ];

                                this.wrapPrint(lines);
                            },
                        },
                    },
                },
            },
        },
    };

    commands: Record<string, Command> = {
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
                    this.availableCommands[commandName ?? "help"]?.helpText ??
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

    room: Room = this.rooms.cell;
    storyPoint: StoryPoint = this.room.storyPoints.start;

    worldItems: Item[] = [
        {
            name: "soap",
            description:
                "You squint at the wrapper's tiny text. \"It's a bar of soap. What more do you want?\". Bit passive aggressive, especially for some soap found in a dingy dungeon.",
        },
    ];

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

            this.setStoryPoint(this.storyPoint);
        }
    }

    wrapPrint(data: string | string[]) {
        const { cols } = this.terminal;

        const lines = Array.isArray(data) ? data : data.split("\n");

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

    setStoryPoint(s: StoryPoint) {
        this.storyPoint = s;
        this.terminal.clear();
        this.wrapPrint(s.text);
        this.prompt();
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

        const { handler } = this.availableCommands[commandName] || {
            handler: (_) => {
                this.terminal.write(`psh: command not found: ${commandName}`);
            },
        };

        handler(args);
    }

    prompt() {
        this.terminal.write(`\n${Storyteller.prompt}`);
    }

    get command() {
        return this.currentHistory[this.input.historyIndex];
    }

    set historyIndex(index: number) {
        this.input.historyIndex = index;
        this.input.cursorPosition = this.command.length;
    }

    set command(command: string) {
        this.currentHistory[this.input.historyIndex] = command;
        this.input.cursorPosition = command.length;
    }

    get availableCommands() {
        return {
            ...this.commands,
            ...this.storyPoint.commands,
        };
    }
}
