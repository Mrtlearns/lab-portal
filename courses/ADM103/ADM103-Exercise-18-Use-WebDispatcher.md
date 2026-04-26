# Exercise 18 — Use SAP Web Dispatcher
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC / Poll000000 |
| WD HTTP port | **8001** *(8000 = HANA Web Dispatcher — do not use)* |
| WD HTTPS port | 44300 |
| ABAP HTTP port | 8011 (direct — bypasses WD) |
| WD profile | `/usr/sap/S4X/WD00/WD.pfl` |
| WD Admin URL | `http://s4xhost:8001/sap/wdisp/admin/public/index.html` |
| OS admin user | s4xadm |

> **Pre-requisite:** Exercises 14–17 complete. WD running on port 8001, HTTPS on 44300.

---

## Business Scenario

The Web Dispatcher is running and forwarding all traffic to S4X. In this exercise you
will explore the URL routing and access control features that make the WD useful beyond
simple port forwarding: prefix-based URL routing, custom error pages, access logging,
and verifying load-balancing behaviour with the server cache.

---

## Task 1 — Review Default URL Routing

By default, the WD forwards **all** URLs to the backend. Confirm this with a few test URLs.

1. Ping endpoint (ICF service):

   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://s4xhost:8001/sap/public/ping
   ```
   Expected: `200`

2. WebGUI:

   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     http://s4xhost:8001/sap/bc/gui/sap/its/webgui
   ```
   Expected: `200` or `301`

3. Fiori launchpad:

   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     http://s4xhost:8001/sap/bc/ui2/flp
   ```
   Expected: `200` or `302`

4. Unknown URL (should pass through and get ABAP 404):

   ```bash
   curl -s -o /dev/null -w "%{http_code}" \
     http://s4xhost:8001/does/not/exist
   ```
   Expected: `404`

---

## Task 2 — Add a URL Prefix Routing Rule

URL routing rules let the WD direct specific URL prefixes to specific backend systems.
In a multi-system landscape, this is how a single WD serves several SAP systems.

1. Edit the WD profile:

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

2. Add the following routing rule at the end of the profile:

   ```
   # URL prefix routing — explicit rule for S4X
   # Forward all /sap/ paths to S4X backend (default behaviour made explicit)
   wdisp/url_prefix_0 = PREFIX=/sap, DEST=S4X
   ```

   > **Note:** `DEST=S4X` matches the SID in `wdisp/system_0`. In a multi-system
   > landscape you would have multiple `wdisp/system_N` entries and route different
   > URL prefixes to different SIDs here.

3. Save and exit. Reload the WD configuration without a full restart:

   ```bash
   kill -HUP $(pgrep sapwebdisp)
   ```

   Or use the Admin UI: `http://s4xhost:8001/sap/wdisp/admin/public/index.html`
   → **Server → Reload Configuration**.

