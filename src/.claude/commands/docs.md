# Documentation Organization

Use the doc-organizer agent to clean up and organize project documentation.

## Tasks to perform:

1. **Check root directory** - Only README.md should be in root
   - Move any other .md files to `docs/archive/`

2. **Remove artifacts** - Clean up macOS files
   ```bash
   find . -name "._*" -delete
   find . -name ".DS_Store" -delete
   ```

3. **Archive old documents**:
   - `*_COMPLETE.md` → `docs/archive/implementations/`
   - `*_SUMMARY.md` → `docs/archive/sessions/`
   - Old reports → `docs/archive/reports/`

4. **Check for issues**:
   - Duplicate filenames
   - Empty/tiny files
   - Broken links in README files

5. **Report results**:
   - Files moved
   - Files deleted
   - Current doc counts
   - Any warnings

Run the automated script: `npm run docs:organize`

Or use the doc-organizer agent for more thorough review.
