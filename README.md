# SteamBOQ

**AI-assisted steam requirement, utility-piping and preliminary BOQ estimator**

> **Canonical application:** The actively developed public application is in [`sites_app/`](./sites_app).  
> The Python/Streamlit implementation in [`app/`](./app) and [`calculations/`](./calculations) is retained as the **legacy prototype** for engineering reference.

## Current public application

[Open the SteamBOQ public beta](https://steamboq-proposal-estimator.briny-giant-5065.chatgpt.site)

The canonical application provides:

- Product-heating and direct heat-load calculation modes.
- Saturated-steam demand and property interpolation.
- Steam pipe sizing, velocity checks and iterative pressure-drop screening.
- Condensate generation, flash-steam estimation and condensate-line sizing.
- Preliminary BOQ quantities and budgetary rates.
- Scenario comparison and CSV/print export.
- Free ChatGPT sign-in for private saved projects.
- Private calculation history for the latest 50 deliberate calculations.
- Structured user-feedback collection.
- A licensed daily rate-feed adapter with a clearly identified fallback catalogue.

Engineering results are preliminary and must be independently reviewed before design, procurement or construction.

## Repository structure

| Path | Status | Purpose |
|---|---|---|
| [`sites_app/`](./sites_app) | **Canonical / active** | Current JavaScript application, Worker API, D1 schema, tests and Sites deployment configuration |
| [`app/`](./app) | **Streamlit delivery** | Embedded guest edition of the canonical interface using the same tested JavaScript engineering engine |
| [`calculations/`](./calculations) | Legacy reference | Earlier Python engineering modules |
| [`databases/`](./databases) | Legacy reference | Earlier spreadsheet engineering databases |
| [`docs/`](./docs) | Reference | Engineering notes, workbooks and screenshots |

GitHub stores both runtime editions. Streamlit launches `app/app.py`, which embeds the canonical interface and calculation engine. It runs without login and stores scenarios, calculation history, approved rate snapshots and feedback drafts in the visitor's browser. The Sites edition additionally provides ChatGPT identity and D1-backed cross-device account storage.

## Run the canonical application

```bash
git clone https://github.com/yadavraje/SteamBOQ_AI.git
cd SteamBOQ_AI/sites_app
npm install
npm test
npm run dev
```

The canonical application requires Node.js. Production account storage and ChatGPT identity are supplied by the OpenAI Sites runtime through the configuration in `sites_app/.openai/hosting.json`.

## Canonical engineering scope

The active engine in `sites_app/src/engine.js` includes:

- IAPWS-IF97 benchmark property nodes at 0.5 barg intervals.
- Energy balance with efficiency and design-margin controls.
- Diameter-dependent fitting equivalent lengths.
- Compressible saturated-steam pressure-drop iteration.
- Minimum steam-to-product temperature-approach validation.
- Condensate receiver-pressure and flash-steam effects.
- A blocking no-solution state when sizes through DN200 cannot satisfy the entered limits.
- Separate hydraulic and BOQ material lengths.

Run `npm test` from `sites_app/` to validate engineering benchmarks, authentication boundaries, database ownership, account-history limits and UI contracts.

## Streamlit edition

The Streamlit entry point now displays the canonical SteamBOQ interface and uses the same JavaScript engineering engine. It is intended for frictionless public testing without login. Browser data is device-specific and may be lost if the visitor clears site storage.

To run it:

```bash
pip install -r requirements.txt
streamlit run app/app.py
```

The earlier Python calculation modules remain in the repository as engineering-history references; the active Streamlit interface does not use them for its results.

## Rates and limitations

The public beta uses a visibly unverified seed catalogue unless a licensed current rate feed is configured. Final quotations require supplier validation, approved process data, detailed hydraulics, applicable codes, stress and water-hammer review, vendor sizing and site confirmation.

## Author

**Rajesh Yadav**  
Mechanical Engineering | Project Estimation | Data Analytics | AI
