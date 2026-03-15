# No-WMS Project — Claude Code Instructions

## Linear Integration (NWMS Team)

This project tracks issues in Linear under the **NWMS** team: https://linear.app/sizelabs/team/NWMS/all

### Status flow
Backlog → Todo → In Progress → In Review → Done

### Working with issues

When asked to process NWMS issues (or when triggered by `/loop`):

1. **Fetch** open issues from team NWMS with state "Todo" or "Backlog" using the Linear MCP
2. **Prioritize** by priority value: 1=Urgent, 2=High, 3=Medium, 4=Low
3. **For each issue**, in priority order:
   - Read full description with `get_issue`. Use `extract_images` if screenshots exist.
   - Move to **In Progress**: `save_issue({ id: "<ID>", state: "In Progress" })`
   - Branch from main: `git checkout main && git pull && git checkout -b <issue.gitBranchName>`
   - Analyze the codebase, understand patterns, implement the fix/feature
   - Run linter/typecheck/tests to validate
   - Run `/simplify` if the changes are meaningful enough to benefit from it
   - Write a concise TLDR of what was done
   - Commit: `git add -A && git commit -m "<TLDR>\n\n<ISSUE_ID>"`
   - Merge into main (do NOT push yet):
     ```bash
     git checkout main
     git merge <branch> --no-ff -m "Merge <branch>: <TLDR>\n\n<ISSUE_ID>"
     ```
   - If merge conflicts occur, resolve them and complete the merge
   - Move to **In Review**: `save_issue({ id: "<ID>", state: "In Review" })`
   - Comment on the issue with this format:
     ```
     ## TLDR
     <One-line summary>

     ## Solution
     <How the issue was solved>

     ## Changes
     <Files changed and what was modified>

     ## Branch
     `<branch-name>` — merged into main, pending push.
     ```
   - **Never move to Done** — leave in "In Review" for Juan to verify
4. Move to the next issue and repeat
5. **When no more Todo/Backlog issues remain**, push all commits at once:
   ```bash
   git push origin main
   ```

### Commit format
The Linear issue ID must be in the commit body (not the subject line) to trigger GitHub ↔ Linear linking:
```
Fix modality not pre-selecting when editing shipping categories

NWMS-10
```

### Git workflow
- Create a feature branch per issue from latest main
- Implement and commit on the branch
- Merge back into main with `--no-ff` — do NOT push yet
- Resolve any merge conflicts during the merge step
- If merge fails after conflict resolution, comment on the issue with what went wrong
- **Push `main` only once**, after all issues in the cycle are processed

### Rules
- Each issue gets its own branch from latest main
- One commit per issue, all merged into main locally
- Push main only at the end when no more issues to process
- Never mark anything as Done
- Always leave a comment with TLDR + solution details
- If blocked (unclear requirements, needs external access), comment what's blocking, move to In Review, continue to next issue
- Always commit with the issue ID in the body
