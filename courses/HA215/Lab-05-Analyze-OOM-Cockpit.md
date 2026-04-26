# Lab 05 — Analyze OOM Using SAP HANA Cockpit

## Business Example

End-users report applications hanging. Alerts 46 (Runtime dump files) and 43 (Memory usage of services) are triggered. You want to investigate OOM dump files using SAP HANA Cockpit rather than raw trace files.

---

## Connection Details

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

---

## Step 1 — Navigate to Memory Analysis

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the **Database Directory**, choose the **HXE@HXE** database.
3. In the **Database Overview** screen, find the **Memory Usage** card.
4. In the **Memory Usage** card, choose **More → Analyze Memory History**.

---

## Step 2 — Review OOM Events

1. In the **Memory Analysis** application, choose the **Out of Memory Events** tab.
2. Find the OOM event with a timestamp around the time you ran `call "HA215::rte_statements"` in Lab 04.
3. In the **Statement** column, choose the **View SQL** link to display the statement that caused the OOM.

You should see an INSERT statement performing a full cross-join between `SAP_HANA_DEMO.SO_HEADER` (10,000 rows) and `SAP_HANA_DEMO.SO_ITEM` (32,000 rows), producing approximately 320 million rows — the OOM-triggering operation from the `HA215::rte_statements` stored procedure called in Lab 04.

4. Click outside the popup to continue.

---

## Step 3 — Investigate via Workload Analysis

1. In the **Statement Hash** column, choose the hash link.
2. In the **Workload Analysis** screen, **Top SQL Statements** tab, find the column matching the timestamp of the OOM event.
3. In the **Top SQL Statement** chart, choose the four largest colored blocks (from the bottom up) and review the SQL statements shown.

From the **Statement Information** area, answer:
- What is the number of **waiting threads**?
- What is the **plan memory size**?
- What is the **execution count**?
- What is the **total preparation time**?

---

## Step 4 — Return to Home

Choose **Workload Analysis** navigation menu → **Home**.

---

## Result

You have used SAP HANA Cockpit's Memory Analysis and Workload Analysis to identify the OOM-causing SQL statement without needing to read raw trace files. This provides a faster, graphical path to OOM root cause analysis.
