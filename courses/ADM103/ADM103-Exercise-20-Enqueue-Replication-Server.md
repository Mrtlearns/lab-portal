# Exercise 20 — Installation and Operation of an Enqueue Replication Server
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC / Poll000000 |
| ASCS instance | ASCS10 (instance number 10) |
| Enqueue server binary | `enq_server` (ENSA2) |
| Enqueue server port | **3210** *(confirmed listening)* |
| **ERS instance** | **ERS20** (instance number 20) — new in this exercise |
| ERS binary | `enq_replicator` |
| ERS replication port | **3220** |
| ERS trace log | `dev_enq_replicator` |
| sapcontrol | `/sapmnt/S4X/exe/uc/linuxx86_64/sapcontrol` |
| OS admin user | s4xadm |

---

## Business Scenario

The ASCS10 hosts the **Enqueue Server 2** (ENSA2), which holds the global SAP lock table.
If the ASCS process crashes, all locks are lost and active users experience aborted
transactions. The Enqueue Replication Server (ERS) maintains a real-time mirror copy of
the lock table in a separate process. If the Enqueue Server fails, the ERS provides the
lock data for a takeover with no data loss. In this exercise you will install and start
an ERS20 instance on `s4xhost` and verify that lock replication is active.

> **Production note:** In a real HA landscape, ASCS and ERS run on different hosts
> with Pacemaker managing failover. This lab runs both on `s4xhost` to demonstrate the
> concept on a single host.

---

## Task 1 — Understand the Current Enqueue Configuration

1. Verify the ASCS10 process list via sapcontrol:

   ```bash
   su - s4xadm
   export LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64
   /sapmnt/S4X/exe/uc/linuxx86_64/sapcontrol -nr 10 -function GetProcessList
   ```

   Expected output includes:
   ```
   enq_server, Enqueue Server 2, GREEN, Running, ...
   msg_server, MessageServer, GREEN, Running, ...
   ```

   The process name `enq_server` confirms **ENSA2** (Enqueue Server 2) is in use —
   this is the standard for S/4HANA 2023.

2. Confirm the enqueue server port (3210) is listening:

   ```bash
   ss -tlnp | grep 3210
   ```

   Expected: `SAP_S4X_10_ENQ` on `0.0.0.0:3210`

3. Confirm the ERS binary is available:

   ```bash
   ls -l /sapmnt/S4X/exe/uc/linuxx86_64/enq_replicator
   ```

---

## Task 2 — Create the ERS Instance Directory

1. Create the ERS working directories (as s4xadm):

   ```bash
   mkdir -p /usr/sap/S4X/ERS20/work
   mkdir -p /usr/sap/S4X/ERS20/data
   mkdir -p /usr/sap/S4X/ERS20/log
   ```

2. Verify:

   ```bash
   ls -la /usr/sap/S4X/ERS20/
   ```

---

## Task 3 — Create the ERS Profile

1. Create the ERS profile file:

   ```bash
   vi /sapmnt/S4X/profile/S4X_ERS20_s4xhost
   ```

2. Enter the following content exactly:

   ```
   # SAP ERS — Enqueue Replication Server 2 — S4X ERS20 on s4xhost
   SAPSYSTEMNAME    = S4X
   SAPSYSTEM        = 20
   INSTANCE_NAME    = ERS20

   DIR_ROOT         = /usr/sap/S4X
   DIR_INSTANCE     = $(DIR_ROOT)/ERS20
   DIR_EXECUTABLE   = /sapmnt/S4X/exe/uc/linuxx86_64
   DIR_PROFILE      = /sapmnt/S4X/profile

   SETENV_00        = LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64

   # Enqueue server to replicate from (ASCS10 on port 3210)
   enque/serverhost    = s4xhost
   enque/serverinst    = 10

   # ERS replication port: 32 + instance 20 = 3220
   enque/replication_port = 3220

   # Lock table size
   enque/table_size    = 4096

   # Logging
   rdisp/TRACE         = 1
   ```

3. Save and exit (`:wq`).

4. Set correct permissions:

   ```bash
   chmod 644 /sapmnt/S4X/profile/S4X_ERS20_s4xhost
   chown s4xadm:sapsys /sapmnt/S4X/profile/S4X_ERS20_s4xhost
   ```

