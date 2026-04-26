# Exercise 22 — Initial Data Synchronization (CUA)
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC / Poll000000 |
| Transaction — CUA | **SCUA** |
| Transaction — User comparison | **SCUG** |
| Transaction — IDoc monitoring | **WE05** / **BD87** |
| Transaction — IDoc outbox | **WE02** |
| RFC destination | `<LOGSYS>_CUA_CHILD` (from Exercise 21) |

> **Pre-requisite:** Exercise 21 complete. CUA is active in client 000. RFC destination
> and ALE distribution model are configured. The logical system name from Exercise 21
> (e.g. `S4XCLNT000`) is used throughout this exercise — substitute your actual name.

---

## Business Scenario

CUA has been activated, but the child systems do not yet have synchronised copies of the
centrally managed user master records. The **initial data synchronisation** pushes the
full user base from the central system to every child as a batch of USERCLONE IDocs.
After the initial sync, only delta changes (create, modify, lock, delete) are sent.

---

## Task 1 — Review Users Before Synchronisation

1. Log on via SAPGUI (host: s4xhost, system: 11, client: 000, DDIC/Poll000000).

2. Go to **SU10** (mass user maintenance). Leave all fields blank and **Execute** (F8).

   Note the total number of users listed — this is your baseline count.

3. Go to **SCUA → Overview → Users**.

   All users should now show status **Central** (not **Local**) after the activation
   from Exercise 21.

---

## Task 2 — Run Initial User Comparison (SCUG)

SCUG compares user master records between the central system and a child system,
then generates USERCLONE IDocs to bring the child in sync.

1. Go to transaction **SCUG**.

2. Fill in:

   | Field | Value |
   |-------|-------|
   | Central system | Your logical system name (e.g. `S4XCLNT000`) |
   | Child systems | Your RFC destination (e.g. `S4XCLNT000_CUA_CHILD`) |

3. Under **Options**, select:
   - ☑ **Compare users**
   - ☑ **Create missing users in child systems**
   - ☑ **Send complete user data** (initial sync — sends all fields)

4. Click **Execute**.

   The system compares all users and generates one USERCLONE IDoc per user
   (or a batched set, depending on the packaging parameter).

5. A results screen shows the number of IDocs generated. Note this count — it
   should match the user count from Task 1.

---

## Task 3 — Monitor IDoc Processing

1. Go to transaction **WE05** or **WE02**.

2. Filter:
   - Message type: `USERCLONE`
   - Direction: **Outbound**
   - Date: today

3. Check IDoc statuses:

   | Status | Meaning | Action |
   |--------|---------|--------|
   | **03** | Transferred to port | ✅ Success — no action needed |
   | **01** | Generated — waiting to send | Trigger via BD87 (see step 4) |
   | **51** | Application error | Double-click → Status records for details |

4. If IDocs are in status **01** (waiting), trigger processing manually:

   Go to **BD87**, select the USERCLONE IDocs with status 01, and click **Process**.

   Alternatively, trigger from SCUA:
   **SCUA → Distribution → Send all users**.

---

## Task 4 — Verify User Distribution

1. After IDoc processing completes, go to **SCUA → Overview → Users**.

   The **Child systems** column should now be populated, confirming each USERCLONE
   IDoc was processed.

2. Check an individual user. Go to **SU01 → DDIC → Display → Logon Data** tab.

   The **System** field shows `S4XCLNT000` — centrally managed.

3. Run a comparison check:
   **SCUA → Distribution → Compare users**.

   Select the child system and click **Compare**. After a successful initial sync
   the result should show **No differences**.

---

## Task 5 — Test a Delta Change

Verify that CUA automatically distributes incremental changes.

1. In **SU01**, create a test user:

   | Field | Value |
   |-------|-------|
   | User | `CUA_DELTA_TEST` |
   | Last name | `Delta` |
   | First name | `Test` |
   | Password | `Test1234!` |
   | Profile | `S_A.CUSTOMIZ` |

2. Save.

3. Go to **WE02** and check for a new outbound USERCLONE IDoc for `CUA_DELTA_TEST`.
   It should appear within seconds (or after the dispatch job runs).

4. Confirm the IDoc status reaches **03** (transferred).

5. Clean up — **SU01 → `CUA_DELTA_TEST` → Delete**.

---

## Task 6 — Configure Automatic IDoc Dispatch

Ensure delta changes are dispatched without manual intervention.

1. Go to **SM36**.

2. Schedule job `RSEOUT00` (IDoc outbound processing):

   | Field | Value |
   |-------|-------|
   | Job name | `CUA_IDOC_SEND` |
   | Program | `RSEOUT00` |
   | Repeat | Every 5 minutes |

3. **Alternative — immediate port transfer:**

   In **WE21**, open the RFC port for `<LOGSYS>_CUA_CHILD` and set the
   transfer mode to **Trigger immediately**. IDocs are then sent as soon as they
   are created, with no batch job required.

---

## Task 7 — CUA Health Check

1. Go to **SCUA**. Confirm:
   - CUA active: **Yes**
   - Central system: your logical system name
   - Child systems: **Connected**

2. Go to **SU10**. Execute without filters. Confirm the user count matches the
   baseline from Task 1 — no users were lost during CUA activation or initial sync.

3. Go to **SM59**. Test the connection to `<LOGSYS>_CUA_CHILD` — confirm
   **Connection test successful**.

4. Go to **BD64**. Confirm the `CUA_MODEL` distribution model still contains
   the USERCLONE message type assignment between the two logical systems.

---

## Summary

| What you completed | Result |
|-------------------|--------|
| Baseline user count | Recorded from SU10 before sync |
| SCUG initial comparison | All users compared, IDocs generated |
| IDoc status | Status 03 — transferred |
| Delta test | `CUA_DELTA_TEST` created and IDoc distributed automatically |
| Automatic dispatch | `RSEOUT00` job scheduled every 5 minutes (or immediate port) |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| SCUG shows RFC error | Test RFC destination in SM59; verify s4xhost:8011 is reachable, DDIC/Poll000000 correct |
| IDocs stuck in status 01 | Run BD87 to trigger; check whether `RSEOUT00` job is active in SM37 |
| IDoc status 51 — application error | Double-click IDoc in WE02 → Status records; usually a missing profile or auth on child |
| SCUA compare shows differences after sync | Delta IDocs may be queued — wait for `RSEOUT00`, then re-compare |
| User shows **Local** instead of **Central** | User created after CUA activation without SCUG — re-run SCUG for that user |
| CUA shows **Inactive** after system restart | Check SCC4 client settings and SM21 for any deactivation events |
| Cannot find logical system name in SCUA | Go to SALE → Assign Logical System to Client → note the name for client 000 |
