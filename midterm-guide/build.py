#!/usr/bin/env python3
"""Turns the guide's document (doc.xml) into one self-contained index.html.

The text comes straight from the document, so nothing is retyped. This script
only decides how each piece is presented: which section is a question set, where
each simulator goes, and how plain-text maths such as n^2 is typeset. It stops
with an error if any question ends up without an answer.
"""
import html
import json
import pathlib
import re
import xml.etree.ElementTree as ET

HERE = pathlib.Path(__file__).parent
root = ET.parse(HERE / "doc.xml").getroot()

# ---------------------------------------------------------------- typesetting
TIMES = re.compile(r"(?<=[\w).!]) times (?=(?:\d|[a-z]\b|\(|log|\[|\.\.\.))")


def mathify(s):
    s = s.replace("&lt;=", "≤").replace("&gt;=", "≥")
    s = re.sub(r"(?<!Big-)\bTheta\b", "Θ", s)
    s = re.sub(r"(?<!Big-)\bOmega\b", "Ω", s)
    s = re.sub(r"\blog_(\w+)", r"log<sub>\1</sub>", s)
    s = re.sub(r"\blog2\b", "log<sub>2</sub>", s)
    s = TIMES.sub(" × ", s)
    s = re.sub(r"\bsqrt\(([\w.]+)\)", r"√\1", s)
    s = re.sub(r"\bsqrt\(((?:[^()]|\([^()]*\))+)\)", r"√(\1)", s)

    def sup(m):
        body = m.group(1)
        if body.startswith("(") and body.endswith(")"):
            body = body[1:-1]
        return f"<sup>{body}</sup>"

    s = re.sub(r"(?<=[\w)!])\^(\((?:[^()]|\([^()]*\))*\)|-?\d+(?:\.\d+)?|\w+)", sup, s)
    s = re.sub(r"\b([ncghv])(\d)\b", r"\1<sub>\2</sub>", s)
    s = re.sub(r"\bL(\d)\b", r"L<sub>\1</sub>", s)
    return s


def linkify(s):
    s = re.sub(r"\bLessons (\d+) and (\d+)\b", r'Lessons <a href="#lesson-\1">\1</a> and <a href="#lesson-\2">\2</a>', s)
    s = re.sub(r"\bLesson (\d+)\b", r'<a href="#lesson-\1">Lesson \1</a>', s)
    s = s.replace("the Math toolkit", 'the <a href="#math">Math toolkit</a>').replace("The Math toolkit", 'The <a href="#math">Math toolkit</a>')
    return s


REWORDS = {
    "with answers right underneath. Cover the answers, try them, then look.": "with answers hidden until you ask for them. Try each one first, then look.",
    "Try it yourself: cover the picture, sketch from the edge list, then compare.": "Try it yourself: before you press Next, sketch from the edge list, then compare.",
    "Write full answers before reading the solutions that follow.": "Write full answers before you open the solutions.",
}
reworded = set()


def text_of(el):
    out = el.text or ""
    for c in el:
        out += text_of(c) + (c.tail or "")
    return out


def run(el):
    """One <text> run: plain, or holding a <bold> or <italic> child."""
    body = html.escape(text_of(el), quote=False)
    for k, v in REWORDS.items():
        if k in body:
            body = body.replace(k, v)
            reworded.add(k)
    body = mathify(body)
    kinds = [c.tag for c in el]
    if "bold" in kinds:
        body = f"<strong>{body}</strong>"
    if "italic" in kinds:
        body = f"<em>{body}</em>"
    return body


def inline(par, link=True):
    out = "".join(run(c) for c in par if c.tag == "text")
    return linkify(out) if link else out


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


# --------------------------------------------------------------------- blocks
def table_html(t):
    rows = list(t)
    head = "".join(f"<th>{cell_html(c)}</th>" for c in rows[0])
    body = "".join("<tr>" + "".join(f"<td>{cell_html(c)}</td>" for c in r) + "</tr>" for r in rows[1:])
    return f'<div class="tablewrap"><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def cell_html(c):
    return " ".join(inline(p) for p in c if p.tag == "paragraph")


def list_html(l):
    tag = "ol" if l.get("kind") in ("ordered", "number", "numbered") else "ul"
    items = []
    for li in l:
        parts = []
        for ch in li:
            if ch.tag == "paragraph":
                parts.append(inline(ch))
            elif ch.tag == "list":
                parts.append(list_html(ch))
        items.append("<li>" + " ".join(parts) + "</li>")
    return f"<{tag}>" + "".join(items) + f"</{tag}>"


