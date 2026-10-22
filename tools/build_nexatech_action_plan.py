from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "deliverables" / "Nexatech Product and Commercial Action Plan.docx"

NAVY = "18324A"
BLUE = "2D6A8A"
PALE_BLUE = "EAF3F7"
PALE_GREEN = "EBF5F0"
LIGHT_GRAY = "F4F6F7"
BORDER = "D7DEE3"
TEXT = "17212B"
MUTED = "5B6772"


def set_font(run, name="Aptos", size=None, bold=None, color=None, italic=None):
    run.font.name = name
    rpr = run._element.get_or_add_rPr()
    rpr.rFonts.set(qn("w:ascii"), name)
    rpr.rFonts.set(qn("w:hAnsi"), name)
    if size is not None:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if color is not None:
        run.font.color.rgb = RGBColor.from_string(color)


def spacing(paragraph, before=0, after=6, line=1.1):
    fmt = paragraph.paragraph_format
    fmt.space_before = Pt(before)
    fmt.space_after = Pt(after)
    fmt.line_spacing = line


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def margins(cell, top=105, start=120, bottom=105, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def borders(table):
    tbl_pr = table._tbl.tblPr
    value = tbl_pr.first_child_found_in("w:tblBorders")
    if value is None:
        value = OxmlElement("w:tblBorders")
        tbl_pr.append(value)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        node = value.find(qn(f"w:{edge}"))
        if node is None:
            node = OxmlElement(f"w:{edge}")
            value.append(node)
        node.set(qn("w:val"), "single")
        node.set(qn("w:sz"), "6")
        node.set(qn("w:space"), "0")
        node.set(qn("w:color"), BORDER)


def repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    marker = OxmlElement("w:tblHeader")
    marker.set(qn("w:val"), "true")
    tr_pr.append(marker)


def style_cell(cell, bold=False, color=TEXT, align=WD_ALIGN_PARAGRAPH.LEFT, size=9.2):
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    margins(cell)
    for p in cell.paragraphs:
        p.alignment = align
        spacing(p, after=0, line=1.05)
        for run in p.runs:
            set_font(run, size=size, bold=bold, color=color)


def add_table(doc, headers, rows, widths, highlight_last=False):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    borders(table)
    header = table.rows[0]
    repeat_header(header)
    for i, label in enumerate(headers):
        cell = header.cells[i]
        cell.width = Inches(widths[i])
        cell.text = label
        shade(cell, NAVY)
        style_cell(cell, bold=True, color="FFFFFF", size=8.8)
    for row_i, values in enumerate(rows):
        row = table.add_row()
        for i, value in enumerate(values):
            cell = row.cells[i]
            cell.width = Inches(widths[i])
            cell.text = str(value)
            if row_i % 2:
                shade(cell, LIGHT_GRAY)
            style_cell(cell)
    if highlight_last and len(table.rows) > 1:
        for cell in table.rows[-1].cells:
            shade(cell, PALE_BLUE)
            style_cell(cell, bold=True)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_bullet(doc, text, level=0, checked=None):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    p = doc.add_paragraph(style=style)
    prefix = "☐ " if checked is False else ""
    run = p.add_run(prefix + text)
    set_font(run, size=10.2, color=TEXT)
    spacing(p, after=3, line=1.08)
    return p


def add_number(doc, text):
    p = doc.add_paragraph(style="List Number")
    run = p.add_run(text)
    set_font(run, size=10.2, color=TEXT)
    spacing(p, after=4, line=1.1)
    return p


def add_body(doc, text, bold_prefix=None, after=7):
    p = doc.add_paragraph()
    spacing(p, after=after, line=1.12)
    if bold_prefix and text.startswith(bold_prefix):
        lead = p.add_run(bold_prefix)
        set_font(lead, size=10.4, bold=True, color=TEXT)
        rest = p.add_run(text[len(bold_prefix):])
        set_font(rest, size=10.4, color=TEXT)
    else:
        run = p.add_run(text)
        set_font(run, size=10.4, color=TEXT)
    return p


doc = Document()
section = doc.sections[0]
section.page_width = Inches(8.5)
section.page_height = Inches(11)
section.top_margin = Inches(0.65)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.75)
section.right_margin = Inches(0.75)

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Aptos"
normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
normal.font.size = Pt(10.4)
normal.font.color.rgb = RGBColor.from_string(TEXT)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.1

