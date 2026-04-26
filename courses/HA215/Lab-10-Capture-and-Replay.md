# Lab 10 — Use SAP HANA Capture and Replay

## Business Example

Changes are planned for your SAP HANA production system in two weeks. To ensure no performance impact, you will capture the current workload and replay it on the same system to identify potential problems before the changes are applied.

---

## Connection Details

SSH to your assigned VM  (`10.10.110.XX` — Student 01=.11, 02=.12 … 10=.20):
```
ssh root@10.10.110.XX
su - hxeadm
```

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

HANA SQL port: `10.10.110.XX:39015`  
SID: `HXE` | Instance: `90`

---

## Step 1 — Start the Workload Capture

1. Open **https://vhcala4hci.local.lan:51039** and log on.
2. From the **Database Directory**, choose **HXE@HXE**.
3. In the **Database Overview**, search for and choose the **Capture Workload** card.
4. Choose **New Capture**.
5. In the **Capture Configuration** screen:
   - **Usage:** select `Replay and Analysis`
   - **Capture Name:** `HA215 Workload Capture`
   - **Description:** `Workload capture before SAP HANA update to revision XX`
6. Keep all other defaults and choose **Start Capture**.
7. Choose the **HA215 Workload Capture** line to open the Capture Monitor.

---

## Step 2 — Generate Workload

In an SSH session:
```bash
cd /data/training/setup/exercises_HXE
sh ./Ex_10_GenerateLoad.sh
```

Wait until the script finishes (approximately one minute).

---

## Step 3 — Stop the Capture and Load Workload Analysis

1. Return to the **Capture Monitor** tab.
2. Choose **Stop Capture → Yes**.
3. In the **Workload Analysis** column, choose **Start** to load the workload analysis data.
4. In the **Loading Workload** popup, choose **Start Loading**.
5. Refresh until the **Workload Analysis** status shows **Loaded**.
6. Choose **< (back)** to return to the Database Overview.

---

## Step 4 — Preprocess the Captured Workload for Replay

1. In the **Database Overview**, find and choose the **Replay Workload** card.
2. In the **Replay Management** screen, choose **Start** in the **Preprocess Status** column.
3. In the **Memory Consumption for Preprocessing** popup, choose **Start Preprocessing**.
4. Refresh until the status shows **Preprocessed**.

---

## Step 5 — Create hdbuserstore Keys

In your SSH session, switch to hxeadm:
```bash
su - hxeadm
```

Create the userstore keys used by the replay tool:
```bash
hdbuserstore SET CR_SYSTEM 10.10.110.XX:39015@HXE SYSTEM Poll0000
hdbuserstore SET CR_CPT_MONITOR 10.10.110.XX:39015@HXE SYSTEM Poll0000
hdbuserstore SET CR_HA215 10.10.110.XX:39015@HXE HA215 Welcome1
```

Verify the keys were created:
```bash
hdbuserstore LIST
```

---

## Step 6 — Start the Workload Replay Tool

Still as `hxeadm`, start the replay tool:
```bash
hdbwlreplayer -controlhost 10.10.110.XX -controlinstnum 90 -controladminkey system,CR_SYSTEM -controldbname HXE -port 12345
```

The replay tool is now running and accepting requests. Keep this session open.

---

## Step 7 — Configure and Start the Replay in Cockpit

1. Return to the **Replay Management** screen in the browser.
2. Choose the **HA215 Workload Capture** line.
3. In the **Replay Configuration** screen, configure:

**General Information:**
| Field | Value |
|-------|-------|
| Replay Name | `HA215 Workload Capture` |
| Target Host Name | `HXE@HXE` (use the value input help icon) |

**Target Instance options:**
| Field | Value |
|-------|-------|
| Synchronize Replay with Backup | OFF |
| Transactional Replay | ON |

**Replayer Authentication:**
| Field | Value |
|-------|-------|
| Replayer List | Select `10.10.110.XX / 12345` |
| User Name | `SYSTEM` |
| Authentication Method | Secure User Store Key — `CR_SYSTEM` |

**User Authentication:**
| Field | Value |
|-------|-------|
| Target System User | `CR_SYSTEM` |
| Target Technical User | `CR_CPT_MONITOR` |
| HA215 user | `CR_HA215` |

4. Choose **User List** and enter the HA215 user key `CR_HA215` when prompted.
5. Choose **Start Replay**.
6. Refresh until the replay starts. Choose the **HA215 Workload Capture** line to monitor progress.

Wait until the workload replay is finished.

---

## Step 8 — Examine the Replay Results

1. Once replay is complete, choose **Go to Report**.
2. Review the data in these tabs:
   - **Overview** — overall comparison between capture and replay
   - **Load** — resource consumption during replay
   - **Performance Comparison** — response time differences
   - **Result Comparison** — data correctness checks

3. Return to Home: **Replay Report** navigation menu → **Home**.

---

## Result

You have captured a production workload and replayed it against the same SAP HANA system. This technique allows you to validate performance impact of HANA updates, configuration changes, or schema modifications before applying them to production.
