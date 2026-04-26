# Exercise 17 — Enable HTTPS Between SAP Web Dispatcher and the SAP System
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC / Poll000000 |
| WD HTTP port | **8001** *(8000 = HANA Web Dispatcher)* |
| WD HTTPS port | 44300 |
| ABAP HTTPS port | **44311** *(already active)* |
| WD SECUDIR | `/usr/sap/S4X/WD00/sec` |
| ABAP SECUDIR | `/usr/sap/S4X/D11/sec` |
| WD profile | `/usr/sap/S4X/WD00/WD.pfl` |
| sapgenpse binary | `/sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse` |
| OS admin user | s4xadm |

> **Pre-requisite:** Exercise 16 complete. HTTPS between browser and WD working on
> port 44300. ABAP HTTPS on 44311 is already active on this system.

---

## Business Scenario

Exercise 16 secured the connection between the browser and the Web Dispatcher.
However, traffic between the Web Dispatcher and the ABAP application server still
travels in plain HTTP on port 8011. In this exercise you will configure the Web
Dispatcher to forward requests to the ABAP ICM over HTTPS (port 44311), and import
the ABAP certificate into the WD's trust store so the handshake succeeds.

---

## Task 1 — Verify the ABAP ICM HTTPS Port

1. Confirm the ABAP system is already listening for HTTPS:

   ```bash
   ss -tlnp | grep 44311
   ```

   Expected:
   ```
   LISTEN  0  ...  0.0.0.0:44311  ...  SAP_S4X_11_ICM
   ```

2. Test the ABAP HTTPS endpoint directly (bypassing the WD):

   ```bash
   curl -vk https://s4xhost:44311/sap/public/ping
   ```

   Expected: `HTTP/1.1 200 OK`

   The ABAP ICM already has a self-signed certificate installed (CN=s4xhost).
   This port is pre-configured on this system — no ABAP-side changes are required
   for this exercise.

---

## Task 2 — Inspect the ABAP Server Certificate

1. Extract the certificate the ABAP ICM presents on port 44311:

   ```bash
   echo | openssl s_client -connect s4xhost:44311 2>/dev/null \
     | openssl x509 -noout -subject -issuer -dates
   ```

   Expected output:
   ```
   subject=CN=s4xhost
   issuer=CN=s4xhost
   notBefore=Mar 22 13:42:00 2026 GMT
   notAfter=Jan  1 00:00:01 2038 GMT
   ```

   Note the Subject `CN=s4xhost` — the WD will verify this CN during the TLS
   handshake once trust is established.

2. Export the certificate to a file:

   ```bash
   echo | openssl s_client -connect s4xhost:44311 2>/dev/null \
     | openssl x509 -outform PEM \
     > /tmp/abap_icm_cert.pem
   ```

3. Verify the export:

   ```bash
   openssl x509 -noout -subject -in /tmp/abap_icm_cert.pem
   ```

---

## Task 3 — Import the ABAP Certificate into the WD PSE

The WD must trust the ABAP ICM's certificate. Use `sapgenpse maintain_pk` to add
it to the WD PSE trusted certificate list.

1. Set the environment:

   ```bash
   export SECUDIR=/usr/sap/S4X/WD00/sec
   export LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64
   ```

2. Add the ABAP certificate to the WD PSE as a trusted entry:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse maintain_pk \
     -v \
     -p /usr/sap/S4X/WD00/sec/SAPSSLS.pse \
     -a /tmp/abap_icm_cert.pem
   ```

   When prompted for a PIN, press **Enter** (no PIN was set in Exercise 16).

   Expected output:
   ```
   sapgenpse: Certificate added to PSE
   ```

3. Verify the certificate is now trusted in the PSE:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse maintain_pk \
     -v \
     -p /usr/sap/S4X/WD00/sec/SAPSSLS.pse \
     -l
   ```

   You should see the ABAP ICM certificate listed (`CN=s4xhost`).

---

## Task 4 — Update the WD Profile for Backend HTTPS

1. Edit the WD profile:

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

2. Change `wdisp/system_0` to enable SSL on the backend connection:

   Change:
   ```
   wdisp/system_0 = SID=S4X, MSHOST=s4xhost, MSPORT=8110, SSL_ENCRYPT=0
   ```
   To:
   ```
   wdisp/system_0 = SID=S4X, MSHOST=s4xhost, MSPORT=8110, SSL_ENCRYPT=1
   ```

3. Also update `wdisp/ssl_encrypt`:

   Change:
   ```
   wdisp/ssl_encrypt = 0
   ```
   To:
   ```
   wdisp/ssl_encrypt = 1
   ```

4. Save and exit (`:wq`).

---

## Task 5 — Restart and Verify

1. Restart the Web Dispatcher:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapwebdisp \
     pf=/usr/sap/S4X/WD00/WD.pfl -stop

   cd /usr/sap/S4X/WD00/work
   /sapmnt/S4X/exe/uc/linuxx86_64/sapwebdisp \
     pf=/usr/sap/S4X/WD00/WD.pfl -start
   ```

2. Check the trace for the backend SSL handshake:

   ```bash
   grep -i "ssl\|encrypt\|44311" /usr/sap/S4X/WD00/work/dev_webdisp | tail -30
   ```

   Look for a successful SSL connect to port 44311.

3. Test the full HTTPS path — browser → WD → ABAP:

   ```bash
   curl -vk https://s4xhost:44300/sap/public/ping
   ```

   The request now travels HTTPS on both hops:
   - Browser → WD: port 44300
   - WD → ABAP ICM: port 44311

4. Test the WebGUI over the fully-encrypted path:

   In a browser: `https://s4xhost:44300/sap/bc/gui/sap/its/webgui`

---

## Task 6 — Verify in STRUST (SAPGUI)

For completeness, inspect the ABAP ICM certificate configuration.

1. Log on via SAPGUI:
   - **Host**: s4xhost — **System number**: 11 — **Client**: 000
   - **User**: DDIC — **Password**: Poll000000

2. Go to transaction **STRUST**.

3. Under **SSL server Standard**, expand the entry and click the certificate.

4. Note: Subject = `CN=s4xhost`, Issuer = `CN=s4xhost` — self-signed, valid until 2038.
   This is the certificate your WD just imported and now trusts.

---

## Summary

| What you configured | Value |
|--------------------|-------|
| Backend connection encryption | `SSL_ENCRYPT=1` in `wdisp/system_0` |
| ABAP HTTPS port used by WD | `44311` |
| Trust chain | WD PSE (`SAPSSLS.pse`) now holds ABAP ICM cert (`CN=s4xhost`) |
| Full encrypted path | Browser → WD:44300 → ABAP:44311 |
| ABAP SECUDIR | `/usr/sap/S4X/D11/sec/` |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| `curl -k https://s4xhost:44311/ping` returns connection refused | ABAP ICM not on port 44311 — check SMICM Goto → Services |
| SSL_connect failed in dev_webdisp | Certificate not imported — re-run Task 3; check PSE list with `maintain_pk -l` |
| Requests work HTTP but fail HTTPS through WD | `wdisp/ssl_encrypt` still 0 — confirm profile change and restart |
| `sapgenpse: PIN required` | PSE was created with a PIN — supply it or re-create with no PIN |
| `DVEBMGS11` path referenced in older docs | Correct ABAP SECUDIR on this system is `/usr/sap/S4X/D11/sec/` |
