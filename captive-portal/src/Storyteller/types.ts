export type Command = {
    handler: (args: string[]) => void;
    helpText?: string;
};

export type Item = {
    name: string;
    description: string;
};

export type StoryPoint = { text: string[]; commands?: Record<string, Command> };

export type Room = {
    storyPoints: Record<string, StoryPoint>;
};
