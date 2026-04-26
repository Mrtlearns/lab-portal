# Exercise 19 — Send and Receive E-Mails Using SMTP with AS ABAP
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
| ABAP SMTP ICM port | **25011** *(to be configured in this exercise)* |
| Local mail relay | `localhost` / `127.0.0.1` port **25** (Postfix) |
| Transaction — mail config | **SCOT** |
| Transaction — mail inbox | **SBWP** |
| Transaction — sent items / jobs | **SOST** |

> **Lab SMTP environment:** Postfix is installed and running on `s4xhost` (loopback-only).
> It accepts SMTP connections from `127.0.0.1:25` only. There is no outbound relay
> configured, so messages sent from SAP will be queued locally and delivered to the
> local OS mailbox. This is sufficient to verify the complete ABAP→SMTP flow in the lab.

---

## Business Scenario

SAP AS ABAP can send and receive e-mails directly via SMTP, without requiring a separate
mail server application. The ICM handles SMTP connections. In this exercise you will
add an SMTP listener to the ABAP ICM, configure SAPConnect (the ABAP mail subsystem),
define an SMTP node pointing to the local Postfix relay, schedule the SAPConnect
background job, and verify that a test e-mail is dispatched successfully.

---

## Task 1 — Add an SMTP Port to the ABAP ICM

The D11 instance profile currently configures HTTP on port 8011 and HTTPS on port 44311.
No SMTP port is configured yet. You will add one via RZ10.

1. Log on via SAPGUI (host: s4xhost, system: 11, client: 000, DDIC/Poll000000).

2. Go to transaction **RZ10**.

3. Select profile: `S4X_D11_s4xhost` — choose the highest active version —
   **Extended Maintenance → Change**.

4. Add the following parameter:

   | Parameter | Value |
   |-----------|-------|
   | `icm/server_port_2` | `PROT=SMTP,PORT=25011,TIMEOUT=120` |

5. Save the profile.

6. For the new port to take effect, restart the ABAP ICM **without** a full system
   restart using SMICM:

   Go to **SMICM → Administration → ICM → Restart → Yes**.

7. Verify the SMTP port is now listening:

   In the s4xadm terminal:
   ```bash
   ss -tlnp | grep 25011
   ```

   Expected: `SAP_S4X_11_ICM` listening on `0.0.0.0:25011`

---

## Task 2 — Verify the Local Postfix Relay

Postfix is the local SMTP relay for this exercise. Confirm it is running:

```bash
systemctl status postfix | grep Active
```

Expected: `active (running)`

Postfix listens only on loopback (`127.0.0.1:25`). Confirm:

```bash
ss -tlnp | grep ':25'
```

Expected: `127.0.0.1:25` bound to `master` (Postfix master process).

> **Important:** Postfix on this server has no outbound relay configured
> (`relayhost` is empty) and `inet_interfaces = loopback-only`. Messages delivered to
> Postfix will remain on the local server. This is intentional for the lab — you will
> verify delivery via the Postfix mailbox and SOST, not via an external inbox.

---

## Task 3 — Configure SAPConnect (SCOT)

SAPConnect is the ABAP framework that queues and dispatches outbound messages.

1. In SAPGUI, go to transaction **SCOT**.

2. Go to **Settings → Default Domain**.

   Enter:
   ```
   s4x.mrtlabs.local
   ```

   Click **Continue**.

3. Go to **Create → SMTP** (or in some releases: **Node → Create → SMTP**).

   Fill in the node definition:

   | Field | Value |
   |-------|-------|
   | Node name | `SMTP_LOCAL` |
   | Host | `127.0.0.1` |
   | Port | `25` |
   | Maximum wait time | `00:05:00` |
   | Retry interval | `00:05:00` |

4. In the **Internet** section, set the address area:

   ```
   *
   ```

   Click **Set** next to the entry.

5. Click **Back** and **Save**.

6. Activate the node: select `SMTP_LOCAL` and click **Activate node** (or F5).

   Status should change to **Active** (green).

---

## Task 4 — Schedule the SAPConnect Background Job

SAPConnect dispatches queued messages via a background job.

1. In SCOT, go to **Settings → Sending jobs**.

2. Click **Schedule sending job**:

   | Field | Value |
   |-------|-------|
   | Job name | `SAPCONNECT_SEND` |
   | Variant | `SAP&CONNECTALL` |
   | Repeat every | `15` minutes |

3. Click **Schedule immediately**, then **Save**.

4. Verify the job in **SM37**: job `SAPCONNECT_SEND` should show status **Scheduled**
   or **Active**.

---

## Task 5 — Send a Test E-Mail from SBWP