def block_html(b):
    if b.tag == "paragraph":
        return f"<p>{inline(b)}</p>"
    if b.tag == "list":
        return list_html(b)
    if b.tag == "table":
        return table_html(b)
    if b.tag == "codeBlock":
        return f"<pre><code>{html.escape(text_of(b), quote=False)}</code></pre>"
    if b.tag == "blockquote":
        kind = "annotated" if text_of(b).startswith("Annotated") else "refresher"
        return f'<aside class="callout callout--{kind}">' + "".join(f"<p>{inline(p)}</p>" for p in b) + "</aside>"
    if b.tag == "embed":
        return widget_html(EMBEDS[b.get("ref")], b.get("caption"))
    raise ValueError(b.tag)


def widget_html(spec, caption=None):
    conf = html.escape(json.dumps(spec), quote=True)
    cap = html.escape(caption or "", quote=True)
    return f'<div class="widget" data-conf="{conf}" data-caption="{cap}"></div>'


# Every picture in the guide, and the simulator that takes its place.
EMBEDS = {
    "node/6c5cd1b6-6900": {"w": "gs", "preset": "worked"},
    "node/54598525-f3d8": {"w": "sketch", "graph": "G", "start": "A"},
    "node/443a61a8-70a0": {"w": "traverse", "graph": "internet", "start": "MIT", "mode": "bfs", "modes": ["bfs"]},
    "node/a0a37b3a-7a49": {"w": "traverse", "graph": "dfs8", "start": "1", "mode": "dfs", "modes": ["dfs"]},
    "node/07a17313-07e9": {"w": "bipartite", "graph": "cycle5", "start": "a"},
    "node/42e799f1-100e": {"w": "topo", "preset": "prereq"},
    "node/03a16a55-7853": {"w": "intervals", "preset": "worked"},
    "node/38cb4c40-efa8": {"w": "lateness", "preset": "swap"},
    "node/b7ac24b6-0707": {"w": "dijkstra", "preset": "worked"},
    "node/2a7435b1-c361": {"w": "mst", "preset": "worked"},
    "node/5184e608-f5a3": {"w": "cut"},
    "node/ec26a874-46ac": {"w": "uf", "preset": "kruskal"},
    "node/98affcc6-b8c6": {"w": "analyze", "graph": "practice", "start": "p"},
    "node/78bd0d7a-92e7": {"w": "twotrees"},
}

# Simulators with no picture in the guide, placed after the block they illustrate.
AFTER = {
    "Gale-Shapley proves one always exists": ({"w": "matching", "preset": "B"}, "Try any matching · find the unstable pairs"),
    "Refresher: how to read the big-O definition": ({"w": "bigo"}, "Set c and n0 yourself · the ceiling and the floor"),
    "Hierarchy:": None,
    "Applying the same monotone operation": ({"w": "growth"}, "Growth rates side by side"),
    "Refresher: why doubling gives log n": ({"w": "loops"}, "Count the loops by running them"),
    "Discovered nodes are the frontier": None,
    "Refresher: stacks": ({"w": "traverse", "graph": "G", "start": "A", "mode": "queue", "modes": ["queue", "stack"]}, "One algorithm, two data structures"),
    "EDF order 1, 2, 3, 4 gives finish times": ({"w": "lateness", "preset": "worked"}, "Reorder the jobs · watch the maximum lateness"),
    "Worked example. DAG with edges s to x": ({"w": "topo", "preset": "format3"}, "Count the orderings by choosing"),
}
AFTER = {k: v for k, v in AFTER.items() if v}
placed = set()


def after_widgets(b):
    t = text_of(b)
    out = ""
    for k, (spec, cap) in AFTER.items():
        key = k.replace("n0", "n0")
        if t.startswith(key):
            out += widget_html(spec, cap)
            placed.add(k)
    return out


# ------------------------------------------------------------------ questions
class Q:
    def __init__(self, qid, body, answer=None):
        self.qid, self.body, self.answer = qid, body, answer


all_questions = []


