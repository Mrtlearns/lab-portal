# Exercise 00 — Install SAP Web Dispatcher

## 000 HA215 Test

**System reference:**

|Parameter|Value|
|-|-|
|SID|S4X|
|Instance|D11 (system number 11)|
|Host|s4xhost|
|Client|000|
|ABAP user|DDIC|
|ABAP password|Poll000000|
|Message server HTTP port|8110|
|ABAP HTTP port|8011|
|ABAP HTTPS port|44311|
|OS admin user|s4xadm|
|Web Dispatcher binary|`/sapmnt/S4X/exe/uc/linuxx86\_64/sapwebdisp`|

\---

## Business Scenario

Your SAP system currently accepts direct browser connections to the ABAP ICM on port 8011.
In a production landscape, clients should never connect directly to the application server —
a Web Dispatcher acts as the entry point, providing load balancing, URL routing, and a
security boundary. In this exercise you will install and configure a standalone SAP Web
Dispatcher instance that forwards requests to the S4X system via the message server.

\---

## Task 1 — Prepare the Working Directory

The Web Dispatcher needs its own working directory for its profile, trace files, and security store.

1. Open a terminal on `s4xhost`. Switch to the SAP admin user:

```bash
   su - s4xadm
   ```

2. Create the Web Dispatcher instance directory and required sub-directories:

```bash
   mkdir -p /usr/sap/S4X/WD00/work
   mkdir -p /usr/sap/S4X/WD00/sec
   mkdir -p /usr/sap/S4X/WD00/data/icmandir

&#x20;  mkdir -p /usr/sap/S4X/WD00/log/SLOG00
   ```

3. Verify the binary is accessible:

```bash
   ls -l /sapmnt/S4X/exe/uc/linuxx86\_64/sapwebdisp
   ```

   Expected output: `-rwxr-xr-x ... s4xadm sapsys ... sapwebdisp`

   \---

   ## Task 2 — Create the Web Dispatcher Profile

1. Create the profile file:

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

2. Enter the following content exactly:

   ```
   # SAP Web Dispatcher — S4X standalone instance
   # Working directory
   DIR\_ROOT        = /usr/sap/S4X/WD00
   DIR\_INSTANCE    = $(DIR\_ROOT)
   DIR\_EXECUTABLE  = /sapmnt/S4X/exe/uc/linuxx86\_64
   DIR\_DATA        = $(DIR\_ROOT)/data
   SECUDIR         = $(DIR\_ROOT)/sec

   # Library path (required for ICU / crypto)
   SETENV\_00       = LD\_LIBRARY\_PATH=/sapmnt/S4X/exe/uc/linuxx86\_64

   # Web Dispatcher listening ports
   icm/server\_port\_0 = PROT=HTTP,PORT=8001
   icm/server\_port\_1 = PROT=HTTPS,PORT=44300

   # Backend system — connect via message server
   wdisp/system\_0  = SID=S4X, MSHOST=s4xhost, MSPORT=8110, SSL\_ENCRYPT=0

   # Keep SSL off for lab simplicity
   wdisp/ssl\_encrypt = 0
   icm/use\_sapuxuserchk = false

   # Administration interface
   icm/HTTP/admin\_0 = PREFIX=/sap/wdisp/admin, DOCROOT=$(DIR\_DATA)/icmandir,  PORT=8001

   
   # Logging
   rdisp/TRACE     = 1
   ```

3. Save and exit (`Esc` → `:wq`).

   \---

   ## Task 3 — Allow the Web Dispatcher in the Message Server ACL

   The message server has an access control list. The Web Dispatcher must be permitted to
register with it, otherwise it will be rejected when it tries to retrieve the list of
active application server instances.

1. Log on to the SAP system via SAPGUI:

   * **Host**: s4xhost
   * **System number**: 11
   * **Client**: 000
   * **User**: DDIC
   * **Password**: Poll000000
2. Go to transaction **RZ10**.
3. Select profile: `DEFAULT` — Version: `2` — choose **Extended Maintenance** → **Change**.
4. Add the following parameter (or verify it already exists):

|Parameter|Value|
|-|-|
|`ms/acl\_info`|`$(DIR\_GLOBAL)/ms\_acl\_info`|