1. In SAPGUI, go to transaction **SBWP**.

2. Click **New message** (envelope icon) or **Inbox → New → Mail**.

3. Fill in:

   | Field | Value |
   |-------|-------|
   | To | `root@localhost` |
   | Subject | `ADM103 Exercise 19 — SMTP test from S4X` |
   | Body | `This is a test e-mail sent from SAP AS ABAP via SAPConnect.` |

4. Click **Send**.

   The message is placed in the SAPConnect outbound queue.

---

## Task 6 — Trigger Manual Send and Monitor via SOST

1. Go to transaction **SOST**.

2. You should see the test e-mail with status **Waiting**.

3. Select the entry and click **Resend** (or **Resend → Immediately** from the menu).

4. Refresh (F5). Status should change to **Sent**.

5. Double-click the entry to see the full SMTP transmission log — EHLO, MAIL FROM,
   RCPT TO, DATA, and the final response from Postfix (250 OK).

---

## Task 7 — Verify Delivery in the Local Postfix Mailbox

Since Postfix has no outbound relay, the message is delivered to the local OS mail spool.

1. In the s4xadm terminal, check the Postfix mail queue (should be empty if delivered):

   ```bash
   mailq
   ```

   Expected: `Mail queue is empty`

2. Check the Postfix mail log for delivery confirmation:

   ```bash
   tail -20 /var/log/mail.log
   ```

   Look for lines like:
   ```
   postfix/smtp[...]: ... status=sent (250 2.0.0 Ok: queued as ...)
   postfix/local[...]: ... status=delivered ...
   ```

3. Read the delivered message from the root mailbox:

   ```bash
   cat /var/mail/root
   ```

   You should see the e-mail body and headers sent from SAP (From, To, Subject,
   and the SAP-generated Message-ID).

---

## Task 8 — Receive an Inbound E-Mail via SAP SMTP Port

Now test the reverse direction: send an e-mail **to** the SAP ICM SMTP listener on
port 25011. SAP routes inbound SMTP to the matching SAP user's inbox based on the
recipient address.

1. First, set an e-mail address for the DDIC user so SAP knows where to route inbound mail.

   In SAPGUI, go to **SU01** → enter user `DDIC` → click **Change** → **Address** tab.

   Set:
   | Field | Value |
   |-------|-------|
   | E-mail | `DDIC@s4x.mrtlabs.local` |

   Save.

2. From the OS terminal, use `curl` to submit a test e-mail to the SAP SMTP port:

   ```bash
   curl -v \
     --url "smtp://s4xhost:25011" \
     --mail-from "test@mrtlabs.local" \
     --mail-rcpt "DDIC@s4x.mrtlabs.local" \
     --upload-file - << 'EOF'
   From: test@mrtlabs.local
   To: DDIC@s4x.mrtlabs.local
   Subject: Inbound test to SAP

   Test inbound e-mail via SAP ICM SMTP port 25011.
   EOF
   ```

   Expected: SMTP dialogue showing `250 OK`.

3. In SAPGUI, go to **SBWP → Inbox → Unread Documents**.

   The inbound mail should appear in the DDIC user's inbox.

---

## Task 9 — Check SMTP in SMICM

1. In SAPGUI, go to **SMICM → Goto → Services**.

2. Confirm the SMTP service entry shows:
   - Protocol: SMTP
   - Port: 25011
   - Status: Active

---

## Summary

| What you configured | Value |
|--------------------|-------|
| ABAP SMTP ICM port | `25011` (added to D11 profile) |
| Default mail domain | `s4x.mrtlabs.local` |
| SMTP node | `SMTP_LOCAL` → `127.0.0.1:25` (Postfix) |
| Background job | `SAPCONNECT_SEND` every 15 minutes |
| Delivery verification | SOST status + `/var/mail/root` + `/var/log/mail.log` |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Port 25011 not listening after ICM restart | Verify `icm/server_port_2` is saved in the active profile version in RZ10; reload ICM |
| SOST shows status **Error** | Check SMTP dialogue in SOST detail; verify `systemctl status postfix` |
| SOST shows **Waiting** indefinitely | Check SM37 for `SAPCONNECT_SEND` job status; trigger manually from SOST |
| `mailq` shows message stuck in Postfix queue | Check `/var/log/mail.log` for Postfix errors; run `postfix flush` |
| Inbound mail not in SBWP | Verify DDIC has e-mail `DDIC@s4x.mrtlabs.local` set in SU01; check SMICM trace |
| No `swaks` or `telnet` for SMTP testing | Use `curl --url smtp://...` as shown in Task 8 — curl is available on this system |
