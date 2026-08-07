"""
main.py
-------
Entry point of the AI Weather Assistant.

Run with:
    python main.py
"""

import sys
import tkinter as tk
from tkinter import messagebox

from config import APP_TITLE
from gui import WeatherApp


def main() -> int:
    """Create the Tk root window, start the app, and handle fatal errors."""
    try:
        root = tk.Tk()
    except tk.TclError as error:
        print(f"Could not start the graphical interface: {error}")
        print("Make sure you are running on a machine with a display and Tkinter installed.")
        return 1

    try:
        WeatherApp(root)
        root.mainloop()
    except Exception as error:  # noqa: BLE001 - report instead of a raw traceback
        messagebox.showerror(APP_TITLE, f"The application stopped unexpectedly:\n\n{error}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