5. Save the profile. You do **not** need to restart for this step — the ACL file approach
is checked at runtime.
6. **Alternative — direct file approach (faster for lab):**

   Back in the s4xadm terminal, create the ACL file directly:

   ```bash
   cat > /sapmnt/S4X/global/ms\_acl\_info << 'EOF'
   # Message server ACL — allow Web Dispatcher
   HOST=s4xhost, DEST=s4xhost
   EOF
   ```

   > \*\*Note:\*\* On this single-host lab system, both the WD and the message server run on
   > `s4xhost`, so the above allows the WD to connect. On a multi-host landscape you would
   > add the WD's hostname separately.

   \---

   ## Task 4 — Start the Web Dispatcher

1. In the s4xadm terminal, start the Web Dispatcher in the foreground first to verify it comes up cleanly:

   ```bash
   cd /usr/sap/S4X/WD00/work
   /sapmnt/S4X/exe/uc/linuxx86\_64/sapwebdisp pf=/usr/sap/S4X/WD00/WD.pfl
   ```

2. Check the trace file for startup messages:

   ```bash
   tail -50 /usr/sap/S4X/WD00/work/dev\_webdisp
   ```

   Look for lines containing:

   ```
   ICM initialized
   ```

   and

   ```
   registering at message server ... success
   ```

3. Verify the Web Dispatcher is listening:

   ```bash
   ss -tlnp | grep 8001
   ```

   Expected:

   ```
   LISTEN  0  ...  0.0.0.0:8001  ...  sapwebdisp
   ```

   \---

   ## Task 5 — Test Connectivity Through the Web Dispatcher

1. From a browser (or from the terminal using curl), access the SAP system **through the Web Dispatcher**:

   ```bash
   curl -v http://s4xhost:8001/sap/public/ping
   ```

   Expected response: `HTTP/1.1 200 OK`

2. Also test the SAP Fiori/WebGUI login page:

   ```
   http://s4xhost:8000/sap/bc/gui/sap/its/webgui
   ```

   You should see the SAP login screen.

3. Compare: direct access still works too (this is expected in a lab — in production
you would firewall direct access):

   ```bash
   curl -v http://s4xhost:8011/sap/public/ping
   ```

   \---

   ## Task 6 — Verify in SMICM

   The Web Dispatcher runs its own ICM. You can monitor it using the ICM admin interface.

1. In a browser, navigate to:

   ```
   http://s4xhost:8001/sap/wdisp/admin/public/index.html
   ```

   This opens the **Web Dispatcher Administration** page showing:

   * Connected backend systems
   * Active work processes
   * Current connections
2. Back in the SAPGUI session, go to transaction **SMICM**.

   Under **Goto → Services**, verify that the ABAP ICM is serving:

   * HTTP on port 8011
   * HTTPS on port 44311

   > The ABAP ICM and the Web Dispatcher ICM are separate processes. SMICM shows the
   > ABAP ICM only. The WD has its own `dev\_webdisp` trace log.

   \---

   ## Task 7 — (Optional) Stop and Register as a Service

   For lab purposes, stopping the Web Dispatcher:

   ```bash
/sapmnt/S4X/exe/uc/linuxx86\_64/sapwebdisp pf=/usr/sap/S4X/WD00/WD.pfl -stop
```

   To restart:

   ```bash
cd /usr/sap/S4X/WD00/work
/sapmnt/S4X/exe/uc/linuxx86\_64/sapwebdisp pf=/usr/sap/S4X/WD00/WD.pfl -start
```

   \---

   ## Summary

|What you configured|Value|
|-|-|
|Web Dispatcher working dir|`/usr/sap/S4X/WD00/`|
|Profile|`/usr/sap/S4X/WD00/WD.pfl`|
|WD HTTP port|**8000**|
|WD HTTPS port|**44300**|
|Backend routing|Via message server at s4xhost:**8110**|
|Direct ABAP HTTP (bypasses WD)|s4xhost:8011|

\---

## Troubleshooting

|Symptom|Check|
|-|-|
|`ICU library not found` error|Ensure `LD\_LIBRARY\_PATH=/sapmnt/S4X/exe/uc/linuxx86\_64` is set before starting|
|`registering at message server ... failed`|Check ms\_acl\_info file; verify MS is running on port 8110 with `ss -tlnp \| grep 8110`|
|Port 8000 already in use|Another process using it — try port 8001|
|`dev\_webdisp` shows SSL errors|Confirm `wdisp/ssl\_encrypt = 0` is in the profile|
|HTTP 403 through WD|ICF service tree not loaded — verify direct `http://s4xhost:8011/sap/public/ping` returns 200 first|