def card(q, lesson, kind):
    all_questions.append(q.qid)
    assert q.answer, f"{q.qid} has no answer"
    label = {"check": "Check", "reps": "Rep", "practice": "Practice"}[kind]
    tag = q.qid if kind != "check" else f"Check {q.qid.split('-C')[-1]}"
    return (
        f'<article class="q" data-qid="{q.qid}" data-lesson="{lesson}" data-kind="{kind}">'
        f'<div class="q__tag">{tag}</div><div class="q__body">{q.body}</div>'
        f'<div class="q__act"><button class="btn btn--quiet" data-act="reveal" type="button">Show answer</button>'
        f'<span class="q__state"></span></div>'
        f'<div class="q__answer" hidden><div class="q__text">{q.answer}</div>'
        f'<div class="q__mark"><span>How did it go?</span>'
        f'<button class="btn btn--good" data-mark="got" type="button">Got it</button>'
        f'<button class="btn btn--warn" data-mark="review" type="button">Review later</button></div></div></article>'
    )


def split_numbered(text, count):
    parts = []
    pos = []
    start = 0
    for k in range(1, count + 1):
        i = text.index(f"({k}) ", start)
        pos.append(i)
        start = i + 1
    for j, i in enumerate(pos):
        end = pos[j + 1] if j + 1 < len(pos) else len(text)
        parts.append(text[i + len(f"({j + 1}) ") :end].strip())
    return parts


def is_lead(b, lead):
    return b.tag == "paragraph" and text_of(b).startswith(lead)


def strip_lead(par_html, lead):
    return re.sub(rf"^<strong>{re.escape(lead)}</strong>\s*", "", par_html)


def qset_check(blocks, lesson):
    lst = next(b for b in blocks if b.tag == "list")
    ans = next(b for b in blocks if is_lead(b, "Answers."))
    qs = [" ".join(inline(c) for c in li if c.tag == "paragraph") for li in lst]
    answers = split_numbered(strip_lead(inline(ans), "Answers."), len(qs))
    out = [Q(f"L{lesson}-C{i + 1}", q, a) for i, (q, a) in enumerate(zip(qs, answers))]
    return "".join(card(q, lesson, "check") for q in out)


def answers_by_id(blocks, prefix):
    """Answers arrive as one paragraph or as a list. Either way, key them by id."""
    found = {}
    pat = re.compile(rf"\b({prefix}\d+\.\d+)(:| \()")
    chunks = []
    for b in blocks:
        if b.tag == "paragraph":
            chunks.append(strip_lead(strip_lead(inline(b), "Answers."), "Solutions."))
        elif b.tag == "list":
            chunks += [" ".join(inline(c) for c in li if c.tag == "paragraph") for li in b]
    for ch in chunks:
        ms = list(pat.finditer(ch))
        for i, m in enumerate(ms):
            end = ms[i + 1].start() if i + 1 < len(ms) else len(ch)
            body = ch[m.end() if m.group(2) == ":" else m.start(2) + 1 : end].strip()
            found[m.group(1)] = body
    return found


def qset_labeled(blocks, lesson, prefix, kind, answer_lead):
    i = next(n for n, b in enumerate(blocks) if is_lead(b, answer_lead))
    answers = answers_by_id(blocks[i:], prefix)
    intro, qs = [], []
    for b in blocks[:i]:
        m = re.match(rf"({prefix}\d+\.\d+)\s", text_of(b)) if b.tag == "paragraph" else None
        if m:
            qs.append(Q(m.group(1), f"<p>{strip_lead(inline(b), m.group(1))}</p>"))
        elif qs and b.tag == "codeBlock":
            qs[-1].body += block_html(b)
        else:
            intro.append(block_html(b))
    for q in qs:
        q.answer = answers.get(q.qid)
    return "".join(intro) + "".join(card(q, lesson, kind) for q in qs)


# --------------------------------------------------------------------- split
blocks = list(root)
views, cur = [], None
for b in blocks:
    if b.tag == "paragraph" and b.get("heading") == "1":
        continue
    if b.tag == "paragraph" and b.get("heading") == "2":
        cur = {"title": text_of(b), "subs": [{"title": None, "blocks": []}]}
        views.append(cur)
    elif cur is None:
        continue
    elif b.tag == "paragraph" and b.get("heading") == "3":
        cur["subs"].append({"title": text_of(b), "blocks": []})
    else:
        cur["subs"][-1]["blocks"].append(b)


def view_id(title):
    m = re.match(r"Lesson (\d+)", title)
    if m:
        return f"lesson-{m.group(1)}"
    if title.startswith("How to use"):
        return "how"
    if title.startswith("Math toolkit"):
        return "math"
    if title.startswith("Proof technique"):
        return "cheat"
    if title.startswith("Practice exam"):
        return "exam"
    raise ValueError(title)


