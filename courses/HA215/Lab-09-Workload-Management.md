# Lab 09 — Set Parameters for Workload Management

## Business Example

You want to ensure healthy SAP HANA operation during peak hours by limiting resource consumption for high-impact queries. You will create a Workload Class for the HA215 user and observe its effect on query execution.

---

## Connection Details

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

---

## Step 1 — Open Database Explorer

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the Home screen, choose the **Database Explorer** tile.
3. Keep the Database Explorer tab open — you will need it throughout this lab.

---

## Step 2 — Verify Memory Tracking is Enabled

1. In the Cockpit Home screen, choose **HXE@HXE** from the Database Directory.
2. In the **Database Overview**, choose the **SQL Statements** card.
3. If you see **Disable Memory Tracking**, memory tracking is already enabled — continue to Step 3.
4. If you see **Enable Memory Tracking**, choose the button to enable it.

---

## Step 3 — Set Visible Columns in SQL Statements

1. Choose the **Settings** (gear) icon.
2. Select only the following columns:
   - Statement Runtime
   - Allocated Memory (MB)
   - Statement String
   - Application
   - Application User
   - Database User
   - Workload Class
3. Choose **OK**.

---

## Step 4 — Run the Heavy SQL Statement (Baseline — No Workload Class)

1. Return to the **Database Explorer** tab.
2. Choose **My HA215 user connection → Open SQL Console** and execute:

```sql
SELECT * FROM SAP_HANA_DEMO.SO_HEADER AS A
LEFT OUTER JOIN SAP_HANA_DEMO.SO_ITEM AS B
ON 1 = 1
WHERE B.DELIVERYDATE > '24.04.2017' AND B.DELIVERYDATE < '30.04.2017'
ORDER BY B.DELIVERYDATE DESC;
```

3. Immediately switch to the **SQL Statements** tab in Cockpit and refresh until the HA215 session disappears.

Answer:
- Was the Cockpit refresh responsive or did it feel stuck?
- Which **Workload Class** is shown for the HA215 statement?
- What is the execution time (from the **Messages** tab)?

---

## Step 5 — Create a Workload Class

Open a second browser tab to **https://vhcala4hci.local.lan:51039** and log on.

1. Navigate to **HXE@HXE → Database Overview → Manage Workload Classes**.
2. Choose **Create**.
3. Fill in the following:

| Field | Value |
|-------|-------|
| Workload Class Name | `WLC_Exercise_09` |
| Execution Priority | `5` |
| Total Statement Memory Limit | `7 GB` |
| Total Statement Thread Limit | `1 threads` |
| Mapping Name | `WLM_Exercise_09` |
| Database User Name | `HA215` |

4. Choose **Create**, then confirm **Create Parent Workload** if prompted.

---

## Step 6 — Run the Statement with Workload Class Active (1 Thread)

1. Return to the **Database Explorer** tab.
2. Execute the same SQL statement again.
3. While running, switch to the **SQL Statements** tab and refresh.

Answer:
- Was the Cockpit refresh responsive?
- Which **Workload Class** is now shown for the HA215 statement?
- What is the execution time?

---

## Step 7 — Increase Thread Limit to 2 and Set Up Threads View

1. In the **Workload Classes** tab, choose `>` on the `WLC_Exercise_09` row.
2. Choose **Edit** → increase **Total Statement Thread Limit** to `2` → **Save**.
3. Return to the **Database Overview** and choose the **Threads** card.
4. In the **Threads** application, choose **Settings** (gear) and select:
   - Duration (ms)
   - Thread Type
   - Thread Method
   - Thread Detail
   - User
   - Thread Status
5. Choose **OK**. Keep the Threads tab open.

---

## Step 8 — Run the Statement with 2 Threads

1. Execute the same SQL statement again from the **Database Explorer**.
2. While running, switch to the **Threads** tab and refresh.

Answer:
- How many `HA215` threads did you see running in parallel?
- What is the execution time?

---

## Step 9 — Reduce Thread Limit Back to 1

1. In the **Workload Classes** tab, choose `WLC_Exercise_09`.
2. Choose **Edit** → decrease **Total Statement Thread Limit** to `1` → **Save**.

---

## Step 10 — Run the Statement with 1 Thread

1. Execute the same SQL statement again from the **Database Explorer**.
2. While running, switch to the **Threads** tab and refresh.

Answer:
- How many `HA215` threads did you see running in parallel?
- What is the execution time compared to 2 threads?

---

## Step 11 — Clean Up

1. In the **Workload Classes** tab, select `WLC_Exercise_09` and choose **Enable/Disable** to disable it.
2. Return to Home: **Threads** navigation menu → **Home**.

---

## Result

You observed how workload classes control query parallelism. With **1 thread**, the query ran serially with lower concurrency impact. With **2 threads**, it ran faster but with greater system load. Workload classes allow fine-grained control over resource allocation per user or application.