title_style = styles["Title"]
title_style.font.name = "Aptos Display"
title_style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
title_style.font.size = Pt(25)
title_style.font.bold = True
title_style.font.color.rgb = RGBColor(0, 0, 0)
title_style.paragraph_format.space_after = Pt(8)
title_style._element.get_or_add_pPr().remove(title_style._element.get_or_add_pPr().find(qn("w:pBdr"))) if title_style._element.get_or_add_pPr().find(qn("w:pBdr")) is not None else None

for style_name, size, before, after in (("Heading 1", 16, 14, 7), ("Heading 2", 12.5, 10, 5)):
    style = styles[style_name]
    style.font.name = "Aptos Display"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.space_before = Pt(before)
    style.paragraph_format.space_after = Pt(after)
    style.paragraph_format.keep_with_next = True

header = section.header.paragraphs[0]
header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
set_font(header.add_run("NEXATECH"), size=8, bold=True, color=MUTED)
footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
set_font(footer.add_run("Product and Commercial Action Plan  |  21 October 2026"), size=8, color=MUTED)

doc.add_paragraph("Nexatech Product and Commercial Action Plan", style="Title")
subtitle = doc.add_paragraph()
spacing(subtitle, after=12)
set_font(subtitle.add_run("A practical roadmap for positioning, product engineering, infrastructure, and pricing"), size=12, bold=True, color=BLUE)

add_body(doc,
    "Nexatech should be presented and sold as a school operations platform. Its job is to make routine school processes faster, clearer, and more reliable: capturing information once, storing it safely, and making it available to the right person when needed. The immediate flagship workflow should be marks capture and retrieval because it has an obvious user benefit, can be measured, and proves the wider platform model."
)
add_body(doc,
    "The current system already covers student records, academics, attendance, behaviour, finance, timetables, communications, examinations, report cards, and a parent portal. The next phase is not simply to add more screens. It is to make the shared data model, workflows, infrastructure, and commercial offer feel like one coherent product."
)

doc.add_heading("The Decision", level=1)
add_body(doc, "Use this market-facing name: Nexatech School Operations Platform.", "Use this market-facing name:")
add_body(doc, "Use this short explanation: Nexatech helps schools capture records faster, run connected workflows, and retrieve trusted information when it is needed.", "Use this short explanation:")
add_body(doc, "Stop leading with student monitoring. That language suggests surveillance and narrows the value of the product. Monitoring may describe a report or permissioned oversight function, but it should not define the platform.", "Stop leading with student monitoring.")

doc.add_heading("What Nexatech Is Selling", level=1)
add_table(doc,
    ["Product layer", "Customer outcome", "Commercial treatment"],
    [
        ("Platform foundation", "Secure school workspace, users, roles, audit trail, backups, and support", "Monthly subscription"),
        ("Workflow modules", "Marks, attendance, finance, timetables, communication, and related processes", "Included by plan or sold as add-ons"),
        ("Managed infrastructure", "Hosting, database, Redis, backups, monitoring, and domain configuration", "Included allowance plus upgrades"),
        ("External usage", "SMS, email, payment services, and third-party API calls", "Allowance plus usage charges or pass-through"),
        ("Implementation", "Configuration, imports, training, and go-live support", "One-time setup fee"),
    ],
    [1.55, 3.55, 2.15]
)

doc.add_heading("Product Engineering Priorities", level=1)
add_body(doc, "The product should be engineered around shared workflows rather than independent modules. Every module should use the same school, academic year, term, class, subject, user, and student definitions. A change in one authoritative record should flow safely to every module that depends on it.")

doc.add_heading("1 Rebuild the Data Intake Engine", level=2)
add_body(doc, "Treat data entry as a reusable platform capability, not a separate form on every page. The intake engine should support both day-to-day entry and controlled bulk onboarding.")
for item in [
    "Create reusable input schemas for students, staff, classes, subjects, assessments, marks, attendance, fees, and transactions.",
    "Support CSV and spreadsheet import with downloadable templates, column mapping, preview, validation, and clear row-level errors.",
    "Stage imports before committing them. Show valid rows, rejected rows, duplicates, and changes to existing records.",
    "Use stable identifiers and idempotency keys so retries do not create duplicate students, marks, invoices, or payments.",
    "Allow a controlled undo or rollback for imports, backed by an audit record of who imported what and when.",
    "Save drafts and recover interrupted work. Never make a user re-enter a full sheet after a connection failure.",
    "Use the same server-side validation rules for the web interface, bulk imports, and future public APIs.",
]:
    add_bullet(doc, item)

