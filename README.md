# nslibmgr - NodeSite Library Manager

### What is this?

A library manager / maintanance utility

### Who is this for?

It&#x27;s for me. I made this for myself.

Feel free to use it, but be aware **it backs up your project on my server**.

### Compatibility?

Tested on Node 14 LTS on GNU/Linux.

### How do I install this?

npm: `sudo npm i -g nslibmgr yarn`

yarn: `sudo yarn global add nslibmgr`

### How do I use this?

`[npx] nslibmgr [arguments]`

Arguments

`init` \- initialize project

`lint` \- run [prettier](https://npmjs.com/package/prettier)

`clean` \- clear directory

`purge` \- purge dependencies

`install` \- install dependencies

`make` \- compile TypeScript

`test` \- run test scripts

`publish` \- publish to npm

### Folder structure

`src/` \- source files

`lib/` \- compiled files - do not edit, run `nslibmgr make`

`tests/` \- test scripts, each file should export an async function

`examples/` \- any example scripts

`package.json`

`README.md`

`LICENSE.md`
