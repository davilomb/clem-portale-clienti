from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "comunicazione_geometri" / "linkedin_inbolla" / "assets"
BRAND_DIR = ROOT / "comunicazione_geometri" / "brevo_email_inbolla" / "assets"

W = H = 1200
BG = "#f7f4ec"
INK = "#17313b"
MUTED = "#5d6d72"
GREEN = "#1f8a70"
LIME = "#c9e76c"
LINE = "#d8d2c5"
PANEL = "#ffffff"
BLUE = "#285f8f"


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


F_LOGO = font(42, True)
F_SMALL = font(30)
F_TAG = font(34, True)
F_TITLE = font(74, True)
F_BODY = font(40)
F_BADGE = font(28, True)
F_TINY = font(24)


def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def multiline(draw, text, xy, max_chars, fill, font_obj, spacing=12):
    x, y = xy
    lines = []
    for part in text.split("\n"):
        lines.extend(textwrap.wrap(part, max_chars) if part else [""])
    draw.multiline_text((x, y), "\n".join(lines), fill=fill, font=font_obj, spacing=spacing)
    bbox = draw.multiline_textbbox((x, y), "\n".join(lines), font=font_obj, spacing=spacing)
    return bbox[3]


def paste_logo(img, draw):
    logo_path = BRAND_DIR / "inbolla-logo-full.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        logo = ImageOps.contain(logo, (190, 90))
        img.alpha_composite(logo, (72, 64))
    else:
        draw.text((72, 72), "InBolla", fill=INK, font=F_LOGO)


def screenshot_card(img, draw, path_name, box):
    src = BRAND_DIR / path_name
    x1, y1, x2, y2 = box
    rounded(draw, box, 32, PANEL, LINE, 3)
    if src.exists():
        shot = Image.open(src).convert("RGBA")
        shot = ImageOps.fit(shot, (x2 - x1 - 42, y2 - y1 - 92), method=Image.Resampling.LANCZOS)
        img.alpha_composite(shot, (x1 + 21, y1 + 62))
    for i, c in enumerate(["#e85d50", "#f2bd4a", "#58c271"]):
        draw.ellipse((x1 + 28 + i * 34, y1 + 25, x1 + 48 + i * 34, y1 + 45), fill=c)


def draw_footer(draw):
    draw.text((72, 1116), "inbolla.vercel.app", fill=MUTED, font=F_TINY)
    draw.text((872, 1116), "Portale clienti per geometri", fill=MUTED, font=F_TINY)


def draw_checklist(draw, x, y, items):
    for idx, item in enumerate(items):
        yy = y + idx * 74
        rounded(draw, (x, yy, x + 44, yy + 44), 12, GREEN if idx < 2 else "#eef1ed")
        if idx < 2:
            draw.line((x + 12, yy + 23, x + 20, yy + 32, x + 34, yy + 13), fill="white", width=5)
        draw.text((x + 64, yy + 2), item, fill=INK, font=F_SMALL)


