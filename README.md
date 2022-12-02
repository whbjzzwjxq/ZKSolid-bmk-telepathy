# telepathy

building towards a proof-based future, starting with proof of consensus ✨

### Installation

We require node 16.15.0 and yarn 3.
https://yarnpkg.com/getting-started/install

```
corepack enable
npm i -g corepack
corepack prepare yarn@stable --activate
```

To install dependencies, use

```
yarn
```

### Troubleshooting

Make sure to run `yarn` at the top-level, before running `yarn` in each subdir, otherwise there are
issues. If you didn't do this, `rm -rf node_modules` in the top-lovel folder, `rm yarn.lock` and reinstall everything by calling `yarn` in the top-level folder, follow by `yarn` in each subdirectory.

If there are issues with yarn, run
`yarn dedupe`
`yarn dedupe react-dom`

### TODO

-   Make sure before running the frontend that you run `cd cli; npx tsx src/frontend.ts` to generate
    all the requisite public folder files for the frontend. In the future, this should be moved to the
    `frontend` folder as a post-install hook.
