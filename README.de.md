# SOBI CRM — ein modulares Business Operating System

🌐 **Sprache:** [English](README.md) · **Deutsch** · [فارسی](README.fa.md)

SOBI CRM ist ein mandantenfähiges, metadatengetriebenes, KI-natives
**Business Operating System**. CRM ist die Vorzeigefunktion, aufgebaut auf
einer gemeinsamen Plattform, auf der jeder Mandant nur die für sein
Geschäft relevanten Branchenmodule aktiviert.

Es ist keine Demo — es ist ein echtes, kommerzielles Fundament: starke
Sicherheits- und DSGVO-Haltung, Low-Code-Konfigurierbarkeit (Formular-,
Workflow-, Entitäts- und Dashboard-Builder), eine Automatisierungs-Engine,
eine Integrationsschicht und ein KI-Betriebssystem mit menschlicher
Freigabe-Instanz.

> **Pflegehinweis:** Diese README ist die einzige verbindliche Quelle dafür,
> "was SOBI CRM kann". Wird dem Projekt eine neue Funktion hinzugefügt, muss
> sie hier ergänzt werden (in allen drei Sprachdateien) — die Funktionsliste
> darf nicht veralten.

---

## Inhaltsverzeichnis

1. [Schnellstart](#schnellstart)
2. [Stack](#stack)
3. [Funktionskatalog](#funktionskatalog)
   - [Plattform & Mandantenfähigkeit](#plattform--mandantenfähigkeit)
   - [Authentifizierung & Zugriff](#authentifizierung--zugriff)
   - [Plattformverwaltung](#plattformverwaltung)
   - [CRM-Kern](#crm-kern)
   - [Lead-Konvertierung & KI-Bewertung](#lead-konvertierung--ki-bewertung)
   - [KI-Betriebssystem](#ki-betriebssystem)
   - [Verträge](#verträge)
   - [E-Mail-Kampagnen](#e-mail-kampagnen)
   - [Wissensdatenbank & KI-Inhaltsvorschläge](#wissensdatenbank--ki-inhaltsvorschläge)
   - [Berichte & Einblicke](#berichte--einblicke)
   - [Formular-Engine](#formular-engine)
   - [Dateien, Aufgaben, Kalender, Benachrichtigungen](#dateien-aufgaben-kalender-benachrichtigungen)
   - [Dashboards](#dashboards)
   - [Workflow-Builder & Automatisierung](#workflow-builder--automatisierung)
   - [Integrationen](#integrationen)
   - [Branchenmodule](#branchenmodule)
   - [Low-Code-Studio](#low-code-studio)
   - [Sicherheit, Audit & DSGVO](#sicherheit-audit--dsgvo)
   - [Marketing-Landingpage](#marketing-landingpage)
   - [Branding & Internationalisierung](#branding--internationalisierung)
   - [Demo-Modus](#demo-modus)
4. [Architektur im Überblick](#architektur-im-überblick)
5. [Skripte](#skripte)
6. [Deployment](#deployment)
7. [Dokumentation](#dokumentation)

---

## Schnellstart

```bash
# 1. Postgres + Mailpit starten
docker compose up -d

# 2. Umgebung konfigurieren
cp .env.example .env      # Dev-Secrets sind vorgeneriert; bei Bedarf anpassen

# 3. Installieren, migrieren, seeden
npm install
npx prisma migrate dev
npm run db:seed           # verknüpft Demo-CRM-Daten mit Ihrem ersten Arbeitsbereich

# 4. Starten
npm run dev               # http://localhost:3000
```

Besuchen Sie `/` für die Marketing-Landingpage, oder gehen Sie direkt zu
`/de/register`, um einen Arbeitsbereich zu erstellen. In der Entwicklung
bietet die Login-Seite auch einen Ein-Klick-Button **„Mit
Demo-Arbeitsbereich fortfahren"** (siehe [Demo-Modus](#demo-modus)).

> **Ports:** Postgres ist in `docker-compose.yml` auf **5433** gemappt
> (passen Sie `DATABASE_URL` an, falls Sie das ändern). Mailpit nutzt
> 1025 (SMTP) / 8025 (Web).

## Stack

- **Next.js 16** (App Router, RSC) + TypeScript strict
- **PostgreSQL 16** + **Prisma 7** (Multi-File-Schema, Treiber-Adapter —
  `@prisma/adapter-pg`)
- **Better Auth** (E-Mail/Passwort, DB-Sessions) + eine eigene
  Mandanten-/RBAC-Schicht
- **Tailwind CSS v4** + ein eigenes OKLCH-Designsystem (kein Standardtemplate)
- TanStack-artige Datentabellen, **dnd-kit** Kanban, **React Flow**
  Beziehungsgraph, **react-grid-layout** Dashboards, **Recharts**, **cmdk**
  Command Palette
- **next-intl** i18n — Englisch, Deutsch und Persisch (vollständiges RTL,
  Vazirmatn-Schrift)
- **Manrope + DM Sans** Typografie für die öffentliche Marketing-Seite
  (Vazirmatn für Persisch, passend zum Rest der App)

---

## Funktionskatalog

### Plattform & Mandantenfähigkeit

- **Mandantenfähigkeit auf Datenebene** — eine Prisma-Client-Erweiterung
  fügt `tenantId` aus einem AsyncLocalStorage-basierten `PlatformContext`
  ein, sodass mandantenübergreifender Zugriff strukturell unmöglich ist,
  nicht nur pro Handler gefiltert. Ein separater `rawDb`-Client existiert
  für echt mandantenübergreifenden Systemcode (Seeding, Admin-Tools).
- **Mandanten-Provisionierung** — neue Arbeitsbereiche werden über einen
  geführten Onboarding-Flow erstellt, der den Mandanten, die
  Owner-Rolle und Standard-Pipeline/-Stufen anlegt.
- **Event Bus + dauerhaftes Log** — jede Engine sendet typisierte
  Ereignisse an einen In-Process-Bus mit persistenter `Event`-Tabelle;
  Timeline, Activity Feed, Analytics, Automatisierung, Benachrichtigungen,
  Audit und Integrationen abonnieren alle dasselbe Log.
- **Feature Management** — Modulaktivierung und Beta-/Experimentier-Flags
  werden als `Feature`- + `FeatureGrant`-Datensätze modelliert, pro Anfrage
  ausgewertet (`hasFeature(ctx, key)`).
- **Metadaten-Kernel** — eingebaute Entitäten (Contact, Deal, Policy, …)
  registrieren ihre Struktur über dasselbe versionierte JSONB-Metadaten-
  register, das auch zur Laufzeit erstellte Datensätze antreibt.

### Authentifizierung & Zugriff

- **Better Auth** E-Mail/Passwort-Sessions, DB-gestützt, same-origin
  (funktioniert auf jedem Port/Host ohne fest codierte Basis-URL).
- **RBAC** — Rolle → Eigentümerschaft → Team-Sichtbarkeit →
  Datensatz-Einschränkungsregeln → Admin-Override, via `can()`/`authorize()`.
  Berechtigungsschlüssel sind `"<modul>.<entität>.<aktion>"` mit
  Wildcard-Unterstützung (`crm.*.read`, `*`).
- **Systemrollen** pro Mandant vorbelegt: Owner, Administrator, Manager,
  Employee, Client (Portal).
- **Feldebenen-Regeln** und ein vollständiges `AuditLog` (Auth-, Daten-,
  Datei-, Berechtigungs-, Export-, Admin-, Sicherheits-, KI-Kategorien) mit
  einem Viewer in der Administration.
- **Ein-Klick-Demo-Login** — siehe [Demo-Modus](#demo-modus).

### Plattformverwaltung

- **Selbstständiges Super-Admin-Bootstrapping** — der allererste Nutzer, der
  sich auf einer frischen Installation registriert, wird automatisch als
  `isSuperAdmin` markiert — kein manueller DB-Eingriff oder Seed-Schritt
  nötig. Erneut vergebbar: Existiert aktuell kein Super-Admin, wird die
  nächste Registrierung einer.
- **`/platform-admin`-Panel** — eine mandantenübergreifende Oberfläche
  (getrennt vom mandantenspezifischen Verwaltungsbereich), sichtbar nur für
  den Super-Admin, mit eigenem Eintrag im Module Rail:
  - **Preispläne** — vollständiges CRUD über die auf der öffentlichen
    Preisseite gezeigten Pläne, je Sprache übersetzt (Name, Beschreibung,
    Monats-/Jahrespreis, Button-Text, Funktionsliste), mit Reihenfolge- und
    „Empfohlen"-Flag.
  - **Landingpage-Inhalte** — sprachspezifische Textüberschreibungen für die
    wichtigsten Landingpage-Texte (Hero, CTA-Banner, Preis-Disclaimer); ein
    leeres Feld fällt auf die eingebaute Übersetzung zurück — kein Redeploy
    für eine schnelle Textänderung nötig.
  - **Branding** — Logo/Favicon als extern gehostete Bild-URLs (kein
    Datei-Upload — Vercels serverloses Dateisystem ist zur Laufzeit
    schreibgeschützt), angewendet überall dort, wo das SOBI-CRM-Wortzeichen
    erscheint: Arbeitsbereichs-Rail, Anmelde-/Registrierungs-Panel,
    öffentliche Vertragsseite und Landingpage/Footer.
  - **Ankündigungsleiste** — ein Aktions-/Hinweisstreifen (Rabattcodes,
    Ankündigungen) oben auf der öffentlichen Landingpage und im
    In-App-Arbeitsbereich, mit sprachspezifischem Text, Hintergrund-/
    Textfarbe und einer scrollenden Laufschrift (links↔rechts oder statisch)
    per reinem CSS.
  - Abgesichert durch `requireSuperAdmin()`, ein plattformweites Flag,
    getrennt von den mandantenbezogenen `can()`/`authorize()`-Prüfungen, die
    sonst überall im Produkt verwendet werden.
- **Rich-Text-Editor** — ein vollständiger TipTap-Editor (fett/kursiv/Listen/
  Links) treibt jedes vom Super-Admin verfasste Textfeld an (Landingpage-
  Überschreibungen, das Hover-Bearbeitungspanel unten); gespeichertes HTML
  wird serverseitig bereinigt (`isomorphic-dompurify`), bevor es persistiert
  oder gerendert wird.
- **Hover-Bearbeitung im Live-CMS-Modus** — ein „Zurück zur Hauptseite"-Eintrag
  unten im Module Rail (nur Super-Admin) öffnet die öffentliche Landingpage,
  während man weiterhin angemeldet bleibt. Dort zeigt das Überfahren mit der
  Maus über jeden bearbeitbaren Text (Hero, CTA-Banner, Preis-Disclaimer)
  einen Stift, der den Rich-Text-Editor direkt vor Ort öffnet — ohne das
  passende Feld zuerst im Admin-Panel suchen zu müssen.

### CRM-Kern

- **Kontakte & Firmen** — vollständiges CRUD, Firmen-Find-or-Create mit
  gegen LIKE-Injection abgesichertem Matching, Kontakt↔Firma-Beziehungen,
  Tags, Notizen.
- **Leads** — Website-Formular- und Chatbot-Erfassung in einer gemeinsamen
  Warteschlange, jeder Lead trägt `source`, `conversationId` (verknüpft ein
  Chatbot-Transkript) und frei definierbare `customFields`.
- **Deals & Pipeline** — eine generische Stufen-Engine (Kanban-Board, native
  Drag-and-Drop), wiederverwendet von Deals und fünf
  Branchenmodul-Pipelines; konfigurierbare Stufen mit `isWon`/`isLost`-Flags,
  die den Deal-Status automatisch steuern.
- **Aktivitäten & Notizen** — eine Timeline pro Datensatz (Anrufe, E-Mails,
  Meetings, Notizen, Stufenwechsel, Dateien, Systemereignisse), automatisch
  gespeist von allem, was Ereignisse sendet.
- **Tags & Beziehungen** — ein generisches `Relationship`-Modell plus ein
  eigenständiger **Beziehungsgraph** (React Flow), der Verbindungen
  zwischen beliebigen Datensätzen visualisiert.
- **CSV-Import/-Export** für Kern-Entitäten.

### Lead-Konvertierung & KI-Bewertung

- **Bewusster Konvertierungs-Flow** (`convertLead`) — macht aus einem
  rohen Lead einen Kontakt, findet oder erstellt dessen Firma, erstellt
  optional einen Deal und legt die ursprüngliche Lead-Nachricht als erste
  Timeline-Notiz ab. Idempotent: eine erneute Konvertierung liefert den
  bestehenden Kontakt zurück, statt ihn zu duplizieren.
- **KI-Lead-Bewertung** — ein Score von 0–100 mit einer Begründung.
  Fällt auf eine transparente, erklärbare **Heuristik** zurück
  (Vollständigkeit von E-Mail/Telefon/Firma/Quelle/Nachricht), wenn kein
  KI-Anbieterschlüssel konfiguriert ist, sodass die Funktion immer
  vorführbar ist.
- **Gesprächszusammenfassung** — findet die mit einem Kontakt verknüpfte
  Chatbot-`Conversation` und fasst sie in 3–5 Stichpunkten auf der
  „Kundenwissen"-Karte des Kontakts zusammen.

### KI-Betriebssystem

Pipeline: `Anbieter → Prompt-Bibliothek → Skills → Tools → Agenten-Schleife
→ Action Center → menschliche Freigabe → KI-Audit`.

- **Anbieter** — OpenAI, OpenRouter und ein lokaler OpenAI-kompatibler
  Endpunkt, pro Mandant wählbar. Ohne konfigurierten Schlüssel liefert ein
  schlüsselloser **Mock-Anbieter** für jede KI-Funktion nützliche
  heuristische Ausgaben — nichts stürzt ab oder tut mangels API-Schlüssel
  stillschweigend nichts.
- **Skills** — Datensatzzusammenfassung, Vorschlag für den nächsten Schritt
  (als ausstehende Aktion), E-Mail-Entwurf, Erkennung fehlender Dokumente
  (regelbasiert, kein LLM), Lead-Bewertung, Gesprächszusammenfassung und
  Inhaltsvorschlag (siehe
  [Wissensdatenbank](#wissensdatenbank--ki-inhaltsvorschläge)).
- **Tool-aufrufender Assistent („Chat mit CRM")** — eine begrenzte
  Agenten-Schleife (max. 4 Runden) mit vier schreibgeschützten,
  zod-validierten Tools — `query_leads`, `query_deals`, `query_activities`,
  `crm_stats` — direkt aus der Datenbank gespeist. Der System-Prompt
  verlangt vom Modell, ein Tool aufzurufen statt eine Zahl zu erfinden;
  der Mock-Anbieter erzwingt dies mechanisch, indem er nur echte
  Tool-JSON-Daten widerspiegelt. Antworten werden wortweise gestreamt.
- **Action Center** — KI-Skills, die Daten schreiben würden, tun dies nie
  direkt; sie erstellen eine ausstehende `AiAction`, die ein Mensch
  explizit **genehmigt** oder **ablehnt**. Genehmigungen senden
  `ai.action_approved` und werden unter der KI-Kategorie protokolliert.
  Die Kampagnen-E-Mail-Generierung folgt demselben Prinzip: KI entwirft
  einen Empfänger nach dem anderen, ein Mensch prüft jede Nachricht, und
  nichts wird ohne ausdrückliche Freigabe versendet.
- **KI-Audit** — jeder KI-Aufruf wird in `AiLog` protokolliert (Skill,
  Anbieter, Ein-/Ausgabezusammenfassung, Akteur).

### Verträge

- **Automatisch nummerierte** Verträge (`CTR-<Jalali-Jahr>-<Sequenz>`),
  generiert aus einem Deal/Kontakt/Firma, mit einer 10-Artikel-Vorlage für
  persische Beratungsverträge, einem 40/30/30-Zahlungsplan und echten
  eingesetzten Werten.
- **Öffentliche Freigabeseite** — ein nicht erratbarer `shareToken`-Link,
  über den der Kunde prüft, druckt (eigenes Print-Stylesheet) und
  **online akzeptiert**; Ansichts-Tracking (`sent → viewed`) und Annahme
  (`viewed → accepted`) werden serverseitig **awaited** (nicht
  fire-and-forget), damit ein serverloser Response-Abbruch den Schreibvorgang
  nicht verlieren kann.
- **Status-Lebenszyklus**: Entwurf → gesendet → angesehen → akzeptiert /
  storniert, mit Bearbeitungssperre nach Annahme.
- **KI-Umformulierung** des Vertragstexts und **KI-Follow-up**-Nachrichten.
- Ereignisveröffentlichung im öffentlichen Kontext
  (`contract.created|sent|viewed|accepted`) funktioniert auch ohne
  authentifizierte Session, über einen `publicContext(tenantId)`-Helfer.

### E-Mail-Kampagnen

- **Segment-Builder-Modul**, entkoppelt von der Kampagnen-Engine —
  benannte, codegesteuerte Zielgruppen-Resolver (verlorene Leads,
  nicht nachverfolgte Leads, verlorene Deals, gewonnene Kunden), jeweils
  auf 20 Empfänger begrenzt.
- **KI-Personalisierung pro Empfänger** — eine Anfrage nach der anderen
  (nie parallel), ein System-Prompt mit ≤120 Wörtern/kein Hard-Sell/CTA für
  kostenlose Beratung, mit Mock-Anbieter-Fallback ohne KI-Schlüssel.
- **Menschliche Prüfung im Review-Loop** — jede generierte E-Mail ist
  bearbeitbar, kann neu generiert oder übersprungen werden und wird erst
  nach expliziter Freigabe pro Empfänger versendet.
- **Strikte Zustell-Buchführung** — Kampagnenversand nutzt
  `emailChannel.sendStrict` (wirft echte SMTP-Fehler weiter, sodass ein
  Versand als `failed` erfasst wird statt still als „erfolgreich" zu
  gelten).

### Wissensdatenbank & KI-Inhaltsvorschläge

- Eine schlanke interne **Wissensdatenbank** (`KnowledgeArticle`: Titel,
  Text, Tags), editierbar aus dem CRM-Arbeitsbereich.
- **KI-Inhaltsvorschlags-Skill** — bewertet für einen Lead jeden Artikel
  nach Schlüsselwort-/Tag-Relevanz (erfindet nie einen Artikel), wählt die
  beste Übereinstimmung und entwirft eine kurze, fundierte
  Follow-up-Nachricht, die nur auf den echten Inhalt dieses Artikels
  verweist. Fällt ohne KI-Schlüssel auf eine deterministische Vorlage
  zurück.

### Berichte & Einblicke

- **Tabellarische Berichte** (Deals, Pipeline, Aufgaben, Kontakte) mit
  CSV-Export, protokolliert.
- **Visuelle Einblicke-Seite** (`/mgmt/reports/insights`) — Conversion-
  Trichter, Lead-Quellen-Aufschlüsselung und 12-Monats-Umsatz nach
  **Jalali-Kalender** (echte Jalali-Monatsbuckets über `jalaali-js`),
  gerendert mit Recharts im Stil der App-eigenen Dashboard-Widgets.

### Formular-Engine

- Drag-and-Drop-**Formular-Builder**: Abschnitte/Tabs, bedingte Sichtbarkeit
  und berechnete Felder (über den gemeinsamen Business-Rules-Ausdrucks-
  Evaluator), aus Metadaten generierte Zod-Validierung, mehrsprachige
  Labels, einfache Wiederholfelder, Versionierung, wiederverwendbare
  Vorlagen.

### Dateien, Aufgaben, Kalender, Benachrichtigungen

- **Dokument-/Datei-Engine** — sicherer Upload, Kategorien, Versionen,
  Vorschau, Ablauf, Pflichtdokument-Checklisten pro Datensatz.
- **Aufgaben** — Unteraufgaben, Wiederholung, Abhängigkeiten, Kommentare,
  Überfälligkeitserkennung per geplantem Job.
- **Kalender** — Monats-/Wochenansichten, Verfügbarkeit,
  Buchungskonflikterkennung.
- **Benachrichtigungen** — In-App-Center, E-Mail-Kanal, Präferenzen pro
  Nutzer, Erinnerungs-/Überfälligkeits-Scheduler.

### Dashboards

- **Dashboard-Builder** — eine `react-grid-layout`-Canvas mit einer
  Widget-Bibliothek, persönlichen/Rollen-/Mandanten-/geteilten Layouts und
  versionierten Vorlagen.

### Workflow-Builder & Automatisierung

- **Visueller Workflow-Builder** — Stufen/Schritte, Rules-geleitete
  Freigabeketten, Bedingungen, Timer, SLAs, Eskalationen, Pflichtfelder/
  -dokumente, Vorlagen, Versionierung.
- **Automatisierungs-Engine** — Ereignis-/Zeitplan-Trigger → Regeln →
  Aktionen (Aufgabe erstellen, benachrichtigen, Feld aktualisieren, Stufe
  verschieben, E-Mail senden, Webhook aufrufen, KI-Skill auslösen), mit
  vollständigem `AutomationRun`-Log.

### Integrationen

- **Ausgehende Webhooks** — signiert (`HMAC-SHA256`, `X-Sobi-Signature` /
  `X-Sobi-Event`-Header), pro Mandant nach Ereignistyp abonnierbar.
- **API-Schlüssel** für die öffentliche REST-API.
- OAuth- und Drittanbieter-Gerüst (Google, Microsoft, WhatsApp, Telegram,
  Stripe, PayPal) ist konzipiert, aber nicht an echte Zugangsdaten
  angebunden — siehe [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Branchenmodule

| Modul | Zusammensetzung |
|---|---|
| **Versicherung** *(voll umgesetzter Referenzbau)* | Produkte, Versicherer, Policen mit Verlängerungserinnerungen, Schäden, Provisionen |
| **Kredit & Banking** | Anträge, Bankpartner, verschlüsseltes Antragstellerprofil, Bonitätscheckliste |
| **Immobilien** | Objekte, Käufer-/Verkäuferrollen, Besichtigungen, Angebote, Verträge |
| **Vertrieb & Agentur** | Kampagnen, Angebote, Ziele, Leistung |
| **Einwanderung** | Visum-/Genehmigungsfälle, Behördeneinreichungen, Dokumentvorlagen, Fristen |
| **Friseursalon** | Leistungen, Personal, Stühle, Termine, Laufkundschaft |
| **Kosmetikstudio** | + Behandlungsserien, Vorher/Nachher-Fotos, Einwilligungsformulare |
| **Restaurant** | Tischreservierungen, Gästeallergien/-präferenzen, Catering-Leads |

### Low-Code-Studio

- **Entity Builder** — eigene Entität erstellen (Felder, Beziehungen,
  Berechtigungen), die eine generierte CRUD-API, Listen-/Detailansichten,
  Suche und Timeline-Anbindung erhält.
- **Regel-Editor**, **Vorlagen-Editor** und **Versionshistorie**-Panels,
  gemeinsam genutzt von jedem Builder.
- **Command Platform** — eine `Strg+K`-Befehlspalette.
- **Universelle Suche** — Postgres-Volltextsuche über Entitäten, Dateien,
  Notizen, Aktivitäten, Berichte und Befehle.

### Sicherheit, Audit & DSGVO

- Argon2-Passwort-Hashing, DB-Sessions (httpOnly, SameSite), Rate-Limiting.
- CSP-, HSTS- und weitere Sicherheitsheader auf jeder Antwort.
- AES-256-GCM-Feldverschlüsselung für sensible Daten.
- Soft-Delete + Papierkorb für Kern-Entitäten; vollständiger Audit-Trail.
- DSGVO: Einwilligungsdatensätze, Export personenbezogener Daten
  (`/api/v1/gdpr/contacts/:id/export`), Löschworkflow mit
  Anonymisierung + konfigurierbaren Aufbewahrungsrichtlinien.
- Strukturiertes Logging (Pino) plus ein Admin-Health-Dashboard.

### Marketing-Landingpage

- Eine vollständige öffentliche Marketing-Seite unter `/` (nur für
  abgemeldete Besucher sichtbar — eine authentifizierte Session
  leitet weiterhin direkt zu `/crm` um), visuell unabhängig vom
  In-App-Designsystem (eigene Pinien-/Tiel-Palette, Manrope/DM-Sans-
  Typografie).
- Abschnitte: Sticky-Nav, Hero (mit einem live gerenderten
  Mini-Leads-Tabellen-Mockup, kein Screenshot), ein dunkler
  Problem-/Lösungs-Abschnitt, eine Vier-Schritte-Workflow-Erklärung, eine
  Live-Analytics-Vorschau, Branchen-Lösungs-Tabs, illustrative Preise
  (ausdrücklich als „kein reales kommerzielles Angebot" gekennzeichnet),
  ein FAQ und ein Demo-/Registrierungs-CTA-Banner.
- Vollständig lokalisiert (Englisch/Deutsch/Persisch, RTL für Persisch).
- „Demo testen" / „Demo-Arbeitsbereich betreten" lösen denselben
  Ein-Klick-Demo-Login wie auf der Anmeldeseite aus.
- **Preispläne, Hero-/CTA-Texte und das Logo** stammen alle live aus dem
  Plattformverwaltungs-Panel (mit statischen Fallbacks) — siehe
  [Plattformverwaltung](#plattformverwaltung).
- Ein echter **Monats-/Jahres-Preis-Umschalter** — beim Umschalten ändern
  sich die tatsächlichen Zahlen je Tarif (kein rein kosmetischer
  Label-Tausch), plus ein „jährlich abgerechnet"-Hinweis.
- **Vollständig für Mobilgeräte optimiert**: ein echtes Hamburger-Menü (kein
  versteckter Nav-Bereich) zeigt unterhalb von `lg` jeden Nav-Link, den
  Sprachumschalter und die Anmelde-/Demo-/Registrierungs-Aktionen, plus eine
  **untere Tableiste** für schnellen Daumenzugriff auf Funktionen, Module,
  Preise und Demo testen beim Scrollen (deren „Menü"-Button dasselbe
  vollständige Panel öffnet wie das Hamburger-Icon); ebenso für die
  Anmeldeseite, deren Markenpanel sich auf Mobilgeräten über das Formular
  stapelt statt zu verschwinden.
- Auch der **In-App-Arbeitsbereich** ist mobil optimiert: Das Module Rail —
  auf Desktop immer sichtbar, ein- und ausklappbar zwischen reiner
  Icon-Ansicht und einer beschrifteten, erweiterten Ansicht (Einstellung
  bleibt sitzungsübergreifend gespeichert) — wird auf Mobilgeräten zu einer
  aufklappbaren Schublade mit demselben Ein-/Ausklapp-Steuerelement (geöffnet
  über ein Hamburger-Icon in der Topbar). Die Unternavigation je
  Arbeitsbereich (Dashboard, Kontakte, …) läuft auf jeder Bildschirmgröße als
  horizontale, scrollbare Tableiste oberhalb des Seiteninhalts, und jede
  Datentabelle scrollt horizontal statt abzuschneiden.

### Branding & Internationalisierung

- Produktname und Marke: **SOBI CRM**, mit einem echten Logo-/Favicon-
  Asset, das durchgängig verwendet wird — in der App-Sidebar, im
  Anmelde-/Registrierungs-Panel, auf der öffentlichen Vertragsseite und
  auf der Landingpage.
- Drei Sprachen — Englisch, Deutsch, Persisch — mit vollständiger
  Rechts-nach-links-Unterstützung für Persisch.
- **Vazirmatn** ist überall die Schriftart für die persische Sprache: im
  Hauptarbeitsbereich (über einen `:lang(fa)`-CSS-Variablentausch von
  `--font-ui`) und auf der Landingpage (über einen äquivalenten
  `--landing-font-*`-Tausch).
- Jalali-(Shamsi-)Kalenderunterstützung für Vertragsnummerierung und den
  Umsatzbericht.

### Demo-Modus

- Ein **Ein-Klick-Button „Mit Demo-Arbeitsbereich fortfahren"** auf der
  Login-Seite und der Landingpage, der als vorbelegter Demo-Nutzer
  anmeldet — keine Registrierung zum Ausprobieren nötig.
- **Aus Produktions-Builds ausgeschlossen** — geprüft, dass er inklusive
  des Zugangsdaten-Strings vollständig aus dem Produktions-Client-Bundle
  entfernt ist.
- Das Seed-Skript befüllt einen realistischen Demo-Mandanten mit Firmen,
  Kontakten, Deals, offenen und konvertierten Leads, einem
  Wissensdatenbank-Artikel, einem gesendeten Vertrag und einer
  Entwurfskampagne.

---

## Architektur im Überblick

```
src/
  core/       Plattform-Kernel — Auth, Mandantenfähigkeit, RBAC, Event Bus,
              Jobs, Metadaten, Regeln, Vorlagen, Versionen, Features,
              Befehle, Observability, Security, DSGVO (keine Business-Logik)
  engines/    Wiederverwendbare Business Engines — crm, pipeline, booking,
              workflow, forms, documents, files, finance, notifications,
              dashboards, reporting, analytics, timeline, feed, graph,
              search, automation, integrations, ai, entity-builder, portal,
              contracts, campaigns, knowledge
  modules/    Schlanke Business-Module, die Engines zusammensetzen
  components/ Designsystem: ui/-Primitive, patterns/, layout/, brand/
  app/        Next.js-Routen — [locale]/(auth|app|public|landing), api/v1
```

Abhängigkeitsregel (lint-geprüft): **modules → engines → core**, nie seitlich.

## Skripte

| Befehl | Zweck |
|---|---|
| `npm run dev` | Dev-Server |
| `npm run build` / `start` | Produktions-Build / Serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest-Testsuite |
| `npm run db:migrate` / `db:generate` / `db:seed` / `db:studio` | Prisma |

## Deployment

Siehe [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) für Umgebungsvariablen,
Plattformoptionen und die Release-Checkliste. Wichtig für serverlose
Plattformen (Vercel u. Ä.):

- `DATABASE_URL` muss auf eine **erreichbare, verwaltete Postgres-Instanz**
  zeigen (Neon, Supabase, RDS, …) — das lokale Docker-Postgres aus der
  Entwicklung ist von einer deployten Umgebung aus nicht erreichbar. Wenn
  Ihr Anbieter Verbindungen über einen Pooler leitet (z. B. Supabases
  pgbouncer), setzen Sie zusätzlich `DIRECT_URL` auf eine **ungepoolte**
  Verbindung — `prisma migrate deploy` benötigt sie, da der
  Transaktionsmodus des Poolers Schema-Migrationen nicht unterstützt.
- `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` und
  `FIELD_ENCRYPTION_KEY` auf echte Produktionswerte setzen.
- Der **lokale Datei-Speichertreiber funktioniert nur auf einem
  persistenten Einzel-Host** — auf serverlosen Plattformen vor
  Datei-Uploads auf die S3-kompatible Implementierung umstellen.
- `npx prisma migrate deploy` muss vor (oder als Teil) dem ersten Deploy
  gegen die Produktionsdatenbank laufen.

## Dokumentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/AI-OS.md`](docs/AI-OS.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/MODULES.md`](docs/MODULES.md)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- [`docs/TESTING.md`](docs/TESTING.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