doc.add_heading("2 Make Marks the Flagship Workflow", level=2)
add_body(doc, "Package this capability as Fast Marks. The promise is simple: a teacher can enter or paste marks quickly, the school can trust the stored result, and authorized users can retrieve or export it without waiting for someone to rebuild a spreadsheet.")
add_table(doc,
    ["Workflow stage", "Required behaviour", "Acceptance measure"],
    [
        ("Prepare", "Select year, term, class, subject, assessment, and maximum mark from controlled lists", "Correct roster loads in under 2 seconds under normal load"),
        ("Capture", "Keyboard-first grid, paste from spreadsheet, inline validation, and clear missing-mark states", "A 40-learner class can be entered in under 5 minutes"),
        ("Save", "Debounced autosave plus explicit Save All, idempotent bulk writes, and visible save status", "No duplicates after retry; no silent data loss"),
        ("Review", "Draft, submitted, approved, published, and locked states with role-based actions", "Every status change is attributable and timestamped"),
        ("Retrieve", "Fast class, learner, subject, term, and assessment views with export", "Common results views respond in under 2 seconds"),
        ("Recover", "Audit history, backup, restore procedure, and export owned by the school", "Quarterly restore test succeeds"),
    ],
    [1.15, 4.15, 2.0]
)

doc.add_heading("3 Make Module Logic Consistent", level=2)
for item in [
    "Use an academic calendar as the common backbone for years, terms, teaching periods, examination sessions, and reporting windows.",
    "Use one authoritative class roster. Attendance, marks, fees, behaviour, timetables, and parent views should reference it rather than recreate it.",
    "Define a consistent lifecycle for records: draft, active, archived, restored, and locked where appropriate.",
    "Centralize permissions by role and action. A user should not gain broader data access merely by switching modules.",
    "Standardize search, filters, empty states, validation messages, success messages, deletion, restore, and export behaviour.",
    "Document cross-module events such as enrolment, class transfer, withdrawal, assessment publication, payment, and term closure.",
]:
    add_bullet(doc, item)

doc.add_heading("Data and Reliability Design", level=1)
add_body(doc, "The database should remain the source of truth, but users should not feel its weight. Performance comes from good indexes, bounded queries, caching of safe summaries, background jobs, and disciplined retention—not from copying records into disconnected files.")

add_table(doc,
    ["Control", "Implementation direction", "Reason"],
    [
        ("Tenant isolation", "Require school scope on every school-owned record and every query", "Prevents one school from seeing another school's data"),
        ("Indexes", "Index school, class, student, subject, assessment, term, year, status, and common composite filters", "Keeps marks and reports fast as records grow"),
        ("Uniqueness", "Enforce one mark per student and assessment and other business keys at database level", "Makes retries safe and prevents conflicting records"),
        ("Pagination", "Paginate large registers, logs, deliveries, and transactions", "Avoids loading entire datasets into memory"),
        ("Background work", "Queue reports, messages, imports, and heavy exports", "Keeps the web experience responsive"),
        ("Caching", "Cache dashboards and reference lists; invalidate after relevant writes", "Reduces repeated aggregate queries"),
        ("Backups", "Daily encrypted snapshots, point-in-time recovery where available, and quarterly restore tests", "A backup is useful only when it can be restored"),
        ("Observability", "Monitor uptime, slow queries, database connections, queue failures, storage, and backup status", "Finds pressure before users report failure"),
        ("Retention", "Apply written retention rules and controlled deletion/export workflows", "Limits risk and uncontrolled growth"),
    ],
    [1.25, 3.95, 2.1]
)

