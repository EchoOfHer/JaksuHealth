import json
import os
from tabulate import tabulate

HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rollback_history.json")

def main():
    if not os.path.exists(HISTORY_FILE):
        print(f"Error: {HISTORY_FILE} not found. No rollback history available yet.")
        return
        
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
    except Exception as e:
        print(f"Error reading history file: {e}")
        return
        
    if not history:
        print("Rollback history is empty.")
        return
        
    table_data = []
    for item in history:
        status = item.get('status', 'Unknown')
        issue = item.get('issue', 'None')
        
        # Format issue for display
        if issue == "None":
            issue_display = "-"
        else:
            issue_display = issue[:50] + ("..." if len(issue) > 50 else "")
            
        table_data.append([
            item.get('id', '?'),
            item.get('timestamp', 'Unknown'),
            status,
            issue_display
        ])
        
    headers = ["ID", "Timestamp", "Status", "Issue / Error"]
    
    print("\n" + "="*80)
    print(" "*25 + "DATABASE ROLLBACK HISTORY")
    print("="*80)
    print(f"Total Records: {len(history)} (Max: 200)")
    print("-" * 80)
    print(tabulate(table_data, headers=headers, tablefmt="grid"))
    print("="*80 + "\n")

if __name__ == "__main__":
    # pip install tabulate
    try:
        main()
    except ImportError:
        print("Please install 'tabulate' to view the table: pip install tabulate")
