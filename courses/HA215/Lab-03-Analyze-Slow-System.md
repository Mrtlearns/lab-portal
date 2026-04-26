# Lab 03 — Analyze and Solve a Slow System

## Business Example

Colleagues report that operational business status reports are running very slowly, risking delayed customer order processing. You need to investigate and resolve the problem.

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

## Step 1 — Establish a Response-Time Baseline

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the Home screen, choose **Database Explorer**.
3. Choose the **+** button to add your tenant database.
4. Select **HXE@HXE** and choose **OK**.
5. Navigate to: **HXE@HXE → Catalog → Tables**
6. Choose the **Choose Schema** button, deselect **SYSTEM**, select **SAP_HANA_DEMO**, and choose **Select**.
7. Search for the table `PO_ITEM`.
8. Right-click **PO_ITEM** → **Load Into Memory** → **OK**.
9. Right-click the same table → **Generate SELECT Statement**.
10. In the SQL Console, change `TOP 1000` to `TOP 300000`.
11. Execute the query (green **Run** button) four times and record execution times from the **Messages** tab:

| Run | Execution Time |
|-----|---------------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| Average | |

> Keep the Database Explorer tab open.

---

## Step 2 — Generate Load

Open an SSH session to your VM:
```bash
ssh root@10.10.110.XX
```

Run the load generation script:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_03_GenerateLoad.sh 12
```

> Do not look into the script — try to find the problem yourself.

---

## Step 3 — Re-test Query Execution

Return to the **Database Explorer** tab and execute the same query four more times:

| Run | Execution Time |
|-----|---------------|
| 1 | |
| 2 | |
| 3 | |
| 4 | |
| Average | |

> How much slower is the system in the second run?

---

## Step 4 — Review Memory Usage

1. In **SAP HANA Cockpit**, navigate to **HXE@HXE → Database Overview**.
2. Choose the **Memory Usage** card.
3. Review memory usage over time — check the different memory metrics on the left.

> Is the memory usage coming from within SAP HANA, or is something outside SAP HANA consuming memory?

4. Choose **< (back)** to return.

---

## Step 5 — Review CPU Usage

1. In the **Database Overview** screen, choose the **CPU Usage** card.
2. Review CPU usage over time — check the different CPU metrics on the left.

> Is the high CPU caused by SAP HANA or the Linux operating system?

3. Choose **< (back)** to return.

---

## Step 6 — Review Disk Usage with Custom KPIs

1. In the **Database Overview** screen, choose the **Disk Usage** card.
2. Choose the **Manage Configurations** (gear) icon.
3. Add the following KPIs:
   - Read Requests
   - Write Requests
   - Data Read Size
   - Data Write Size
   - Log Read Size
   - Log Write Size
4. Choose **OK**.
5. In the **Performance Monitor** screen, choose **Disk → Save As** and save the view as `HA215 Disk KPIs`.

---

## Step 7 — Analyze Disk I/O

Review the disk usage with the new KPIs and answer:

- Is the generated load from **read** or **write** requests?
- Is the disk I/O caused by data **reads** or data **writes**?
- Why is the **log volume** also experiencing disk I/O?

---

## Result

You have identified the source of slow performance by reviewing memory, CPU, and disk I/O metrics in the Performance Monitor. The custom disk KPI view (`HA215 Disk KPIs`) has been saved for future use.
