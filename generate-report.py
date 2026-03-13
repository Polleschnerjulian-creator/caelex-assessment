#!/usr/bin/env python3
"""
CAELEX Platform Report Generator
Generates a professional PDF report for COO/Co-Founder onboarding.
"""

import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, Frame, PageTemplate, BaseDocTemplate,
    NextPageTemplate
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas

# ── Colors ──────────────────────────────────────────────────
ORANGE = HexColor("#E85D3A")
DARK = HexColor("#1A1A1A")
TEXT = HexColor("#333333")
SUBTLE = HexColor("#6B7280")
BG_ACCENT = HexColor("#F8F9FA")
WHITE = HexColor("#FFFFFF")
LIGHT_ORANGE = HexColor("#FFF5F2")
BORDER_LIGHT = HexColor("#E5E7EB")
GREEN = HexColor("#10B981")
AMBER = HexColor("#F59E0B")
RED = HexColor("#EF4444")

PAGE_W, PAGE_H = A4
MARGIN_L = 60
MARGIN_R = 60
MARGIN_T = 50
MARGIN_B = 50
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R

# ── Styles ──────────────────────────────────────────────────
styles = getSampleStyleSheet()

def make_style(name, parent='Normal', **kw):
    base = styles[parent] if parent in styles else styles['Normal']
    return ParagraphStyle(name, parent=base, **kw)

S_BODY = make_style('SBody', fontName='Helvetica', fontSize=10.5, leading=15,
                     textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=6)
S_BODY_SMALL = make_style('SBodySmall', fontName='Helvetica', fontSize=9, leading=13,
                          textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=4)
S_H1 = make_style('SH1', fontName='Helvetica-Bold', fontSize=22, leading=28,
                   textColor=DARK, spaceBefore=20, spaceAfter=6)
S_H2 = make_style('SH2', fontName='Helvetica-Bold', fontSize=16, leading=22,
                   textColor=DARK, spaceBefore=16, spaceAfter=6)
S_H3 = make_style('SH3', fontName='Helvetica-Bold', fontSize=13, leading=18,
                   textColor=DARK, spaceBefore=12, spaceAfter=4)
S_H4 = make_style('SH4', fontName='Helvetica-Bold', fontSize=11, leading=15,
                   textColor=DARK, spaceBefore=8, spaceAfter=3)
S_METRIC = make_style('SMetric', fontName='Courier-Bold', fontSize=11, leading=14,
                       textColor=DARK)
S_METRIC_LARGE = make_style('SMetricLarge', fontName='Courier-Bold', fontSize=24, leading=30,
                             textColor=ORANGE, alignment=TA_CENTER)
S_METRIC_LABEL = make_style('SMetricLabel', fontName='Helvetica', fontSize=8, leading=11,
                             textColor=SUBTLE, alignment=TA_CENTER, spaceAfter=2)
S_CAPTION = make_style('SCaption', fontName='Helvetica', fontSize=8, leading=10,
                        textColor=SUBTLE, alignment=TA_CENTER, spaceAfter=4)
S_BULLET = make_style('SBullet', fontName='Helvetica', fontSize=10.5, leading=15,
                       textColor=TEXT, leftIndent=20, bulletIndent=8,
                       spaceBefore=2, spaceAfter=2)
S_COVER_TITLE = make_style('SCoverTitle', fontName='Helvetica-Bold', fontSize=48,
                            leading=56, textColor=ORANGE, alignment=TA_CENTER)
S_COVER_SUB = make_style('SCoverSub', fontName='Helvetica', fontSize=16,
                          leading=22, textColor=SUBTLE, alignment=TA_CENTER)
S_COVER_LINE = make_style('SCoverLine', fontName='Helvetica', fontSize=12,
                           leading=16, textColor=TEXT, alignment=TA_CENTER)
S_TOC = make_style('STOC', fontName='Helvetica', fontSize=11, leading=16,
                    textColor=TEXT, leftIndent=0, spaceAfter=4)
S_TOC_SUB = make_style('STOCSub', fontName='Helvetica', fontSize=10, leading=14,
                        textColor=SUBTLE, leftIndent=20, spaceAfter=2)
S_VALUE_HEADER = make_style('SValueHeader', fontName='Helvetica-Bold', fontSize=10,
                             leading=14, textColor=ORANGE)
S_VALUE_BODY = make_style('SValueBody', fontName='Helvetica', fontSize=9.5,
                           leading=14, textColor=TEXT, spaceAfter=3)

# ── Helper Functions ────────────────────────────────────────

def orange_line():
    return HRFlowable(width="100%", thickness=2, color=ORANGE, spaceAfter=8, spaceBefore=4)

def thin_line():
    return HRFlowable(width="100%", thickness=0.5, color=BORDER_LIGHT, spaceAfter=6, spaceBefore=6)

def section_header(text, number=None):
    """Section header with orange underline"""
    elements = []
    if number:
        elements.append(Paragraph(f"{number}. {text}", S_H1))
    else:
        elements.append(Paragraph(text, S_H1))
    elements.append(orange_line())
    return elements

def sub_header(text):
    return Paragraph(text, S_H2)

def sub_sub_header(text):
    return Paragraph(text, S_H3)

def body(text):
    return Paragraph(text, S_BODY)

def body_small(text):
    return Paragraph(text, S_BODY_SMALL)

def bullet(text):
    return Paragraph(f"<bullet>&bull;</bullet> {text}", S_BULLET)

def spacer(h=8):
    return Spacer(1, h)

def metric_box(metrics):
    """Create a row of metric boxes: [(value, label), ...]"""
    cells_top = []
    cells_bot = []
    for val, label in metrics:
        cells_top.append(Paragraph(str(val), S_METRIC_LARGE))
        cells_bot.append(Paragraph(label, S_METRIC_LABEL))

    n = len(metrics)
    col_w = CONTENT_W / n

    t = Table([cells_top, cells_bot], colWidths=[col_w]*n, rowHeights=[40, 20])
    t.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BACKGROUND', (0,0), (-1,-1), BG_ACCENT),
        ('LINEBELOW', (0,0), (-1,0), 0, BG_ACCENT),
        ('TOPPADDING', (0,0), (-1,0), 8),
        ('BOTTOMPADDING', (0,1), (-1,1), 6),
    ]))
    # Add left orange bar
    return t

def data_table(headers, rows, col_widths=None):
    """Create a styled data table with alternating rows"""
    header_row = [Paragraph(f"<b>{h}</b>", make_style('th', fontName='Helvetica-Bold',
                  fontSize=9, leading=12, textColor=WHITE)) for h in headers]
    data = [header_row]
    for row in rows:
        data.append([Paragraph(str(c), S_BODY_SMALL) for c in row])

    if col_widths is None:
        col_widths = [CONTENT_W / len(headers)] * len(headers)

    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ('BACKGROUND', (0,0), (-1,0), DARK),
        ('TEXTCOLOR', (0,0), (-1,0), WHITE),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('ALIGN', (0,0), (-1,0), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_LIGHT),
    ]
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_cmds.append(('BACKGROUND', (0,i), (-1,i), BG_ACCENT))
    t.setStyle(TableStyle(style_cmds))
    return t

