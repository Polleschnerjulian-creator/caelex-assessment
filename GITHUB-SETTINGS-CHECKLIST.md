# GitHub Repository Settings Checklist

Configure these settings manually in the GitHub repository UI.

## Branch Protection Rules (Settings → Branches)

### `main` branch

- [x] Require a pull request before merging
  - [x] Require 1 approval
  - [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require status checks to pass before merging
  - Required checks:
    - `Lint & Typecheck`
    - `Unit & Integration Tests`
    - `CodeQL Analysis`
- [x] Require branches to be up to date before merging
- [x] Do not allow force pushes
- [x] Do not allow deletions

### `develop` branch (if used)

- [x] Require status checks: `Lint & Typecheck`, `Unit & Integration Tests`

## Security Features (Settings → Code security and analysis)

- [x] **Dependabot alerts**: Enabled (automatic with dependabot.yml)
- [x] **Dependabot security updates**: Enabled
- [x] **Secret scanning**: Enabled (free for all repos)
- [x] **Secret scanning push protection**: Enabled
- [x] **CodeQL analysis**: Enabled (automatic with security.yml workflow)

## Actions Permissions (Settings → Actions → General)

- [x] Allow all actions and reusable workflows
- [x] Workflow permissions: Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests

## Environments (Settings → Environments)

Create a `production` environment with:

- [x] Required reviewers (1 reviewer)
- [x] Only deploy from `main` branch
