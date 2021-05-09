# nslibmgr - NodeSite Library Manager

### What is this?

A library manager / maintanance utility

### Who is this for?

It&#x27;s for me. I made this for myself.

Feel free to use it, but be aware **it backs up your project on my server**.

### Compatibility?

Tested on Node 14 LTS on GNU/Linux.

### How do I install this?

npm:  `sudo npm i -g nslibmgr yarn`

yarn: `sudo yarn global add nslibmgr`

### How do I use this?

`[npx] nslibmgr [arguments]`

Arguments

`init` \- initialize project

`clean` \- clear directory

`purge` \- purge dependencies

`install` \- install dependencies

`make` \- compile TypeScript

`test` \- run test scripts

`declare` \- generate TypeScript declarations from JSDoc

`publish` \- publish to npm

### Folder structure

`src/` \- source files

`lib/` \- compiled files - do not edit, run `nslibmgr make`

`types/` \- TypeScript declarations - do not edit, run `nslibmgr declare`

`tests/` \- test scripts, each file should export an async function

`examples/` \- any example scripts

`package.json`

`README.md`

`LICENSE.md`
