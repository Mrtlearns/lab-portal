# Lab 01 — Restart a Crashed System

## Business Example

You are the system administrator on call during the quarterly closing runs. On Monday morning you receive a call that quarterly closing reports can't be started. You need to resolve the problem as soon as possible.

---

## Connection Details

SSH to your assigned VM  (`10.10.110.XX` — Student 01=.11, 02=.12 … 10=.20):
```
ssh root@10.10.110.XX
```

SAP HANA Cockpit:
```
https://vhcala4hci.local.lan:51039
```
Cockpit login: `STUDENT0X` / `Welcome1`  *(replace 0X with your student number: 01–10)*

---

## Step 1 — Simulate a Database Crash

In your SSH session, ungracefully shut down the SAP HANA database:

```bash
su - hxeadm
HDB kill
exit
```

---

## Step 2 — Check Last Reboot and Journal Errors

Check when the host was last rebooted:
```bash
last | grep boot
```

Check the kernel journal for error messages:
```bash
journalctl -n 50 -p err -k
```

> How many kernel error messages do you see?

---

## Step 3 — Check SAP HANA Hosts and Services

Check the SAP HANA system instance list:
```bash
/usr/sap/hostctrl/exe/sapcontrol -nr 90 -function GetSystemInstanceList
```

Check the SAP HANA process list:
```bash
/usr/sap/hostctrl/exe/sapcontrol -nr 90 -function GetProcessList
```

> Are all SAP HANA processes available?

---

## Step 4 — Review Database Status in SAP HANA Cockpit

1. Open **https://vhcala4hci.local.lan:51039** in a browser.
2. Log on with your Cockpit credentials (`STUDENT0X` / `Welcome1`).
3. On the **Database Directory** screen, choose the **SYSTEMDB@HXE** database.
4. On the **Database Overview** screen, change the view from **Monitoring** to **All**.
5. Review the SYSTEMDB status and note the problem.
6. Return to the **Database Directory** and choose the **HXE@HXE** tenant database.
7. Review the tenant database status and note the problem.

---

## Step 5 — Collect a Full System Information Dump

1. On the **Database Directory** screen, choose **SYSTEMDB@HXE**.
2. Find the **Alerting and Diagnostics** card and choose **Manage full system information dumps**.
3. Choose **Collect Diagnostics → Collect from Existing Files**.
4. Set a date range covering the last four days.
5. Choose **Start Collecting** and wait approximately one minute.
6. Choose **Download** to download the ZIP file.
7. Open the ZIP file and inspect **log.txt** — search for `topology` to confirm topology information was exported.

---

## Step 6 — Start the SAP HANA Database

1. In the **Database Overview** screen, find the **Services** card and choose **Manage Services**.
2. Choose **Start Database** (top-right corner).
3. Confirm with **Yes**.
4. Wait for the database to start — the screen refreshes automatically.
5. Return to **Database Directory** and verify:
   - **SYSTEMDB@HXE** status
   - **HXE@HXE** tenant status

> Note: High CPU usage immediately after startup is normal — HANA is loading column tables into memory.

---

## Result

You have analyzed and handled a system offline situation. The full system information dump preserves logs for later analysis.
