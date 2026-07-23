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

- **Mandantenfähigkeit mit Defense-in-Depth** — eine fail-closed
  Prisma-Capability injiziert den unveränderlichen AsyncLocalStorage-
  Mandantenkontext, während erzwungenes PostgreSQL-RLS dieselbe Grenze
  unabhängig durchsetzt. Identity und eng begrenzte, allowlisted
  Systemclients verwenden getrennte Least-Privilege-Datenbankrollen; einen
  allgemeinen `rawDb`-Bypass gibt es nicht.
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
  Tags, Notizen. Die Liste zeigt Geschäft/Dienstleistung (Firmenname oder
  eine Interessens-Notiz bei Einzelkontakten), Telefon, E-Mail,
  Registrierungsdatum, Lifecycle-Stufe und Lead-Quelle (Website, manuell,
  Chatbot, Telegram, Web-Chat). Die Timeline der 360°-Detailseite ist eine
  echte durchgängige Historie — zusammengeführt aus der Aktivität des
  Kontakts selbst **und der des ursprünglichen Leads** —, sodass sie vom
  ersten eingehenden Moment bis zur Konvertierung und darüber hinaus lesbar
  ist, mit einem manuellen „Aktivität hinzufügen"-Steuerelement (Anruf/
  Meeting protokollieren oder eine echte verknüpfte Aufgabe als
  Follow-up-Erinnerung erstellen, ebenfalls sichtbar im Ops → Aufgaben
  Arbeitsbereich). Firmen erhalten dieselbe Behandlung — eine bearbeitbare
  Detailkarte und dasselbe „Aktivität hinzufügen"-Steuerelement — plus eine
  **aufgerollte Timeline**: Aktivität, die bei einem der Kontakte der Firma
  protokolliert wird, erscheint auch dort, beschriftet mit dem Namen dieses
  Kontakts, sodass die Beziehung über jede Person in diesem Unternehmen
  hinweg synchron bleibt.
- **Leads** — Website-Formular- und Chatbot-Erfassung in einer gemeinsamen
  Warteschlange, jeder Lead trägt `source`, `industry` (Tätigkeitsfeld),
  `conversationId` (verknüpft ein Chatbot-Transkript) und frei definierbare
  `customFields`. Eine kartenbasierte Liste mit Status-Filtern, Suche und
  CSV-Export; ein manueller „Neuer Lead"-Einstiegspunkt neben dem
  öffentlichen Website-Formular; und eine vollständige Detailseite
  (`/crm/leads/[id]`) mit einer bearbeitbaren Detailkarte, KI-Bewertung,
  einem KI-Inhaltsvorschlag und dem unten beschriebenen erweiterten
  Konvertierungsdialog.
- **Deals & Pipeline** — eine generische Stufen-Engine (Kanban-Board, native
  Drag-and-Drop), wiederverwendet von Deals und fünf
  Branchenmodul-Pipelines; konfigurierbare Stufen mit `isWon`/`isLost`-Flags,
  die den Deal-Status automatisch steuern. Die Standard-Deal-Pipeline hat
  fünf aktive Stufen — Neu, In Prüfung, Beratung, Angebot gesendet,
  Vertragsphase — plus die beiden Endzustände Gewonnen/Verloren. Jede Karte
  hat außerdem ein „In beliebige Stufe verschieben"-Menü als
  tap-freundliche Alternative zu Drag-and-Drop; unter dem Board fasst ein
  Streifen abgeschlossene/offene Deals nach gewonnenem, verlorenem und noch
  offenem Wert und Anzahl zusammen.
- **Aktivitäten & Notizen** — eine Timeline pro Datensatz (Anrufe, E-Mails,
  Meetings, Notizen, Stufenwechsel, Dateien, Systemereignisse), automatisch
  gespeist von allem, was Ereignisse sendet.
