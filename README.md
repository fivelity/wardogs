# BF6 Mod Template

Couldn't find a solid, up-to-date bf6 modding template...
So I created my own BF6 Mod Template to suit my needs. 
Based on the following (credits):

[Bf6mods](https://github.com/bf6mods/bf6mods) - used for initial project setup, cli tools. Modified the `.bf6/*` config to handle `bf6-portal-mod-types`. See [docs](https://bf6mods.github.io/bf6mods).

[bf6-portal-mod-types](https://github.com/deluca-mike/bf6-portal-mod-types) - for up-to-date bf6 portal sdk types (v1.4.2.0). See [docs](https://deluca-mike.github.io/bf6-portal-mod-types/) 

[bf6-portal-utils](https://github.com/deluca-mike/bf6-portal-utils) - helpful utils to save time. See [README.md](https://github.com/deluca-mike/bf6-portal-utils#)


## Installation

Run `npm install` in this directory.

## Deploying Project to Portal

There are two different ways of deploying a project to portal.

### Manually Import

Just run `npm run build` in your project dir, open [portal.battlefield.com](https://portal.battlefield.com), click import, and select the `dist/mod.json` file.

### `npx @bf6mods/cli deploy`

To use this, you must first install puppeteer via `npm -g i puppeteer`, but after doing so you can just run this command, and you will
have your project deploy automatically for you.

Important note on this. The [portal.battlefield.com](https://portal.battlefield.com) will not update showing the changes from the deployed code. This is due to the browsers cache.


I don't take credit for anything in this repo. I just organized the tools I needed into a base template for my needs. Feel free to use. 

Special thanks to **deluca-mike** for having the only relavent repos I found with latest Portal SDK and **bf6mods** for insights, cli tools, and initial project config/sdk.