---

## Task 4 — Start the ERS

1. Start the enqueue replicator in the background:

   ```bash
   cd /usr/sap/S4X/ERS20/work
   nohup /sapmnt/S4X/exe/uc/linuxx86_64/enq_replicator \
     pf=/sapmnt/S4X/profile/S4X_ERS20_s4xhost \
     > /usr/sap/S4X/ERS20/log/ers20_start.log 2>&1 &
   ```

2. Verify the ERS process is running:

   ```bash
   pgrep -a enq_replicator
   ```

3. Verify port 3220 is listening:

   ```bash
   ss -tlnp | grep 3220
   ```

4. Check the ERS trace log for startup messages:

   ```bash
   tail -50 /usr/sap/S4X/ERS20/work/dev_enq_replicator
   ```

   Look for:
   ```
   Connected to enqueue server s4xhost:3210
   Replication started
   ```

   > **Note:** The ERS trace file is always named `dev_enq_replicator` and is written
   > in the working directory (`DIR_INSTANCE/work`).

---

## Task 5 — Verify Lock Replication via SM12

1. In SAPGUI (host: s4xhost, system: 11, client: 000, DDIC/Poll000000), go to **SM12**.

2. Note the current lock count (number of rows in the lock table).

3. Generate a test lock: open any business object in change mode (e.g., open a
   material in MM02, or open a user in SU01 change mode without saving). A lock entry
   appears in SM12 while the object is open.

4. Refresh SM12 (F5) — the lock entry should be visible.

5. Verify the ERS has the same lock count by checking the ERS trace log:

   ```bash
   grep -i "replicated\|lock.*count\|table.*sync" \
     /usr/sap/S4X/ERS20/work/dev_enq_replicator | tail -10
   ```

6. Close the business object in SAPGUI (cancel without saving) to release the lock.
   SM12 should show the entry disappear after refresh.

---

## Task 6 — Verify ASCS Processes After ERS Start

1. Re-run the ASCS process list:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapcontrol -nr 10 -function GetProcessList
   ```

   The ERS is a separate process — it does **not** appear in the ASCS10 process list.
   It is an independent instance registered with the message server.

2. In SAPGUI, go to **SM51** (Server Overview).

   The ERS instance (`s4xhost / ERS20`) may appear as an additional line depending
   on the release. If it does, its type will be **ERS**.

---

## Task 7 — Stop the ERS

```bash
kill $(pgrep enq_replicator)
```

Verify it stopped:

```bash
pgrep enq_replicator || echo "ERS stopped"
```

To restart:

```bash
cd /usr/sap/S4X/ERS20/work
nohup /sapmnt/S4X/exe/uc/linuxx86_64/enq_replicator \
  pf=/sapmnt/S4X/profile/S4X_ERS20_s4xhost \
  > /usr/sap/S4X/ERS20/log/ers20_start.log 2>&1 &
```

> In production, the ERS is managed by Pacemaker (cluster manager). Never use `kill`
> in production — let the cluster manager handle start/stop to maintain HA integrity.

---

## Summary

| What you configured | Value |
|--------------------|-------|
| Enqueue server type | ENSA2 (`enq_server`) — confirmed in ASCS10 |
| ERS instance | ERS20 |
| ERS working directory | `/usr/sap/S4X/ERS20/` |
| ERS profile | `/sapmnt/S4X/profile/S4X_ERS20_s4xhost` |
| Replicating from | ASCS10 on s4xhost:3210 |
| ERS listening port | 3220 |
| ERS trace log | `/usr/sap/S4X/ERS20/work/dev_enq_replicator` |
| Lock replication verified | SM12 lock count + ERS trace log |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| ERS fails to start — `no profile path` | Confirm `pf=` argument is present and path is correct |
| `dev_enq_replicator` shows `Connection refused` to 3210 | ASCS enq_server not running — `sapcontrol -nr 10 -function GetProcessList` |
| Port 3220 not listening | ERS failed to bind — check log for `bind error`; another process may hold 3220 |
| ERS starts then exits immediately | Check last 20 lines of `dev_enq_replicator` for ABAP exception or auth error |
| Lock replication not confirmed in trace | Allow 5–10 seconds for initial sync; increase trace level: add `-t 2` to startup command |
