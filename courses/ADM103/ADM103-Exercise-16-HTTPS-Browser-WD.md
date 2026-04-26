# Exercise 16 — Enable HTTPS Between the Web Browser and SAP Web Dispatcher
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| OS admin user | s4xadm |
| WD HTTP port | **8001** *(8000 is occupied by HANA Web Dispatcher)* |
| WD HTTPS port | **44300** |
| WD SECUDIR | `/usr/sap/S4X/WD00/sec` |
| WD profile | `/usr/sap/S4X/WD00/WD.pfl` |
| sapgenpse binary | `/sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse` |
| sapcrypto library | `/sapmnt/S4X/exe/uc/linuxx86_64/libsapcrypto.so` |

> **Pre-requisite:** Exercise 14 complete. Web Dispatcher running on port 8001.

---

## Business Scenario

Currently browsers connect to the Web Dispatcher using plain HTTP on port 8001. Any
credentials or session data transmitted are visible in clear text. In this exercise you
will verify or create a server certificate PSE, confirm the Web Dispatcher presents it
on port 44300, and test that HTTPS works end-to-end.

---

## Task 1 — Check Whether the Server PSE Already Exists

The Web Dispatcher uses the SAP CommonCryptoLib (sapcrypto) for TLS. The certificate
and private key are stored in a **PSE** (Personal Security Environment) file. The
SECUDIR convention means the WD automatically uses `SECUDIR/SAPSSLS.pse` for HTTPS
without requiring an explicit profile parameter.

1. Switch to the s4xadm terminal:

   ```bash
   su - s4xadm
   ```

2. Check whether the PSE already exists:

   ```bash
   ls -l /usr/sap/S4X/WD00/sec/SAPSSLS.pse
   ```

   - **If the file exists** → skip Task 2 and proceed directly to Task 3.
   - **If the file does not exist** → continue with Task 2 to generate it.

3. If the PSE exists, display the certificate details to understand what is already
   configured:

   ```bash
   export LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64
   /sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse get_my_name \
     -v -p /usr/sap/S4X/WD00/sec/SAPSSLS.pse
   ```

   Note the Subject (CN) and validity dates. Proceed to Task 3.

---

## Task 2 — Generate a Self-Signed Server PSE (Only If Missing)

> **Skip this task if `SAPSSLS.pse` already exists** (verified in Task 1).

1. Set the environment:

   ```bash
   export SECUDIR=/usr/sap/S4X/WD00/sec
   export LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64
   ```

2. Generate a self-signed server PSE:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapgenpse gen_pse \
     -v \
     -noreq \
     -p /usr/sap/S4X/WD00/sec/SAPSSLS.pse \
     "CN=s4xhost, O=MrTLabs, C=US"
   ```

   When prompted for a PIN, press **Enter** twice (no PIN for lab).

   Expected output:
   ```
   sapgenpse: Generating PSE ...
   sapgenpse: Successfully generated PSE SAPSSLS.pse
   ```

3. Verify the PSE was created:

   ```bash
   ls -l /usr/sap/S4X/WD00/sec/SAPSSLS.pse
   ```

---

## Task 3 — Verify the WD Profile HTTPS Configuration

1. Review the current WD profile:

   ```bash
   cat /usr/sap/S4X/WD00/WD.pfl
   ```

2. Confirm the following are present:

   | Line | Expected |
   |------|----------|
   | `SECUDIR` | `= $(DIR_ROOT)/sec` |
   | `SETENV_00` | `= LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64` |
   | `icm/server_port_1` | `= PROT=HTTPS,PORT=44300` |

   The WD automatically loads `SECUDIR/SAPSSLS.pse` when HTTPS is configured. No
   explicit `ssl/server_pse` parameter is required as long as `SECUDIR` is set correctly.

3. If `ssl/ssl_lib` is not present, add it for explicit clarity (optional but
   recommended in production):

   ```bash
   vi /usr/sap/S4X/WD00/WD.pfl
   ```

   Add after the `SETENV_00` line:

   ```
   ssl/ssl_lib = /sapmnt/S4X/exe/uc/linuxx86_64/libsapcrypto.so
   ```

   Save and exit (`:wq`).

4. If you added `ssl/ssl_lib`, reload the WD:

   ```bash
   /sapmnt/S4X/exe/uc/linuxx86_64/sapwebdisp \
     pf=/usr/sap/S4X/WD00/WD.pfl -stop

   cd /usr/sap/S4X/WD00/work
   /sapmnt/S4X/exe/uc/linuxx86_64/sapwebdisp \
     pf=/usr/sap/S4X/WD00/WD.pfl -start
   ```

   If no changes were needed, skip the restart.

---

## Task 4 — Verify Port 44300 Is Listening

```bash
ss -tlnp | grep 44300
```

Expected output:
```
LISTEN  0  ...  0.0.0.0:44300  ...  sapwebdisp
```

> **Also present:** You will see port `44310` occupied by `wd.sapS4X_ASCS10` — that is
> the embedded Web Dispatcher inside the ASCS instance. Our standalone WD is on 44300.

---

## Task 5 — Test HTTPS Connectivity

1. Test with curl (the `-k` flag skips certificate verification for self-signed certs):

   ```bash
   curl -vk https://s4xhost:44300/sap/public/ping
   ```

   Expected: `HTTP/1.1 200 OK`

2. Inspect the certificate presented by the WD:

   ```bash
   echo | openssl s_client -connect s4xhost:44300 2>/dev/null \
     | openssl x509 -noout -subject -dates
   ```

   Expected output shows the Subject CN and validity period.

3. Test the WebGUI over HTTPS:

   In a browser: `https://s4xhost:44300/sap/bc/gui/sap/its/webgui`

   Accept the browser security warning (expected — self-signed cert).
   You should see the SAP login screen.

---

## Task 6 — Verify in the WD Admin UI

1. Navigate to `http://s4xhost:8001/sap/wdisp/admin/public/index.html`

2. Click **Services**. Confirm:

   | Protocol | Port | Status |
   |----------|------|--------|
   | HTTP | 8001 | Active |
   | HTTPS | 44300 | Active |

---

## Summary

| What you configured | Value |
|--------------------|-------|
| Server PSE | `/usr/sap/S4X/WD00/sec/SAPSSLS.pse` |
| PSE auto-detection | Via `SECUDIR = $(DIR_ROOT)/sec` — no explicit `ssl/server_pse` needed |
| SSL library | `libsapcrypto.so` (via `SETENV_00` / `ssl/ssl_lib`) |
| HTTPS port | `44300` |
| HTTP port | `8001` *(8000 = HANA Web Dispatcher — do not use)* |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Port 44300 not listening after restart | Check `dev_webdisp` for PSE load errors; confirm PSE file is readable by s4xadm |
| `curl: (35) SSL connect error` | TLS handshake failed — check `grep -i ssl dev_webdisp` |
| Browser shows ERR_CERT errors | Accept self-signed warning or add cert to browser trust store |
| WD reports `ICU library not found` on start | `SETENV_00 = LD_LIBRARY_PATH=/sapmnt/S4X/exe/uc/linuxx86_64` must be in `WD.pfl` |
| `SAPSSLS.pse: Permission denied` | `chown s4xadm:sapsys /usr/sap/S4X/WD00/sec/SAPSSLS.pse` |
| Connected to port 8000 but got HANA login | Wrong port — SAP WD is on **8001** |