def render_sub(sub, lesson, vid):
    t = sub["title"]
    bl = sub["blocks"]
    if t and t.startswith("Check yourself"):
        body = qset_check(bl, lesson)
    elif t and t.startswith("Reps"):
        body = qset_labeled(bl, lesson, "R", "reps", "Answers.")
    elif t and t == "Practice":
        body = qset_labeled(bl, lesson, "P", "practice", "Solutions.")
    else:
        body = "".join(block_html(b) + after_widgets(b) for b in bl)
    sid = f"{vid}--{slug(t)}" if t else f"{vid}--top"
    head = f'<h3 id="{sid}">{mathify(html.escape(t, quote=False))}</h3>' if t else ""
    cls = "sub"
    if t and (t.startswith("Check yourself") or t.startswith("Reps") or t == "Practice"):
        cls += " sub--q"
    return sid, t, f'<section class="{cls}" data-sub="{sid}">{head}{body}</section>'


def render_exam(view):
    intro = view["subs"][0]["blocks"]
    sols = view["subs"][1]["blocks"]
    answers = {}
    for b in sols:
        m = re.match(r"(E\d+)\.", text_of(b))
        answers[m.group(1)] = strip_lead(inline(b), m.group(1) + ".")
    lead, cards = [], []
    for b in intro:
        m = re.match(r"(E\d+)\.\s", text_of(b)) if b.tag == "paragraph" else None
        if m:
            cards.append([m.group(1), f"<p>{strip_lead(inline(b), m.group(1) + '.')}</p>"])
        elif cards and b.tag == "codeBlock":
            cards[-1][1] += block_html(b)
        else:
            lead.append(block_html(b))
    out = "".join(lead)
    out += '<div id="exam-bar" class="exambar"></div><div id="exam-qs">'
    for qid, body in cards:
        assert qid in answers, qid
        out += (
            f'<article class="q q--exam" data-exam="{qid}"><div class="q__tag">{qid}</div><div class="q__body">{body}</div>'
            f'<label class="scratch"><span>Your answer</span><textarea id="ans-{qid}" rows="4" placeholder="Write your full answer here. It stays in this browser."></textarea></label>'
            f'<div class="q__answer" hidden><div class="q__tag q__tag--sol">Solution</div><div class="q__text">{answers[qid]}</div>'
            f'<div class="q__mark"><span>Score yourself</span>'
            f'<button class="btn btn--good" data-score="full" type="button">Full credit</button>'
            f'<button class="btn" data-score="part" type="button">Partial</button>'
            f'<button class="btn btn--warn" data-score="none" type="button">Missed it</button></div></div></article>'
        )
    return out + "</div>"


pages = {}
meta = []
for v in views:
    vid = view_id(v["title"])
    m = re.match(r"Lesson (\d+): (.*)", v["title"])
    lesson = int(m.group(1)) if m else None
    if vid == "exam":
        pages[vid] = {"title": v["title"], "html": render_exam(v), "toc": []}
        continue
    toc, parts = [], []
    for sub in v["subs"]:
        sid, t, h = render_sub(sub, lesson, vid)
        if t:
            toc.append((sid, t))
        parts.append(h)
    pages[vid] = {"title": v["title"], "html": "".join(parts), "toc": toc, "lesson": lesson, "short": m.group(2) if m else v["title"]}
    if m:
        big = text_of(v["subs"][0]["blocks"][0]).replace("Big idea. ", "")
        meta.append({"id": vid, "n": lesson, "title": m.group(2), "big": mathify(html.escape(big, quote=False))})

# Anything the placement tables promised must have landed.
missing = [k for k in AFTER if k not in placed]
assert not missing, f"not placed: {missing}"
assert len(reworded) == len(REWORDS), f"rewords unused: {set(REWORDS) - reworded}"

# ----------------------------------------------------------------- flashcards
CARD_SOURCES = {
    1: ["Definitions to state exactly", "The two observations every proof uses"],
    2: ["Properties you can use as shortcuts"],
    3: ["Vocabulary to state exactly"],
    4: ["Adjacency lists"],
    5: ["DAGs and topological order"],
    7: ["Two facts used in the proof"],
    9: ["Union-find"],
}
cards = []
BOLD = re.compile(r"^<strong>([^<]+?):?</strong>:?\s*(.+)$", re.S)