doc.add_heading("Hosting Domain API and Database Work", level=1)
add_table(doc,
    ["Area", "Do now", "Definition of done"],
    [
        ("Domain", "Choose a final product domain, configure DNS and HTTPS, and use domain-based email", "Production URL, sender records, redirects, and renewal owner are documented"),
        ("Hosting", "Keep separate web, worker, and scheduler services with Redis-backed queues", "Health checks, logs, alerts, scaling limits, and rollback are tested"),
        ("Database", "Use managed MySQL or PostgreSQL with encryption, backups, connection limits, and restore drills", "Restore evidence exists and common queries meet response targets"),
        ("API", "Version endpoints, document authentication and permissions, rate-limit keys, rotate secrets, and log use", "No key is embedded in the frontend or committed to source"),
        ("Secrets", "Store application, mail, SMS, payment, and partner secrets in the host secret manager", "Production checks fail closed when required values are missing"),
    ],
    [1.05, 4.1, 2.15]
)

doc.add_heading("API Key Commercial Rules", level=2)
for item in [
    "Nexatech-owned infrastructure keys are never sold or exposed. Their cost is recovered through the subscription and usage charges.",
    "A school may supply its own SMS, email, or payment-provider account when it needs direct ownership and billing.",
    "Customer API access uses a unique key per integration, least-privilege scopes, rate limits, expiration or rotation, and revocation.",
    "Never charge for the secret itself. Charge for API access, managed integration, support, and measurable usage.",
]:
    add_bullet(doc, item)

doc.add_heading("Recommended Pricing Strategy", level=1)
add_body(doc, "Use simple subscription tiers with clear limits. Do not present hosting, database, or API keys as random technical line items to ordinary school buyers. Show them as managed service components included in the plan. Use separate line items only for dedicated infrastructure, high usage, or custom integrations.")

add_table(doc,
    ["Plan", "Best for", "Monthly price", "Included scope"],
    [
        ("Foundation", "Small school starting with core records", "US$99", "Up to 250 active learners; shared hosting and database; backups; users and roles; student register; basic support"),
        ("Academic", "School prioritizing marks and reports", "US$179", "Up to 500 active learners; Foundation plus Fast Marks, assessments, results, report cards, attendance, and standard exports"),
        ("Operations", "School replacing multiple disconnected tools", "US$299", "Up to 1,000 active learners; Academic plus finance, timetable, communication, behaviour, parent portal, and priority support"),
        ("Custom", "Large, multi-campus, or integration-heavy customer", "Quoted", "Dedicated resources, custom limits, service commitments, migrations, and integrations"),
    ],
    [1.05, 1.75, 1.0, 3.5]
)

doc.add_heading("One Time and Usage Charges", level=2)
add_table(doc,
    ["Charge", "Recommended price", "What it covers"],
    [
        ("Standard onboarding", "US$350 once", "School setup, configuration, one clean import, administrator training, and go-live support"),
        ("Complex migration", "From US$750 once", "Cleaning or mapping inconsistent historical data and multiple import cycles"),
        ("Additional training", "US$25 per hour", "Remote role-based training beyond the included session"),
        ("Public API access", "US$49 per month", "One documented integration, scoped credentials, standard rate limit, logs, and rotation support"),
        ("Custom integration", "From US$300 once", "Provider-specific mapping, testing, and deployment; ongoing provider fees remain separate"),
        ("Dedicated database", "From US$75 per month", "Dedicated managed database resources; final price follows provider capacity"),
        ("SMS email and payments", "Allowance then pass-through", "Publish unit rates or pass through provider cost with an agreed service margin"),
    ],
    [1.75, 1.4, 3.9]
)

add_body(doc, "Pricing guardrail: the current internal operating baseline is approximately US$60.40 per month for one school at the defined launch scope. Treat that as a cost floor, not a selling price. Review actual infrastructure usage monthly and revise allowances before adding schools.", "Pricing guardrail:")
add_body(doc, "Commercial test: begin with three to five pilot schools. Record onboarding hours, support hours, database growth, message usage, and willingness to pay. Keep the recommended prices for the pilot unless real cost or sales evidence shows that a change is needed.", "Commercial test:")

doc.add_heading("How to Sell Fast Marks", level=1)
add_body(doc, "Lead with a workflow and a result, not a feature list. The buyer should understand what changes in the working day.")
add_table(doc,
    ["Sales question", "Nexatech answer"],
    [
        ("What problem does it solve", "Teachers lose time moving between paper, spreadsheets, messaging, and separate report files."),
        ("What changes", "A teacher loads the correct roster, enters or pastes marks, resolves visible errors, and saves once."),
        ("What does management gain", "Authorized staff can retrieve class and learner results immediately, with status and audit history."),
        ("Why is it safer", "Tenant isolation, roles, validation, audit logs, backups, and controlled publication protect the record."),
        ("How is success measured", "Entry time, retrieval time, correction rate, save failures, support requests, and restore results."),
    ],
    [2.0, 5.05]
)