def make_card(n, kicker, title, body, kind, screenshot=None):
    img = Image.new("RGBA", (W, H), BG)
    draw = ImageDraw.Draw(img)
    paste_logo(img, draw)

    draw.ellipse((930, -90, 1280, 260), fill=LIME)
    draw.ellipse((-130, 820, 220, 1170), fill="#d7efe8")
    rounded(draw, (72, 168, 1128, 1032), 44, "#fbfaf5", "#e5ded0", 2)
    rounded(draw, (112, 216, 112 + len(kicker) * 17 + 44, 270), 27, "#e6f4ef")
    draw.text((134, 229), kicker.upper(), fill=GREEN, font=F_BADGE)

    multiline(draw, title, (112, 310), 20, INK, F_TITLE, 10)
    multiline(draw, body, (112, 520), 31, MUTED, F_BODY, 14)

    if kind == "screenshot" and screenshot:
        screenshot_card(img, draw, screenshot, (570, 560, 1080, 940))
    elif kind == "messages":
        labels = ["Email", "WhatsApp", "Telefonate", "Documenti"]
        for i, label in enumerate(labels):
            x = 610 + (i % 2) * 220
            y = 575 + (i // 2) * 120
            rounded(draw, (x, y, x + 180, y + 70), 20, PANEL, LINE, 2)
            draw.text((x + 24, y + 20), label, fill=INK, font=F_SMALL)
        rounded(draw, (735, 835, 980, 925), 28, GREEN)
        draw.text((780, 862), "Un portale", fill="white", font=F_TAG)
    elif kind == "documents":
        for i, label in enumerate(["Pratica", "Catasto", "Permessi"]):
            y = 610 + i * 94
            rounded(draw, (620, y, 1030, y + 64), 18, PANEL, LINE, 2)
            draw.rectangle((650, y + 20, 695, y + 48), fill="#f0c75e")
            draw.text((720, y + 16), label, fill=INK, font=F_SMALL)
    elif kind == "timeline":
        x = 690
        draw.line((x, 595, x, 920), fill=GREEN, width=8)
        for i, label in enumerate(["Aperta", "Documenti", "Verifica", "Prossimo step"]):
            y = 595 + i * 105
            draw.ellipse((x - 22, y - 22, x + 22, y + 22), fill=GREEN if i < 3 else LIME)
            draw.text((x + 52, y - 20), label, fill=INK, font=F_SMALL)
    elif kind == "checklist":
        draw_checklist(draw, 620, 600, ["Documento ricevuto", "Aggiornamento letto", "Firma mancante", "Conferma richiesta"])
    elif kind == "two-columns":
        rounded(draw, (595, 590, 820, 920), 28, PANEL, LINE, 2)
        rounded(draw, (860, 590, 1085, 920), 28, PANEL, LINE, 2)
        draw.text((644, 635), "Studio", fill=GREEN, font=F_TAG)
        draw.text((900, 635), "Cliente", fill=BLUE, font=F_TAG)
        draw.text((632, 720), "ordine\ncontrollo\nmeno rincorse", fill=MUTED, font=F_SMALL, spacing=16)
        draw.text((896, 720), "chiarezza\ndocumenti\nscadenze", fill=MUTED, font=F_SMALL, spacing=16)
    elif kind == "beta":
        rounded(draw, (640, 620, 1035, 820), 36, GREEN)
        draw.text((720, 678), "Accesso beta", fill="white", font=F_TAG)
        rounded(draw, (700, 850, 985, 920), 26, LIME)
        draw.text((738, 870), "Primi studi", fill=INK, font=F_TAG)
    elif kind == "demo":
        rounded(draw, (655, 610, 1045, 900), 32, PANEL, LINE, 2)
        draw.text((750, 660), "Demo", fill=GREEN, font=F_TITLE)
        draw.text((748, 760), "15 minuti", fill=INK, font=F_TAG)
        rounded(draw, (745, 830, 955, 890), 26, GREEN)
        draw.text((790, 846), "Scrivimi", fill="white", font=F_SMALL)

    draw_footer(draw)
    img.convert("RGB").save(OUT_DIR / f"post-{n:02d}.png", quality=95)


POSTS = [
    (1, "Presentazione", "Il portale clienti per geometri", "Pratiche, documenti e aggiornamenti in un unico spazio chiaro.", "screenshot", "hero-cliente-reale.png"),
    (2, "Problema", "Meno messaggi sparsi", "Email, WhatsApp e telefonate non devono essere l'archivio della pratica.", "messages", None),
    (3, "Cruscotto", "A che punto siamo?", "Stato pratica, prossima azione e scadenze visibili senza rincorse.", "screenshot", "demo-cruscotto.png"),
    (4, "Documenti", "File ordinati per pratica", "Lo studio decide cosa pubblicare. Il cliente trova quello che serve.", "documents", None),
    (5, "Timeline", "Ogni passaggio resta chiaro", "Aggiornamenti consultabili nel tempo, senza ricostruire conversazioni.", "timeline", None),
    (6, "Richieste", "Cosa manca davvero?", "Documenti, firme e conferme diventano richieste visibili al cliente.", "checklist", None),
    (7, "Studio", "Il geometra lavora meglio", "Meno passaggi manuali e piu' controllo sulla relazione con il cliente.", "two-columns", None),
    (8, "Cliente", "Il cliente sa dove guardare", "Uno spazio semplice per seguire pratica, documenti e prossimi step.", "screenshot", "hero-cliente-reale.png"),
    (9, "Beta", "Cerchiamo i primi studi", "Condizioni agevolate e supporto personalizzato per chi entra ora.", "beta", None),
    (10, "Demo", "Vediamolo in 15 minuti", "Una chiamata conoscitiva per capire se InBolla ha senso per il tuo studio.", "demo", None),
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for post in POSTS:
        make_card(*post)
    print(f"Generated {len(POSTS)} LinkedIn images in {OUT_DIR}")


if __name__ == "__main__":
    main()
