# Lab 06 — Analyze Performance

## Business Example

End users report poor system performance. You need to find the root cause and fix it where possible.

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

## Step 1 — Generate Load

In an SSH session, run the load generation script:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_06_GenerateLoad.sh
```

> Do not look into the script — try to find the problem yourself.

Note the time you started the script. Keep this session open.

---

## Step 2 — Check for High Resource Consumption in Cockpit

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the **Database Directory**, choose **HXE@HXE**.
3. In the **Database Overview**, find and choose the **CPU Usage** card.

---

## Step 3 — Add Connection KPIs and Save the Layout

1. In the **Performance Monitor** screen, choose the **Manage Configurations** (gear) icon.
2. **Deselect** these KPIs:
   - Host KPIs - CPU
   - Service KPIs - CPU
   - Service KPIs - System CPU
3. **Select** these KPIs:
   - Service KPIs - Open Connections
   - Service KPIs - Internal Connections
   - Service KPIs - External Connections
   - Service KPIs - Idle Connections
4. Choose **OK**.
5. Choose **CPU → Save As** and save the view as `HA215 Connections KPIs`.

---

## Step 4 — Identify the Cause of High Load

Review the connection graphs:

> **Note:** Check the different Y-scales on the left and right axes before drawing conclusions.

- Is the load caused by **internal** or **external** connections?
- Are the open connections caused by **internal** or **external** connections?

Choose **< (back)** to return to the Database Overview screen.

---

## Step 5 — Run the sp_load Stored Procedure

1. In the **Database Overview**, choose **Open SQL Console**.
2. Select **My HA215 user connection** → **Open SQL Console**.
3. Execute:

```sql
CALL HA215.SP_LOAD(50000);
```

4. In the **Messages** tab, record the execution time:

> **First run execution time:** ___________

---

## Step 6 — Import SQL Statement Library (SAP Note 1969700)

1. In the **Database Explorer**, right-click **My HA215 user connection** → **Show Statement Library**.
2. Choose the **Import** (arrow-up) icon.
3. Navigate to the SQL statement library ZIP file and import it.
4. Close the Statement Library dialog.

---

## Step 7 — Find the High-Load Statement Hash

1. Right-click **My HA215 user connection** → **Show Statement Library**.
2. Search for `Filtering and aggregation` and choose version **2.00.060+** → **Open in SQL Console**.
3. In the SQL Console, find the **Modification section** and set:

| Field | Value |
|-------|-------|
| `BEGIN_TIME` | ~5 minutes before high CPU started (`YYYY/MM/DD HH24:MI:SS`) |
| `END_TIME` | ~5 minutes after high CPU stopped (`YYYY/MM/DD HH24:MI:SS`) |
| `DATA_SOURCE` | `CURRENT` |
| `AGGREGATE_BY` | `HASH` |

4. Execute the query.
5. Use **Hide/Show Columns** → clear all → select `PCT`, `STATEMENT_HASH`, `DURATION_S`.
6. Find the hash with execution duration matching the sp_load run time. **Copy the hash**.

---

## Step 8 — Find the SQL Statement Text

1. Right-click **My HA215 user connection** → **Show Statement Library**.
2. Search for `StatementHash_SQLText` → **Open in SQL Console**.
3. In the **Modification section**, set `STATEMENT_HASH` to the hash you copied.
4. Execute. You should see:

```sql
SELECT COUNT(*) FROM "HA215"."PRODUCTS" WHERE "PRODUCTID" = :V0
```

Answer:
- Which **table** is being scanned?
- Which **column** is used in the WHERE condition?

---

## Step 9 — Check for Distinct Values and Missing Index

**Count distinct values in PRODUCTID:**
```sql
select count(distinct PRODUCTID) from "HA215"."PRODUCTS";
```

> Result: approximately 1 million distinct values (999,983).

**Check for existing indexes:**
1. Open Statement Library → search for `Index column information` → **Open in SQL Console**.
2. In the Modification section: `SCHEMA_NAME = HA215`, `TABLE_NAME = PRODUCTS`.
3. Execute.

> Result: Primary index on `UUID` only — no index on `PRODUCTID`.

> Does it make sense to create an index on `PRODUCTID`?

---

## Step 10 — Create the Index

```sql
CREATE INDEX "TEST_PRODUCTID_INDEX" on "HA215"."PRODUCTS" ("PRODUCTID");
```

Verify in **Database Explorer → My HA215 user connection → Catalog → Indexes → HA215**.

---

## Step 11 — Re-run sp_load and Compare

Ensure `Ex_06_GenerateLoad.sh` is still running in your SSH session. If not, re-run it and wait two minutes before proceeding.

Execute:
```sql
CALL HA215.SP_LOAD(50000);
```

> **Second run execution time:** ___________

> Is there a performance improvement after creating the index?

---

## Result

You identified a missing index on the `PRODUCTID` column of the `PRODUCTS` table as the root cause of poor performance. Creating the index `TEST_PRODUCTID_INDEX` significantly reduced query execution time.
