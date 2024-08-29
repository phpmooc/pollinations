import React from 'react';
import Markdown from 'markdown-to-jsx';
import { Container } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { ImageURLHeading } from './styles';

const useStyles = makeStyles((theme) => ({
    root: {
        maxWidth: 700,
        margin: '0 auto',
        padding: theme.spacing(2),
    },
}));

const markdownContent = `
| Project | Description |
|--------------|-------------|
| [SillyTavern](https://docs.sillytavern.app/extensions/stable-diffusion/) | An LLM frontend for power users. Pollinations permits it to generate images. |
| [Pollinator](https://github.com/g-aggarwal/Pollinator) by @gaurav_87680 | An open-source Android app for text-to-image generation using Pollinations.ai's endpoint. |
| [Discord Bot](https://discord.com/oauth2/authorize?client_id=1123551005993357342) by @Zngzy | A Discord bot that uses Pollinations.ai for generating images based on user prompts. [GitHub Repository](https://github.com/Zingzy/pollinations.ai-bot) |
| [Telegram Bot](http://t.me/pollinationsbot) by Wong Wei Hao | A Telegram bot that uses Pollinations.ai for generating images based on user prompts. |
| [WhatsApp Group](https://chat.whatsapp.com/KI37JqT5aYdL9WBYMyyjDV) by @dg_karma | A WhatsApp group for discussing and sharing projects related to Pollinations.ai. |
| [Karma.yt](https://karma.yt) by @dg_karma | A project that uses Pollinations.ai for generating AI-driven content for Karma.yt. |
| [StorySight](https://github.com/abiral-manandhar/storySight) | App aiming to help children with learning disabilities to learn by visualizing abstract concepts. Made using Django and Pollinations.ai. Submitted to: [https://devpost.com/software/storysight] |
| [Anyai](#) by @meow_18838 | A Discord bot and community that amongst others leverages Pollinations.ai for generating AI-driven content. |
| [Python Package](https://pypi.org/project/pollinations/) by @flo.a | A Python package that allows developers to easily integrate Pollinations.ai's image generation capabilities into their projects. |
| [Websim](https://websim.ai/c/bXsmNE96e3op5rtUS) by @thomash_pollinations | A web simulation tool that integrates Pollinations.ai for generating AI-driven content. |
| [FlowGPT](https://flowgpt.com/p/instant-image-generation-with-chatgpt-and-pollinationsai) | Generate images on-demand with ChatGPT and Pollinations.AI. |
| [Toolkitr](https://github.com/toolkitr/pollinations.ai) | Another Python wrapper for Pollinations. |
`;

const ProjectsSection = () => {
    const classes = useStyles();

    return (
        <Container className={classes.root}>
            <ImageURLHeading>Integrations</ImageURLHeading>
            <Markdown>{markdownContent}</Markdown>
        </Container>
    );
};

export default ProjectsSection;