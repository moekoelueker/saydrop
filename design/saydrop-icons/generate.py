"""Generates the Saydrop app icon and tray icons. See README.md."""
import math, subprocess
DROP = "M8 1C8 1 2 8 2 12.5C2 16.1 4.7 19 8 19C11.3 19 14 16.1 14 12.5C14 8 8 1 8 1Z"
WAVE = "M5.5 12.5V14M8 10.5V16M10.5 12V14.5"
DARK = "#0c0c0c"
TRAY_BG = "#1a1c2e"

def drop(scale, cx, cy, fill, wave_color=None, wave_width=1.5):
    # drop artwork is centered on (8, 10) in its 16x20 box
    t = f'translate({cx - 8*scale} {cy - 10*scale}) scale({scale})'
    s = f'<g transform="{t}"><path d="{DROP}" fill="{fill}"/>'
    if wave_color:
        s += f'<path d="{WAVE}" fill="none" stroke="{wave_color}" stroke-width="{wave_width}" stroke-linecap="round"/>'
    return s + '</g>'

def svg(size, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">{body}</svg>'

def render(name, size, body):
    open(name + ".svg", "w").write(svg(size, body))
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), name + ".svg", "-o", name + ".png"], check=True)

# App icon, Apple grid: 824px rounded square inside a 1024 canvas.
render("app-icon", 1024, f'''
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1d1733"/><stop offset="1" stop-color="{DARK}"/>
  </linearGradient>
  <linearGradient id="drop" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#a87cff"/><stop offset="1" stop-color="#7c3aed"/>
  </linearGradient>
</defs>
<rect x="100" y="100" width="824" height="824" rx="185" fill="url(#bg)"/>
<rect x="100.5" y="100.5" width="823" height="823" rx="184.5" fill="none" stroke="#ffffff" stroke-opacity="0.08"/>
{drop(28, 512, 512, "url(#drop)", DARK, 1.5)}
''')

def tray(name, glyph):
    render(name, 32, f'<rect x="0" y="0" width="32" height="32" rx="7" fill="{TRAY_BG}"/>{glyph}')

tray("tray-idle", drop(1.25, 16, 16, "#ffffff", TRAY_BG, 1.6))
tray("tray-dictating", drop(1.25, 16, 16, "#a87cff", TRAY_BG, 1.6))
for i in range(12):
    a0 = math.radians(i * 30 - 90)
    a1 = a0 + math.radians(270)
    r = 11
    p0 = (16 + r*math.cos(a0), 16 + r*math.sin(a0))
    p1 = (16 + r*math.cos(a1), 16 + r*math.sin(a1))
    arc = f'<path d="M{p0[0]:.2f} {p0[1]:.2f} A{r} {r} 0 1 1 {p1[0]:.2f} {p1[1]:.2f}" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>'
    tray(f"frame_{i:02d}", arc + drop(0.55, 16, 16, "#ffffff"))
