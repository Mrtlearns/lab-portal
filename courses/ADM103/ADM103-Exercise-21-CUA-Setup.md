# Exercise 21 — Preparing and Activating the Central User Administration (CUA)
## ADM103 — Adapted for MrTLabs ADM103 Fleet

**System reference:**
| Parameter | Value |
|-----------|-------|
| SID | S4X |
| Host | s4xhost |
| Client | 000 |
| ABAP user | DDIC / Poll000000 |
| CUA central client | **000** |
| Logical system name | Verify in SALE — expected convention: `S4XCLNT000` |
| Transaction — CUA activation | **SCUA** |
| Transaction — RFC destinations | **SM59** |
| Transaction — ALE config | **SALE** |
| Transaction — ALE distribution model | **BD64** |

> **Lab topology note:** A full CUA deployment requires at least two systems or clients
> (central + child). In this single-client lab, client 000 on S4X acts as both the
> CUA **central** system and a self-referencing child for demonstration purposes.
> The exercise walks through the complete configuration procedure.

---

## Business Scenario

Managing users across many SAP systems is error-prone when done individually in each
system. Central User Administration (CUA) designates one SAP client as the central
system. User master records are created once centrally and distributed via ALE IDocs
(message type USERCLONE) to all child systems. In this exercise you will define the
ALE infrastructure, configure RFC connections, and activate CUA.

---

## Task 1 — Identify the Logical System Name

Before activating CUA, you must know the logical system name already assigned to
client 000. Do **not** create a new one blindly — check what already exists.

1. Log on via SAPGUI (host: s4xhost, system: 11, client: 000, DDIC/Poll000000).

2. Go to transaction **SALE**.

3. Navigate to:
   **Basic Settings → Logical Systems → Assign Logical System to Client**

4. Find the row for **Client 000** and note the assigned logical system name.

   Common conventions for this system:
   - `S4XCLNT000` — standard SAP convention (SID + CLNT + client number)
   - `S4X_000` — alternative format

   **Use the name that is already assigned.** If no logical system is assigned yet,
   proceed to Task 1b.

   > **Important:** Write down the exact logical system name. You will use it in
   > every subsequent task of this exercise.

### Task 1b — Create and Assign a Logical System (Only If None Exists)

Only perform this if Task 1 step 4 showed no logical system assigned to client 000.

1. In SALE, go to:
   **Basic Settings → Logical Systems → Define Logical Systems**

2. Click **New Entries**:

   | Field | Value |
   |-------|-------|
   | Logical system | `S4XCLNT000` |
   | Description | `S4X Client 000 — CUA Central` |

3. Save.

4. Return to **Assign Logical System to Client** and assign `S4XCLNT000` to
   client 000. Save.

---

## Task 2 — Create an RFC Destination

In a real multi-system CUA, you create one RFC destination per child system. For this
lab, the child is a self-reference back to the same system (same host, same client).

1. Go to transaction **SM59**.

2. Click **Create**. Fill in:

   | Field | Value |
   |-------|-------|
   | RFC destination | `<LOGSYS>_CUA_CHILD` *(replace `<LOGSYS>` with your logical system name, e.g. `S4XCLNT000_CUA_CHILD`)* |
   | Connection type | `3` (ABAP connection) |
   | Description | `CUA child RFC — lab self-reference` |

3. On the **Technical Settings** tab:

   | Field | Value |
   |-------|-------|
   | Target host | `s4xhost` |
   | System number | `11` |

4. On the **Logon & Security** tab:

   | Field | Value |
   |-------|-------|
   | Client | `000` |
   | Language | `EN` |
   | User | `DDIC` |
   | Password | `Poll000000` |

5. Save.

6. Click **Connection Test**. Expected: `Connection test was successful`.

   If the test fails, check that the ABAP ICM is running (port 8011) and verify
   the user/password are correct.

---

## Task 3 — Define the ALE Distribution Model