def add_card(front, back, lesson):
    cards.append({"f": front, "b": back, "l": lesson})


for v in views:
    m = re.match(r"Lesson (\d+)", v["title"])
    if not m:
        continue
    n = int(m.group(1))
    for sub in v["subs"]:
        if not sub["title"] or not any(sub["title"].startswith(p) for p in CARD_SOURCES.get(n, [])):
            continue
        for b in sub["blocks"]:
            texts = []
            if b.tag == "list":
                texts = [" ".join(inline(c, link=False) for c in li if c.tag == "paragraph") for li in b]
            elif b.tag == "paragraph" and text_of(b).startswith(("Handshake", "Theorem")):
                texts = [inline(b, link=False)]
            for t in texts:
                mm = BOLD.match(t)
                if mm and mm.group(1).endswith(":") is False:
                    add_card("Theorem on DAGs" if mm.group(1).startswith("Theorem") else mm.group(1).rstrip(":"), mm.group(2), n)
        if n == 1 and sub["title"].startswith("Definitions"):
            pass

for v in views:
    if v["title"].startswith("Lesson 2"):
        t = next(b for s in v["subs"] if s["title"] == "The three definitions" for b in s["blocks"] if b.tag == "table")
        for r in list(t)[1:]:
            c = [cell_html(x) for x in r]
            add_card(c[0], f"{c[1]}. {c[2]}", 2)
    if v["title"].startswith("Lesson 9"):
        add_card("Cut property", "If e is the cheapest edge crossing some cut, then e is in every MST.", 9)
    if v["title"].startswith("Proof technique"):
        for s in v["subs"]:
            for b in s["blocks"]:
                if b.tag != "table":
                    continue
                rows = list(b)
                head = [text_of(c) for c in rows[0]]
                for r in rows[1:]:
                    c = [cell_html(x) for x in r]
                    if head[0] == "Pattern":
                        add_card(f"Proof pattern: {c[0]}", f"Use it when {c[1]}. {c[2]}. Seen in: {c[3]}.", None)
                    else:
                        add_card(f"Running time: {c[0]}", f"{c[1]}, using {c[2]}.", None)
cards.sort(key=lambda c: (c["l"] is None, c["l"] or 0))

# ------------------------------------------------------------------- assemble
nav_lessons = "".join(
    f'<a class="nav__item" href="#{m["id"]}" data-view="{m["id"]}"><span class="nav__n">{m["n"]}</span>'
    f'<span class="nav__t">{html.escape(m["title"], quote=False)}</span><span class="nav__bar"><i></i></span></a>'
    for m in meta
)


def view_html(vid):
    p = pages[vid]
    title = re.sub(r"^Lesson \d+: ", "", p["title"])
    eyebrow = f'Lesson {p["lesson"]} of 10' if p.get("lesson") else {"math": "Background", "cheat": "Reference", "exam": "12 problems · about 2 hours"}.get(vid, "")
    toc = ""
    if p["toc"]:
        toc = '<nav class="rail" aria-label="On this page"><div class="rail__label">On this page</div>' + "".join(
            f'<a href="#{vid}" data-scroll="{sid}" class="{"rail__q" if t.startswith(("Check yourself", "Reps", "Practice")) else ""}">{mathify(html.escape(re.sub(r" \([^()]*\)$", "", t), quote=False))}</a>' for sid, t in p["toc"]
        ) + "</nav>"
    order = ["start", "math"] + [m["id"] for m in meta] + ["cheat", "exam"]
    i = order.index(vid)
    prev_v = order[i - 1] if i > 0 else None
    next_v = order[i + 1] if i + 1 < len(order) else None

    def label(x):
        if x == "start":
            return "Home"
        return re.sub(r" \([^()]*\)$", "", pages[x]["title"])

    pager = '<div class="pager">'
    pager += f'<a href="#{prev_v}" class="pager__a"><span>Previous</span>{html.escape(label(prev_v), quote=False)}</a>' if prev_v else "<i></i>"
    pager += f'<a href="#{next_v}" class="pager__a pager__a--next"><span>Next</span>{html.escape(label(next_v), quote=False)}</a>' if next_v else "<i></i>"
    pager += "</div>"
    prog = f'<div class="lessonprog" data-progress="{vid}"></div>' if p.get("lesson") and vid != "lesson-10x" else ""
    return (
        f'<section class="view" data-view="{vid}" hidden><div class="view__grid"><div class="view__main">'
        f'<header class="view__head"><div class="eyebrow">{eyebrow}</div><h1>{html.escape(title, quote=False)}</h1>{prog}</header>'
        f'{p["html"]}{pager}</div>{toc}</div></section>'
    )


