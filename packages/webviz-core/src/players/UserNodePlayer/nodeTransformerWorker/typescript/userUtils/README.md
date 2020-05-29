# Node Playground Utilities

This directory includes a number of utility functions that can be used in any node playground. You can import them into your node like this:

```typescript
import { compare } from "./time.ts"
```

## Contributing

_Prequisites: You will need to have the Webviz repo cloned locally to update these utilities. You just need to have node and yarn installed to get going though, follow those steps in the `developer-guide.md`._

### TL;DR

- Update utility
- Add unit testing and a structured comment (as needed)
- Run `yarn run test:user-utilities` (checks compilation and runs tests)
- Open PR for Webviz review

If you'd like to add any reusable utilities, simply add (or tweak) the relevant file with the function/class/constant you'd like to expose! Make sure to mark your variable declaration with the `export` keyword so that it will be importable from other modules.

If one of the filenames is not to your liking, or you'd like to add a new one, just make sure to keep the `*.ts` extension and keep the directory flat (i.e. not nested folders). You will also need to import the file in `userUtils/index.js` and add an entry that mimics the format present in other imports.

For adding new functions and what not, also be sure to add a short description of what it is used for using the multiline comment syntax:

```typescript
/**
* YOUR COMMENT
*/
```

This structure will ensure your modules get coupled with inline documentation.

We also have unit testing available for these modules! Please add releveant unit tests for all new/amended code, it'll help us keep the bar high for our consumers.

Then open up a PR in the webviz repo and post in the webviz channel. We'll make sure a team member looks at it in a timely manner! :)

### FAQ

> Can I use third-party packages?

Not at the moment, but please let us know if that would be useful for you! Be sure to specify which package(s) you would like and why you want them.

> Can I use other Webviz code here?

Webviz has many utilities that you are free to copy and paste into this directory, as long as you also provide relevant unit testing. Keep in mind the rest of Webviz is written in Flow, which, while very similar to Typescript, has a few discrepancies. Feel free to reach out to the Webviz team if you're having any trouble with this!

> Are these utilities versioned?

Not currently. We would like to get around to this eventually, but wanted to harden this feature first.