The ALE distribution model specifies which IDoc message types flow between logical
systems. CUA uses message type **USERCLONE**.

1. Go to transaction **BD64**.

2. Click **Create Model View**:

   | Field | Value |
   |-------|-------|
   | Short text | `CUA Distribution Model` |
   | Technical name | `CUA_MODEL` |

3. In the model, click **Add message type**:

   | Field | Value |
   |-------|-------|
   | Sender | `<your logical system>` (e.g. `S4XCLNT000`) |
   | Receiver | `<your logical system>_CUA_CHILD` |
   | Message type | `USERCLONE` |

4. Save.

5. Distribute the model (normally sends it to child systems via RFC):

   Select the model → **Edit → Distribute model view**.

   In this single-system lab, the distribution step is a no-op — acknowledge and
   continue.

---

## Task 4 — Configure Partner Profile (WE20)

The partner profile controls how IDocs are packaged and sent for a given logical system.

1. Go to transaction **WE20**.

2. Check whether a partner profile for your logical system already exists:
   - Partner type: **LS** (Logical System)
   - Partner number: `<your logical system>` (e.g. `S4XCLNT000`)

   If it exists, verify or add the outbound parameter for `USERCLONE`. If it
   does not exist, create it:

3. Click **Create** → Partner type **LS** → enter the logical system name.

4. Under **Outbound Parameters**, add:

   | Field | Value |
   |-------|-------|
   | Message type | `USERCLONE` |
   | Receiver port | *(select the RFC port for `<LOGSYS>_CUA_CHILD`)* |
   | Basic type | `USERCLONE01` |
   | Output mode | **Collect IDocs** |

5. Save.

6. If the RFC port does not exist, go to **WE21** and create a port of type **RFC**
   pointing to the RFC destination you created in Task 2.

---

## Task 5 — Activate the CUA

1. Go to transaction **SCUA**.

2. In the **Central system** field, enter your logical system name (e.g. `S4XCLNT000`).

3. Click **Activate**.

   The system will:
   - Mark all existing users in client 000 as centrally managed
   - Set the CUA flag in client customising
   - Prepare outbound IDoc queues for USERCLONE

4. Confirm the activation prompt.

5. Verify activation: go to **SCUA** again. The header should show:
   ```
   CUA is active in this client
   Central system: <your logical system name>
   ```

---

## Task 6 — Verify the CUA Status

1. In SAPGUI, go to **SU01**. Open any user (e.g. DDIC) in display mode.

2. Under the **Logon Data** tab, a **System** field now appears showing which
   CUA child the user is assigned to.

3. Try to create a test user (**SU01 → Create → `CUA_TEST`**).

   After CUA activation, some fields will be managed centrally. Verify that
   the user creation still works and the new user is flagged as centrally managed.

4. Delete the test user: **SU01 → `CUA_TEST` → Delete**.

---

## Summary

| What you configured | Value |
|--------------------|-------|
| Logical system | Verified/assigned in SALE — e.g. `S4XCLNT000` |
| RFC destination | `S4XCLNT000_CUA_CHILD` → s4xhost:11 / client 000 |
| ALE model | `CUA_MODEL` — USERCLONE from central to child |
| Partner profile | WE20 / LS / `S4XCLNT000` with USERCLONE outbound |
| CUA activation | Active in client 000 |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| SM59 connection test fails | `ss -tlnp \| grep 8011` — confirm ICM is up; verify DDIC password `Poll000000` |
| SCUA activation fails — `Logical system not assigned` | Assign in SALE → Assign Logical System to Client first |
| SCUA activation fails — authorization error | DDIC needs `SAP_ALL`; check SM21 for ABAP error details |
| `USERCLONE` not in BD64 message type list | Check SE11 for existence of type `USERCLONE`; run report `RBDMOIND` to refresh |
| WE20 partner profile missing | Create manually (Task 4) |
| Multiple logical system names found in SALE | Use the one **assigned to client 000** — verify in Assign Logical System to Client |
