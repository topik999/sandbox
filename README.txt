SANDBOX — Node.js multiplayer (shared-world build)

1. Install Node.js LTS: https://nodejs.org/
2. Run start.bat on Windows. On first run, ws is installed with npm.
3. Open http://localhost:3000 on the host PC.
4. In the game's online menu, create a room. Other players open the same server address and join that exact room.
5. For phones on the same Wi-Fi, use the host PC's local IPv4 address, e.g. http://192.168.1.100:3000.

Internet play from different networks requires hosting the Node.js server publicly (or router port forwarding). The server must stay running.

Shared-world features in this build:
- Player positions/models and chat.
- Player-spawned props, NPCs and vehicles are announced to the room.
- The room creator relays periodic positions for synced props, NPCs and vehicles.
- Removing synced props/NPCs is relayed to the room.

Limitations: this is still a basic experimental sync layer, not a full authoritative Garry's Mod server. Physics, combat/damage, NPC AI decisions, missions, pickups, and all pre-existing map objects are not perfectly synchronized. If a vehicle/NPC is created by an internal mission event rather than the spawn menu, it may not be shared. For best results, have the room creator create the room first, then other players join.
