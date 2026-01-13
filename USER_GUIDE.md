# User Guide

Welcome to Money Flow! This guide will help you get started and make the most of the application.

## Getting Started

### First Time Setup

1. **Start the application** (see [README.md](README.md) for installation)
2. **Open** http://localhost:5173 in your browser
3. You're ready to start tracking!

## Core Features

### 1. Adding Expenses

**Where**: Homepage (`/home`)

**How**:
1. Enter the expense amount
2. Write a brief description (e.g., "Coffee at Starbucks")
3. Select a tag (category) - required
4. Optionally add special tags (e.g., "Fixed expense")
5. Add notes if needed
6. Click "Save"

**Tip**: The budget bar at the top shows how much you've spent this month vs your budget.

### 2. Setting Budgets

**Where**: Budget Page (`/budget`)

**How**:
1. Navigate to the Budget page
2. Select a month and year
3. Enter your monthly budget amount
4. The system will track your spending against this budget

**Budget Colors**:
- 🟢 **Green**: Normal spending
- 🟡 **Yellow**: Less than 10% remaining
- 🔴 **Red**: Over budget

### 3. Viewing Expenses

**Where**: Expenses section

**Navigation**:
- **Expense Overview**: See all years with expenses
- **Year View**: Click a year to see all months
- **Month View**: Click a month to see individual expenses
- **Analysis**: View spending breakdowns by category

### 4. Managing Accounts

**Where**: Accounts Page (`/accounts`)

**What**: Track your liquid money (savings, checking accounts, fixed deposits)

**How**:
1. Click "Add Account"
2. Enter account name and current balance
3. Add notes (e.g., "Primary savings")
4. Update balance whenever it changes

**Features**:
- View balance history over time
- Export/import CSV data
- See trends with graphs

### 5. Tracking Assets

**Where**: Assets Page (`/assets`)

**What**: Track owned items (car, jewelry, electronics, property)

**How**: Similar to accounts - add asset name, current value, and notes. Update values as needed.

### 6. Managing Investments

**Where**: Investments Page (`/investments`)

**What**: Track stocks, mutual funds, fixed deposits, PPF, etc.

**How**: Add investment name, current value, and notes. Mark as "closed" when you sell.

### 7. Plans (Insurance & Commitments)

**Where**: Plans Page (`/plans`)

**What**: Track insurance policies, recurring payments, subscriptions

**Important Fields**:
- **Cover**: Insurance coverage amount
- **Premium**: Payment amount
- **Frequency**: Monthly, Quarterly, Yearly
- **Expiry Date**: When the plan ends
- **Next Premium Date**: When to pay next

**Alerts**:
- 🔴 **Red dot**: Premium due soon or overdue
- 🟡 **Yellow border**: Plan expiring within 60 days
- 🔴 **Red border**: Plan expired

**Tip**: Update "Next Premium Date" after each payment to keep alerts accurate.

### 8. Life Experiences

**Where**: Life-XP Page (`/life-xp`)

**What**: Guilt-free spending buckets for experiences (vacations, hobbies, entertainment)

**How**: Create buckets and track spending without affecting your main budget.

### 9. Tags

**Where**: Tags Page (`/tags`)

**What**: Organize expenses by categories

**How**:
- Tags are created automatically when you use them
- Rename tags to merge categories
- Special tags (like "Fixed expense") can be added to multiple expenses

## Tips & Best Practices

### Daily Routine

1. **Morning**: Check the Overview page for a quick financial snapshot
2. **Throughout the day**: Add expenses as you spend
3. **Evening**: Review the day's expenses on the Homepage

### Monthly Routine

1. **Start of month**: Set your monthly budget
2. **During month**: Monitor budget bar on Homepage
3. **End of month**: Review spending in Expense Analysis

### Organizing Expenses

- **Use consistent tags**: "Food", "Transport", "Shopping" work well
- **Special tags**: Use for recurring items like "Fixed expense"
- **Notes**: Add context for unusual expenses

### Managing Resources

- **Update regularly**: Keep account balances and asset values current
- **Use history**: Track changes over time to see trends
- **Export data**: Download CSV files for backup or analysis

## Common Questions

**Q: Can I edit past expenses?**  
A: Yes! Navigate to the month view and click on any expense to edit.

**Q: How do I delete an expense?**  
A: Open the expense and use the delete option.

**Q: Can I set different budgets for different months?**  
A: Yes! Each month can have its own budget amount.

**Q: What if I forget to add an expense?**  
A: You can add expenses with any date - just change the date field when adding.

**Q: How do I track recurring expenses?**  
A: Use the "Fixed expense" special tag. The system will remind you on the recurrence day.

**Q: Can I export my data?**  
A: Yes! Most pages support CSV export. Look for the export button.

## Keyboard Shortcuts

- **Homepage**: Focus on amount field automatically
- **Quick save**: Press Enter after filling the form (where supported)

## Troubleshooting

**Problem**: Budget bar not updating  
**Solution**: Refresh the page or check that the expense was saved successfully

**Problem**: Can't see my expenses  
**Solution**: Check the date - expenses are organized by month and year

**Problem**: Tags not appearing  
**Solution**: Tags are created when first used. Try typing the tag name again.

---

Need more help? Check the [Developer Guide](DEVELOPER_GUIDE.md) or open an issue on GitHub.
