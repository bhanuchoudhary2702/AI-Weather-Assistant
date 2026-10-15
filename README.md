# AI Weather Assistant (Python + Tkinter + Gemini)

A modern, dark-mode desktop weather app written **entirely in Python**.
It fetches live weather from OpenWeatherMap and asks Google Gemini to turn
the raw numbers into practical, everyday advice.

No HTML, CSS or JavaScript is used anywhere in this project.

---

## Web Edition (React + Vite + Supabase Edge Functions)

The same app is also available as a browser-based web application with a
cinematic animated weather background, 3D glass cards, and the same
OpenWeatherMap + Gemini integration — all API keys kept server-side.

The web edition lives alongside the Python files in the same project folder.
Both editions share the same two API keys and produce the same six insight
cards. The Python desktop app is untouched and still runs on its own.

### Quick start (web edition)

1. **Install Node.js 18+** (if you don't have it — check at <https://nodejs.org>)
2. Open a terminal in the project folder
3. Run `npm install` (first time only — downloads dependencies)
4. Run `npm run dev` — the app opens at `http://localhost:5173`

That's it for local development. The dev server reloads automatically when
you save changes.

### Where to put your API keys (web edition)

API keys for the web edition are stored as **Supabase Edge Function secrets**,
not in the `.env` file. The `.env` file is only used for the Python desktop app.

To add keys for the web edition:

1. Go to your Bolt project dashboard
2. Click **Database** in the left sidebar
3. Go to the **Secrets** tab
4. Click "New secret" and add each key:

| Secret name | Where to get it | What it unlocks |
| --- | --- | --- |
| `OPENWEATHER_API_KEY` | <https://openweathermap.org/api> (free tier) | Real live weather data for any city |
| `GEMINI_API_KEY` | <https://aistudio.google.com/app/apikey> | Real Gemini AI insights (instead of fallback advice) |

Optional secret: `GEMINI_MODEL` (defaults to `gemini-1.5-flash` if not set).

Source: <https://support.bolt.new/cloud/database/secrets>

### How to tell if real data is working

| Feature | How to verify |
| --- | --- |
| **Real weather** | Search any city — you should see the official weather icon image (not an emoji), a real temperature, and 8 hourly forecast entries. The status bar will say "live weather and Gemini insights ready." |
| **Real Gemini AI** | The badge in the AI Insights panel reads "Gemini AI" (not "Fallback Mode"). The insight text will have natural, conversational phrasing that varies per city and condition. |
| **Fallback mode** | If the Gemini key is missing or invalid, the badge reads "Fallback Mode" and the status bar says "Gemini unavailable, showing built-in advice." The app still works — it shows rule-based advice (same logic as the Python `ai.py` fallback). |

### Build and deploy (web edition)

```bash
# Production build (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview
```

The built files in `dist/` are static HTML/CSS/JS and can be hosted on any
static hosting provider (Netlify, Vercel, Cloudflare Pages, etc.). Upload the
entire `dist/` folder.

The Supabase Edge Functions are deployed automatically from
`supabase/functions/` when you use the Bolt environment.

### API key security

- `OPENWEATHER_API_KEY` and `GEMINI_API_KEY` are read exclusively inside the
  Supabase Edge Functions via `Deno.env.get()` — they never appear in the
  browser or in the built JavaScript bundle.
- The browser only contains the Supabase project URL and anon key, which are
  designed to be public (they allow access only through RLS-protected endpoints).
- The Edge Functions act as a secure proxy: the browser sends a city name,
  the function adds the API key server-side, calls the external API, and
  returns only the formatted result.

### Web edition file structure

```text
├── src/
│   ├── App.tsx              # Main app — state, search flow, layout
│   ├── AtmosphereBackground.tsx  # Animated canvas weather background
│   ├── CitySearch.tsx       # Search input + history chips + clear confirm
│   ├── WeatherPanel.tsx     # 3D tilt card with temp, metrics, range bar
│   ├── HourlyForecastSection.tsx # Horizontal scrollable 8-hour forecast
│   ├── AIInsightsPanel.tsx  # Six AI insight cards with stagger animation
│   ├── ConfirmModal.tsx     # Accessible confirmation dialog
│   ├── Skeletons.tsx        # Loading state placeholders
│   └── ...                  # Icons, types, utilities, API clients
├── supabase/functions/
│   ├── weather/index.ts     # Edge Function: OpenWeatherMap proxy
│   └── ai-insights/index.ts # Edge Function: Gemini AI proxy + fallback
└── package.json             # Web app dependencies and scripts
```

---

## Features

- Search any city in the world
- Live readings: temperature, feels-like, humidity, wind speed, pressure,
  visibility, condition, sunrise/sunset and the official weather icon
- Gemini AI briefing: summary, clothing tip, travel advice, health tip,
  outdoor activity suggestion and a rain/heat alert
- Recently searched cities saved locally (`search_history.json`)
- Refresh Weather button
- Loading indicator on a background thread — the window never freezes
- Friendly handling of wrong city names, bad keys, timeouts and offline use
- Dark, glassmorphism-inspired interface built with Tkinter Canvas cards
- API keys read from a `.env` file

---

## Project structure

```text
weather_ai/
├── main.py            # Entry point - creates the window
├── gui.py             # All Tkinter UI code
├── weather.py         # OpenWeatherMap API service
├── ai.py              # Google Gemini service + offline fallback
├── config.py          # Settings, theme colours, .env loading
├── utils.py           # History storage, formatting, icon download
├── requirements.txt   # Python dependencies
├── .env.example       # Sample environment file
└── README.md
```

---

## Setup

### 1. Requirements

- Python 3.9 or newer
- Tkinter (bundled with the official Python installer)
  - Ubuntu/Debian: `sudo apt install python3-tk`

### 2. Install dependencies

```bash
cd weather_ai
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Add your API keys

```bash
# Windows
copy .env.example .env
# macOS / Linux
cp .env.example .env
```

Open `.env` and paste your keys:

```env
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_MODEL=gemini-1.5-flash
UNITS=metric
```

- OpenWeatherMap key: <https://openweathermap.org/api> (free tier is enough;
  a new key can take a few minutes to activate)
- Gemini key: <https://aistudio.google.com/app/apikey>

### 4. Run

```bash
python main.py
```

---

## How it works

1. `main.py` starts Tk and hands the root window to `WeatherApp` in `gui.py`.
2. When you search, the GUI starts a **background thread** so the interface
   stays responsive and a progress bar is shown.
3. `WeatherService.get_weather()` calls OpenWeatherMap and converts the JSON
   into a clean `WeatherData` object.
4. The weather panel updates immediately; the weather icon PNG is downloaded
   and cached in memory.
5. `AIService.analyze()` sends a strict JSON-only prompt to Gemini and parses
   the six advice sections. If Gemini is unreachable, a rule-based offline
   briefing is shown instead so the app is always useful.
6. The city is appended to `search_history.json` and shown as a chip.

---

## Troubleshooting

| Message | Meaning / fix |
| --- | --- |
| `Missing in .env: ...` | Keys not set — edit `.env` and restart |
| `City '...' was not found` | Check the spelling, or try `City,CountryCode` e.g. `Paris,FR` |
| `Invalid OpenWeatherMap API key` | Wrong key, or a new key that is not active yet (wait ~10 min) |
| `No internet connection` | Check your network or proxy |
| `Offline mode` badge | Gemini could not be reached; built-in advice is shown |
| `ModuleNotFoundError: tkinter` | Install the OS Tk package (see Requirements) |

---

## Notes for submission

- Every module is documented with docstrings, and each important function
  has a comment explaining its purpose.
- Code follows PEP 8 (4-space indent, snake_case, ≤ 100 char lines).
- OOP is used where it helps: `WeatherService`, `AIService`, `WeatherApp`,
  `WeatherData`, and the custom widgets `RoundedFrame` / `HoverButton`.
- `.env` and `search_history.json` should not be committed to version control.
