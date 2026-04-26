# Lab 04 — Analyze Runtime Errors

## Business Example

End-users report failures with `Error: (dberror) [4]: cannot allocate enough memory`. Alerts 46 (RTEdump files) and 43 (Memory usage of services) are triggered. You need to investigate the OOM dump files.

---

## Connection Details

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

HANA Host: `10.10.110.XX` | Instance: `90` | SID: `HXE`

---

## Step 1 — Run the OOM-Triggering Stored Procedure

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the Home screen, choose **Database Explorer**.
3. Choose the **+** button to add a new database connection:
   - **Instance type:** SAP HANA Database (Multitenant)
   - **Host:** `10.10.110.XX`
   - **Instance number:** `90`
   - **Database:** Tenant database — `HXE`
   - **User:** `HA215`
   - **Password:** `Welcome1`
   - **Save password:** checked
   - **Display Name:** `My HA215 user connection`
4. Choose **OK**.
5. Select **My HA215 user connection** and open an SQL Console.
6. Execute:

```sql
call "HA215::rte_statements"
```

After some time, you will see an error similar to:

```
Could not execute 'call "HA215::rte_statements"'
Error: (dberror) [4]: cannot allocate enough memory: ...
```

Choose **OK** to start the investigation.

---

## Step 2 — Navigate to Indexserver Trace Files

In the **Database Explorer**, navigate to:
```
HXE@HXE (vhcala4hci.local.lan) → Database Diagnostic Files → vhcala4hci.local.lan → indexserver
```

All indexserver log and trace files are shown in the bottom-left panel.

---

## Step 3 — Find and Open the RTEdump File

1. In the search field, enter `rtedump`.
2. Open the file containing `rtedump`, today's date, and `oom`.
3. Double-click the tab to open it full-screen.
4. In the **Lines shown** field, enter `10000` and press **Enter**.
5. From the **From End of File** dropdown, choose **Lines From Start of File**.

---

## Step 4 — Analyze Memory Allocation Failure

Press **Ctrl+F** and search for `[MEMORY_LIMIT_VIOLATION]`.

> The second hit is the section you need.

Search within that section for `Failed to allocate`.

> How much memory could not be allocated?

---

## Step 5 — Find the Total Allocated Memory

Search for `Composite limit`.

> What is the Composite limit value for this system?

---

## Step 6 — Find the Allocation Failure Type

Search for `Allocation failure type`.

> What allocation failure type caused the OOM?

---

## Step 7 — Find the Top Memory Allocators

Search for `limited composite allocator`.

> How much memory is used by the 1st, 2nd, and 3rd allocators?

The list ordered by `exclusive_size_in_use` shows the net memory size per allocator (excluding sub-allocators). The first few allocators contribute most to overall heap consumption.

---

## Step 8 — Identify the Triggering Statement

Search for `Dump at QueryExecution`.

This section shows:
- The SQL statement that caused the error
- The query plan
- The involved tables, views, and database user

---

## Step 9 — Analyze OOM from the Indexserver Trace File

Re-run `call "HA215::rte_statements"` (Step 1) to generate a fresh OOM event.

Then, in the **Database Explorer**, navigate back to:
```
HXE@HXE (vhcala4hci.local.lan) → Database Diagnostic Files → vhcala4hci.local.lan → indexserver
```

1. Search for and open the file named `indexserver` (the main trace file).
2. From the **end of the file**, search upward for `Allocation failed`.

   > This shows technical memory allocation details but not the failing SQL query.

3. Search again from the end for `oom flag transferred`.

Answer:
- What is the SQL statement hash number?
- From which application was the OOM triggered?
- Which database user caused the OOM?

---

## Result

You have identified an Out of Memory event using both the RTEdump file and the indexserver trace. The RTEdump provides the most detailed analysis including the failing SQL statement and top memory allocators.