- **Globaler Activity Feed** (`/crm/activity`) — jedes relevante
  Plattform-Ereignis in einem einzigen chronologischen, filterbaren Strom:
  Entitätstyp- und Datumsbereich-Filter, jeder Eintrag zeigt den echten
  Namen des Akteurs und verlinkt direkt zum betroffenen Datensatz, mit
  vollständig lokalisierten Labels für alle ~45 Ereignisarten (en/de/fa).
  Eine „Aktivität protokollieren"-Aktion lässt einen Nutzer einen Anruf,
  ein Meeting, eine E-Mail oder eine Notiz gegen einen beliebigen Kontakt/
  eine Firma/einen Deal/Lead protokollieren, gefunden über eine
  Type-Ahead-Auswahl — derselbe Eintrag erscheint auch auf der eigenen
  Timeline dieses Datensatzes.
- **Tags & Beziehungen** — ein generisches `Relationship`-Modell plus ein
  eigenständiger **Beziehungsgraph** (`/crm/graph`, React Flow): jede Firma,
  jeder Kontakt und jeder Deal wird als farbcodierter, verschiebbarer Block
  gerendert (Icon + Titel + eine Faktenzeile — eine Firma zeigt ihre
  Kontakt-/Deal-Anzahl, ein Kontakt zeigt seine Firma, ein Deal zeigt seinen
  Betrag), automatisch als Baum von links nach rechts angeordnet, sodass die
  Form eines Accounts auf einen Blick erkennbar ist. Blöcke lassen sich frei
  verschieben; ein Klick auf einen Block fokussiert seine Verbindungen
  (Nachbarn und deren Verknüpfungen leuchten auf, alles andere wird
  abgedunkelt); Typ-Filter-Chips blenden Firmen/Kontakte/Deals ein oder aus;
  eine Minimap sowie Pan/Zoom helfen bei größeren Graphen. Über die durch
  bestehende Fremdschlüssel implizierten Verbindungen hinaus kann man **eine
  neue Verknüpfung durch Ziehen von einem Block zu einem anderen erstellen**
  — sie wird als echte `Relationship`-Zeile gespeichert (kein reiner
  visueller Entwurf) und lässt sich von der Leinwand aus auch wieder
  entfernen; die automatisch abgeleiteten Kanten (die einen echten
  Fremdschlüssel an anderer Stelle widerspiegeln) lassen sich hier
  absichtlich nicht löschen.
- **CSV-Import/-Export** für Kern-Entitäten.

### Lead-Konvertierung & KI-Bewertung

- **Bewusster Konvertierungs-Flow** (`convertLead`) — macht aus einem
  rohen Lead einen Kontakt, findet oder erstellt dessen Firma, erstellt
  optional einen Deal und legt die ursprüngliche Lead-Nachricht als erste
  Timeline-Notiz ab. Idempotent: eine erneute Konvertierung liefert den
  bestehenden Kontakt zurück, statt ihn zu duplizieren. Der
  Konvertierungsdialog erfasst reichhaltigere Felder, als der rohe Lead
  mitbringt — Vor-/Nachname, Berufsbezeichnung, korrigierte E-Mail/Telefon/
  Firma, eine Branche, ein Dienstleistungsinteresse für private
  (Nicht-Geschäfts-)Leads und eine zusätzliche Notiz — ohne dabei jemals
  den Lead selbst umzuschreiben.
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
  generiert aus einem Deal/Kontakt/Firma, verknüpft mit dem Namen des
  konkreten Kontakts in der Vertragsliste. **Vier auswählbare
  Text-Vorlagen** (Beratungsleistungen, Softwareentwicklung, monatliches
  Retainer, Einzelprojekt), jede ein vollständiges persischsprachiges
  Rechtsdokument mit echten eingesetzten Werten.
- **Briefkopf- und Digitalsignatur-Designer** (im Modul, mandantenweit):
  Firmenname/Logo/Adresse/Fußzeile, ein Unterzeichner-Name + -Titel, und ein
  admin-konfigurierbarer **Jalali-/Gregorianischer**-Kalender für Dokumente.
