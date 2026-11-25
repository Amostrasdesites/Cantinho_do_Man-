from PIL import Image
from pathlib import Path
import base64, io, re

ids = "ead25a12 5da9e1e1 4e2a6b35 20394a99 4cc67414 0728219f 233741df bffa77ad 3fb21954 d8e06c66 d23c3081".split()
temp = Path(r"C:/Users/Wolf/AppData/Local/Temp")
images = [Image.open(next(temp.glob(f"codex-clipboard-{key}*.jpg"))) for key in ids]
def asset(index, box=None, size=(900,900)):
    im = images[index]
    if box:
        im = im.crop(box)
    im.thumbnail(size)
    buffer = io.BytesIO()
    im.save(buffer, "WEBP", quality=86)
    return "data:image/webp;base64," + base64.b64encode(buffer.getvalue()).decode()

assets = {
    "logo": asset(0, (190,157,1064,1040), (145,145)),
    "hero": asset(2, (451,925,1024,1242)),
    "hamburguer": asset(2, (0,429,625,785)),
    "sexta": asset(2, (448,857,1024,1264)),
    "fritas": asset(7, (599,516,1122,1305)),
    "personalizado": asset(3, (0,345,312,681)),
    "copo-morango": asset(10, (95,384,1000,1460)),
    "copo-chocolate": asset(9, (144,441,1040,1500)),
}
for i, (x, y) in enumerate([(27,435),(359,435),(683,435),(27,795),(359,795),(683,795)]):
    assets[f"marmita-{i}"] = asset(1, (x+5,y+5,x+308,y+261))
for key, i in [("1",6),("2",4),("3",5)]:
    assets["kit-"+key] = asset(i, (560,355,907,679))
for i, (x,y) in enumerate([(25,419),(257,419),(493,419),(727,419),(958,419),(25,771),(257,771),(493,771),(727,771),(958,771)]):
    assets[f"doce-{i}"] = asset(8,(x+5,y,x+211,y+220))
source = Path("work/cantinho.html").read_text(encoding="utf-8-sig")
result = re.sub(r"@@([a-z0-9-]+)@@", lambda m: assets[m[1]], source)
for path in ("outputs/Cantinho do Maná.html","work/cantinho-do-mana/dist/index.html"):
    Path(path).write_text(result, encoding="utf-8")
