"""
gui.py
------
Tkinter user interface for the AI Weather Assistant.

Design notes
------------
Tkinter cannot blur pixels, so the "glassmorphism" look is recreated with
a deep midnight background, softly tinted translucent-looking panels,
1px light borders, rounded corners drawn on a Canvas, and a lot of
breathing room. All colours come from config.THEME.

Network calls run on background threads; results are pushed back to the
Tk main thread with `root.after()` so the window never freezes.
"""

import threading
import tkinter as tk
from tkinter import font as tkfont
from tkinter import ttk

from PIL import Image, ImageTk

from ai import SECTIONS, AIService
from config import APP_MIN_SIZE, APP_SIZE, APP_TITLE, FONTS, THEME, missing_keys
from utils import (
    WeatherAppError,
    bytes_to_stream,
    clear_history,
    fetch_icon_bytes,
    load_history,
    save_city,
)
from weather import WeatherService


class RoundedFrame(tk.Canvas):
    """A frame with rounded corners and a soft border — our 'glass' card.

    Widgets are added to `self.body`, a normal Frame placed on the canvas.
    """

    def __init__(self, parent, radius=18, fill=None, border=None, padding=16, **kwargs):
        super().__init__(
            parent,
            bg=kwargs.pop("bg", THEME["bg"]),
            highlightthickness=0,
            bd=0,
            **kwargs,
        )
        self.radius = radius
        self.fill = fill or THEME["glass"]
        self.border = border or THEME["border"]
        self.body = tk.Frame(self, bg=self.fill)
        self._window = self.create_window(
            padding, padding, anchor="nw", window=self.body
        )
        self._padding = padding
        self.bind("<Configure>", self._redraw)

    def _redraw(self, event=None):
        """Repaint the rounded rectangle whenever the card is resized."""
        self.delete("shape")
        width = self.winfo_width()
        height = self.winfo_height()
        self._round_rect(1, 1, width - 2, height - 2, self.radius)
        self.tag_lower("shape")
        self.itemconfigure(
            self._window, width=max(width - self._padding * 2, 1)
        )

    def _round_rect(self, x1, y1, x2, y2, r):
        """Draw a rounded rectangle out of arcs and rectangles."""
        r = min(r, (x2 - x1) // 2, (y2 - y1) // 2)
        opts = {"fill": self.fill, "outline": self.fill, "tags": "shape"}
        self.create_rectangle(x1 + r, y1, x2 - r, y2, **opts)
        self.create_rectangle(x1, y1 + r, x2, y2 - r, **opts)
        for cx, cy, start in (
            (x1, y1, 90),
            (x2 - 2 * r, y1, 0),
            (x1, y2 - 2 * r, 180),
            (x2 - 2 * r, y2 - 2 * r, 270),
        ):
            self.create_arc(
                cx, cy, cx + 2 * r, cy + 2 * r,
                start=start, extent=90, style="pieslice", **opts
            )
        # Thin light border for the frosted-glass edge
        self.create_line(
            x1 + r, y1, x2 - r, y1, fill=self.border, tags="shape"
        )
        self.create_line(
            x1 + r, y2, x2 - r, y2, fill=self.border, tags="shape"
        )
        self.create_line(
            x1, y1 + r, x1, y2 - r, fill=self.border, tags="shape"
        )
        self.create_line(
            x2, y1 + r, x2, y2 - r, fill=self.border, tags="shape"
        )


class HoverButton(tk.Button):
    """Flat button that brightens on hover — used for all actions."""

    def __init__(self, parent, bg, hover_bg, fg=THEME["text"], **kwargs):
        super().__init__(
            parent,
            bg=bg,
            fg=fg,
            activebackground=hover_bg,
            activeforeground=fg,
            relief="flat",
            bd=0,
            highlightthickness=0,
            cursor="hand2",
            font=FONTS["button"],
            padx=18,
            pady=9,
            **kwargs,
        )
        self._bg, self._hover = bg, hover_bg
        self.bind("<Enter>", lambda _e: self.configure(bg=self._hover))
        self.bind("<Leave>", lambda _e: self.configure(bg=self._bg))


class WeatherApp:
    """Main application window and all of its behaviour."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.weather_service = WeatherService()
        self.ai_service = AIService()

        self.current_city = None
        self.icon_image = None  # keep a reference so Tk doesn't garbage-collect it
        self.metric_values = {}
        self.ai_labels = {}
        self.is_loading = False

        self._configure_window()
        self._build_layout()
        self._render_history()
        self._check_keys()

    # ------------------------------------------------------------------
    # Window setup
    # ------------------------------------------------------------------

    def _configure_window(self):
        self.root.title(APP_TITLE)
        self.root.geometry(APP_SIZE)
        self.root.minsize(*APP_MIN_SIZE)
        self.root.configure(bg=THEME["bg"])

        # ttk styling for the progress bar / combobox
        style = ttk.Style(self.root)
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(
            "Glass.Horizontal.TProgressbar",
            troughcolor=THEME["glass_light"],
            background=THEME["accent"],
            bordercolor=THEME["glass_light"],
            lightcolor=THEME["accent"],
            darkcolor=THEME["accent"],
            thickness=4,
        )

    # ------------------------------------------------------------------
    # Layout
    # ------------------------------------------------------------------

    def _build_layout(self):
        """Create every visual section of the window."""
        outer = tk.Frame(self.root, bg=THEME["bg"], padx=28, pady=22)
        outer.pack(fill="both", expand=True)

        self._build_header(outer)
        self._build_search(outer)
        self._build_status(outer)

        content = tk.Frame(outer, bg=THEME["bg"])
        content.pack(fill="both", expand=True, pady=(14, 0))
        content.columnconfigure(0, weight=3, uniform="col")
        content.columnconfigure(1, weight=4, uniform="col")
        content.rowconfigure(0, weight=1)

        self._build_weather_panel(content)
        self._build_ai_panel(content)

    def _build_header(self, parent):
        """App title, subtitle and the Refresh button."""
        header = tk.Frame(parent, bg=THEME["bg"])
        header.pack(fill="x")

        titles = tk.Frame(header, bg=THEME["bg"])
        titles.pack(side="left")
        tk.Label(
            titles,
            text="AI Weather Assistant",
            font=FONTS["title"],
            bg=THEME["bg"],
            fg=THEME["text"],
        ).pack(anchor="w")
        tk.Label(
            titles,
            text="Live conditions, explained by Gemini AI",
            font=FONTS["subtitle"],
            bg=THEME["bg"],
            fg=THEME["text_muted"],
        ).pack(anchor="w", pady=(2, 0))

        self.refresh_button = HoverButton(
            header,
            text="⟳  Refresh Weather",
            bg=THEME["glass_light"],
            hover_bg=THEME["border"],
            command=self.refresh_weather,
            state="disabled",
        )
        self.refresh_button.pack(side="right")

    def _build_search(self, parent):
        """City entry, Search button and recent-city chips."""
        card = RoundedFrame(parent, height=118, fill=THEME["glass"])
        card.pack(fill="x", pady=(18, 0))
        card.pack_propagate(False)
        body = card.body

        row = tk.Frame(body, bg=THEME["glass"])
        row.pack(fill="x")

        self.city_var = tk.StringVar()
        entry = tk.Entry(
            row,
            textvariable=self.city_var,
            font=("Segoe UI", 13),
            bg=THEME["glass_light"],
            fg=THEME["text"],
            insertbackground=THEME["accent"],
            relief="flat",
            bd=0,
        )
        entry.pack(side="left", fill="x", expand=True, ipady=9, padx=(4, 12))
        entry.insert(0, "")
        entry.bind("<Return>", lambda _e: self.search_weather())
        self.entry = entry

        HoverButton(
            row,
            text="Search",
            bg=THEME["accent_2"],
            hover_bg="#9481ff",
            command=self.search_weather,
        ).pack(side="left")

        self.history_row = tk.Frame(body, bg=THEME["glass"])
        self.history_row.pack(fill="x", pady=(12, 0))

    def _build_status(self, parent):
        """Loading bar plus the status / error message line."""
        wrapper = tk.Frame(parent, bg=THEME["bg"])
        wrapper.pack(fill="x", pady=(12, 0))

        self.progress = ttk.Progressbar(
            wrapper, mode="indeterminate", style="Glass.Horizontal.TProgressbar"
        )
        self.status = tk.Label(
            wrapper,
            text="Enter a city to get started.",
            font=FONTS["small"],
            bg=THEME["bg"],
            fg=THEME["text_muted"],
            anchor="w",
        )
        self.status.pack(fill="x")

    def _build_weather_panel(self, parent):
        """Left column: big temperature, icon, and the six metric tiles."""
        card = RoundedFrame(parent, fill=THEME["glass"])
        card.grid(row=0, column=0, sticky="nsew", padx=(0, 12))
        body = card.body

        top = tk.Frame(body, bg=THEME["glass"])
        top.pack(fill="x")

        left = tk.Frame(top, bg=THEME["glass"])
        left.pack(side="left", fill="x", expand=True)

        self.location_label = tk.Label(
            left,
            text="No city selected",
            font=("Segoe UI Semibold", 15),
            bg=THEME["glass"],
            fg=THEME["text"],
            anchor="w",
        )
        self.location_label.pack(anchor="w")

        self.temp_label = tk.Label(
            left,
            text="--°",
            font=FONTS["temp"],
            bg=THEME["glass"],
            fg=THEME["text"],
            anchor="w",
        )
        self.temp_label.pack(anchor="w")

        self.condition_label = tk.Label(
            left,
            text="Waiting for data",
            font=FONTS["body"],
            bg=THEME["glass"],
            fg=THEME["accent"],
            anchor="w",
        )
        self.condition_label.pack(anchor="w")

        self.icon_label = tk.Label(top, bg=THEME["glass"], text="🌤", font=("Segoe UI", 42))
        self.icon_label.pack(side="right", padx=(8, 0))

        # Metric tiles in a 2 x 3 grid
        grid = tk.Frame(body, bg=THEME["glass"])
        grid.pack(fill="both", expand=True, pady=(18, 0))
        for column in range(2):
            grid.columnconfigure(column, weight=1, uniform="metric")

        metrics = [
            ("feels", "FEELS LIKE"),
            ("humidity", "HUMIDITY"),
            ("wind", "WIND SPEED"),
            ("pressure", "PRESSURE"),
            ("visibility", "VISIBILITY"),
            ("sun", "SUNRISE / SUNSET"),
        ]
        for index, (key, label) in enumerate(metrics):
            self._metric_tile(grid, key, label, index // 2, index % 2)

    def _metric_tile(self, parent, key, label_text, row, column):
        """One small stat tile inside the weather panel."""
        tile = tk.Frame(parent, bg=THEME["glass_light"], padx=14, pady=12)
        tile.grid(row=row, column=column, sticky="nsew", padx=4, pady=4)

        tk.Label(
            tile,
            text=label_text,
            font=FONTS["card_label"],
            bg=THEME["glass_light"],
            fg=THEME["text_muted"],
            anchor="w",
        ).pack(anchor="w")

        value = tk.Label(
            tile,
            text="--",
            font=FONTS["card_value"],
            bg=THEME["glass_light"],
            fg=THEME["text"],
            anchor="w",
        )
        value.pack(anchor="w", pady=(4, 0))
        self.metric_values[key] = value

    def _build_ai_panel(self, parent):
        """Right column: scrollable list of Gemini insight cards."""
        card = RoundedFrame(parent, fill=THEME["glass"])
        card.grid(row=0, column=1, sticky="nsew")
        body = card.body

        head = tk.Frame(body, bg=THEME["glass"])
        head.pack(fill="x")
        tk.Label(
            head,
            text="✨  AI Insights",
            font=("Segoe UI Semibold", 14),
            bg=THEME["glass"],
            fg=THEME["text"],
        ).pack(side="left")
        self.ai_badge = tk.Label(
            head,
            text="Gemini",
            font=FONTS["small"],
            bg=THEME["glass_light"],
            fg=THEME["accent"],
            padx=10,
            pady=3,
        )
        self.ai_badge.pack(side="right")

        # Scrollable area (Canvas + inner Frame is the standard Tk pattern)
        container = tk.Frame(body, bg=THEME["glass"])
        container.pack(fill="both", expand=True, pady=(12, 0))

        canvas = tk.Canvas(
            container, bg=THEME["glass"], highlightthickness=0, bd=0, height=380
        )
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar = tk.Scrollbar(container, command=canvas.yview, width=8)
        scrollbar.pack(side="right", fill="y")
        canvas.configure(yscrollcommand=scrollbar.set)

        inner = tk.Frame(canvas, bg=THEME["glass"])
        window = canvas.create_window((0, 0), window=inner, anchor="nw")
        inner.bind(
            "<Configure>",
            lambda _e: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.bind(
            "<Configure>", lambda e: canvas.itemconfigure(window, width=e.width)
        )
        canvas.bind_all(
            "<MouseWheel>",
            lambda e: canvas.yview_scroll(int(-e.delta / 120), "units"),
        )

        icons = {
            "summary": "📋",
            "clothing": "👕",
            "travel": "🧭",
            "health": "💧",
            "activity": "🏃",
            "alert": "⚠️",
        }
        for key, title in SECTIONS:
            self._insight_card(inner, key, f"{icons[key]}  {title}")

    def _insight_card(self, parent, key, title):
        """A single AI advice block."""
        block = tk.Frame(parent, bg=THEME["glass_light"], padx=14, pady=12)
        block.pack(fill="x", pady=5, padx=(0, 6))

        tk.Label(
            block,
            text=title,
            font=("Segoe UI Semibold", 10),
            bg=THEME["glass_light"],
            fg=THEME["accent"],
            anchor="w",
        ).pack(anchor="w")

        text = tk.Label(
            block,
            text="Search a city to see AI guidance here.",
            font=FONTS["body"],
            bg=THEME["glass_light"],
            fg=THEME["text"],
            anchor="w",
            justify="left",
            wraplength=430,
        )
        text.pack(anchor="w", fill="x", pady=(5, 0))
        # Keep the wrap width in sync with the panel width
        block.bind(
            "<Configure>",
            lambda e, lbl=text: lbl.configure(wraplength=max(e.width - 30, 160)),
        )
        self.ai_labels[key] = text

    # ------------------------------------------------------------------
    # History chips
    # ------------------------------------------------------------------

    def _render_history(self):
        """Redraw the row of recently searched cities."""
        for child in self.history_row.winfo_children():
            child.destroy()

        history = load_history()
        if not history:
            tk.Label(
                self.history_row,
                text="Recent searches will appear here",
                font=FONTS["small"],
                bg=THEME["glass"],
                fg=THEME["text_muted"],
            ).pack(side="left")
            return

        tk.Label(
            self.history_row,
            text="Recent:",
            font=FONTS["small"],
            bg=THEME["glass"],
            fg=THEME["text_muted"],
        ).pack(side="left", padx=(2, 8))

        for city in history:
            chip = HoverButton(
                self.history_row,
                text=city,
                bg=THEME["glass_light"],
                hover_bg=THEME["border"],
                fg=THEME["text_muted"],
                command=lambda c=city: self.search_weather(c),
            )
            chip.configure(padx=12, pady=4, font=FONTS["small"])
            chip.pack(side="left", padx=3)

        clear = HoverButton(
            self.history_row,
            text="Clear",
            bg=THEME["glass"],
            hover_bg=THEME["glass_light"],
            fg=THEME["danger"],
            command=self._clear_history,
        )
        clear.configure(padx=10, pady=4, font=FONTS["small"])
        clear.pack(side="left", padx=(10, 0))

    def _clear_history(self):
        """Wipe stored cities and refresh the chip row."""
        clear_history()
        self._render_history()

    # ------------------------------------------------------------------
    # Status helpers
    # ------------------------------------------------------------------

    def _check_keys(self):
        """Warn on startup when API keys are missing from .env."""
        missing = missing_keys()
        if missing:
            self._set_status(
                "Missing in .env: " + ", ".join(missing) + " — see README.md",
                THEME["warning"],
            )

    def _set_status(self, message, colour=None):
        self.status.configure(text=message, fg=colour or THEME["text_muted"])

    def _start_loading(self, message):
        """Show the indeterminate progress bar and lock the buttons."""
        self.is_loading = True
        self._set_status(message, THEME["accent"])
        self.progress.pack(fill="x", pady=(0, 6), before=self.status)
        self.progress.start(12)
        self.refresh_button.configure(state="disabled")

    def _stop_loading(self):
        """Hide the progress bar and unlock the buttons."""
        self.is_loading = False
        self.progress.stop()
        self.progress.pack_forget()
        if self.current_city:
            self.refresh_button.configure(state="normal")

    # ------------------------------------------------------------------
    # Actions
    # ------------------------------------------------------------------

    def search_weather(self, city=None):
        """Handle the Search button / Enter key / recent-city chip."""
        if self.is_loading:
            return
        city = (city or self.city_var.get()).strip()
        if not city:
            self._set_status("Please type a city name first.", THEME["warning"])
            return

        self.city_var.set(city)
        self._start_loading(f"Fetching weather for {city}…")
        threading.Thread(target=self._worker, args=(city,), daemon=True).start()

    def refresh_weather(self):
        """Re-fetch the currently displayed city."""
        if self.current_city:
            self.search_weather(self.current_city)

    def _worker(self, city):
        """Background thread: weather → icon → AI, then hand back to the UI."""
        try:
            weather = self.weather_service.get_weather(city)
        except WeatherAppError as error:
            self.root.after(0, self._on_error, str(error))
            return
        except Exception as error:  # noqa: BLE001 - last-resort safety net
            self.root.after(0, self._on_error, f"Unexpected error: {error}")
            return

        icon_bytes = fetch_icon_bytes(weather.icon)
        self.root.after(0, self._on_weather, weather, icon_bytes)

        # AI analysis is slower, so it is delivered as a second update.
        insights = self.ai_service.analyze(weather)
        self.root.after(0, self._on_insights, insights)

    # ------------------------------------------------------------------
    # UI callbacks (always on the main thread)
    # ------------------------------------------------------------------

    def _on_weather(self, weather, icon_bytes):
        """Paint the weather panel with fresh data."""
        self.current_city = weather.city
        self.location_label.configure(text=weather.location)
        self.temp_label.configure(text=weather.temp_text)
        self.condition_label.configure(
            text=f"{weather.condition} · {weather.description}"
        )

        self.metric_values["feels"].configure(text=weather.feels_text)
        self.metric_values["humidity"].configure(text=f"{weather.humidity}%")
        self.metric_values["wind"].configure(text=weather.wind_text)
        self.metric_values["pressure"].configure(text=f"{weather.pressure} hPa")
        self.metric_values["visibility"].configure(text=weather.visibility_text)
        self.metric_values["sun"].configure(text=f"{weather.sunrise} / {weather.sunset}")

        self._set_icon(icon_bytes)

        save_city(weather.city)
        self._render_history()

        self.refresh_button.configure(state="normal")
        self._set_status("Weather updated. Asking Gemini for insights…", THEME["accent"])
        for label in self.ai_labels.values():
            label.configure(text="Analysing…", fg=THEME["text_muted"])

    def _set_icon(self, icon_bytes):
        """Render the downloaded PNG, or fall back to an emoji."""
        if not icon_bytes:
            self.icon_label.configure(image="", text="🌤", font=("Segoe UI", 42))
            self.icon_image = None
            return
        try:
            image = Image.open(bytes_to_stream(icon_bytes)).convert("RGBA")
            image = image.resize((110, 110), Image.LANCZOS)
            self.icon_image = ImageTk.PhotoImage(image)
            self.icon_label.configure(image=self.icon_image, text="")
        except Exception:  # noqa: BLE001 - a broken image must not crash the app
            self.icon_label.configure(image="", text="🌤", font=("Segoe UI", 42))
            self.icon_image = None

    def _on_insights(self, insights):
        """Paint the AI panel and finish the loading state."""
        offline = insights.pop("_offline", False)
        for key, _title in SECTIONS:
            self.ai_labels[key].configure(
                text=insights.get(key) or "No suggestion available.",
                fg=THEME["text"],
            )

        if offline:
            self.ai_badge.configure(text="Offline mode", fg=THEME["warning"])
            self._set_status(
                "Weather loaded. Gemini unavailable — showing built-in advice.",
                THEME["warning"],
            )
        else:
            self.ai_badge.configure(text="Gemini", fg=THEME["accent"])
            self._set_status("Weather and AI insights updated.", THEME["success"])
        self._stop_loading()

    def _on_error(self, message):
        """Show a friendly error without a blocking dialog."""
        self._stop_loading()
        self._set_status(message, THEME["danger"])