4. Verify routing still works:

   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://s4xhost:8001/sap/public/ping
   ```
   Expected: `200`

---

## Task 3 — Configure a Custom Error Page

When the backend is unreachable, the WD returns a generic error. You can configure it
to serve a custom HTML page instead.

1. Create a simple error page:

   ```bash
   mkdir -p /usr/sap/S4X/WD00/data/icmandir/errors
   cat > /usr/sap/S4X/WD00/data/icmandir/errors/503.html << 'EOF'
   <!DOCTYPE html>
   <html>
   <head><title>SAP System Maintenance</title></head>
   <body>
   <h2>SAP S4X is currently unavailable.</h2>
   <p>Please contact your system administrator.</p>
   </body>
   </html>
   EOF
   ```

2. Add the error page parameter to `WD.pfl`:

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

   Add:
   ```
   # Custom error page
   icm/error_templ_path = $(DIR_DATA)/icmandir/errors
   ```

3. Save and reload:

   ```bash
   kill -HUP $(pgrep sapwebdisp)
   ```

4. To test the error page you would need to stop the ABAP system. Skip in the live
   lab — the configuration is in place and would trigger on a real backend failure.

---

## Task 4 — Explore Load Balancing Behaviour

1. Open the WD Admin UI:
   ```
   http://s4xhost:8001/sap/wdisp/admin/public/index.html
   ```

2. Click **Subhandlers**. Observe:
   - The single S4X backend entry (s4xhost:8011)
   - The **Weight** column — in a multi-AS system, weights influence traffic distribution
   - The **State** column — Active means the WD is currently routing to this server

3. Click **Server Cache**. This shows the server list retrieved from the message server:
   - Instance name: `s4xhost_S4X_11`
   - HTTP port: `8011`
   - HTTPS port: `44311`

4. To force the WD to pick up a newly started AS without restarting:

   Click **Reload server cache**, or from the terminal:

   ```bash
   curl -s "http://s4xhost:8001/sap/wdisp/admin/server?cmd=reload"
   ```

---

## Task 5 — Configure Access Logging

Enable per-request HTTP access logging for the WD.

1. Edit `WD.pfl`:

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

2. Add:

   ```
   # HTTP access log
   icm/HTTP/logging_0 = PREFIX=/,LOGFILE=$(DIR_ROOT)/work/http_access.log,\
   MAXSIZEKB=10240,SWITCHTF=day,LOGFORMAT=%t %h %s %b
   ```

3. Save and reload:

   ```bash
   kill -HUP $(pgrep sapwebdisp)
   ```

4. Generate some requests:

   ```bash
   for i in 1 2 3 4 5; do
     curl -s http://s4xhost:8001/sap/public/ping > /dev/null
   done
   ```

5. View the access log:

   ```bash
   cat /usr/sap/S4X/WD00/work/http_access.log
   ```

   Each line shows: timestamp, client IP, HTTP status, bytes.

---

## Task 6 — Confirm Direct vs. WD Access

In production, firewall rules block direct access to the ABAP ICM on port 8011,
forcing all traffic through the WD. In the lab both paths work — verify this and
understand the difference:

```bash
# Through WD (correct production path)
curl -s -o /dev/null -w "Via WD (8001): %{http_code}\n" \
  http://s4xhost:8001/sap/public/ping

# Direct ABAP (bypasses WD — blocked in production by firewall)
curl -s -o /dev/null -w "Direct (8011): %{http_code}\n" \
  http://s4xhost:8011/sap/public/ping

# HANA Web Dispatcher (unrelated — do not use for ABAP exercises)
curl -s -o /dev/null -w "HANA WD (8000): %{http_code}\n" \
  http://s4xhost:8000/
```

Both 8001 and 8011 return `200` in the lab. The HANA WD on 8000 serves a different
login page (HANA Cockpit / XSA — not relevant to ABAP exercises).

---

## Summary

| What you configured / explored | Detail |
|-------------------------------|--------|
| URL prefix routing | `wdisp/url_prefix_0` — routes `/sap` to S4X backend |
| Reload without restart | `kill -HUP $(pgrep sapwebdisp)` |
| Custom error page | `503.html` served when backend unreachable |
| Server cache / load balancing | Single AS (s4xhost:8011) — reload to pick up new instances |
| HTTP access logging | `http_access.log` with per-request entries |
| WD vs. direct vs. HANA WD | 8001 = SAP WD, 8011 = ABAP direct, 8000 = HANA WD |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `kill -HUP` has no effect | Confirm PID: `pgrep -a sapwebdisp`; ensure HUP goes to sapwebdisp, not hdbwebdispatche |
| URL prefix rule causes 404 for all requests | Check `wdisp/url_prefix_0` DEST exactly matches SID (`S4X`) |
| Access log file not created | Confirm `DIR_ROOT` expands correctly; check `dev_webdisp` for logging errors |
| Admin UI shows no subhandlers after reload | Message server unreachable — `ss -tlnp \| grep 8110` |
| Port 8000 gives HANA page, not SAP WD | Correct port is **8001** |
