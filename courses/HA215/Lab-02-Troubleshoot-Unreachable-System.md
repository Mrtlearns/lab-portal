# Lab 02 — Troubleshoot an Unreachable System

## Business Example

After last weekend's IT hardware maintenance, colleagues report they cannot execute revenue forecast reports. You need to quickly analyze and resolve the problem.

---

## Connection Details

SSH to your assigned VM  (`10.10.110.XX` — Student 01=.11, 02=.12 … 10=.20):
```
ssh root@10.10.110.XX
```

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

---

## Step 1 — Test SQL Connection via Cockpit

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the **Database Directory**, choose **SYSTEMDB@HXE**.
3. Choose **Open SQL Console** (top-right).
4. In the SQL Console, execute:

```sql
SELECT * FROM USERS;
```

5. In the **Database Overview** screen, search for **Alerting** cards to reduce the view.

> What data is returned?

---

## Step 2 — Check Inodes, Deadlocks, and Backup Errors

**Check available inodes:**
```bash
df -i | grep -E 'Mounted on|/hana'
```

> How many free inodes does SAP HANA have?

**Switch to hxeadm and check for deadlocks:**
```bash
su - hxeadm
hdbcons 'deadlockdetector wg -w -o /usr/sap/HXE/HDB90/work/HA215_HXE_DeadlockCheck.dot'
```

> Did the deadlock detector return any deadlocks?

**Check for log backup errors:**
```bash
cdtrace
cd DB_HXE
cat backup.log | grep ERROR
```

> Did you see any log backup errors?

---

## Step 3 — Test SQL Connection via hdbsql

```bash
hdbsql -n localhost -i 90 -d SYSTEMDB -u SYSTEM -p Poll0000
```

In the hdbsql session:
```sql
SELECT * FROM USERS;
```

Press `q` to exit the output, then `exit` to leave hdbsql.

> What data is returned?

---

## Step 4 — Create the Problem (Second SSH Session)

Open a **second SSH session** to your VM:
```bash
ssh root@10.10.110.XX
```

Run the problem creation script:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_02_CreateProblem.sh
```

> Do not look into the script — try to find the problem yourself.

---

## Step 5 — Re-test SQL Connection

**In Cockpit SQL Console**, execute again:
```sql
SELECT * FROM USERS;
```

**In hdbsql (first SSH session)**, execute again:
```bash
hdbsql -n localhost -i 90 -d SYSTEMDB -u SYSTEM -p Poll0000
```
```sql
SELECT * FROM USERS;
```

> What data is returned now? What is different?

---

## Step 6 — Identify the Root Cause

> What could be the root cause of the problems you are experiencing?

---

## Step 7 — Use Troubleshoot Unresponsive Systems

1. In the **Database Overview** screen, choose **Troubleshoot unresponsive systems**.
2. The application collects information on connections, transactions, blocked transactions, and threads.

Answer the following:
- Is the SAP HANA database system running?
- Is there excessive load on the system?
- Which connection does the tool use to collect information?

3. Return to the **Database Overview** screen.

---

## Step 8 — Fix the Problem

In your second SSH session:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_02_FixProblem.sh
```

---

## Step 9 — Verify the Fix

In the **Cockpit SQL Console**, execute:
```sql
SELECT * FROM USERS;
```

> What data is returned now? Is the system back to normal?

---

## Result

You have analyzed and handled a system offline situation caused by a blocking query. The troubleshoot unresponsive systems tool uses a dedicated internal connection that remains available even when the database appears unresponsive.
