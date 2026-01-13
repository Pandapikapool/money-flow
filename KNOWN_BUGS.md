# Known Bugs and Issues

This document tracks known bugs, limitations, and issues in Money Flow.

## Current Issues

### Investment Template Copy/Add Bug
- **Issue**: When copying or adding a new template in the Investments page, each tile should be separate from the newly added one, but they are not properly isolated
- **Impact**: New investment entries may incorrectly share data or state with existing entries
- **Status**: Known issue, fix pending
- **Workaround**: Manually create each investment entry separately instead of using copy/template feature

### Graph Information Display
- **Issue**: Graphs throughout the application are not informative enough
- **Impact**: Users may not get sufficient insights from the visualizations
- **Status**: Known limitation, improvement planned
- **Workaround**: Rely on raw data tables for detailed information

If you discover a bug, please report it by opening an issue on GitHub with:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/OS information (if relevant)

## Limitations

### Single User Mode
- Currently supports only one user ("default")
- Multi-user authentication not yet implemented
- Data is not isolated between users

### Browser Compatibility
- Tested primarily on modern browsers (Chrome, Firefox, Safari, Edge)
- Older browsers may have limited support
- Mobile browsers may have UI issues

### Data Validation
- Some edge cases in data validation may not be handled
- Large numbers may cause display issues
- Date handling assumes standard timezone

### Performance
- Large datasets (1000+ expenses) may cause slower load times
- No pagination implemented for expense lists
- Graph rendering may be slow with many data points

## Workarounds

### If expenses don't appear
- Check the date range filter
- Verify the expense was saved successfully
- Refresh the page

### If budget bar doesn't update
- Refresh the page
- Check that the current month budget is set
- Verify expenses are in the current month

### If tags don't appear
- Tags are created when first used
- Try typing the tag name again
- Check for typos in tag names

## Reporting Bugs

To report a bug:

1. **Check existing issues** on GitHub to see if it's already reported
2. **Create a new issue** with:
   - Clear title describing the bug
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, browser, Node version)

3. **Use labels** appropriately:
   - `bug` - Something isn't working
   - `enhancement` - New feature request
   - `documentation` - Documentation improvements

---

**Last Updated**: Check GitHub issues for the most current bug list.
