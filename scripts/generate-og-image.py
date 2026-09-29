from PIL import Image, ImageDraw, ImageFont

S = 2
W, H = 1200, 630
image = Image.new("RGB", (W * S, H * S), "#f6f8f2")
draw = ImageDraw.Draw(image)


def box(coords, fill, radius=0, outline=None, width=1):
    draw.rounded_rectangle(
        tuple(int(value * S) for value in coords),
        radius=radius * S,
        fill=fill,
        outline=outline,
        width=width * S,
    )


def line(points, fill, width):
    draw.line([(int(x * S), int(y * S)) for x, y in points], fill=fill, width=width * S, joint="curve")
    for x, y in (points[0], points[-1]):
        r = width / 2
        draw.ellipse(((x-r)*S, (y-r)*S, (x+r)*S, (y+r)*S), fill=fill)


def font(size, bold=False):
    name = "malgunbd.ttf" if bold else "malgun.ttf"
    return ImageFont.truetype("C:/Windows/Fonts/" + name, size * S)


def text(x, y, value, size, fill, bold=False, spacing=0):
    draw.multiline_text((x * S, y * S), value, font=font(size, bold), fill=fill, spacing=spacing * S)


# A calm grid ties the sharing card to the lyric puzzle without revealing an answer.
for x in range(0, W + 1, 40):
    line([(x, 0), (x, H)], "#eef1e9", 1)
for y in range(0, H + 1, 40):
    line([(0, y), (W, y)], "#eef1e9", 1)
box((0, 0, W, 18), "#246446")
draw.ellipse((790*S, -125*S, 1380*S, 465*S), fill="#eaf0df")
draw.ellipse((-215*S, 485*S, 145*S, 845*S), fill="#ebf2e3")

# Brand mark, matching the pastel note favicon with a neon green accent.
box((88, 91, 173, 176), "#e0f0ec", 24)
box((133, 112, 139, 150), "#58d523")
draw.ellipse((109*S, 143*S, 138*S, 162*S), fill="#58d523")
draw.polygon([(139*S, 112*S), (154*S, 124*S), (150*S, 137*S), (147*S, 129*S), (139*S, 124*S)], fill="#58d523")
text(191, 108, "LYRICS PUZZLE", 20, "#397054", True)
text(191, 137, "NCT 노래 퀴즈", 19, "#5c6b5d")

text(83, 217, "NCT 초성\n가사 맞히기", 72, "#193e2c", True, 16)
text(89, 434, "NCT 가사의 초성을 보고\n노래 제목을 맞히세요.", 26, "#5a6a59", False, 13)
box((89, 552, 333, 598), "#dceac7", 22)
text(110, 558, "하루 한 곡  ·  오늘의 문제", 19, "#2c6142", True)

# A fictional four-cell puzzle is used instead of any song lyric.
box((716, 135, 1129, 539), "#d4dfce", 30)
box((705, 124, 1118, 528), "#ffffff", 30, "#dce5d8", 2)
box((737, 157, 1086, 213), "#eaf3df", 16)
text(756, 166, "오늘의 문제", 23, "#28563d", True)
draw.ellipse((1051*S, 180*S, 1065*S, 194*S), fill="#74b46b")
text(742, 231, "초성에서 가사 찾기", 19, "#7a8779")
for index, char in enumerate("ㅊㅅㄱㅅ"):
    x = 742 + index * 84
    box((x, 285, x + 70, 360), "#eff4e8", 14, "#dde7d7", 2)
    text(x + 17, 290, char, 38, "#326c4a", True)
box((742, 394, 1080, 405), "#e8eee3", 5)
box((742, 394, 879, 405), "#91bb72", 5)
text(742, 425, "가사 복원 40%", 20, "#5b715d")
line([(742, 476), (1080, 476)], "#edf0e9", 1)
text(742, 482, "제목을 맞혀보세요", 18, "#879487")

image.resize((W, H), Image.Resampling.LANCZOS).save("public/og-image.png", optimize=True)
