# Husky Git Hooks

This directory contains Git hooks managed by Husky v9.1.7.

## Setup

The project uses the modern Husky v9 initialization pattern:

```json
"prepare": "husky"
```

This `prepare` script in `package.json` runs when developers install the project (`npm install`), automatically setting up Git hooks without additional commands.

## Pre-Commit Hook

The `.husky/pre-commit` hook runs the following checks before each commit:

1. **Code Formatting** (`npx lint-staged`)
   - Automatically formats staged files using Prettier
   - Uses rules defined in `.prettierrc`

2. **Type Checking** (`npx tsc --noEmit`)
   - Validates TypeScript compilation across the entire project
   - Prevents commits with type errors

## How It Works

1. When developers run `npm install`, the `prepare` script initializes Husky
2. Git hooks in `.husky/` are installed automatically
3. Before each commit, the pre-commit hook validates formatting and types
4. If checks fail, the commit is blocked until issues are fixed

## Manual Testing

```bash
# The hooks are automatically installed when you run:
npm install

# Test the pre-commit hook:
git add src/index.ts
git commit -m "test: verify hooks"
```

## Husky v9 Pattern

This project uses the **official Husky v9 recommended initialization** via `npx husky init`, which provides:
- Simplified `prepare` script: `"husky"` (not `husky install`)
- Modern hook structure with built-in helper utilities
- Best practices for Git hooks in v9+

Current version: **9.1.7**

## File Structure

```
.husky/
├── _ /           # Internal Husky utilities (auto-generated)
├── .gitignore    # Ignores internal files
└── pre-commit    # Pre-commit hook script
```

## Documentation

- [Husky Official Documentation](https://typicode.github.io/husky/)
- [Husky Get Started Guide](https://typicode.github.io/husky/get-started.html)
- [Git Hooks Reference](https://git-scm.com/docs/githooks)
