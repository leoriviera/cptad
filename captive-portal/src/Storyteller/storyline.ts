const commands = {
    about: {
        helpText:
            "Use the [about] command with an item in your [inventory] to read a description.",
    },
    inventory: {
        helpText:
            "These are the items you've managed to scavenge and shove in your pockets.",
    },
    help: {
        helpText:
            "Use with another command to figure out what it does. For example, [help about].",
    },
};

const items = {
    soap: {
        name: "Bar of soap",
        description: "It's a bar of soap.",
    },
};

const inventory = [items.soap];

const printInventory = () => {
    const items = `You have the following items in your pockets:\n${inventory
        .map((i) => i.name)
        .join("\n")}`;
};

const storyPoints = {
    opening: {
        text: [
            "You wake up in a dark, dingy cell. Your eyes are closed, but you can feel the dry stone beneath your curled body, and the cramped walls of the room.",
            "You can try to [open eyes], you can [yell] for help or you can [sit still], waiting for... well, waiting for something.",
        ],
        commands: {
            help: () => {
                // Println "You can try to [open eyes], [yell] for help, or [sit still]."
            },
            "open eyes": () => {
                // Set new storypoint?
            },
            yell: () => {
                // Set new storypoint?
            },
            "sit still": () => {
                // Set new storypoint?
            },
        },
    },
    yell: {
        text: [],
        commands: {},
    },
};

export const openingYell = [
    '"Hello? Is anyone there?"',
    "Your words echo the empty hallways. Nobody is there.",
];
