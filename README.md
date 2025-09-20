# Music Theory for Bass Guitar

[![CI](https://github.com/bas/music-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/bas/music-notes/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This repository contains a collection of documents covering fundamental music theory concepts, with a focus on the 4-string bass guitar.

These documents were created and refined through a collaborative conversation with GitHub Copilot, aiming to provide clear, practical, and easy-to-understand explanations for bass players. 

**Quality Assurance**: All TAB examples in this repository are automatically verified for correctness using TypeScript unit tests that ensure the fret positions match the described musical notes.

While care has been taken to ensure accuracy, please be aware that as an AI-assisted work, there may be occasional errors. Always use these guides as a starting point and cross-reference with other resources.

## Table of Contents

- [Keys and Scales](./docs/keys-and-scales.md)
- [Intervals](./docs/intervals.md)
- [Modes](./docs/modes.md)
- [Pentatonic Scales](./docs/pentatonic-scales.md)
- [Chords](./docs/chords.md)
- [Seventh Chords](./docs/seventh-chords.md)
- [The 12-Bar Blues Progression](./docs/twelve-bar-blues.md)

## Development

This project uses TypeScript and Jest to automatically verify the correctness of all TAB examples.

### Prerequisites

- Node.js 18.x or 20.x
- npm

### Setup

```bash
npm install
```

### Available Scripts

```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run type-check    # Check TypeScript types
npm run validate      # Run type checking and tests
```

### How It Works

The test suite:
1. Parses all markdown files in the `docs/` directory
2. Extracts TAB notation and associated note descriptions
3. Converts fret positions to musical notes using bass guitar tuning (E-A-D-G)
4. Verifies that the TAB plays the correct notes in the correct order
5. Handles enharmonic equivalents (e.g., D♯ = E♭)

This ensures that all educational content maintains musical accuracy as the documentation evolves.
