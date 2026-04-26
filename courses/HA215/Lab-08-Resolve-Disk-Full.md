# Lab 08 — Resolve a Disk Full Situation

## Business Example

IT tickets report the SAP S/4HANA system isn't working. You need to investigate the root cause, identify the disk problem, and restore normal operation.

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

## Step 1 — Create the Disk Problem

In an SSH session, run the problem creation script:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_08_CreateProblem.sh
```

> Do not look into the script — try to find the problem yourself.

---

## Step 2 — Check for Alerts in SAP HANA Cockpit

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. On the **Database Directory** screen, check for any new error conditions.

   > You may need to wait up to 2 minutes for the problem to appear.

   > Which new problem is reported in the Database Directory?

3. Choose the **HXE@HXE** database.
4. Review the **Disk Usage** and **Alerts** cards:
   - Which alerts are reported?
   - Which disk is causing problems?
   - What seems to be the problem?

---

## Step 3 — Use Disk Usage Performance Monitor

1. In the **Disk Usage** card, choose the **Performance Monitor** button.
2. Review the file systems:
   - Are all file systems running out of space?
   - Can you identify which specific file system is running out of space from this view?

3. Choose **< (back)** to return.

---

## Step 4 — Use Alerts to Pinpoint the Problem

1. In the **Database Overview**, choose the **Alerts** card.
2. Choose the alert that reports the disk problem.

Answer:
- Which file system is running out of free space?
- What is the alert ID number of the Disk Usage alert?
- At which threshold value does the alert report Medium or High severity?

3. Return to Home: **Alerts** navigation menu → **Home**.

---

## Step 5 — Check Disk Usage via SSH

In your SSH session:
```bash
df -h | grep -E 'Mounted on|/hana'
```

- Which file system is running out of space?
- What would be a solution to this problem?

---

## Step 6 — Fix the Problem

Run the fix script:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_08_FixProblem.sh
```

Verify the fix:
```bash
df -h | grep -E 'Mounted on|/hana'
```

> Confirm that disk space has been recovered.

---

## Result

You used SAP HANA Cockpit alerts and the Disk Usage monitor to identify a disk full situation on a HANA file system. The alert system provides both the file system path and configurable severity thresholds for proactive disk monitoring.