def value_box(title, items):
    """Orange-accented value proposition box: items = [(stakeholder, text), ...]"""
    inner = []
    inner.append(Paragraph(f"<b>{title}</b>", S_VALUE_HEADER))
    for label, text in items:
        inner.append(Paragraph(f"<b>{label}:</b> {text}", S_VALUE_BODY))

    # Build as a table with left orange bar
    content = []
    for item in inner:
        content.append([item])

    t = Table([[Table(content, colWidths=[CONTENT_W - 12])]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_ORANGE),
        ('LINEBELOW', (0,0), (-1,-1), 0, LIGHT_ORANGE),
        ('LEFTPADDING', (0,0), (0,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    return t

def feature_metrics_row(items):
    """Small metrics row: [(label, value), ...]"""
    cells = [Paragraph(f"<b>{label}:</b> {value}",
             make_style('fm', fontName='Helvetica', fontSize=8.5, leading=11, textColor=SUBTLE))
             for label, value in items]
    n = len(cells)
    t = Table([cells], colWidths=[CONTENT_W/n]*n)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BG_ACCENT),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    return t


# ── Page Templates ──────────────────────────────────────────

def header_footer(canvas_obj, doc):
    """Standard header/footer for content pages"""
    canvas_obj.saveState()
    # Header line
    canvas_obj.setStrokeColor(ORANGE)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(MARGIN_L, PAGE_H - 30, PAGE_W - MARGIN_R, PAGE_H - 30)
    # Header text
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.setFillColor(SUBTLE)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 25, "CAELEX  --  Vertraulich")
    # Footer
    canvas_obj.setFont('Helvetica', 8)
    canvas_obj.setFillColor(SUBTLE)
    canvas_obj.drawCentredString(PAGE_W/2, 25, f"Seite {doc.page}")
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(PAGE_W - MARGIN_R, 25, "Maerz 2026")
    canvas_obj.restoreState()

def cover_page(canvas_obj, doc):
    """Cover page template — no header/footer"""
    pass


# ── Build Document ──────────────────────────────────────────

def build_report():
    output_path = os.path.join(os.path.dirname(__file__), "CAELEX-PLATTFORM-REPORT.pdf")

    doc = BaseDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=MARGIN_L,
        rightMargin=MARGIN_R,
        topMargin=MARGIN_T,
        bottomMargin=MARGIN_B,
        title="CAELEX - Plattform-Uebersicht & Wertanalyse",
        author="Caelex Technologies",
        subject="COO Onboarding Report",
    )

    content_frame = Frame(MARGIN_L, MARGIN_B, CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B,
                          id='content')
    cover_frame = Frame(MARGIN_L, MARGIN_B, CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B,
                        id='cover')

    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[cover_frame], onPage=cover_page),
        PageTemplate(id='content', frames=[content_frame], onPage=header_footer),
    ])

    story = []

    # ════════════════════════════════════════════════════════
    # COVER PAGE
    # ════════════════════════════════════════════════════════
    story.append(Spacer(1, 120))
    story.append(Paragraph("CAELEX", S_COVER_TITLE))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Space Regulatory Compliance Platform", S_COVER_SUB))
    story.append(Spacer(1, 40))
    story.append(HRFlowable(width="40%", thickness=1.5, color=ORANGE, spaceAfter=40))
    story.append(Paragraph("Plattform-Uebersicht &amp; Wertanalyse", S_COVER_LINE))
    story.append(Spacer(1, 16))
    story.append(Paragraph("Vertraulich -- Nur fuer Fuehrungskreis", make_style('conf',
                 fontName='Helvetica', fontSize=10, textColor=SUBTLE, alignment=TA_CENTER)))
    story.append(Spacer(1, 12))
    story.append(Paragraph("Maerz 2026", make_style('date',
                 fontName='Helvetica', fontSize=11, textColor=TEXT, alignment=TA_CENTER)))
    story.append(Spacer(1, 160))
    story.append(Paragraph("caelex.eu", make_style('url',
                 fontName='Helvetica', fontSize=10, textColor=ORANGE, alignment=TA_CENTER)))

    story.append(NextPageTemplate('content'))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ════════════════════════════════════════════════════════
    story.extend(section_header("INHALTSVERZEICHNIS"))
    story.append(spacer(8))

    toc_items = [
        ("1", "Executive Summary"),
        ("2", "Markt &amp; Problem"),
        ("3", "Plattform-Architektur"),
        ("4", "Feature-Katalog mit Wertanalyse"),
        ("", "4.1 Compliance Assessment Tool"),
        ("", "4.2 Regulatory Tracker &amp; Checklist"),
        ("", "4.3 Authorization Workflow"),
        ("", "4.4 Ephemeris -- Predictive Compliance Engine"),
        ("", "4.5 Caelex Shield (Conjunction Assessment)"),
        ("", "4.6 Verity (Kryptographische Attestierung)"),
        ("", "4.7 Sentinel (Tamper-Evident Telemetrie)"),
        ("", "4.8 ASTRA (AI Compliance Copilot)"),
        ("", "4.9 Environmental Footprint &amp; Debris Mitigation"),
        ("", "4.10 Cybersecurity Suite (NIS2)"),
        ("", "4.11 Generate 2.0 (Dokumentengenerierung)"),
        ("", "4.12 Audit Center &amp; Compliance-Nachweis"),
        ("", "4.13 Assure (Investor Due Diligence)"),
        ("", "4.14 Academy (Schulungsplattform)"),
        ("", "4.15 Weitere Module"),
        ("5", "Regulatorische Abdeckung"),
        ("6", "Competitive Moat"),
        ("7", "Technische Metriken"),
        ("8", "Entwicklungs-Roadmap"),
        ("9", "Warum Caelex gewinnt"),
    ]
    for num, title in toc_items:
        if num and num[0].isdigit() and "." not in num:
            story.append(Paragraph(f"<b>{num}.</b>  {title}", S_TOC))
        else:
            story.append(Paragraph(f"{num}  {title}", S_TOC_SUB))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 1. EXECUTIVE SUMMARY
    # ════════════════════════════════════════════════════════
    story.extend(section_header("EXECUTIVE SUMMARY", "1"))
    story.append(spacer(4))

    story.append(body(
        "<b>Caelex</b> ist die erste Software-Plattform, die europaeischen Satellitenbetreibern, "
        "Launch-Providern und Space-Service-Unternehmen eine vollstaendige, automatisierte Compliance-Loesung "
        "fuer den EU Space Act (COM(2025) 335), die NIS2-Richtlinie und 10 nationale Weltraumgesetze bietet."
    ))
    story.append(body(
        "<b>Das Problem:</b> Ab 2030 muessen alle europaeischen Weltraumakteure umfassende regulatorische "
        "Anforderungen erfuellen -- von Debris Mitigation ueber Cybersecurity bis zur Autorisierung. "
        "Heute existiert keine Software-Loesung, die diese Anforderungen integriert abbildet. "
        "Betreiber arbeiten mit Excel-Tabellen, externen Anwaelten und fragmentierten Prozessen."
    ))
    story.append(body(
        "<b>Warum jetzt:</b> Der EU Space Act wurde 2025 verabschiedet mit Enforcement ab 2030. "
        "Das eroeffnet ein 4-Jahres-Fenster, in dem Betreiber Compliance-Infrastruktur aufbauen muessen. "
        "Caelex ist die einzige Plattform, die Orbitalmechanik, regulatorisches Wissen und kryptographische "
        "Beweisfuehrung in einem System vereint."
    ))
    story.append(spacer(12))

    story.append(metric_box([
        ("496K+", "Lines of Code"),
        ("167", "Datenmodelle"),
        ("429", "API-Routen"),
        ("365", "Test-Dateien"),
        ("11", "Jurisdiktionen"),
        ("119", "EU Space Act Art."),
    ]))
    story.append(spacer(4))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 2. MARKT & PROBLEM
    # ════════════════════════════════════════════════════════
    story.extend(section_header("MARKT &amp; PROBLEM", "2"))
    story.append(spacer(4))

    story.append(sub_header("EU Space Act -- Regulatorischer Paradigmenwechsel"))
    story.append(body(
        "Der EU Space Act (Verordnung COM(2025) 335) schafft erstmals einen einheitlichen europaeischen "
        "Rechtsrahmen fuer Weltraumaktivitaeten. Er definiert 119 Artikel ueber 7 Operatortypen -- von "
        "Spacecraft-Betreibern (SCO) ueber Launch Operator (LO) bis zu Tracking &amp; Command Operations (TCO). "
        "Jeder Operatortyp hat spezifische Anforderungen an Autorisierung, Debris Mitigation, Cybersecurity, "
        "Versicherung und laufende Supervision."
    ))
    story.append(body(
        "<b>Zeitlinie:</b> Verabschiedung 2025 | Transition 2026-2029 | Enforcement ab 1. Januar 2030 | "
        "Strafen: Bis zu 10 Mio. EUR oder 2% des globalen Jahresumsatzes (angelehnt an NIS2/DSGVO-Mechanismus)."
    ))
    story.append(spacer(8))

    story.append(sub_header("Marktgroesse &amp; Opportunity"))
    story.append(body(
        "Europa beherbergt 880+ Weltraumunternehmen, die 20-25% des globalen Raumfahrtmarktes "
        "ausmachen (ca. 55 Mrd. EUR). Jedes dieser Unternehmen wird ab 2030 nachweisbare "
        "Compliance benoetigen. Der adressierbare Markt fuer Compliance-Software im europaeischen "
        "Space-Sektor liegt bei 200-500 Mio. EUR jaehrlich (geschaetzt auf Basis von vergleichbaren "
        "Compliance-Maerkten wie DSGVO/OneTrust)."
    ))
    story.append(spacer(8))

    story.append(sub_header("Das Pain"))
    story.append(bullet("Fragmentierte nationale Regulierung (10 verschiedene Weltraumgesetze, bald vereinheitlicht)"))
    story.append(bullet("Kein existierendes Software-Tool, das Orbitalmechanik mit regulatorischen Anforderungen verbindet"))
    story.append(bullet("Manuelle Compliance-Nachweise ueber Excel, PDF-Reports und externe Berater (100K+ EUR/Jahr)"))
    story.append(bullet("Keine standardisierte Methodik fuer Compliance-Scoring ueber Frameworks hinweg"))
    story.append(bullet("NCAs (National Competent Authorities) haben keine digitalen Einreichungs-Workflows"))
    story.append(spacer(8))

    story.append(sub_header("Caelex-Positionierung: OneTrust for Space"))
    story.append(body(
        "So wie OneTrust den DSGVO-Compliance-Markt definiert hat, positioniert sich Caelex als "
        "die Standard-Plattform fuer Weltraum-Regulierung. Der entscheidende Unterschied: Caelex "
        "verbindet regulatorisches Wissen mit physikalischen Modellen (Orbital Decay, Fuel Depletion), "
        "kryptographischer Beweissicherung (Ed25519-Attestierungen) und KI-gestuetzter Analyse (Claude). "
        "Diese Kombination ist einzigartig und nicht trivial nachzubauen."
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 3. PLATTFORM-ARCHITEKTUR
    # ════════════════════════════════════════════════════════
    story.extend(section_header("PLATTFORM-ARCHITEKTUR", "3"))
    story.append(spacer(4))

    story.append(sub_header("Technologie-Stack"))
    story.append(data_table(
        ["Ebene", "Technologie", "Zweck"],
        [
            ["Framework", "Next.js 15 (App Router)", "Full-Stack React mit SSR/SSG"],
            ["Sprache", "TypeScript (Strict Mode)", "Typsicherheit ueber 496K LOC"],
            ["Datenbank", "PostgreSQL (Neon Serverless)", "167 Modelle, 83 Enums, 481 Indizes"],
            ["ORM", "Prisma 5.22", "6.539-Zeilen Schema, Type-Safe Queries"],
            ["Auth", "NextAuth v5", "Google OAuth, SAML/OIDC SSO, MFA, WebAuthn"],
            ["AI", "Anthropic Claude (claude-sonnet-4-6)", "38 regulatorische Tools, Tool-Use Loop"],
            ["Payments", "Stripe", "Subscriptions, Checkout, Webhooks"],
            ["Storage", "Cloudflare R2 / AWS S3", "Dokumente, Reports, Evidence"],
            ["Cache", "Upstash Redis", "25-Tier Rate Limiting, Session Cache"],
            ["Monitoring", "Sentry + Vercel Analytics", "Error Tracking, Performance"],
            ["Email", "Resend + Nodemailer", "Transaktions-E-Mails, 19 Templates"],
            ["3D", "Three.js + React Three Fiber", "Mission Control Globe, Landing Page"],
            ["Satellite", "satellite.js", "SGP4 Orbital Propagation"],
            ["Testing", "Vitest + Playwright + MSW", "Unit, Integration, E2E, API Mocking"],
        ],
        col_widths=[CONTENT_W*0.18, CONTENT_W*0.38, CONTENT_W*0.44]
    ))
    story.append(spacer(12))

    story.append(sub_header("Architektur-Schichtmodell"))
    arch_text = """
    <b>Schicht 1 -- Praesentationsschicht</b> (156 Seiten, 299 Komponenten)<br/>
    Next.js App Router mit Liquid Glass Design System. Dark-Mode-Dashboard mit Glassmorphism, <br/>
    3D-Satellitentracking, ReactFlow-basierter What-If-Simulation.<br/><br/>
    <b>Schicht 2 -- API-Schicht</b> (429 Route Handler, 56 Domaenen)<br/>
    RESTful Endpoints mit Session + API-Key Auth. 25 Rate-Limiting-Tiers.<br/>
    Vercel Cron fuer 22 automatisierte Jobs (04:00-12:00 UTC Pipeline).<br/><br/>
    <b>Schicht 3 -- Business Logic</b> (32 Server-Only Engines, 65 Services)<br/>
    EU Space Act Engine (119 Artikel), NIS2 Engine (51 Requirements), 10 nationale Gesetze,<br/>
    Ephemeris Prediction (5 Physik-Modelle), Verity Krypto-Attestierung, ASTRA AI Copilot.<br/><br/>
    <b>Schicht 4 -- Datenschicht</b> (167 Prisma-Modelle, 83 Enums)<br/>
    Multi-Tenant mit Organisations-Isolation. AES-256-GCM Verschluesselung fuer sensible Felder.<br/>
    SHA-256 Hash-Chain Audit Trail. Ed25519 kryptographische Signaturen.
    """
    story.append(body(arch_text))
    story.append(spacer(8))

    story.append(sub_header("Externe Integrationen"))
    story.append(data_table(
        ["Service", "Typ", "Zweck"],
        [
            ["CelesTrak", "Orbital Data", "TLE-Daten fuer Satelliten-Tracking (taegl. 05:00 UTC)"],
            ["NOAA SWPC", "Space Weather", "Solar Flux F10.7 Index fuer Atmosphere-Modell (taegl. 04:00 UTC)"],
            ["Space-Track", "Conjunction", "CDM-Daten fuer Kollisionsbewertung (alle 30 Min.)"],
            ["Anthropic Claude", "AI", "Compliance-Copilot mit 38 regulatorischen Tools"],
            ["Stripe", "Payments", "Subscription Management, Checkout, Billing Portal"],
            ["Resend", "Email", "Transaktions-E-Mails (Alerts, Reports, Onboarding)"],
            ["Upstash Redis", "Cache", "Distributed Rate Limiting, Session State"],
            ["Cloudflare R2", "Storage", "Dokument-Vault, Evidence-Archiv, Reports"],
        ],
        col_widths=[CONTENT_W*0.20, CONTENT_W*0.18, CONTENT_W*0.62]
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 4. FEATURE-KATALOG
    # ════════════════════════════════════════════════════════
    story.extend(section_header("FEATURE-KATALOG MIT WERTANALYSE", "4"))
    story.append(spacer(4))

    # ── 4.1 Compliance Assessment ──
    story.append(sub_header("4.1 Compliance Assessment Tool"))
    story.append(body(
        "Interaktiver Assessment-Wizard, der Satellitenbetreiber durch einen strukturierten Fragebogen fuehrt, "
        "um ihre regulatorische Landschaft zu kartieren. Der Wizard erkennt automatisch den Operatortyp "
        "(7 Typen: SCO, LO, LSO, ISOS, CAP, PDP, TCO), filtert relevante Artikel, und berechnet ein "
        "gewichtetes Compliance-Scoring ueber alle anwendbaren Frameworks."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>EU Space Act Assessment:</b> 8 Fragen, 119 Artikel, 7 Operatortypen, Standard/Light-Regime"))
    story.append(bullet("<b>NIS2 Assessment:</b> 51 Requirements, Essential/Important-Klassifizierung, Incident-Timeline"))
    story.append(bullet("<b>National Space Law:</b> 10 Jurisdiktionen, Favorability Scoring, Cross-References"))
    story.append(bullet("<b>Unified Assessment:</b> Multi-Framework-Aggregation, Cross-Regulation-Mapping"))
    story.append(spacer(4))
    story.append(feature_metrics_row([
        ("Engines", "12 Assessment-Engines"),
        ("LOC", "~8.000 Engine-Code"),
        ("Regulatory Data", "33.000+ LOC"),
        ("Endpoints", "20+ API-Routen"),
    ]))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Innerhalb von 15 Minuten eine vollstaendige regulatorische Landkarte statt 3-6 Monate externer Beratung. Konkrete Handlungsempfehlungen pro Artikel mit Zeitschiene und Kostenschaetzung."),
        ("NCAs / Regulierer", "Standardisiertes Assessment-Format vereinfacht Pruefung und Vergleichbarkeit. Digitale Nachvollziehbarkeit jeder Compliance-Entscheidung."),
        ("Versicherer / Investoren", "Quantifizierbare Compliance-Scores ermoeglichen risikobasierte Praemienkalkulation und Due-Diligence-Bewertung."),
    ]))
    story.append(spacer(12))

    # ── 4.2 Regulatory Tracker ──
    story.append(sub_header("4.2 Regulatory Tracker &amp; Checklist"))
    story.append(body(
        "Artikel-granulares Tracking-System, das jeden einzelnen EU Space Act Artikel, jede NIS2-Anforderung "
        "und jedes nationale Gesetz als individuelle Compliance-Aufgabe abbildet. Status-Management ueber "
        "4 Stufen (Not Started, In Progress, Partially Compliant, Compliant) mit Evidenz-Verlinkung und "
        "Deadline-Tracking. Integriert mit dem Assessment-Wizard fuer automatische Initialbefuellung."
    ))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Operatives Compliance-Management auf Artikel-Ebene. Automatische Deadline-Erinnerungen (8:00 UTC taeglich). Fortschritts-Tracking ueber alle Frameworks hinweg."),
        ("NCAs / Regulierer", "Exportierbare Compliance-Checklisten im standardisierten Format fuer Aufsichtspruefungen."),
    ]))
    story.append(spacer(12))

    # ── 4.3 Authorization Workflow ──
    story.append(sub_header("4.3 Authorization Workflow"))
    story.append(body(
        "State-Machine-basierter Genehmigungsprozess, der den kompletten Autorisierungszyklus bei nationalen "
        "Weltraumbehoerden (NCAs) abbildet. Von der Antragsstellung ueber Dokumenten-Assembly bis zur "
        "Korrespondenz-Verfolgung mit der Behoerde. Integriertes NCA-Portal fuer digitale Einreichung."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>NCA-Submission Pipeline:</b> Dokumenten-Checkliste, Package-Builder (Drag&amp;Drop), Versionsmanagement"))
    story.append(bullet("<b>Korrespondenz-Tracking:</b> Behoerden-Kommunikation, Q&amp;A Threads, Fristenverwaltung"))
    story.append(bullet("<b>Status-Workflow:</b> Draft -> Submitted -> Under Review -> Approved/Rejected mit Audit Trail"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "End-to-End digitaler Autorisierungsprozess. Reduziert Bearbeitungszeit um geschaetzt 40-60% durch vorstrukturierte Dokumentenpakete und automatisierte Checklisten."),
        ("NCAs / Regulierer", "Standardisierte digitale Einreichungen. Automatische Vollstaendigkeitspruefung. Nachvollziehbarer Entscheidungspfad."),
    ]))

    story.append(PageBreak())

    # ── 4.4 EPHEMERIS ──────────────────────────────────────
    story.extend(section_header(""))
    story.append(sub_header("4.4 Ephemeris -- Predictive Compliance Engine"))
    story.append(body(
        "Das Herzstueck der Caelex-Plattform: Eine 51.000+ LOC Predictive Intelligence Engine, die "
        "physikalische Orbital-Modelle mit regulatorischen Anforderungen verbindet, um die zentrale "
        "Frage zu beantworten: <b>'In wie vielen Tagen wird dieser Satellit non-compliant?'</b>"
    ))
    story.append(body(
        "Ephemeris kombiniert 5 Physik-/Prognosemodelle, 7 Operatortyp-spezifische Scoring-Matrizen, "
        "einen 24-Knoten Regulatory Dependency Graph, 131 What-If Szenario-Handler, Fleet-weite "
        "Anomalie-Erkennung und einen kryptographischen 3-Tier Trust-Hierarchie in einem integrierten System."
    ))
    story.append(spacer(8))
    story.append(feature_metrics_row([
        ("LOC", "51.494 (gesamt)"),
        ("Lib-Code", "31.126 LOC"),
        ("Operatortypen", "7"),
        ("Szenarien", "131 Handler"),
        ("Modelle", "5 Prediction"),
        ("API-Routen", "15+"),
    ]))
    story.append(spacer(12))

    # 4.4.1 Core Engine
    story.append(sub_sub_header("4.4.1 Core Engine &amp; 7 Operatortypen"))
    story.append(body(
        "Das Module Registry definiert fuer jeden der 7 EU Space Act Operatortypen eine individuelle "
        "Scoring-Matrix mit 9 Compliance-Modulen. Jedes Modul hat ein definiertes Gewicht und einen "
        "optionalen Safety-Gate-Status."
    ))
    story.append(spacer(4))

    story.append(data_table(
        ["Operatortyp", "Beschreibung", "Spezifische Module"],
        [
            ["SCO", "Spacecraft Operator", "Fuel, Orbital, Subsystems, Collision Avoidance, Cyber, Ground, Docs, Insurance, Registration"],
            ["LO", "Launch Operator", "Launch Auth, Range Safety, TPL Insurance, Payload Integration, Cyber"],
            ["LSO", "Launch Site Operator", "Site Auth, Range Safety Systems, Ground Infra, Emergency Response"],
            ["ISOS", "In-Space Ops &amp; Servicing", "Mission Auth, Proximity Ops, Fuel Mgmt, Collision Avoidance"],
            ["CAP", "Capacity Provider", "Service Auth, Continuity, SLA Compliance, Spectrum Coordination"],
            ["PDP", "Payload Data Provider", "Data Auth, Data Security, Distribution, Spectrum Rights"],
            ["TCO", "Tracking &amp; Command Ops", "Ops Auth, Ground Infra, Cyber (safety-critical), Command Integrity"],
        ],
        col_widths=[CONTENT_W*0.10, CONTENT_W*0.25, CONTENT_W*0.65]
    ))
    story.append(spacer(8))

    # Safety Gate
    story.append(Paragraph("<b>Safety Gate Mechanismus:</b>", S_H4))
    story.append(body(
        "Wenn ein sicherheitskritisches Modul (Fuel, Orbital, Subsystems, Collision Avoidance) den Status "
        "'NON_COMPLIANT' hat, wird der Gesamt-Score auf maximal 49 Punkte gedeckelt -- unabhaengig davon, "
        "wie gut alle anderen Module abschneiden. Logik: Wenn die grundlegende Orbitalkontrolle nicht "
        "gewaehrleistet ist, kann der Satellit nicht als 'compliant' gelten."
    ))
    story.append(spacer(8))

    # 4.4.2 Prediction Models
    story.append(sub_sub_header("4.4.2 Fuenf Physik- &amp; Prognosemodelle"))
    story.append(spacer(4))

    story.append(Paragraph("<b>Modell 1: Orbital Decay</b> (370 LOC)", S_H4))
    story.append(body(
        "Semi-analytisches Langzeit-Decay-Modell mit 9-Schicht Atmosphaere und Solar-Flux-Skalierung. "
        "Berechnet Restlebensdauer, Reentry-Datum und Art. 68 Compliance (25-Jahres-Regel). "
        "Inputs: CelesTrak TLE-Daten, NOAA F10.7 Solar Flux, Area-to-Mass Ratio. "
        "Outputs: Altitude-Kurve mit Best/Nominal/Worst-Case Szenarien ueber 5 Jahre."
    ))
    story.append(spacer(4))

    story.append(Paragraph("<b>Modell 2: Fuel Depletion</b> (403 LOC)", S_H4))
    story.append(body(
        "Lineare Regression auf Sentinel-Telemetriedaten (remaining_fuel_pct). Berechnet drei Schwellen-Crossings: "
        "EU-SA-72 (25% Disposal Reserve), EU-SA-70 (15% Passivation), IADC 5.3.1 (10% Safety Reserve). "
        "Konfidenz basierend auf Datenpunkten und R-Squared: >=30 Punkte mit R2>0.8 ergibt HIGH."
    ))
    story.append(spacer(4))

    story.append(Paragraph("<b>Modell 3: Subsystem Degradation</b> (400 LOC)", S_H4))
    story.append(body(
        "Drei Subsysteme: Thruster (Anomalie-Frequenz, 12-Monats-Ausfallwahrscheinlichkeit), "
        "Batterie (2,5%/Jahr Kapazitaetsverlust, 60% kritische Schwelle), Solar Array (2,75%/Jahr "
        "Leistungsverlust, 70% kritische Schwelle). Gewichtete Aggregation: 40% Thruster + 35% Battery + 25% Solar."
    ))
    story.append(spacer(4))

    story.append(Paragraph("<b>Modell 4: Deadline Events</b>", S_H4))
    story.append(body(
        "6 regulatorische Fristen: Penetration Test (365 Tage, NIS2), Vulnerability Scan (90 Tage), "
        "Access Review (180 Tage), Security Training (365 Tage), Insurance Renewal (365 Tage, CRITICAL), "
        "Frequency License (1825 Tage). Automatische Warnungen mit konfigurierbaren Lead-Zeiten."
    ))
    story.append(spacer(4))

    story.append(Paragraph("<b>Modell 5: Regulatory Change</b>", S_H4))
    story.append(body(
        "EUR-Lex Event-Integration fuer regulatorische Aenderungen. Erkennt neue Anforderungen, "
        "Schwellen-Aenderungen, Deadline-Verschiebungen und Ausnahmen. Propagiert Impact ueber den "
        "Cascade Engine (24-Knoten DAG)."
    ))
    story.append(spacer(12))

    # 4.4.3 Scoring & Safety Gate
    story.append(sub_sub_header("4.4.3 Scoring Engine"))
    story.append(body(
        "Gewichtete Aggregation: OverallScore = SUM(moduleScore x moduleWeight) / SUM(moduleWeight). "
        "Jeder Factor hat einen Status-Score: COMPLIANT=100, WARNING=60, NON_COMPLIANT=20, UNKNOWN=50. "
        "Modul-Score ist der Durchschnitt der Factor-Scores. Modul-Status ist der schlechteste Factor."
    ))
    story.append(spacer(8))

    # 4.4.4 Compliance Horizon
    story.append(sub_sub_header("4.4.4 Compliance Horizon"))
    story.append(body(
        "Beantwortet die Frage: 'Wann wird mein Satellit non-compliant?' Sammelt alle Forecast-Faktoren, "
        "findet den fruehesten Breach, und gibt Tage bis zum ersten Verstoss zurueck. "
        "Beispiel: 'In 847 Tagen erreicht der Satellit <25% Treibstoff und verstoesst gegen EU Space Act Art. 72.'"
    ))
    story.append(spacer(8))

    # 4.4.5 What-If
    story.append(sub_sub_header("4.4.5 What-If Simulation &amp; EphemerisForge"))
    story.append(body(
        "131 Szenario-Handler ueber 14 Domaenen-Dateien: Thruster-Ausfall, Solar-Storm, Kollisionsmaneuver, "
        "regulatorische Aenderungen, Budget-Kuerzungen, Crew-Ausfall, Versicherungsverlust, Frequenz-Interferenz, "
        "Cyber-Angriff und mehr. Jeder Handler modifiziert den Compliance-State und berechnet Delta-Scores."
    ))
    story.append(body(
        "<b>EphemerisForge:</b> ReactFlow-basierter visueller Szenario-Builder. Drag&amp;Drop Szenarien auf eine "
        "Node-Graph Canvas, verketten zu DAG-Ketten (z.B. 'Thruster-Ausfall -> Fuel Reserve sinkt -> "
        "Disposal-Faehigkeit gefaehrdet'), 500ms Debounce fuer Live-Neuberechnung."
    ))
    story.append(spacer(8))

    # 4.4.6 Fleet Intelligence
    story.append(sub_sub_header("4.4.6 Fleet Intelligence &amp; Cross-Type Intelligence"))
    story.append(body(
        "Fleet-weite Compliance-Analyse ueber alle Satelliten und Operatortypen hinweg. Fleet Score als "
        "gewichteter Durchschnitt aller Entitaeten. Weakest-Link-Identifikation: Welcher Satellit zieht "
        "die Fleet-Compliance am staerksten herunter? Cross-Type Intelligence: Identifiziert Single Points "
        "of Failure, Kaskaden-Risiken und Korrelationen zwischen verschiedenen Operatortypen."
    ))
    story.append(spacer(8))

    # 4.4.7 Anomaly Detection
    story.append(sub_sub_header("4.4.7 Anomaly Detection"))
    story.append(body(
        "5 statistische Erkennungsmethoden: (1) Z-Score auf absoluten Score (2/3-Sigma Alerts), "
        "(2) Z-Score auf Aenderungsrate (beschleunigter Decay), (3) Moving Average Crossover "
        "(7-Tage vs. 30-Tage Trend-Umkehr), (4) Forecast Miss (Abweichung von P10/P90 Perzentilen), "
        "(5) Fleet Correlation (Pearson r>0.8 bei gleichzeitigem Decline von 3+ Satelliten -> systemische Ursache)."
    ))
    story.append(spacer(8))

    # 4.4.8 Cascade Engine
    story.append(sub_sub_header("4.4.8 Cascade Engine &amp; Conflict Detection"))
    story.append(body(
        "24-Knoten Regulatory Dependency Graph mit BFS-Propagation. Modelliert wie ein regulatorischer "
        "Verstoss (z.B. Thruster-Ausfall) kaskadenfoermig andere Compliance-Bereiche beeinflusst: "
        "Thruster -> Collision Avoidance -> Debris Mitigation -> Insurance -> Registration. "
        "Conflict Detection identifiziert sich widersprechende regulatorische Anforderungen zwischen Frameworks."
    ))
    story.append(spacer(8))

    story.append(value_box("MEHRWERT -- EPHEMERIS", [
        ("Satellitenbetreiber", "Fruehwarnsystem: Compliance-Probleme Monate/Jahre im Voraus erkennen statt reaktiv handeln. What-If-Simulation: Auswirkung von Szenarien vorab quantifizieren. Fleet Command: Alle Satelliten in einem Dashboard mit priorisierter Risiko-Sortierung."),
        ("NCAs / Regulierer", "Standardisierte, physikalisch fundierte Compliance-Bewertung. Nachvollziehbare Scoring-Methodik mit Safety-Gate-Mechanismus. Automatische Anomalie-Alerts bei signifikanten Compliance-Verschlechterungen."),
        ("Versicherer / Investoren", "Objektive, datengetriebene Risikoeinschaetzung. Compliance Horizon als quantifizierbares Risikomass. Fleet-weite Korrelationsanalyse fuer Portfolio-Risikomanagement."),
    ]))

    story.append(PageBreak())

    # ── 4.5 Caelex Shield ──
    story.append(sub_header("4.5 Caelex Shield -- Conjunction Assessment"))
    story.append(body(
        "Echtzeit-Kollisionsbewertungssystem basierend auf Space-Track Conjunction Data Messages (CDMs). "
        "Automatische Ingestion alle 30 Minuten, Risiko-Klassifizierung (Low/Medium/High/Critical), "
        "und Decision-Support fuer Ausweichmanoever. Integriert mit Ephemeris fuer Fuel-Impact-Analyse "
        "von Manoevern und Verity fuer kryptographisch gesicherte Entscheidungsnachweise."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>CDM Polling:</b> Space-Track API Integration, alle 30 Min., automatische Severity-Klassifizierung"))
    story.append(bullet("<b>Risiko-Assessment:</b> Kollisionswahrscheinlichkeit, Miss Distance, Time to TCA"))
    story.append(bullet("<b>Decision Support:</b> Maneuver-Empfehlungen mit Fuel-Impact-Analyse"))
    story.append(bullet("<b>Audit Trail:</b> Jede Entscheidung kryptographisch dokumentiert (Verity-Integration)"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Automatisierte Kollisionsueberwachung mit priorisierter Alert-Liste. Fuel-Impact-Analyse vor jedem Manoever. Nachweisbare Sorgfaltspflicht gegenueber Regulierern (EU Space Act Art. 63/64)."),
        ("Versicherer", "Dokumentierte Entscheidungsprozesse reduzieren Haftungsrisiko. Kryptographischer Nachweis rechtzeitiger Reaktion."),
    ]))
    story.append(spacer(12))

    # ── 4.6 Verity ──
    story.append(sub_header("4.6 Verity -- Kryptographische Attestierung"))
    story.append(body(
        "Kryptographisches Attestierungsframework, das Satellitenbetreibern erlaubt, regulatorische "
        "Compliance-Claims zu erzeugen, die von jeder dritten Partei (NCAs, Versicherer, Geschaeftspartner) "
        "verifiziert werden koennen -- ohne Vertrauen in Caelex und ohne Offenlegung sensitiver Betriebsdaten."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>Ed25519 Signaturen:</b> NIST-approved, 64-Byte Signaturen, Patent-frei"))
    story.append(bullet("<b>SHA-256 Commitments:</b> Bindet an Messwert ohne Offenlegung (Zero-Knowledge-aehnlich)"))
    story.append(bullet("<b>AES-256-GCM:</b> Verschluesselung der privaten Schluessel at-rest"))
    story.append(bullet("<b>Issuer Key Rotation:</b> Neue Schluessel ersetzen alte; alle historischen Attestierungen bleiben verifizierbar"))
    story.append(bullet("<b>Certificate Bundling:</b> Aggregation mehrerer Attestierungen in ein signiertes Zertifikat"))
    story.append(bullet("<b>Oeffentliche Verifikation:</b> /api/v1/verity/attestation/verify -- keine Auth noetig, fuer jedermann"))
    story.append(spacer(4))
    story.append(feature_metrics_row([
        ("LOC", "~3.000"), ("Dateien", "24"), ("API-Routen", "9"), ("Krypto", "Ed25519 + SHA-256 + AES-256"),
    ]))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Compliance nachweisen ohne Betriebsgeheimnisse offenzulegen. Attestierungen bleiben ewig gueltig -- selbst wenn Caelex als Unternehmen aufhoert zu existieren."),
        ("NCAs / Regulierer", "Mathematisch verifizierbare Compliance-Nachweise statt Eigenerklaerungen. Reduziert Pruefaufwand von Wochen auf Minuten."),
        ("Versicherer", "Kryptographisch gesicherte Entscheidungs-Zeitstempel fuer Claims-Bearbeitung. Beweisbare rechtzeitige Reaktion auf Compliance-Events."),
    ]))

    story.append(PageBreak())

    # ── 4.7 Sentinel ──
    story.append(sub_header("4.7 Sentinel -- Tamper-Evident Telemetrie"))
    story.append(body(
        "Dezentrales Telemetrie-System mit kryptographischer Hash-Chain. Betreiber deployen Sentinel-Agents "
        "auf ihren Bodenstationen, die Betriebsdaten (Treibstoff, Batterie, Thruster-Status, Solar-Array) "
        "in einer manipulationssicheren Kette sammeln. Jeder Datenpunkt referenziert den Hash des vorherigen -- "
        "rueckwirkende Aenderungen brechen die Kette und werden sofort erkannt."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>Agent-Modell:</b> Ed25519-Keypair pro Agent, HMAC-SHA256 Bearer Token, Collector-basiert"))
    story.append(bullet("<b>Hash-Chain:</b> sha256(previousHash || payload) -- Genesis bei erstem Paket, Lueckenlose Verkettung"))
    story.append(bullet("<b>Cross-Verification:</b> Alle 4 Stunden Abgleich gegen oeffentliche Quellen (CelesTrak TLE)"))
    story.append(bullet("<b>Heartbeat:</b> Taeglich 00:30 UTC Agent-Health-Check, automatische SUSPENDED-Markierung bei Ausfall"))
    story.append(spacer(4))
    story.append(body(
        "<b>3-Tier Trust-Hierarchie:</b> Sentinel (krypto-verifizierte Telemetrie, Trust=HIGH) > "
        "Verity (attestierte Claims, Trust=MEDIUM) > Assessment (Self-Reported, Trust=LOW). "
        "Ephemeris nutzt automatisch die hoechste verfuegbare Trust-Stufe fuer seine Berechnungen."
    ))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Manipulationssichere Betriebsaufzeichnungen. Automatische Evidenz-Generierung fuer Compliance-Audits. Hoechster Trust-Level in Caelex-Bewertungen."),
        ("NCAs / Regulierer", "Unabhaengig verifizierbare Betriebsdaten. Hash-Chain-Integritaet mathematisch pruefbar. Kein Vertrauen in Betreiber-Eigenerklaerungen noetig."),
    ]))
    story.append(spacer(12))

    # ── 4.8 ASTRA ──
    story.append(sub_header("4.8 ASTRA -- AI Compliance Copilot"))
    story.append(body(
        "Claude-basierter KI-Assistent (claude-sonnet-4-6) mit 38 regulatorischen Tools und "
        "persistenter Konversationsspeicherung. ASTRA kann Compliance-Scores abfragen, Assessments auswerten, "
        "Dokumente generieren, regulatorische Fragen beantworten und Handlungsempfehlungen ableiten -- "
        "alles im Kontext der spezifischen Organisation und ihrer Compliance-Situation."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>38 Tools:</b> Score-Abfrage, Assessment-Analyse, Artikel-Lookup, Dokument-Generierung, Deadline-Check, etc."))
    story.append(bullet("<b>Tool-Use Loop:</b> Max 10 Iterationen pro Anfrage mit automatischem Tool-Chaining"))
    story.append(bullet("<b>Context Builder:</b> Laedt Compliance-Scores, Assessments, Workflows aus DB vor jeder Antwort"))
    story.append(bullet("<b>Regulatory Knowledge:</b> Eingebettetes Wissen ueber EU Space Act, NIS2, Jurisdiktionen, Glossar"))
    story.append(bullet("<b>Conversation Persistence:</b> Prisma-backed mit Auto-Summarization fuer lange Konversationen"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "24/7 verfuegbarer Compliance-Experte. Beantwortet Fragen wie 'Muss ich Art. 64 erfuellen?' in Sekunden statt Tagen. Generiert Compliance-Dokumente on-demand."),
        ("Alle Stakeholder", "Demokratisiert Compliance-Wissen. Reduziert Abhaengigkeit von spezialisierten (und teuren) Weltraumrecht-Anwaelten."),
    ]))

    story.append(PageBreak())

    # ── 4.9 Environmental & Debris ──
    story.append(sub_header("4.9 Environmental Footprint &amp; Debris Mitigation"))
    story.append(body(
        "Zwei eng verwandte Module: Der Environmental Footprint Calculator bewertet die Umweltauswirkungen "
        "von Weltraummissionen (Emissionen, Orbital-Debris, Reentry-Risiken). Der Debris Mitigation Planner "
        "erstellt IADC/ISO-24113-konforme Deorbit-Plaene und berechnet Post-Mission Disposal Strategien."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>EFD-Berechnung:</b> Launch-Emissionen, Orbital-Debris-Beitrag, Reentry-Risiko (Casualty Expectation)"))
    story.append(bullet("<b>Deorbit-Planung:</b> Aktiv (Propulsiv) vs. Passiv (Atmospheric Drag), Treibstoffberechnung"))
    story.append(bullet("<b>Compliance-Check:</b> Automatischer Abgleich gegen IADC Guidelines, ISO 24113:2024, EU Space Act Art. 68-72"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "EU Space Act verlangt Environmental Footprint Declaration (EFD) ab 2031. Caelex automatisiert die Berechnung und generiert NCA-ready Reports."),
        ("Regulierer", "Standardisierter Vergleich der Umweltauswirkungen verschiedener Missionsprofile. Quantifizierbare Debris-Mitigation-Strategien."),
    ]))
    story.append(spacer(12))

    # ── 4.10 Cybersecurity NIS2 ──
    story.append(sub_header("4.10 Cybersecurity Suite (NIS2)"))
    story.append(body(
        "Vollstaendige NIS2-Compliance-Loesung fuer den Weltraumsektor (Annex I, Sektor 11 -- Critical Infrastructure). "
        "Incident Reporting mit 4-Phasen-Timeline (Fruehwarnung 24h, Meldung 72h, Zwischenbericht auf Anfrage, "
        "Abschlussbericht 1 Monat). Risk Analysis nach ENISA-Methodik. Automatische Essential/Important-Klassifizierung."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>51 Requirements:</b> NIS2 Art. 20-23, 27, 75-89, space-sector-spezifisch"))
    story.append(bullet("<b>Incident Management:</b> Phase-basierte Meldung, Asset-Tracking, Attachment-Management"))
    story.append(bullet("<b>Strafen:</b> Essential: 10 Mio. EUR oder 2% Umsatz | Important: 7 Mio. EUR oder 1,4% Umsatz"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "NIS2-Compliance ist ab Oktober 2024 Pflicht. Caelex bietet strukturierte Self-Assessments mit konkreten Gap-Analysen und Massnahmenplaenen. Incident Reporting Template spart kritische Zeit in den ersten 24 Stunden."),
    ]))
    story.append(spacer(12))

    # ── 4.11 Generate 2.0 ──
    story.append(sub_header("4.11 Generate 2.0 -- Dokumentengenerierung"))
    story.append(body(
        "KI-gestuetzte Generierung NCA-submission-ready Compliance-Dokumente. 8+ Report-Typen mit "
        "automatischer Befuellung aus Assessment-Daten, Compliance-Scores und Regulatory-Mappings. "
        "Client-seitige PDF-Generierung (@react-pdf/renderer) und Server-seitige Generierung (jsPDF) "
        "fuer verschiedene Anwendungsfaelle."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>8+ Report-Typen:</b> Compliance Summary, NCA Application, EFD Report, Audit Report, Risk Assessment, Gap Analysis, etc."))
    story.append(bullet("<b>43 PDF-Template-Dateien:</b> Professionelle Formatierung, Multi-Language (DE/EN/FR/ES)"))
    story.append(bullet("<b>AI-Enhanced:</b> Claude generiert kontextbezogene Empfehlungen und Erlaeuterungen"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Vollstaendige NCA-Antraege in Stunden statt Wochen. Automatische Aktualisierung bei Score-Aenderungen. Export in behoerdenkonformen Formaten."),
    ]))

    story.append(PageBreak())

    # ── 4.12 Audit Center ──
    story.append(sub_header("4.12 Audit Center &amp; Compliance-Nachweis"))
    story.append(body(
        "SHA-256 Hash-Chain Audit Trail fuer lueckenlose Nachvollziehbarkeit. Jeder Audit-Eintrag "
        "referenziert den Hash des vorherigen -- rueckwirkende Manipulationen brechen die Kette. "
        "Evidence Explorer fuer modul- und anforderungsbasiertes Durchsuchen von Compliance-Nachweisen. "
        "ZIP-Export mit kryptographischer Integritaetspruefung fuer externe Audits."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>Hash-Chain:</b> SHA-256 mit Vorgaenger-Referenz, Tamper-Evident, Daily Anchoring (23:00 UTC)"))
    story.append(bullet("<b>Evidence Explorer:</b> Durchsuchbar nach Modul, Anforderung, Zeitraum, Status"))
    story.append(bullet("<b>Export:</b> ZIP-Archiv mit Audit-Log, Evidence-Dateien, Integritaets-Checksummen"))
    story.append(bullet("<b>Security Events:</b> Login-Versuche, Permission-Aenderungen, API-Key-Nutzung"))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Auditors koennen die gesamte Compliance-Historie in einem exportierbaren, integritaetsgeschuetzten Paket erhalten. Reduziert Audit-Vorbereitungszeit von Wochen auf Stunden."),
        ("NCAs / Regulierer", "Mathematisch verifizierbare Audit-Trails. Kein Vertrauen in Betreiber-IT noetig -- die Hash-Chain spricht fuer sich."),
    ]))
    story.append(spacer(12))

    # ── 4.13 Assure ──
    story.append(sub_header("4.13 Assure -- Investor Due Diligence Platform"))
    story.append(body(
        "Spezialisierte Plattform fuer Investor Relations und Due Diligence im Weltraumsektor. "
        "Drei proprietaere Scoring-Systeme: Investment Readiness Score (IRS, 0-100), "
        "Regulatory Readiness Score (RRS, 6 Komponenten mit Gewichten), und "
        "Regulatory Credit Rating (RCR, AAA bis D mit +/- Modifikatoren). "
        "Inklusive sicherer Data Rooms, Risk Register und Benchmark-Vergleichen."
    ))
    story.append(spacer(4))
    story.append(bullet("<b>RRS:</b> 6 Komponenten: Authorization (25%), Cybersecurity (20%), Operations (20%), Documentation (15%), Risk Management (10%), Stakeholder (10%)"))
    story.append(bullet("<b>RCR:</b> Credit-Rating-Skala (AAA-D) mit Watchlist, Appeals, historischen Snapshots"))
    story.append(bullet("<b>Data Room:</b> Token-gated, Drag&amp;Drop, Versioning, Access Logs, Analytics"))
    story.append(bullet("<b>Risk Register:</b> 5x5 Heatmap, Szenario-Analyse, Kategorie-Breakdown"))
    story.append(bullet("<b>Benchmarks:</b> Radar-Charts mit Peer-Vergleich, Traffic-Light-Indikatoren"))
    story.append(bullet("<b>Investor Hub:</b> Milestone Timeline, Update Editor, Share Link Manager mit QR-Codes"))
    story.append(spacer(4))
    story.append(feature_metrics_row([
        ("Seiten", "17 Pages"), ("Komponenten", "37 React"), ("API-Routen", "30+"), ("LOC", "~15.000"),
    ]))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Investoren", "Standardisierte, vergleichbare Compliance-Bewertung ueber Space-Startups hinweg. Datenraum mit strukturierten Dokumenten statt unorganisierter Dropbox-Links."),
        ("Space-Startups", "Regulatorische Readiness als Wettbewerbsvorteil bei Fundraising. Professionelle Investor-Praesentationen mit quantifizierten Compliance-Scores."),
    ]))
    story.append(spacer(12))

    # ── 4.14 Academy ──
    story.append(sub_header("4.14 Academy -- Schulungsplattform"))
    story.append(body(
        "Integrierte Lernplattform fuer Weltraum-Compliance. Kurs-Katalog mit strukturierten Modulen "
        "und Lektionen, interaktive Simulationen mit Branching-Szenarien, virtuelle Klassenzimmer "
        "fuer Team-Schulungen, Badge-System fuer Zertifizierungen. Sandbox-Modus erlaubt "
        "Live-Ausfuehrung der Compliance-Engines mit veraenderbaren Parametern."
    ))
    story.append(spacer(4))
    story.append(feature_metrics_row([
        ("Seiten", "9 Pages"), ("Komponenten", "10 React"), ("Features", "Courses, Simulations, Classroom, Badges, Sandbox"),
    ]))
    story.append(spacer(4))
    story.append(value_box("MEHRWERT", [
        ("Satellitenbetreiber", "Compliance-Training fuer Teams ohne externe Schulungen (NIS2 Art. 21.2(g) verlangt Security Training). Sandbox fuer risikofreies Experimentieren mit Compliance-Szenarien."),
    ]))

    story.append(PageBreak())

    # ── 4.15 Weitere Module ──
    story.append(sub_header("4.15 Weitere Module"))
    story.append(spacer(4))

    story.append(Paragraph("<b>Digital Twin</b>", S_H4))
    story.append(body(
        "Unified Compliance State Machine mit Radar-Charts. Visualisiert alle Compliance-Dimensionen "
        "eines Satelliten in einem integrierten Dashboard. Aggregiert Daten aus allen Assessment-Engines, "
        "Ephemeris-Prognosen und Verity-Attestierungen."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>Regulatory Intelligence Feed</b>", S_H4))
    story.append(body(
        "EUR-Lex Monitoring mit taeglicm Polling (07:00 UTC). Erkennt neue Dokumente, Aenderungen "
        "und Konsultationen, die fuer Weltraumbetreiber relevant sind. Severity-Tagging und "
        "automatische Benachrichtigungen bei regulatorischen Aenderungen."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>Stakeholder Network</b>", S_H4))
    story.append(body(
        "Management von Compliance-Beziehungen: Versicherer, Anwaelte, Auditoren, Zulieferer, NCAs. "
        "Geteilte Data Rooms, Attestierungs-Anfragen, Zugangsprotokollierung. "
        "14 React-Komponenten fuer die vollstaendige Stakeholder-Verwaltung."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>Mission Control</b>", S_H4))
    story.append(body(
        "3D-Globe mit Three.js/React Three Fiber fuer Echtzeit-Satellitentracking. "
        "SGP4-Propagation via satellite.js, Orbit-Visualisierung, Ground-Coverage-Darstellung. "
        "10 React-Komponenten inklusive interaktivem Globe, Orbit-Paths und Fleet-Dashboard."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>Optimizer</b>", S_H4))
    story.append(body(
        "Regulatory Arbitrage Optimizer: Vergleicht Compliance-Anforderungen ueber Jurisdiktionen "
        "hinweg und identifiziert die regulatorisch guenstigste Kombination fuer Multi-Jurisdiktions-Betrieb."
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 5. REGULATORISCHE ABDECKUNG
    # ════════════════════════════════════════════════════════
    story.extend(section_header("REGULATORISCHE ABDECKUNG", "5"))
    story.append(spacer(4))

    story.append(sub_header("Framework-Abdeckung"))
    story.append(data_table(
        ["Framework", "Abdeckung", "Details"],
        [
            ["EU Space Act (COM(2025) 335)", "119 Artikel", "7 Operatortypen, Standard/Light-Regime, 9 Module pro Typ"],
            ["NIS2-Richtlinie (EU 2022/2555)", "51 Requirements", "Space = Annex I Sektor 11, Incident-Timeline, Essential/Important"],
            ["COPUOS LTS Guidelines", "50+ Guidelines", "Debris, Collision Avoidance, Disposal, Constellation Management"],
            ["IADC Guidelines / ISO 24113", "Vollstaendig", "Space Debris Mitigation, 25-Jahres-Regel, Passivierung"],
            ["UK Space Industry Act 2018", "65+ Requirements", "5 Lizenztypen, CAA-Framework, Post-Brexit"],
            ["US FCC Part 25 + Debris Rule", "45+ Requirements", "Frequenzkoordination, 5-Jahres Deorbit (ab 2025)"],
            ["US FAA/AST 14 CFR 450", "80+ Requirements", "Launch Licensing, Range Operations"],
            ["ITAR/EAR Export Control", "100+ Requirements", "Deemed Exports, Sanktionslisten-Screening"],
            ["ITU Radio Regulations", "50+ Anforderungen", "Frequenzbandlizenzierung, 3 ITU-Regionen"],
            ["ORBITS Act 2025", "10+ Requirements", "US Debris-Standards Harmonisierung"],
        ],
        col_widths=[CONTENT_W*0.35, CONTENT_W*0.18, CONTENT_W*0.47]
    ))
    story.append(spacer(12))

    story.append(sub_header("Jurisdiktions-Matrix"))
    story.append(data_table(
        ["Jurisdiktion", "Gesetz", "Status", "Favorability"],
        [
            ["Frankreich (FR)", "LOS 2008", "Enacted / Mature", "75-80"],
            ["Belgien (BE)", "Space Activities Act 1992", "Enacted / Mature", "73-78"],
            ["Niederlande (NL)", "Space Act 2007", "Enacted / Mature", "70-75"],
            ["Luxemburg (LU)", "Space Resources Act 2017", "Enacted / Specialized", "78-82"],
            ["Oesterreich (AT)", "Space Act 1992", "Enacted / Baseline", "65-70"],
            ["Daenemark (DK)", "Space Act 2012", "Enacted / Baseline", "64-69"],
            ["Deutschland (DE)", "SatDSiG (nur Remote Sensing)", "Gap / Pending", "20-25"],
            ["Italien (IT)", "Space Activities Act 2010", "Enacted / Baseline", "62-67"],
            ["Vereinigtes Koenigreich", "Space Industry Act 2018", "Enacted / Post-Brexit", "68-73"],
            ["Norwegen (NO)", "Space Activities Act 1997", "Enacted / EEA", "66-71"],
        ],
        col_widths=[CONTENT_W*0.22, CONTENT_W*0.35, CONTENT_W*0.22, CONTENT_W*0.21]
    ))
    story.append(spacer(8))

    story.append(body(
        "<b>Cross-Framework-Referenzen:</b> Das System trackt 47 Cross-References zwischen nationalen "
        "Gesetzen und dem EU Space Act. Darunter: 12-18 UK SIA/EU Space Act Ueberlappungen, "
        "5-12 NIS2/EU Space Act Superseding-Relationen, und 30+ COPUOS/IADC/ISO Alignment-Mappings."
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 6. COMPETITIVE MOAT
    # ════════════════════════════════════════════════════════
    story.extend(section_header("COMPETITIVE MOAT", "6"))
    story.append(spacer(4))

    story.append(sub_header("4 Strukturelle Vorteile"))
    story.append(spacer(4))

    story.append(Paragraph("<b>1. Regulatorische Wissensbasis (12-18 Monate Vorsprung)</b>", S_H4))
    story.append(body(
        "33.000+ LOC strukturierte regulatorische Daten (nicht generisch, sondern artikelgenau fuer den "
        "Weltraumsektor aufbereitet). 119 EU Space Act Artikel mit Operatortyp-Mapping, 51 NIS2 Requirements, "
        "10 nationale Weltraumgesetze mit Favorability Scoring, ITAR/EAR Export Control Mappings. "
        "Diese Wissensbasis hat 12-18 Monate Aufbauarbeit erfordert -- ein Wettbewerber muesste dieselbe "
        "juristische Detailarbeit leisten."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>2. Physik-Modelle mit regulatorischer Ankopplung</b>", S_H4))
    story.append(body(
        "Ephemeris verbindet orbitalmechanische Berechnungen (Orbital Decay, Fuel Depletion, Subsystem "
        "Degradation) direkt mit regulatorischen Schwellenwerten (Art. 68 25-Jahre-Regel, Art. 72 "
        "Disposal Reserve, IADC Passivierung). Diese Kombination erfordert gleichzeitig Expertise in "
        "Astrodynamik UND Weltraumrecht -- eine seltene Kombination, die Nachahmung extrem erschwert."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>3. Kryptographische Evidenzkette</b>", S_H4))
    story.append(body(
        "Das Dreigespann Sentinel (Hash-Chain Telemetrie) -> Verity (Ed25519 Attestierungen) -> "
        "Audit Center (SHA-256 Hash-Chain) schafft eine durchgaengige, manipulationssichere Beweiskette "
        "von der Satellitentelemetrie bis zum NCA-Nachweis. Diese Architektur ist nicht trivial zu "
        "replizieren und wird mit wachsender Nutzung zum De-facto-Standard."
    ))
    story.append(spacer(6))

    story.append(Paragraph("<b>4. Multi-Operatortyp-Coverage (7 Typen)</b>", S_H4))
    story.append(body(
        "Caelex ist die einzige Plattform, die alle 7 EU Space Act Operatortypen (SCO, LO, LSO, ISOS, "
        "CAP, PDP, TCO) mit individuellen Scoring-Matrizen, Safety Gates und spezifischen Modulen abdeckt. "
        "Jeder neue Typ erfordert wochenlange regulatorische Analyse und Engineering -- ein Wettbewerber "
        "muesste alle 7 parallel entwickeln, um Feature-Paritaet zu erreichen."
    ))
    story.append(spacer(12))

    story.append(sub_header("Wettbewerb"))
    story.append(data_table(
        ["Wettbewerber", "Ansatz", "Caelex-Vorteil"],
        [
            ["Blue Dwarf Space", "Space sustainability consulting", "Software > Consulting: skalierbar, automatisiert, 24/7 verfuegbar"],
            ["Manuelle Spreadsheets", "Excel + Anwaelte", "Integrierte Platform vs. fragmentierte Prozesse. Physik-Modelle nicht in Excel moeglich."],
            ["Generische GRC-Tools", "OneTrust, ServiceNow GRC", "Keine Weltraum-spezifischen Module. Kein Orbital Decay, keine Satellite-Telemetrie."],
            ["Inhouse-Loesungen", "Eigenentwicklung", "496K LOC, 167 Modelle, 12+ Engines -- nicht reproduzierbar in vertretbarer Zeit."],
        ],
        col_widths=[CONTENT_W*0.22, CONTENT_W*0.30, CONTENT_W*0.48]
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 7. TECHNISCHE METRIKEN
    # ════════════════════════════════════════════════════════
    story.extend(section_header("TECHNISCHE METRIKEN", "7"))
    story.append(spacer(4))

    story.append(data_table(
        ["Dimension", "Metrik", "Wert"],
        [
            ["Codebase", "Gesamte Lines of Code (TypeScript)", "496.654"],
            ["Codebase", "TypeScript/TSX Dateien", "1.561"],
            ["Codebase", "Ephemeris Subsystem (gesamt)", "51.494 LOC"],
            ["Codebase", "Ephemeris Lib-Code", "31.126 LOC"],
            ["Codebase", "Regulatorische Datendateien", "33.000+ LOC"],
            ["Datenmodell", "Prisma-Modelle", "167"],
            ["Datenmodell", "Prisma-Enums", "83"],
            ["Datenmodell", "Schema-Zeilen", "6.539"],
            ["Datenmodell", "Indizes", "481"],
            ["API", "Route Handler", "429"],
            ["API", "API-Domaenen", "56"],
            ["API", "Rate-Limiting-Tiers", "25"],
            ["Frontend", "Seiten (page.tsx)", "156"],
            ["Frontend", "React-Komponenten", "299"],
            ["Frontend", "Komponenten-Verzeichnisse", "38"],
            ["Testing", "Test-Dateien (Unit + Integration)", "365"],
            ["Testing", "Vitest + Playwright + MSW", "10.250+ Tests"],
            ["Automatisierung", "Cron-Jobs", "22"],
            ["Automatisierung", "Pipeline (04:00-12:00 UTC)", "8 sequentielle Jobs"],
            ["AI", "ASTRA Tools", "38"],
            ["AI", "Claude Model", "claude-sonnet-4-6"],
            ["Kryptographie", "Verity LOC", "~3.000"],
            ["Kryptographie", "Algorithmen", "Ed25519, SHA-256, AES-256-GCM"],
            ["Auth", "Methoden", "OAuth, SAML/OIDC, MFA/TOTP, WebAuthn"],
            ["Externe APIs", "Integrationen", "20+"],
            ["Assessment", "Engines", "12 Server-Only"],
            ["Assessment", "Operatortypen", "7 (SCO, LO, LSO, ISOS, CAP, PDP, TCO)"],
            ["Assessment", "Jurisdiktionen", "11 (10 EU/EEA + UK)"],
            ["Assessment", "EU Space Act Artikel", "119"],
        ],
        col_widths=[CONTENT_W*0.22, CONTENT_W*0.42, CONTENT_W*0.36]
    ))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 8. ENTWICKLUNGS-ROADMAP
    # ════════════════════════════════════════════════════════
    story.extend(section_header("ENTWICKLUNGS-ROADMAP", "8"))
    story.append(spacer(4))

    story.append(sub_header("Phase 1: Sofort (Kritische Fixes)"))
    story.append(bullet("Prisma Dynamic Access Elimination -- alle 48 Stellen mit typsicheren Aufrufen ersetzen [ABGESCHLOSSEN]"))
    story.append(bullet("What-If Validierung auf dynamische SCENARIO_HANDLERS umgestellt [ABGESCHLOSSEN]"))
    story.append(bullet("Horizon-Route: DB-Read statt Live-Berechnung [ABGESCHLOSSEN]"))
    story.append(bullet("Dependencies-Auth-Pattern korrigiert (5 Routen) [ABGESCHLOSSEN]"))
    story.append(bullet("TypeScript-Fehler aus Prisma-Migration behoben [ABGESCHLOSSEN]"))
    story.append(bullet("Test-Suite: 10.250 Tests passing, 0 neue Regressions"))
    story.append(spacer(8))

    story.append(sub_header("Phase 2: 1-3 Monate"))
    story.append(bullet("Test-Coverage fuer alle Ephemeris-Routen auf 80%+ erhoehen"))
    story.append(bullet("Performance-Optimierung: Fleet-Route Caching, Batch-Processing fuer Constellation-Operatoren"))
    story.append(bullet("Stub-Module (Shield CDM Polling, Sentinel Agent Registration) in Produktionsreife bringen"))
    story.append(bullet("Sales-Demo-Modus: Seed-Daten fuer eindrucksvolle Live-Demos"))
    story.append(spacer(8))

    story.append(sub_header("Phase 3: 3-6 Monate"))
    story.append(bullet("NCA-Portal digitale Integration (API-Schnittstelle zu mindestens einer europaeischen NCA)"))
    story.append(bullet("API-Produktisierung: Public REST API mit API-Key Auth, Dokumentation, SDKs"))
    story.append(bullet("Design-Konsolidierung: Einheitliches Liquid Glass System ueber alle Module"))
    story.append(bullet("Multi-Language: Vollstaendige DE/FR/ES Uebersetzung der Plattform"))
    story.append(spacer(8))

    story.append(sub_header("Phase 4: 6-12 Monate"))
    story.append(bullet("ML-Ensemble-Modelle: Machine Learning ueber Ephemeris-Prognosedaten fuer bessere Vorhersagen"))
    story.append(bullet("Real-Time Streaming: WebSocket-basierte Live-Updates fuer Conjunction Alerts"))
    story.append(bullet("Multi-Tenant Regulatory Graph: Shared Knowledge Base zwischen Operatoren (anonymisiert)"))
    story.append(bullet("Enterprise Features: SSO Marketplace, Custom Branding, Dedicated Instances"))
    story.append(spacer(12))

    story.append(Paragraph("<b>Meilenstein: Erster zahlender Pilot-Kunde Q3/Q4 2026</b>", S_H3))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════
    # 9. WARUM CAELEX GEWINNT
    # ════════════════════════════════════════════════════════
    story.extend(section_header("WARUM CAELEX GEWINNT", "9"))
    story.append(spacer(8))

    story.append(Paragraph(
        '"Die einzige Plattform, die Orbitalmechanik, Weltraumrecht und kryptographische '
        'Beweisfuehrung in einem System vereint -- gebaut fuer eine Regulierung, die noch '
        'niemand anderes bedient."',
        make_style('quote', fontName='Helvetica-Oblique', fontSize=14, leading=20,
                   textColor=DARK, alignment=TA_CENTER, spaceBefore=20, spaceAfter=30)
    ))
    story.append(spacer(12))

    story.append(Paragraph("<b>5 Gruende, warum ein COO hier einsteigen sollte:</b>", S_H2))
    story.append(spacer(8))

    reasons = [
        ("1. TIMING", "Regulatorisches Zeitfenster",
         "Der EU Space Act wurde 2025 verabschiedet, Enforcement beginnt 2030. Das eroeffnet ein "
         "4-Jahres-Fenster, in dem 880+ europaeische Weltraumunternehmen Compliance-Infrastruktur "
         "aufbauen muessen. Wer jetzt den Standard setzt, definiert den Markt."),

        ("2. MOAT", "Technische Tiefe als Burggraben",
         "Ein Solo-Founder hat in weniger als 12 Monaten eine 496K-LOC-Plattform gebaut, die "
         "Orbitalmechanik (5 Physik-Modelle), Kryptographie (Ed25519, SHA-256, Hash-Chains) und "
         "12 Assessment-Engines mit 33K LOC regulatorischem Wissen vereint. Kein Wettbewerber hat "
         "auch nur einen Bruchteil dieser Tiefe."),

        ("3. TAM", "Adressierbarer Markt",
         "880+ Space Companies in Europa, 55 Mrd. EUR europaeischer Raumfahrtmarkt. "
         "Jedes dieser Unternehmen wird ab 2030 nachweisbare Compliance benoetigen. "
         "Vergleichbare Compliance-Maerkte (DSGVO/OneTrust) haben Milliarden-Bewertungen erreicht."),

        ("4. TECH", "Unerreichte technische Vollstaendigkeit",
         "51K LOC Ephemeris-Engine allein (zum Vergleich: viele komplette SaaS-Plattformen haben weniger "
         "Gesamtcode). 167 Datenmodelle, 429 API-Routen, 365 Test-Dateien, 22 automatisierte Cron-Jobs, "
         "38 AI-Tools, 7 Operatortypen, 11 Jurisdiktionen. Kein Wettbewerber."),

        ("5. VALIDATION", "Externe Validierung",
         "Akademische Zusammenarbeit mit Prof. Hobe (Universitaet Koeln, fuehrender Weltraumrechtler). "
         "ESA BIC Bavaria Bewerbung eingereicht. ILA Berlin 2026 Teilnahme geplant. "
         "Die regulatorische Expertise hinter Caelex ist nicht improvisiert -- sie ist akademisch fundiert."),
    ]

    for num_title, subtitle, text in reasons:
        story.append(Paragraph(f"<b>{num_title}</b>  --  {subtitle}", S_H3))
        story.append(body(text))
        story.append(spacer(8))

    story.append(spacer(20))
    story.append(HRFlowable(width="60%", thickness=1.5, color=ORANGE, spaceAfter=16))
    story.append(Paragraph(
        "Caelex ist nicht nur eine Software-Plattform. Es ist die regulatorische Infrastruktur "
        "fuer die europaeische Raumfahrtindustrie der naechsten Dekade.",
        make_style('closing', fontName='Helvetica-Oblique', fontSize=11, leading=16,
                   textColor=DARK, alignment=TA_CENTER, spaceBefore=8, spaceAfter=30)
    ))

    # ── Build ───────────────────────────────────────────────
    doc.build(story)
    print(f"PDF generated: {output_path}")
    print(f"Pages: ~35-40")
    return output_path

if __name__ == "__main__":
    build_report()
