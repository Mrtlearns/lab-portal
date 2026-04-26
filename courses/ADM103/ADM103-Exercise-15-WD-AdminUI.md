# Exercise 15 — Web Dispatcher Administration Interface
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Instance | D11 (system number 11) |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC |
| ABAP password | Poll000000 |
| WD HTTP port | **8001** |
| WD HTTPS port | 44300 |
| WD Admin URL | `http://s4xhost:8001/sap/wdisp/admin/public/index.html` |
| WD working dir | `/usr/sap/S4X/WD00/` |
| WD trace log | `/usr/sap/S4X/WD00/work/dev_webdisp` |
| OS admin user | `s4xadm` |

> **Port note:** Port 8000 is occupied by the HANA Web Dispatcher (`hdbwebdispatche`).
> The standalone SAP Web Dispatcher we installed in Exercise 14 runs on **port 8001**.
>
> **Pre-requisite:** Exercise 14 must be complete. Verify with:
> ```bash
> ss -tlnp | grep sapwebdisp
> ```

---

## Business Scenario

The Web Dispatcher is now running and forwarding requests to the S4X backend. As a basis
administrator, you need to know how to monitor and manage it without restarting the process.
The Web Dispatcher ships with a built-in HTTP administration interface that gives you live
visibility into connected backend systems, active connections, work processes, and trace
settings — all from a browser, without any SAPGUI access.

---

## Task 1 — Open the Web Administration Interface

1. From a browser (or from the terminal if no browser is available), navigate to:

   ```
   http://s4xhost:8001/sap/wdisp/admin/public/index.html
   ```

2. The **SAP Web Dispatcher — Administration** page loads. You will see a navigation
   panel on the left with sections including:
   - **Server** — version, uptime, system info
   - **ICM** — Internet Communication Manager details
   - **Services** — listening ports
   - **Work Processes** — ICM/WD worker threads
   - **Subhandlers** — registered backend systems
   - **Connections** — active HTTP/HTTPS connections
   - **Trace** — log level configuration

   > **Note:** If the page returns HTTP 403 or "Service not found", check that the profile
   > parameter `icm/HTTP/admin_0` is present in `WD.pfl`. See Exercise 14 Task 2.

---

## Task 2 — Inspect Server Information

1. In the left panel, click **Server**.

2. Review the **Version / Build** section. Note:
   - SAP Web Dispatcher release and patch level
   - Start time (confirms the current process uptime)
   - Process ID (PID) — useful for `kill -HUP` soft restart

3. Click **Parameters** (within the Server section). This shows the effective profile
   parameters the running WD loaded from `WD.pfl`. Verify:

   | Parameter | Expected value |
   |-----------|---------------|
   | `DIR_ROOT` | `/usr/sap/S4X/WD00` |
   | `icm/server_port_0` | `PROT=HTTP,PORT=8001` |
   | `wdisp/system_0` | `SID=S4X, MSHOST=s4xhost, MSPORT=8110, SSL_ENCRYPT=0` |
   | `wdisp/ssl_encrypt` | `0` |

   > **Tip:** The Parameters view shows the resolved values after variable expansion
   > (e.g. `$(DIR_ROOT)` is shown as the full path). This is the single fastest way to
   > confirm your profile was loaded correctly.

---

## Task 3 — Check Listening Services

1. In the left panel, click **Services**.

2. You should see two active service rows:

   | Protocol | Port | Status |
   |----------|------|--------|
   | HTTP | 8001 | Active |
   | HTTPS | 44300 | Active |

3. Confirm the **Status** column shows `Active` for HTTP. If HTTPS shows `Inactive`,
   that is addressed in Exercise 16 (SSL configuration).

4. Cross-check from the terminal to confirm the OS is also listening:

   ```bash
   ss -tlnp | grep sapwebdisp
   ```

   You will also see `hdbwebdispatche` on port 8000 — that is the HANA Web Dispatcher,
   a separate process. Do not confuse the two.

---

## Task 4 — Inspect Registered Backend Systems

The Web Dispatcher retrieves the list of active ABAP application server instances from the
message server on first connect, then caches it. This is the **Subhandlers** view.

1. In the left panel, click **Subhandlers**.

2. You should see a row for system **S4X** with:
   - The backend hostname (`s4xhost`)
   - The ABAP ICM HTTP port (`8011`)
   - Status: **Active**

3. If the row is missing or shows **Inactive**:
   - The WD was unable to contact the message server on port 8110.
   - Check the ms_acl_info file from Exercise 14 Task 3.
   - Verify the MS is running: `ss -tlnp | grep 8110`

4. To force the WD to refresh its backend server list **without restarting**:

   In the Subhandlers page, click the **Reload** or **Refresh Server List** button
   (labelled **"Reload server cache"** in some releases).

   Alternatively, from the terminal:

   ```bash
   curl -s "http://s4xhost:8001/sap/wdisp/admin/server?cmd=reload"
   ```

---

## Task 5 — Monitor Active Connections

1. In the left panel, click **Connections**.