how = pages["how"]["html"]
views_html = "".join(view_html(v) for v in ["math"] + [m["id"] for m in meta] + ["cheat", "exam"])

css = (HERE / "src/style.css").read_text()
js = "\n".join((HERE / f"src/{n}.js").read_text() for n in ["core", "widgets", "app"])
data = json.dumps({"lessons": meta, "cards": cards}, ensure_ascii=False).replace("</", "<\\/")

page = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>CS 311 Midterm 1 Learning Guide</title>
<style>{css}</style></head>
<body>
<header class="topbar"><button id="menu" class="btn btn--quiet" type="button" aria-expanded="false" aria-controls="nav">Menu</button><a href="#start" class="topbar__t">CS 311 Midterm 1</a></header>
<div class="shell">
<aside class="nav" id="nav" aria-label="Guide">
  <a class="nav__back" href="../">&larr; All visuals</a>
  <a class="nav__brand" href="#start"><span>CS 311</span> Midterm 1 Learning Guide</a>
  <label class="search"><span class="vh">Search the guide</span><input id="search" type="search" placeholder="Search the guide" autocomplete="off"></label>
  <div id="search-out" class="search__out" hidden></div>
  <div class="nav__group">
    <a class="nav__item nav__item--plain" href="#start" data-view="start">Home</a>
    <a class="nav__item nav__item--plain" href="#math" data-view="math">Math toolkit</a>
  </div>
  <div class="nav__label">Lessons</div>
  <div class="nav__group">{nav_lessons}</div>
  <div class="nav__label">Test yourself</div>
  <div class="nav__group">
    <a class="nav__item nav__item--plain" href="#cards" data-view="cards">Flashcards</a>
    <a class="nav__item nav__item--plain" href="#review" data-view="review">Review queue <b id="review-count" class="count" hidden></b></a>
    <a class="nav__item nav__item--plain" href="#cheat" data-view="cheat">Proof cheat sheet</a>
    <a class="nav__item nav__item--plain" href="#exam" data-view="exam">Practice exam</a>
  </div>
</aside>
<main class="main" id="main">
<section class="view" data-view="start" hidden><div class="view__grid"><div class="view__main">
  <header class="view__head home"><div class="eyebrow">Lectures 1 to 10</div><h1>CS 311 Midterm 1 Learning Guide</h1>
  <p class="home__lead">Every lesson from the guide, with the answers hidden until you ask and every example turned into something you can step through.</p>
  <div id="home-resume" class="home__cta"></div></header>
  <div id="home-stats" class="stats"></div>
  <h2 class="home__h">Lessons</h2>
  <div id="home-lessons" class="lessons"></div>
  <h2 class="home__h">How to use this guide</h2>
  {how}
  <aside class="callout"><p><strong>What is different on this page.</strong> Every example has a simulator: press Next to advance, or turn on Quiz me to predict each step before you see it. Mark each question Got it or Review later, and the ones you flag collect in the <a href="#review">Review queue</a>. Your progress and exam answers stay in this browser.</p></aside>
</div></div></section>
{views_html}
<section class="view" data-view="cards" hidden><div class="view__grid"><div class="view__main"><header class="view__head"><div class="eyebrow">State them exactly</div><h1>Flashcards</h1></header><div id="cards-root"></div></div></div></section>
<section class="view" data-view="review" hidden><div class="view__grid"><div class="view__main"><header class="view__head"><div class="eyebrow">What you flagged</div><h1>Review queue</h1></header><div id="review-root"></div></div></div></section>
</main></div>
<script type="application/json" id="guide-data">{data}</script>
<script>{js}</script>
</body></html>
"""
(HERE / "dist").mkdir(exist_ok=True)
(HERE / "dist" / "index.html").write_text(page)
print(f"questions {len(all_questions)}, cards {len(cards)}, lessons {len(meta)}, size {len(page) // 1024} KB")
for leftover in ("&lt;=", "&gt;=", " Theta(", " Omega("):
    if leftover in page:
        print("leftover", leftover, page.count(leftover))