- **Digitale Signatur vor dem Versand erforderlich** — ein Vertrag muss
  digital signiert sein (`applySignature`), bevor er versendet werden kann;
  `sendContract` verweigert sonst die Ausstellung eines Freigabelinks. Der
  Signaturblock (Unterzeichner-Name/-Titel, Signaturdatum und ein lokal
  generierter QR-Code — nie an einen Drittanbieter-QR-Dienst gesendet, da
  er den nicht erratbaren Freigabe-Token kodiert) erscheint am Ende jedes
  signierten Dokuments, sowohl auf der öffentlichen Seite als auch im
  herunterladbaren PDF.
- **Vorvertrags-Export** — eine mit Wasserzeichen versehene
  („VORVERTRAG" + Briefkopf) PDF-Vorschau für die informelle Kundenprüfung
  ab dem Entwurfsstadium, generiert über
  `/crm/contracts/[id]/print?mode=pre`; enthält nie die digitale Signatur.
  Das finale signierte PDF (`?mode=final`) ist verfügbar, sobald signiert
  wurde. Beide Routen nutzen den nativen Browser-Druck-zu-PDF (keine
  serverseitige Rendering-Abhängigkeit) mit einem eigenen Print-Stylesheet.
- **Öffentliche Freigabeseite** — ein nicht erratbarer `shareToken`-Link,
  über den der Kunde das briefkopf-gebrandete Dokument prüft, den
  Signatur+QR-Block sieht und **online akzeptiert**, indem er seinen
  eigenen Namen plus die auf der Seite gezeigte Vertragsnummer eingibt
  (ein leichtgewichtiger Gegencheck); ein QR-Scan öffnet dieselbe Seite.
  Ansichts-Tracking (`sent → viewed`) und Annahme (`viewed → accepted`)
  werden serverseitig **awaited** (nicht fire-and-forget), damit ein
  serverloser Response-Abbruch den Schreibvorgang nicht verlieren kann.
- **Status-Lebenszyklus**: Entwurf → digital signiert → gesendet →
  angesehen → akzeptiert / storniert, mit Bearbeitungssperre nach Annahme.
- **KI-Umformulierung** des Vertragstexts und **KI-Follow-up**-Nachrichten.
- Ereignisveröffentlichung im öffentlichen Kontext
  (`contract.created|sent|viewed|accepted`) funktioniert auch ohne
  authentifizierte Session, über einen `publicContext(tenantId)`-Helfer,
  der den Schreibvorgang in einen minimalen `PlatformContext` einbettet —
  sodass Automatisierung/Webhooks für diese Ereignisse weiterhin auslösen.

### E-Mail-Kampagnen

- **Segment-Builder-Modul** (`engines/campaigns/segments.ts`), entkoppelt
  von der Kampagnen-Engine — benannte, codegesteuerte Zielgruppen-Resolver
  (verlorene Leads, nicht nachverfolgte Leads, verlorene Deals, gewonnene
  Kunden), jeweils auf 20 Empfänger pro Kampagnenlauf begrenzt. Jedes
  Segment zeigt außerdem uncapped **Live-Statistiken** (echte Gesamtgröße,
  wie viele per E-Mail erreichbar sind, und — bei deal-basierten Segmenten —
  Gesamtwert) im Kampagnen-Erstellungsdialog, bevor man sich festlegt.
  <br>
- **KI-Personalisierung pro Empfänger** — eine Anfrage nach der anderen
  (nie stapelweise/parallel), ein System-Prompt mit ≤120 Wörtern/kein
  Hard-Sell/CTA für kostenlose Beratung, mit Mock-Anbieter-Fallback ohne
  KI-Schlüssel. Funktioniert sowohl einzeln pro Empfänger als auch als
  **Massen-„Alle generieren"** (und, sobald Entwürfe freigegeben sind, ein
  **Massen-„Alle bereiten senden"**) — beide weiterhin strikt sequenziell,
  sodass eine Kampagne nie eine Welle paralleler Anfragen an den
  KI-Anbieter oder den E-Mail-Anbieter feuert.
- **Menschliche Prüfung im Review-Loop** — jede generierte E-Mail ist
  bearbeitbar, kann neu generiert oder übersprungen werden und wird erst
  nach Freigabe versendet (einzeln, oder über die Massen-„Alle bereiten
  senden"-Aktion nach Durchsicht). Die Kampagne selbst wird automatisch
  abgeschlossen (`status: "sent"`), sobald jeder Empfänger einen
  Endzustand erreicht hat, und die Listenansicht zeigt einen live
  gesendet/gesamt-Zähler pro Kampagne, nicht nur eine rohe
  Empfängerzahl.
- **Wählbarer E-Mail-Anbieter** — SMTP (Mailpit in der Entwicklung, der
  Standard), **Resend** oder **Amazon SES** über `EMAIL_PROVIDER`, sodass
  der Massenversand in Produktion auf einen echten Transaktions-E-Mail-
  Anbieter zeigen kann, ohne Codeänderungen.
- **Strikte Zustell-Buchführung** — Kampagnenversand nutzt
  `emailChannel.sendStrict` (wirft echte Sendefehler weiter, sodass ein
  Versand als `failed` erfasst wird statt still als „erfolgreich" zu
  gelten), im Unterschied zum Best-Effort `emailChannel.send`, das für die
  In-App-Benachrichtigungsverteilung verwendet wird.
- **Eingehender E-Mail-Webhook** (`POST /api/v1/inbound-email`) — ein
  providerunabhängiger Empfänger (SendGrid Inbound Parse, Mailgun Routes,
  Postmark usw. leiten alle eine ähnliche Form weiter) für Antworten:
  prüft ein gemeinsames Secret, löst den Mandanten aus der „an"-Adresse
  auf und stellt die eigentliche Verarbeitung als Hintergrund-Job in die
  Warteschlange, sodass der Anbieter nur auf ein schnelles 200-OK wartet,
  nie auf einen Datenbank-Schreibvorgang. Der Job protokolliert die
  Nachricht in derselben `Communication`-Historie, die ausgehende Sends
  bereits nutzen (zugeordnet zu einem Kontakt/Lead anhand der
  Absenderadresse), und zeigt sie auf der Timeline dieses Datensatzes und
  im globalen Activity Feed an.

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

- **Diagramme als Standardansicht** (`/crm/reports`) — vier
  Recharts-Visualisierungen werden zuerst angezeigt, damit ein Unternehmen
  auf einen Blick sieht, was es tatsächlich erreicht hat: eine KPI-Zeile
  (Leads gesamt, Lead-→-Gewonnen-Quote, offene Pipeline, 12-Monats-Umsatz),
  ein Conversion-Trichter (Lead → konvertiert → Deal → über erste Stufe
  hinaus → gewonnen, mit % vom oberen Trichterende), **Pipeline-Wert nach
  Stufe** (farblich passend zum Tone jeder Stufe, sodass eine Stufe hier
  dieselbe Farbe zeigt wie auf dem Deals-Board), Lead-Quellen-
  Aufschlüsselung und 12-Monats-Umsatz nach **Jalali-Kalender** (echte
  Jalali-Monatsbuckets über `jalaali-js`, nicht umbeschriftete
  gregorianische). Diagramme rendern unabhängig von der aktiven Sprache
  innerhalb eines erzwungenen LTR-Zeichenbereichs, sodass die Achsen-/
  Balkengeometrie unter RTL nie zerbricht, während die Tick-Beschriftungen
  weiterhin in der Leserichtung der aktiven Sprache erscheinen.
- **Tabellarische Berichte** (Deals, Pipeline, Aufgaben, Kontakte) mit
  CSV-Export, protokolliert — für alle, die lieber die Rohdaten statt der
  visuellen Zusammenfassung sehen wollen, einen Klick entfernt hinter einem
  **Diagramme-/Tabellen-Umschalter**.
- Jedes Label auf dieser Seite — Trichterschritte, Pipeline-Stufennamen,
  Lead-Quellen — ist ein in en/de/fa aufgelöster Übersetzungsschlüssel,
  kein in die Analytics-Engine eingebackener Rohstring; dieselben
  Stufennamen stimmen jetzt exakt zwischen dem Deals-Board, dem
  Pipeline-Widget des CRM-Dashboards, dem Pipeline-Widget des
  anpassbaren Dashboard-Builders und diesem Diagramm überein.

### Formular-Engine

- Drag-and-Drop-**Formular-Builder**: Abschnitte/Tabs, bedingte Sichtbarkeit
  und berechnete Felder (über den gemeinsamen Business-Rules-Ausdrucks-
  Evaluator), aus Metadaten generierte Zod-Validierung, mehrsprachige
  Labels, einfache Wiederholfelder, Versionierung, wiederverwendbare
  Vorlagen.

### Dateien, Aufgaben, Kalender, Benachrichtigungen

- **Betrieb-Übersicht** (`/ops`) — eine Einstiegsseite des Arbeitsbereichs,
  die offene/überfällige Aufgabenzahlen, anstehende Kalendertermine und
  gespeicherte Dateien in einem Blick zusammenfasst, mit Schnellzugriff auf
  Aufgaben, Kalender und Dateien.
- **Dokument-/Datei-Engine** — sicherer Upload, Kategorien, Versionen,
  Vorschau, Ablauf, Pflichtdokument-Checklisten pro Datensatz.
- **Aufgaben** — Unteraufgaben, Wiederholung, Abhängigkeiten, Kommentare,
  Überfälligkeitserkennung per geplantem Job.
- **Kalender** — Monats-/Wochenansichten, Verfügbarkeit,
  Buchungskonflikterkennung (gemeinsam mit den Service-Branchenmodulen).
- **Benachrichtigungen** — In-App-Center, E-Mail-Kanal, Präferenzen pro
  Nutzer, Erinnerungs-/Überfälligkeits-Scheduler.
- **Kommunikationshistorie** — ein einheitliches Protokoll pro Datensatz
  für E-Mails/Anrufe über jeden Kanal hinweg.

### Dashboards

- **Dashboard-Builder** — eine `react-grid-layout`-Canvas mit einer
  Widget-Bibliothek (KPI, Pipeline-Aufschlüsselung, Aktivitätstrend,
  Aufgaben, Activity Feed, modulregistrierte Widgets), persönlichen/
  Rollen-/Mandanten-/geteilten Layouts und versionierten Vorlagen.

### Finanzen

- **Finanz-Workspace** — modulübergreifende Umsatzübersichten: gewonnener
  Umsatz und offener Pipeline-Wert aus Deals, Gesamtvertragswert nach Status,
  Gewinnrate, kürzlich gewonnene Deals und der Abrechnungs-/Abo-Status des
  Mandanten.

### Workflow-Builder & Automatisierung

- **Visueller Workflow-Builder** — Stufen/Schritte, Rules-geleitete
  Freigabeketten, Bedingungen, Timer, SLAs, Eskalationen, Pflichtfelder/
  -dokumente, Vorlagen, Versionierung; jedes Feld, jede Stufen-Farboption
  und jedes Steuerelement ist in allen drei Sprachen übersetzt (diese
  Seite war in einer früheren Version vollständig englischsprachig).
- **Automatisierungs-Engine** — Ereignis-/Zeitplan-Trigger → Regeln →
  Aktionen (Aufgabe erstellen, benachrichtigen, Feld aktualisieren, Stufe
  verschieben, E-Mail senden, Webhook aufrufen, KI-Skill auslösen), mit
  vollständigem `AutomationRun`-Log, das in Observability einfließt.
- Ein gemeinsamer, sandboxed **JSON-AST-Ausdrucks-Evaluator** treibt
  bedingte Formularlogik, Workflow-Gates und Automatisierungsbedingungen
  an — eine Implementierung, drei Konsumenten.

### Integrationen

- **Ausgehende Webhooks** — signiert (`HMAC-SHA256`, `X-Sobi-Signature` /
  `X-Sobi-Event` / stabile `X-Sobi-Delivery`-Header), pro Mandant
  abonnierbar nach Ereignistyp, dauerhaft und unabhängig wiederholte
  Zustellung mit Statuserfassung, HTTPS-Pflicht, Sperre privater/
  Metadata-Netze, DNS-Pinning und ohne Redirect-Folgen.
- **API-Schlüssel mit Scopes** für die öffentliche REST-API
  (`/api/v1/...`) mit gehashten Throttle-Kennungen, Cursor-Paginierung,
  stabilen Fehler-Envelopes, monatlichen Kontingenten, einem
  OpenAPI-Vertrag und einem abhängigkeitsfreien TypeScript-SDK.
- **SaaS-Kern** — providerneutrale Abos, Testphasen, maschinenlesbare
  Plan-Entitlements/-Limits, atomare Nutzungszähler und ein konservativer
  Free-Plan-Fallback. Manuelle Abrechnung ist explizit, bis ein
  PSP-Adapter konfiguriert ist.
- **Kontakt-CSV-Importe** — private Quellenspeicherung, begrenztes
  Parsen und Mapping, dauerhafte Verarbeitung, Fehlerzusammenfassungen
  pro Zeile, Kontingentprüfungen und idempotente Wiederholungskoordinaten.
- OAuth- und Drittanbieter-Gerüst (Google, Microsoft, WhatsApp, Telegram,
  Stripe, PayPal) ist konzipiert, aber nicht an echte Zugangsdaten
  angebunden — siehe [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Branchenmodule

Jedes Modul ist eine schlanke Komposition der gemeinsamen Engines
(Pipeline, Booking, Documents, Finance) plus ein Manifest (Arbeitsbereich,
Navigation, Berechtigungen, Beziehungsarten, i18n). **Alle acht liefern ein
maßgeschneidertes Dashboard (KPI-Karten + eine bevorstehende/aktuelle
Liste) und Listenansichten mit Erstellungs-Flow**, mit Demo-Daten
vorbelegt:

| Modul | Zusammensetzung |
|---|---|
| **Versicherung** | Produkte, Versicherer, Policen mit Verlängerungserinnerungen, Schäden, Provisionen |
| **Kredit & Banking** | Anträge, Bankpartner, verschlüsseltes Antragstellerprofil, Bonitätscheckliste, Rückzahlungspläne |
| **Immobilien** | Objekte, Käufer-/Verkäuferrollen, Besichtigungen, Angebote, Verträge, Kunde↔Objekt-Matching |
| **Vertrieb & Agentur** | Kampagnen, Angebote, Ziele, Leistung |
| **Einwanderung** | Visum-/Genehmigungsfälle, Behördeneinreichungen, Dokumentvorlagen, Fristen, Servicepakete |
| **Friseursalon** | Leistungen, Personal, Stühle, Termine, Laufkundschaft, Besuchshistorie |
| **Kosmetikstudio** | + Behandlungsserien, Vorher/Nachher-Fotos, Einwilligungsformulare |
| **Restaurant** | Tischreservierungen, Gästeallergien/-präferenzen, Event-/Catering-Leads, Treueprogramm |

Sechs weitere Spec-Module (Investment, Recht, Bildung, Gesundheitswesen,
Service & Wartung, Projektmanagement) sind als „demnächst verfügbar"
registrierte Scaffolds in der Modulaktivierung hinterlegt.

Jedes Dashboard, jede Liste und jeder Dialog in allen acht Modulen — plus
die gemeinsamen Buchungskomponenten von Friseursalon, Kosmetikstudio und
Restaurant — ist vollständig auf Englisch, Deutsch und Persisch übersetzt;
Status-/Typ-Enums (Policenstatus, Kreditzweck, Objekttyp, Visumtyp,
Terminstatus, …) werden pro Wert auf einen sicheren Übersetzungsschlüssel
abgebildet statt als Rohcode angezeigt.

### Low-Code-Studio

- **Industrie-Vorlagen** — eine fertige Branchenlösung (Fitnessstudio,
  Zahnarztpraxis, Beratungsunternehmen, …) anwenden, die konfigurierte
  Entitäten und Beispieldaten auf dem Low-Code-Kernel instanziiert.
  Branchen sind *Daten, kein Code*: ein Unternehmen aktiviert seine
  Branche und erhält einen anpassbaren Startpunkt statt eines fest
  codierten Moduls.
- **Entity Builder** — eigene Entität erstellen (Felder, Beziehungen,
  Berechtigungen), die eine generierte CRUD-API, Listen-/Detailansichten,
  Suche und Timeline-Anbindung erhält.
- **Geschäftsregeln** — ein eigener Editor für wiederverwendbare Validierungs-,
  Berechtigungs-, Genehmigungs- und Berechnungsregeln, gespeichert als sicherer
  Ausdrucks-AST und ausgewertet in Formularen, Workflows und Automationen.
- **Vorlagen** — wiederverwendbare Vorlagen für E-Mail, Dokument,
  Benachrichtigung, Bericht und KI-Prompt mit `{{variable}}`-Interpolation und
  Live-Variablenerkennung.
- **Versionshistorie**-Panels, gemeinsam genutzt von jedem Builder.
- **Command Platform** — eine `Strg+K`-Befehlspalette.
- **Universelle Suche** — Postgres-Volltextsuche über Entitäten, Dateien,
  Notizen, Aktivitäten, Berichte und Befehle.

### Sicherheit, Audit & DSGVO

- Argon2-Passwort-Hashing, DB-Sessions (httpOnly, SameSite), in Produktion
  Redis-gestütztes verteiltes Rate-Limiting.
- CSP mit Nonce pro Request (`strict-dynamic`, keine Inline-Skripte in
  Produktion), HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` und `Permissions-Policy`-Sicherheitsheader.
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
  aufklappbaren Schublade (geöffnet über ein Hamburger-Icon in der Topbar)
  mit demselben Ein-/Ausklapp-Steuerelement, und jede Datentabelle scrollt
  horizontal statt abzuschneiden.
- **Subnav-Leiste bei eingeklapptem Rail** — das Einklappen des Module Rail
  auf reine Icons blendet die Akkordeon-Unterseiten aus, die es normalerweise
  auflisten würde; ohne Ersatz würde ein Nutzer, der nicht weiß, dass er es
  wieder ausklappen muss, den einfachen Zugriff auf die meisten Optionen
  eines Arbeitsbereichs verlieren. Eine horizontale Unternavigationsleiste
  schließt diese Lücke automatisch: Solange das Rail eingeklappt ist,
  erscheint die vollständige Unterseiten-Liste des aktiven Arbeitsbereichs
  (Kontakte, Firmen, Leads, …) als Zeile oben im Inhaltsbereich; sie
  verschwindet wieder, sobald das Rail ausgeklappt wird, damit dieselben
  Links nie doppelt angezeigt werden.
- **Akkordeon-Seitennavigation** — die Unterseiten jedes Arbeitsbereichs
  (Kontakte, Firmen, Leads, Deals, …) verschachteln sich direkt im Rail als
  aufklappbarer Abschnitt statt in einer separaten oberen Leiste; der aktive
  Abschnitt öffnet sich automatisch. Die 8 Branchenmodule sind in einer
  einklappbaren **Vorlagen**-Gruppe zusammengefasst, was die
  Industrie-Vorlagen-Richtung widerspiegelt (siehe
  [Industrie-Vorlagen](#low-code-studio)), statt die primäre Navigation zu
  überladen.
- **Hilfe pro Funktion** — ein „?"-Button neben dem Titel fast jeder Seite
  öffnet einen kurzen Erklärtext (wie die Funktion funktioniert, warum sie
  nützlich ist), lokalisiert in der aktiven Arbeitsbereichs-Sprache; siehe
  `helpTopics` in den i18n-Nachrichten und
  `src/components/patterns/feature-help.tsx`.
- Jeder Dialog behält auf schmalen Bildschirmen einen angenehmen seitlichen
  Rand (`calc(100%-2rem)` statt randlosem `100%`) — ein kleiner, systemischer
  Fix, der jedem Modal in der App auf Mobilgeräten zugutekommt.

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
- **Jeder Bereich des Arbeitsbereichs hat einen kontextuellen Hilfe-Button**
  — ein „?" neben dem Seitentitel (über das gemeinsame `PageHeader`/
  `FeatureHelp`-Muster), der einen kurzen Dialog öffnet, der erklärt, was
  die Funktion tut und wozu sie nützlich ist, in der aktiven Sprache. Das
  beschränkt sich nicht auf die eingebauten CRM-Bildschirme: Es deckt auch
  die Verwaltung (Einstellungen, Audit, Zustand, Integrationen, Module,
  Rollen, Nutzer), den KI-Arbeitsbereich und -Assistenten, jeden
  Studio-Builder (Entitäten, Automatisierungen, Workflows, Regeln,
  Vorlagen), Support, Abrechnung, Profil und alle acht Branchenmodule ab —
  ein vollständiger Durchgang hat gezielt die Lücken geschlossen, die bei
  der manuellen QA gefunden wurden (Workflow-Builder und der
  Beziehungsgraph waren vor diesem Durchgang die zwei auffälligsten
  Lücken).
- **Keine fest codierten Sprach-Strings** — jedes Label, jeder Status-Chip,
  jeder Enum-Wert und sogar Demo-/Platzhalterinhalte werden über next-intl
  für die aktive Sprache aufgelöst, statt in einer Sprache fest codiert zu
  sein. Dies wurde bei einem app-weiten Audit als echter Fehler an zwei
  Stellen gefunden und behoben: Die KI-Assistenten-Seite zeigte
  unabhängig von der gewählten Sprache festen persischen Text an, und das
  Demo-Ticket im Support-Center tat dasselbe — beide übersetzen jetzt
  korrekt in allen drei Sprachen.
- Wo eine Einstellung oder ein Menüpunkt einen natürlichen, gebräuchlichen
  persischen oder deutschen Begriff hat (statt einer holprigen wörtlichen
  Übersetzung), verwenden die persische und deutsche Übersetzung diesen
  gebräuchlichen Begriff.

### Demo-Modus

- Ein **Ein-Klick-Button „Mit Demo-Arbeitsbereich fortfahren"** auf der
  Login-Seite und der Landingpage, der als schreibgeschütztes öffentliches
  Demo-Konto (`public-demo@sobi.local`, Arbeitsbereich „Sobi CRM Demo")
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
| `npm run test:rls` | PostgreSQL-Integrationstest mit zwei Mandanten |
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
  Datei-Uploads den integrierten S3-Treiber mit `FILE_STORAGE_DRIVER=s3` aktivieren.
- In Produktion sind `FILE_STORAGE_DRIVER=s3` und `RATE_LIMIT_BACKEND=redis`
  verpflichtend; Events laufen über eine persistente PostgreSQL-Outbox und
  Jobs verwenden Lease, Deduplizierung und begrenzte Wiederholungen.
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