2. The table shows all currently open HTTP/HTTPS connections through the WD. Each row
   shows:
   - Client IP address
   - Connection state (keep-alive, active, etc.)
   - Backend server the request was routed to

3. Generate some test traffic so you can see entries appear:

   ```bash
   curl -s http://s4xhost:8001/sap/public/ping > /dev/null &
   curl -s http://s4xhost:8001/sap/bc/gui/sap/its/webgui > /dev/null &
   ```

   Refresh the Connections page in the browser immediately after running those commands.

4. In a classroom environment connections clear quickly. If the table appears empty,
   that is normal — all requests completed before you refreshed.

---

## Task 6 — Adjust Trace Level

The Web Dispatcher writes its trace output to `/usr/sap/S4X/WD00/work/dev_webdisp`.
The default trace level is `1` (errors + warnings). You can raise it temporarily for
troubleshooting.

### 6.1 Raise trace level via the Admin UI

1. In the left panel, click **Trace**.

2. Under **ICM Trace Level**, change the value to `3` (full trace, including HTTP
   request/response headers).

3. Click **Apply**.

4. Immediately generate a request through the WD:

   ```bash
   curl -v http://s4xhost:8001/sap/public/ping
   ```

5. On the OS, tail the trace file:

   ```bash
   tail -80 /usr/sap/S4X/WD00/work/dev_webdisp
   ```

   With trace level 3 you will see full HTTP header dumps for each request and the
   backend selection logic.

### 6.2 Reset trace level

6. After reviewing the output, reset the trace level back to `1` in the Admin UI to
   avoid filling the disk.

   > **Production note:** Never leave trace level 3 running in production.

### 6.3 Check trace from the terminal (alternative)

```bash
tail -f /usr/sap/S4X/WD00/work/dev_webdisp
```

Press `Ctrl+C` to stop.

---

## Task 7 — View Work Processes

1. In the left panel, click **Work Processes**.

2. The table shows ICM worker threads. Each row shows:
   - Thread ID
   - State (Free / Busy)
   - Current request details (if Busy)

---

## Task 8 — Soft Shutdown via Admin UI

> **Lab only — the WD will stop.** Only perform this if you want to practice restarting it.

1. In the left panel, click **Server** → **Soft Shutdown**.

2. Click the **Shutdown** button.

3. Restart from the s4xadm terminal:

   ```bash
   cd /usr/sap/S4X/WD00/work
   /sapmnt/S4X/exe/uc/linuxx86_64/sapwebdisp pf=/usr/sap/S4X/WD00/WD.pfl -start
   ```

4. Re-open the Admin UI and confirm the **Server** page shows a new Start Time.

---

## Task 9 — SMICM Comparison (SAPGUI)

1. Log on via SAPGUI:
   - **Host**: s4xhost — **System number**: 11 — **Client**: 000
   - **User**: DDIC — **Password**: Poll000000

2. Go to transaction **SMICM**.

3. Under **Goto → Services**, note the ABAP ICM services:

   | Protocol | Port | Notes |
   |----------|------|-------|
   | HTTP | 8011 | ABAP ICM — direct access |
   | HTTPS | 44311 | ABAP ICM — direct SSL |

4. Compare with the WD services you saw in Task 3 (ports 8001 / 44300).

   > **Key distinction:**
   > - SMICM shows the **ABAP application server's ICM** (ports 8011 / 44311).
   > - The Web Dispatcher's own ICM is **not visible in SMICM** — it is a separate
   >   OS process. Its trace log is `dev_webdisp`, not `dev_icm`.
   > - A third process, the **HANA Web Dispatcher** (`hdbwebdispatche`), runs on port
   >   8000 and is unrelated to both of the above.

5. In SMICM, go to **Goto → Workers**. This is the ABAP ICM worker pool — separate
   from the WD worker pool you viewed in Task 7.

---

## Summary

| What you explored | Detail |
|-------------------|--------|
| Admin UI URL | `http://s4xhost:8001/sap/wdisp/admin/public/index.html` |
| Server info | Version, PID, uptime, effective parameters |
| Services | HTTP **8001** Active, HTTPS 44300 Active |
| Subhandlers | S4X backend on s4xhost:8011 — registered via MS 8110 |
| Connections | Live view of active routed connections |
| Trace | Level 1 (normal) → 3 (verbose) → reset to 1 |
| Work Processes | ICM thread pool, free/busy states |
| Soft Shutdown | Graceful drain-and-stop, then restart with `-start` |
| SMICM comparison | ABAP ICM (8011/44311) vs WD ICM (8001/44300) vs HANA WD (8000) — three separate processes |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Admin UI returns HTTP 404 on port 8001 | Verify `icm/HTTP/admin_0` is in `WD.pfl`; restart WD |
| Browser connects to 8000 but gets HANA page | Wrong port — use **8001** for the SAP Web Dispatcher |
| Subhandlers shows no backend | Check ms_acl_info; verify `ss -tlnp \| grep 8110` |
| Trace level change has no effect | Click Apply — value must be submitted, not just typed |
| `dev_webdisp` grows very fast | Trace level is >1; reset to 1 via Admin UI |
