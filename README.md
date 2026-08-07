# AI Weather Assistant (Python + Tkinter + Gemini)

A modern, dark-mode desktop weather app written **entirely in Python**.
It fetches live weather from OpenWeatherMap and asks Google Gemini to turn
the raw numbers into practical, everyday advice.

No HTML, CSS or JavaScript is used anywhere in this project.

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