doc.add_heading("Ninety Day Execution Plan", level=1)
add_table(doc,
    ["Period", "Primary objective", "Deliverables"],
    [
        ("Days 1 to 14", "Position and stabilize", "Approve name and message; replace Student Monitor wording; map modules and shared entities; define Fast Marks states; confirm production costs; create issue backlog"),
        ("Days 15 to 35", "Fix the intake foundation", "Reusable validation service; import templates; preview and error report; idempotency; audit trail; draft recovery; core indexes and query measurements"),
        ("Days 36 to 60", "Ship Fast Marks", "Keyboard grid; spreadsheet paste; safe bulk save; workflow states; retrieval and export; permissions; performance and failure tests"),
        ("Days 61 to 75", "Harden operations", "Monitoring; backups and restore drill; rate limits; key rotation; queue failure process; retention checks; domain and email configuration"),
        ("Days 76 to 90", "Pilot and price", "Onboard one to three pilot schools; train users; measure outcomes and costs; resolve highest-impact failures; issue first formal quote"),
    ],
    [1.05, 1.55, 4.45]
)

doc.add_heading("Immediate Checklist", level=1)
for item in [
    "Approve Nexatech School Operations Platform as the working product name.",
    "Replace Student Monitor in the README, application name, deployment documentation, page titles, emails, and sales material.",
    "Write a one-page product definition and freeze the first commercial scope.",
    "Create the shared entity and module-dependency map.",
    "Turn Fast Marks requirements and acceptance measures into engineering tickets.",
    "Measure current marks load, save, and retrieval response times before changing the implementation.",
    "Design the staged import workflow and standard spreadsheet templates.",
    "Audit database indexes, unique constraints, tenant filters, and largest queries.",
    "Verify domain, HTTPS, SMTP, SMS, payment, backups, monitoring, and restore procedures before real onboarding.",
    "Create a quote template showing subscription, onboarding, usage allowances, and optional services.",
    "Choose pilot schools and define what data may be imported, who approves it, and how support will work.",
    "Review pilot results after 30 days and change priorities using evidence from actual usage.",
]:
    add_bullet(doc, item, checked=False)

doc.add_heading("Operating Metrics", level=1)
add_table(doc,
    ["Category", "Metric", "Initial target"],
    [
        ("Speed", "Marks grid and common result views", "Under 2 seconds under normal load"),
        ("Efficiency", "Enter a 40-learner assessment", "Under 5 minutes"),
        ("Reliability", "Acknowledged writes without silent loss", "99.9 percent or better"),
        ("Data quality", "Rows rejected with actionable reasons", "100 percent"),
        ("Recovery", "Scheduled restore drill", "Quarterly success"),
        ("Adoption", "Active teachers using Fast Marks", "At least 70 percent in pilot month"),
        ("Commercial", "Monthly recurring revenue against direct service cost", "At least 65 percent gross margin after pilot"),
    ],
    [1.25, 3.75, 2.05]
)

doc.add_heading("Final Product Statement", level=1)
add_body(doc, "Nexatech is a school operations platform that turns repetitive administrative work into connected, reliable workflows. It helps staff capture information once, find it quickly, and use it safely across academics, finance, communication, scheduling, and family services.")

doc.add_heading("Planning Assumptions", level=1)
add_body(doc, "The prices in this plan are recommended starting points in US dollars, not final quotes. They assume the current one-school production design and the internal baseline budget dated 21 October 2026. Taxes, payment-provider charges, unusual migration work, dedicated infrastructure, and customer-specific legal requirements should be quoted separately. Review pricing after the pilot using actual cost and support data.")

doc.core_properties.title = "Nexatech Product and Commercial Action Plan"
doc.core_properties.subject = "Product positioning, engineering roadmap, infrastructure, and pricing"
doc.core_properties.author = "NEXATECH"
doc.core_properties.keywords = "Nexatech, school operations, marks, data intake, pricing, hosting, database, API"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUTPUT)
print(OUTPUT)
