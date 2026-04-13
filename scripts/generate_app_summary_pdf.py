from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output" / "pdf"
TMP_DIR = ROOT / "tmp" / "pdfs"
PNG_PATH = TMP_DIR / "app-summary-one-pager-preview.png"
PDF_PATH = OUTPUT_DIR / "app-summary-one-pager.pdf"

PAGE_W, PAGE_H = 1654, 2339  # A4 at ~150 DPI
MARGIN_X = 110
MARGIN_Y = 100
CONTENT_W = PAGE_W - (MARGIN_X * 2)

BG = "#F7F1E8"
INK = "#1A1A1A"
MUTED = "#5B544C"
ACCENT = "#A64B2A"
CARD = "#FFFDF9"
LINE = "#D7C8B5"


def load_font(path: Path, size: int):
    return ImageFont.truetype(str(path), size=size)


FONT_HEAD = load_font(ROOT / "fonts" / "Caroni-Regular.otf", 72)
FONT_SUB = load_font(ROOT / "fonts" / "Caroni-Regular.otf", 38)
FONT_BODY = load_font(ROOT / "fonts" / "Caroni-Regular.otf", 27)
FONT_BODY_BOLD = load_font(ROOT / "fonts" / "Caroni-Regular.otf", 29)
FONT_SMALL = load_font(ROOT / "fonts" / "Caroni-Regular.otf", 24)
FONT_NOTE = load_font(ROOT / "fonts" / "GloriaHallelujah.ttf", 22)


SUMMARY = {
    "title": "The AI Playground",
    "what_it_is": (
        "A small static web app built as part of a master's thesis to help people explore "
        "different AI models through lightweight, interactive demos. In the current repo, "
        "the implemented hands-on experience is a rule-based drawing classifier."
    ),
    "who_its_for": (
        "Primary persona: curious learners or thesis-demo visitors who want a simple, visual "
        "way to understand what different AI approaches can and cannot do."
    ),
    "features": [
        "Home page introduces multiple AI demo types through card-based navigation.",
        "English and Danish UI toggle updates labeled text across pages.",
        "Interactive canvas lets users draw doodles directly in the browser.",
        "Rule-based classifier recognizes sun, house, fish, or fallback classes.",
        "Result panel explains why a prediction was made using human-readable reasons.",
        "Challenge checklist tracks recognized drawings for the built-in tasks.",
        "Users can create, edit, delete, reorder, and persist custom rules in localStorage.",
    ],
    "architecture": [
        "Client only: HTML pages (`index.html`, `about.html`, `other-resources.html`, `rule-based-ai.html`) load shared CSS from `styles/` and JavaScript from `scripts/`.",
        "Navigation and localization flow through `scripts/script.js` and `scripts/translations.js`; language choice is stored in `localStorage`.",
        "The rule-based demo uses an HTML canvas plus `scripts/rule-based-ai.js` for drawing, undo/redo history, canvas normalization, and feature extraction.",
        "Classification rules live in `scripts/rules.js`; built-in and custom rules are evaluated in the browser, and custom rules are saved back to `localStorage`.",
        "Backend/API/database: Not found in repo.",
    ],
    "run_steps": [
        "Download or clone the repo.",
        "Open `index.html` in a modern browser.",
        "Click `Start` on `Rule-based AI` to use the implemented demo.",
        "Build/dev server instructions: Not found in repo.",
    ],
}


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        width = draw.textbbox((0, 0), candidate, font=font)[2]
        if width <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(draw, x, y, text, font, fill, max_width, line_gap=8):
    lines = wrap_text(draw, text, font, max_width)
    bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_h = bbox[3] - bbox[1]
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += line_h + line_gap
    return y


def draw_bullets(draw, x, y, items, font, fill, max_width, bullet_color=ACCENT, gap=10):
    bullet_indent = 28
    bullet_w = max_width - bullet_indent
    bbox = draw.textbbox((0, 0), "Ag", font=font)
    line_h = bbox[3] - bbox[1]

    for item in items:
        draw.text((x, y), "-", font=font, fill=bullet_color)
        inner_y = y
        for i, line in enumerate(wrap_text(draw, item, font, bullet_w)):
            draw.text((x + bullet_indent, inner_y), line, font=font, fill=fill)
            inner_y += line_h + 6
        y = inner_y + gap
    return y


def draw_section(draw, x, y, title, body_fn):
    draw.text((x, y), title, font=FONT_SUB, fill=ACCENT)
    y += 54
    y = body_fn(y)
    return y + 14


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGB", (PAGE_W, PAGE_H), BG)
    draw = ImageDraw.Draw(image)

    # Main card
    card_box = [55, 55, PAGE_W - 55, PAGE_H - 55]
    draw.rounded_rectangle(card_box, radius=36, fill=CARD, outline=LINE, width=3)
    draw.rounded_rectangle([MARGIN_X, 120, PAGE_W - MARGIN_X, 136], radius=8, fill=ACCENT)

    y = MARGIN_Y + 10
    draw.text((MARGIN_X, y), SUMMARY["title"], font=FONT_HEAD, fill=INK)
    y += 90
    draw.text((MARGIN_X, y), "One-page repo summary", font=FONT_NOTE, fill=MUTED)
    y += 70

    col_gap = 70
    left_w = 760
    right_x = MARGIN_X + left_w + col_gap
    right_w = CONTENT_W - left_w - col_gap

    left_y = y
    right_y = y

    left_y = draw_section(
        draw, MARGIN_X, left_y, "What It Is",
        lambda yy: draw_wrapped(draw, MARGIN_X, yy, SUMMARY["what_it_is"], FONT_BODY, INK, left_w)
    )

    left_y = draw_section(
        draw, MARGIN_X, left_y, "Who It's For",
        lambda yy: draw_wrapped(draw, MARGIN_X, yy, SUMMARY["who_its_for"], FONT_BODY, INK, left_w)
    )

    left_y = draw_section(
        draw, MARGIN_X, left_y, "What It Does",
        lambda yy: draw_bullets(draw, MARGIN_X, yy, SUMMARY["features"], FONT_SMALL, INK, left_w)
    )

    right_y = draw_section(
        draw, right_x, right_y, "How It Works",
        lambda yy: draw_bullets(draw, right_x, yy, SUMMARY["architecture"], FONT_SMALL, INK, right_w)
    )

    right_y = draw_section(
        draw, right_x, right_y, "How To Run",
        lambda yy: draw_bullets(draw, right_x, yy, SUMMARY["run_steps"], FONT_SMALL, INK, right_w)
    )

    footer_y = max(left_y, right_y) + 20
    draw.line((MARGIN_X, footer_y, PAGE_W - MARGIN_X, footer_y), fill=LINE, width=3)
    footer_y += 25
    footer = (
        "Evidence basis: repo files only. Roadmap/demo items visible but not implemented in this repo include "
        "the Image classifier and Chatbot cards."
    )
    draw_wrapped(draw, MARGIN_X, footer_y, footer, FONT_SMALL, MUTED, CONTENT_W, line_gap=4)

    image.save(PNG_PATH)
    image.save(PDF_PATH, "PDF", resolution=150.0)

    print(PNG_PATH)
    print(PDF_PATH)


if __name__ == "__main__":
    main()
