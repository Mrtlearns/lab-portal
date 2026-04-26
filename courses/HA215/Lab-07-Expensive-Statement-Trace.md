# Lab 07 — Use Expensive Statement Trace

## Business Example

You want to identify expensive SQL statements causing high resource consumption so you can provide the development team with a list for optimization.

---

## Connection Details

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

SSH to your assigned VM  (`10.10.110.XX` — Student 01=.11, 02=.12 … 10=.20):
```
ssh root@10.10.110.XX
```

---

## Step 1 — Activate the Expensive Statement Trace

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the **Database Directory**, choose **HXE@HXE**.
3. In the **Database Overview**, search for and choose the **SQL Statements** card.
4. Choose the **Expensive Statements** tab.
5. Choose **Configure Trace**.
6. In the **Configure Expensive Statements Trace** popup, set:

| Field | Value |
|-------|-------|
| Trace Status | Active |
| Threshold Duration (μs) | 1000 |
| Database User | HA215 |

7. Leave all other fields at defaults. Choose **Proceed**.
8. Confirm with **OK**.

---

## Step 2 — Generate Load via the Expensive Statement Shell Script

In your SSH session, run the expensive statement script:

```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_07_ExpensiveStatement.sh
```

Wait for the output to confirm successful execution.

> **Note:** This script runs a deliberately inefficient cross-join query against the SAP_HANA_DEMO dataset. It will appear in HANA Cockpit under **SQL Statements > Most Expensive**.

---

## Step 3 — Review Expensive Statement Trace Results

1. In the **SQL Statements — Expensive Statements** tab, choose **Refresh**.
2. Choose the **Settings** (gear) icon and enable these columns:
   - Start Time
   - Duration
   - Count
   - Statement String
   - CPU Time
   - Memory Size (MB)
   - Database User
   - Application User
3. Choose **OK**.

**Sort by Duration (descending):**
> Which SQL statement has the highest duration?

**Sort by CPU Time (descending):**
> Which SQL statement has the highest CPU time?

**Sort by Memory Size MB (descending):**
> Which SQL statement has the highest memory usage?

> Is it the same query appearing at the top of all three sort orders? If yes, you have identified an expensive SQL statement candidate for optimization.

---

## Step 4 — Deactivate the Trace

1. Choose **Configure Trace**.
2. Set trace status to **Inactive**.
3. Choose **Proceed → OK**.

---

## Result

You have used the Expensive Statement Trace to identify SQL statements with high duration, CPU time, and memory consumption. This tool provides a targeted view of resource-intensive queries for handoff to the development team.
