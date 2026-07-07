# Restore Point — Chronicle v1

The last state of Chronicle before the product rebuild is permanently tagged:

```
tag:    v1-pre-redesign        (pushed to origin)
commit: 7b9bbd93               feat(prayer): enlarge the desktop Baptist Beads card
branch: redesign/foundations   (all rebuild work happens here)
```

## To restore production instantly

```bash
git checkout main
git reset --hard v1-pre-redesign
git push --force-with-lease origin main   # triggers the normal deploy workflow
```

Production redeploys automatically from the `main` push (GitHub Actions →
jarvis-vps). Total restore time ≈ 2 minutes (CI build + container swap).

## To restore without force-pushing (safer, preserves history)

```bash
git checkout main
git revert --no-edit v1-pre-redesign..main
git push origin main
```

## Data safety

The rebuild makes **no destructive database migrations**. All Prisma
migrations in the redesign are additive; existing tables
(`chronicle_entries`, `prayer_items`, `formation_rhythms`, etc.) are never
dropped or rewritten. Restoring the code restores the full product against
the same data.
