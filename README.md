# WARDOGS — Battlefield 6 Portal Custom Mod

**WARDOGS** is a hardcore, asymmetrical 3-faction PMC King-of-the-Hill experience built for Battlefield 6 Portal on *Redline Storage (`MP_Granite_MilitaryStorage`)*.

Repository: [`fivelity/wardogs`](https://github.com/fivelity/wardogs)

---

## 🏗️ Architecture & Tech Stack

* **Engine / Map:** Battlefield 6 Portal / `MP_Granite_MilitaryStorage` (Redline Storage).
* **Tooling:** [`@bf6mods/cli`](https://www.google.com/search?q=https://www.npmjs.com/package/%40bf6mods/cli) bundler, TypeScript (`strict: true`).
* **Types & Helpers:** `bf6-portal-mod-types` (official SDK type defs) and `bf6-portal-utils` (runtime event, UI, and utility helpers).
* **Package Manager:** **npm** (`package-lock.json`).

---

## 🗂️ Project Layout

```text
wardogs/
├── .github/workflows/      # CI typecheck & build validation
├── .llm/                   # AI agent rules & design briefs
│   ├── AGENTS.md           # Authoritative developer/agent rules
│   └── WARDOGS_DESIGN_BRIEF.md # Game design contract & system mechanics
├── src/
│   ├── config/             # Centralized ObjIds, team definitions, price tables
│   ├── player/             # Persistent wallet, mastery tracks, player state
│   ├── game/               # Core primitives & mode rules (HotZone, FOB, AI, win condition)
│   ├── ui/                 # SolidUI-composed scoreboard, HUD, and buy menus
│   └── index.ts            # Entrypoint & event-handler subscription wiring
├── package.json
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

---

<!-- ## 🔍 Repository Reference Audit

All project documentation (`AGENTS.md`, `WARDOGS_DESIGN_BRIEF.md`, and this `README.md`) has been fully reconciled against the new `fivelity/wardogs` repository structure and verified against `bf6-portal-mod-types@4.2.0` and `bf6-portal-utils@9.4.0`. All legacy references to `bf6-wardogs` have been completely removed. --!>