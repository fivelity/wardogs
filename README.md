# WARDOGS — Battlefield 6 Portal Custom Mod

**WARDOGS** is a hardcore, asymmetrical 3-faction PMC King-of-the-Hill experience built for Battlefield 6 Portal on *Redline Storage (`MP_Granite_MilitaryStorage`)*.

Repository: [`fivelity/wardogs`](https://github.com/fivelity/wardogs)

---

## 🏗️ Architecture & Tech Stack

* **Engine / Map:** Battlefield 6 Portal / `MP_Granite_MilitaryStorage` (Redline Storage).
* **Tooling:** [`@bf6mods/cli`](https://www.google.com/search?q=https://www.google.com/search?q=https://www.npmjs.com/package/%40bf6mods/cli) bundler, TypeScript (`strict: true`).
* **Types & Helpers:** `bf6-portal-mod-types` (official SDK type defs) and `bf6-portal-utils` (runtime event, UI, and utility helpers).
* **Package Manager:** **npm** (`package-lock.json`).

---

## 🗂️ Project Layout

```text
wardogs/
├── .agents/                # AI agent rules & configuration
├── .bf6/                   # BF6 Portal SDK / mod tooling
├── .claude/                # Claude Code agent definitions
├── .git/                   # Git version control
├── .gitignore
├── AGENTS.md               # Authoritative developer/agent rules
├── bf6.config.ts           # Portal mod configuration
├── BUILD_GUIDE.md          # Per-file build map & status
├── files.zip               # Mod asset bundle
├── levels/                 # Godot scene files
│   └── MP_Granite_MilitaryStorage_Portal/
├── node_modules/           # npm dependencies
├── opencode.ps1            # OpenCode build script
├── package-lock.json       # npm lockfile
├── package.json
├── placeholder.jpg         # Mod icon / placeholder
├── README.md
├── src/
│   ├── config/             # Centralized ObjIds, team definitions, price tables
│   │   ├── constants.ts
│   │   ├── economy.ts
│   │   ├── ids.ts
│   │   └── teams.ts
│   ├── game/               # Core primitives & mode rules
│   │   ├── core/           # Reusable gameplay primitives
│   │   │   └── transition-state.ts
│   │   └── mode/           # WARDOGS-specific rule wiring
│   │       ├── controlzone.ts
│   │       ├── fob.ts
│   │       └── win-condition.ts
│   ├── player/             # Persistent wallet, mastery tracks, player state
│   │   ├── player-state.ts
│   │   ├── progression.ts
│   │   └── wallet.ts
│   ├── strings.json        # Localizable strings
│   ├── ui/                 # SolidUI-composed scoreboard, HUD, buy menus
│   └── index.ts            # Entrypoint & event-handler subscription wiring
└── tsconfig.json
```

---

## 🚀 Development Workflow

1. **Install Dependencies:**
```
npm install
```

2. **Type Checking:**
```
npm run typecheck
```

3. **Build Bundle:**
```
npm run build
```

4. **Deploy & Test:** Upload the compiled output from `dist/` into the Portal Web Builder. Always test in-game locally and verify execution via `PortalLog.txt`. Never write production logic directly in the web builder interface.
