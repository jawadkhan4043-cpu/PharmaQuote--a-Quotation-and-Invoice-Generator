"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { starterData, STORAGE_KEY } from "@/lib/seed";
import type { AppScreen, CatalogItem, CurrencyCode, CustomerDetails, DocumentKind, QuoteDocument, QuoteLine, WorkspaceData, WorkspaceSettings } from "@/lib/types";

const nav: { name: AppScreen; icon: string }[] = [
  { name: "Builder", icon: "▤" },
  { name: "Catalog", icon: "◈" },
  { name: "History", icon: "◷" },
  { name: "Settings", icon: "⚙" },
];
const currencies: { code: CurrencyCode; name: string }[] = [
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "INR", name: "Indian Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
];
const heading: Record<AppScreen, { eyebrow: string; title: string; subtitle: string }> = {
  Builder: { eyebrow: "COMMERCIAL DOCUMENTS / WORKSPACE", title: "A clearer way to quote.", subtitle: "Build a quotation or invoice with transparent, live totals." },
  Catalog: { eyebrow: "PRODUCTS / PRICE LIST", title: "Your working catalog.", subtitle: "Search demo products, add your own items, and adjust unit prices." },
  History: { eyebrow: "SAVED DOCUMENTS / LOCAL HISTORY", title: "Keep every quote close.", subtitle: "Reopen, duplicate, print, or remove documents stored in this browser." },
  Settings: { eyebrow: "WORKSPACE / PREFERENCES", title: "Set up your workspace.", subtitle: "Business details, currency, and default tax stay on this device." },
};

function localDate(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
}
function showDate(value: string) {
  if (!value) return "—";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
function money(value: number, currency: CurrencyCode) {
  const safe = Number.isFinite(value) ? value : 0;
  try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 2 }).format(safe); }
  catch { return currency + " " + safe.toFixed(2); }
}
function makeId(prefix: string) {
  return prefix + "-" + Math.random().toString(36).slice(2, 9);
}
function makeNumber(kind: DocumentKind, sequence: number) {
  return (kind === "Quotation" ? "PQ-" : "PI-") + new Date().getFullYear() + "-" + String(sequence).padStart(4, "0");
}
function emptyDraft(tax: number, kind: DocumentKind = "Quotation", currency: CurrencyCode = starterData.settings.currency): QuoteDocument {
  return {
    id: "", number: "", kind, currency,
    customer: { name: "", contact: "", email: "", address: "" },
    issueDate: localDate(), dueDate: dateAfter(kind === "Quotation" ? 14 : 30),
    reference: "", taxRate: tax,
    notes: "Thank you for the opportunity to quote. Please confirm availability before placing an order.",
    lines: [], createdAt: "", updatedAt: "",
  };
}
function totals(lines: QuoteLine[], taxRate: number) {
  const itemsTotal = lines.reduce((sum, line) => sum + Math.max(0, line.quantity) * Math.max(0, line.unitPrice), 0);
  const discountTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * Math.min(100, Math.max(0, line.discountPercent)) / 100, 0);
  const taxable = Math.max(0, itemsTotal - discountTotal);
  const taxTotal = taxable * Math.min(100, Math.max(0, taxRate)) / 100;
  return { itemsTotal, discountTotal, taxable, taxTotal, grandTotal: taxable + taxTotal };
}
function freshStore(): WorkspaceData {
  return {
    ...starterData,
    catalog: starterData.catalog.map((item) => ({ ...item })),
    documents: [],
    settings: { ...starterData.settings },
    numbering: { ...starterData.numbering },
  };
}

export default function Home() {
  const [ready, setReady] = useState(false);
  const [store, setStore] = useState<WorkspaceData>(freshStore);
  const [screen, setScreen] = useState<AppScreen>("Builder");
  const [draft, setDraft] = useState<QuoteDocument>(() => emptyDraft(starterData.settings.defaultTaxRate, "Quotation", starterData.settings.currency));
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyFilter, setHistoryFilter] = useState<"All" | DocumentKind>("All");
  const [catalogFormOpen, setCatalogFormOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", sku: "", pack: "", category: "Medicine", price: "" });
  const [printDocument, setPrintDocument] = useState<QuoteDocument | null>(null);
  const [storageProblem, setStorageProblem] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WorkspaceData>;
        if (!Array.isArray(parsed.catalog) || !Array.isArray(parsed.documents)) throw new Error("Invalid saved data");
        const settings = { ...starterData.settings, ...parsed.settings };
        const documents = parsed.documents.map((document) => ({ ...document, currency: document.currency || settings.currency }));
        setStore({
          catalog: parsed.catalog,
          documents,
          settings,
          numbering: { ...starterData.numbering, ...parsed.numbering },
        });
        setDraft(emptyDraft(settings.defaultTaxRate, "Quotation", settings.currency));
      }
    } catch {
      setNotice("Saved browser data could not be read. The demo catalog is ready.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setStorageProblem("");
    } catch {
      setStorageProblem("Browser storage is full. Download a backup before continuing.");
    }
  }, [ready, store]);

  useEffect(() => {
    if (ready && !draft.id && draft.lines.length === 0) {
      setDraft((current) => ({ ...current, taxRate: store.settings.defaultTaxRate, currency: store.settings.currency }));
    }
  }, [ready, store.settings.defaultTaxRate, draft.id, draft.lines.length]);

  const draftTotals = useMemo(() => totals(draft.lines, draft.taxRate), [draft.lines, draft.taxRate]);
  const previewNumber = draft.number || makeNumber(draft.kind, store.numbering[draft.kind]);
  const pickerItems = store.catalog.filter((item) => {
    const q = pickerQuery.toLowerCase().trim();
    return !q || [item.name, item.sku, item.category].some((value) => value.toLowerCase().includes(q));
  });
  const catalogItems = store.catalog.filter((item) => {
    const q = catalogQuery.toLowerCase().trim();
    return !q || [item.name, item.sku, item.category, item.pack].some((value) => value.toLowerCase().includes(q));
  });
  const historyItems = store.documents.filter((item) => {
    const q = historyQuery.toLowerCase().trim();
    const matchesKind = historyFilter === "All" || item.kind === historyFilter;
    const matchesQuery = !q || [item.number, item.customer.name, item.kind].some((value) => value.toLowerCase().includes(q));
    return matchesKind && matchesQuery;
  });

  function changeScreen(value: AppScreen) {
    setScreen(value);
    setNotice("");
    setFormError("");
  }
  function startNew(kind: DocumentKind = "Quotation") {
    if (!draft.id && (draft.customer.name.trim() || draft.lines.length) && !window.confirm("Discard this unsaved draft?")) return;
    setDraft(emptyDraft(store.settings.defaultTaxRate, kind, store.settings.currency));
    setScreen("Builder");
    setFormError("");
    setNotice("");
  }
  function updateCustomer<K extends keyof CustomerDetails>(key: K, value: CustomerDetails[K]) {
    setDraft((current) => ({ ...current, customer: { ...current.customer, [key]: value } }));
    setFormError("");
  }
  function updateDraft<K extends keyof QuoteDocument>(key: K, value: QuoteDocument[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  }
  function updateLine(id: string, key: "quantity" | "unitPrice" | "discountPercent", value: number) {
    const safe = key === "discountPercent" ? Math.min(100, Math.max(0, value)) : key === "quantity" ? Math.max(1, value) : Math.max(0, value);
    setDraft((current) => ({
      ...current,
      lines: current.lines.map((line) => line.id === id ? { ...line, [key]: safe } : line),
    }));
  }
  function addToDraft(item: CatalogItem) {
    if (draft.currency !== store.settings.currency) {
      setNotice("Catalog prices use " + store.settings.currency + ". Start a new document in that currency before adding items.");
      return;
    }
    setDraft((current) => {
      const found = current.lines.find((line) => line.catalogItemId === item.id);
      if (found) {
        return { ...current, lines: current.lines.map((line) => line.catalogItemId === item.id ? { ...line, quantity: line.quantity + 1 } : line) };
      }
      const line: QuoteLine = {
        id: makeId("line"), catalogItemId: item.id, name: item.name, sku: item.sku,
        pack: item.pack, quantity: 1, unitPrice: item.unitPrice, discountPercent: 0,
      };
      return { ...current, lines: [...current.lines, line] };
    });
    setPickerOpen(false);
    setPickerQuery("");
    setFormError("");
    setNotice(item.name + " added to the document.");
  }
  function removeLine(id: string) {
    setDraft((current) => ({ ...current, lines: current.lines.filter((line) => line.id !== id) }));
  }
  function saveDocument(): QuoteDocument | null {
    const name = draft.customer.name.trim();
    if (!name) { setFormError("Enter a customer or business name before saving."); return null; }
    if (!draft.lines.length) { setFormError("Add at least one catalog item before saving."); return null; }
    const now = new Date().toISOString();
    const isNew = !draft.id;
    const saved: QuoteDocument = {
      ...draft,
      id: draft.id || makeId("doc"),
      number: draft.number || makeNumber(draft.kind, store.numbering[draft.kind]),
      customer: { ...draft.customer, name },
      lines: draft.lines.map((line) => ({ ...line })),
      createdAt: draft.createdAt || now,
      updatedAt: now,
    };
    setStore((current) => ({
      ...current,
      documents: isNew ? [saved, ...current.documents] : current.documents.map((item) => item.id === saved.id ? saved : item),
      numbering: isNew ? { ...current.numbering, [draft.kind]: current.numbering[draft.kind] + 1 } : current.numbering,
    }));
    setDraft(saved);
    setFormError("");
    setNotice(isNew ? draft.kind + " " + saved.number + " saved in this browser." : "Changes saved to " + saved.number + ".");
    return saved;
  }
  function printDraft() {
    const saved = saveDocument();
    if (!saved) return;
    setPrintDocument(saved);
    window.setTimeout(() => window.print(), 150);
  }
  function openDocument(document: QuoteDocument) {
    setDraft({ ...document, lines: document.lines.map((line) => ({ ...line })) });
    setScreen("Builder");
    setNotice("Opened " + document.number + " from saved history.");
    setFormError("");
  }
  function duplicateDocument(document: QuoteDocument) {
    setDraft({
      ...document, id: "", number: "", issueDate: localDate(),
      dueDate: dateAfter(document.kind === "Quotation" ? 14 : 30),
      lines: document.lines.map((line) => ({ ...line, id: makeId("line") })),
      createdAt: "", updatedAt: "",
    });
    setScreen("Builder");
    setNotice("Copy ready as a new draft. Save it to assign a new number.");
    setFormError("");
  }
  function deleteDocument(id: string) {
    const target = store.documents.find((item) => item.id === id);
    if (!target || !window.confirm("Remove " + target.number + " from this browser?")) return;
    setStore((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== id) }));
    if (draft.id === id) setDraft(emptyDraft(store.settings.defaultTaxRate, "Quotation", store.settings.currency));
    setNotice("Document removed from local history.");
  }
  function addCatalogItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newItem.name.trim();
    const sku = newItem.sku.trim();
    const price = Number(newItem.price);
    if (!name || !sku || !Number.isFinite(price) || price < 0) {
      setNotice("Enter an item name, SKU, and a valid non-negative price.");
      return;
    }
    const item: CatalogItem = {
      id: makeId("item"), name, sku, pack: newItem.pack.trim() || "Single unit",
      category: newItem.category.trim() || "Medicine", unitPrice: price,
    };
    setStore((current) => ({ ...current, catalog: [item, ...current.catalog] }));
    setNewItem({ name: "", sku: "", pack: "", category: "Medicine", price: "" });
    setCatalogFormOpen(false);
    setNotice("Catalog item added.");
  }
  function changeCatalogPrice(id: string, price: number) {
    setStore((current) => ({
      ...current,
      catalog: current.catalog.map((item) => item.id === id ? { ...item, unitPrice: Math.max(0, Number.isFinite(price) ? price : 0) } : item),
    }));
  }
  function removeCatalog(item: CatalogItem) {
    if (!window.confirm("Remove " + item.name + " from the catalog?")) return;
    setStore((current) => ({ ...current, catalog: current.catalog.filter((entry) => entry.id !== item.id) }));
    setNotice("Item removed. Saved documents keep their copied item details.");
  }
  function updateSettings<K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) {
    setStore((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
    if (key === "currency" && !draft.id && draft.lines.length === 0) {
      setDraft((current) => ({ ...current, currency: value as CurrencyCode }));
    }
  }
  function downloadBackup() {
    const data = { app: "PharmaQuote", version: 1, exportedAt: new Date().toISOString(), data: store };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pharmaquote-backup-" + localDate() + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Backup downloaded to your device.");
  }
  function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as { app?: string; data?: Partial<WorkspaceData> };
        if (parsed.app !== "PharmaQuote" || !Array.isArray(parsed.data?.catalog) || !Array.isArray(parsed.data?.documents)) throw new Error("Invalid backup");
        const restored: WorkspaceData = {
          catalog: parsed.data.catalog,
          documents: parsed.data.documents.map((document) => ({ ...document, currency: document.currency || parsed.data!.settings?.currency || starterData.settings.currency })),
          settings: { ...starterData.settings, ...parsed.data.settings },
          numbering: { ...starterData.numbering, ...parsed.data.numbering },
        };
        setStore(restored);
        setDraft(emptyDraft(restored.settings.defaultTaxRate, "Quotation", restored.settings.currency));
        setNotice("Backup restored in this browser.");
      } catch {
        setNotice("That file could not be restored. Choose a PharmaQuote JSON backup.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  const printTotals = printDocument ? totals(printDocument.lines, printDocument.taxRate) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">PQ</div><div><div className="brand-name">PharmaQuote</div><div className="brand-caption">COMMERCIAL WORKSPACE</div></div></div>
        <div className="workspace-card"><span className="small-label">PRIVATE WORKSPACE</span><strong>{store.settings.companyName || "Your business"}</strong><span className="workspace-dot">● Saved in this browser</span></div>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {nav.map((item) => <button key={item.name} className={"nav-item " + (screen === item.name ? "active" : "")} onClick={() => changeScreen(item.name)}><span className="nav-icon">{item.icon}</span><span>{item.name === "Builder" ? "Quote builder" : item.name}</span>{item.name === "History" && store.documents.length > 0 && <span className="nav-count">{store.documents.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-safety"><span className="shield">✓</span><div><strong>Local-first workspace</strong><p>No account or API key needed</p></div></div><div className="user-card"><div className="avatar">PQ</div><div><strong>Commercial team</strong><span>Offline demo data</span></div><span className="user-menu">···</span></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>{store.settings.companyName || "Your business"}</span><span className="crumb-slash">/</span><strong>{screen === "Builder" ? "Quote builder" : screen}</strong></div><div className="topbar-actions"><span className="local-badge"><i /> LOCAL DATA</span><div className="top-avatar">PQ</div></div></header>
        <div className="content">
          <section className="page-heading"><div><p className="eyebrow">{heading[screen].eyebrow}</p><h1>{heading[screen].title}</h1><p className="page-subtitle">{heading[screen].subtitle}</p></div><button className="button button-primary" onClick={() => startNew("Quotation")}>＋ New document</button></section>
          {notice && <div className="notice" role="status"><span>✓</span>{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}>×</button></div>}
          {storageProblem && <div className="form-error">{storageProblem}</div>}
          {screen === "Builder" && (
            <div className="builder-grid">
              <div className="builder-main">
                <section className="panel panel-pad">
                  <div className="panel-heading">
                    <div><p className="eyebrow">DOCUMENT DETAILS</p><h2>{draft.id ? "Saved document" : "New document draft"}</h2><p className="panel-description">{draft.id ? draft.number + " · Changes update this saved document." : "The number is assigned when you save."}</p></div>
                    <div className="type-switch" aria-label="Document type">
                      <button type="button" className={draft.kind === "Quotation" ? "selected" : ""} disabled={Boolean(draft.id)} onClick={() => setDraft((current) => ({ ...current, kind: "Quotation", dueDate: dateAfter(14) }))}>Quotation</button>
                      <button type="button" className={draft.kind === "Invoice" ? "selected" : ""} disabled={Boolean(draft.id)} onClick={() => setDraft((current) => ({ ...current, kind: "Invoice", dueDate: dateAfter(30) }))}>Invoice</button>
                    </div>
                  </div>
                  <div className="field-grid three" style={{ marginBottom: 14 }}>
                    <div className="field"><span className="field-label">Document number</span><input value={previewNumber} readOnly aria-label="Document number preview" /></div>
                    <div className="field"><label htmlFor="issue-date">Issue date</label><input id="issue-date" type="date" value={draft.issueDate} onChange={(event) => updateDraft("issueDate", event.target.value)} /></div>
                    <div className="field"><label htmlFor="due-date">{draft.kind === "Quotation" ? "Valid until" : "Due date"}</label><input id="due-date" type="date" value={draft.dueDate} onChange={(event) => updateDraft("dueDate", event.target.value)} /></div>
                  </div>
                  <div className="field-grid">
                    <div className="field"><label htmlFor="customer-name">Customer or business name *</label><input id="customer-name" value={draft.customer.name} onChange={(event) => updateCustomer("name", event.target.value)} placeholder="Example: City Care Pharmacy" maxLength={100} /></div>
                    <div className="field"><label htmlFor="customer-contact">Contact number</label><input id="customer-contact" value={draft.customer.contact} onChange={(event) => updateCustomer("contact", event.target.value)} placeholder="Business contact" maxLength={40} /></div>
                    <div className="field"><label htmlFor="customer-email">Email address</label><input id="customer-email" type="email" value={draft.customer.email} onChange={(event) => updateCustomer("email", event.target.value)} placeholder="accounts@example.com" maxLength={120} /></div>
                    <div className="field"><label htmlFor="reference">Reference / purchase order</label><input id="reference" value={draft.reference} onChange={(event) => updateDraft("reference", event.target.value)} placeholder="Optional reference" maxLength={60} /></div>
                    <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="customer-address">Billing address</label><input id="customer-address" value={draft.customer.address} onChange={(event) => updateCustomer("address", event.target.value)} placeholder="Business address" maxLength={180} /></div>
                  </div>
                </section>

                <section className="panel panel-pad">
                  <div className="item-toolbar"><div><strong>Line items</strong><span> · {draft.lines.length} item{draft.lines.length === 1 ? "" : "s"}</span></div><button className="add-line-button" onClick={() => setPickerOpen(true)}>＋ Add catalog item</button></div>
                  {draft.lines.length === 0 ? (
                    <div className="empty-lines"><div className="empty-lines-icon">◈</div><strong>Your document is ready for items.</strong><p>Choose a medicine or supply from the catalog to begin.</p><button className="add-line-button" onClick={() => setPickerOpen(true)}>Browse catalog</button></div>
                  ) : (
                    <div className="table-wrap">
                      <table className="quote-table">
                        <thead><tr><th>ITEM</th><th>UNIT PRICE</th><th>QTY</th><th>DISC. %</th><th>LINE TOTAL</th><th aria-label="Remove item" /></tr></thead>
                        <tbody>
                          {draft.lines.map((line) => {
                            const lineTotal = line.quantity * line.unitPrice * (1 - line.discountPercent / 100);
                            return <tr key={line.id}>
                              <td className="product-cell"><strong>{line.name}</strong><span>{line.sku} · {line.pack}</span></td>
                              <td><label className="field-label" htmlFor={"price-" + line.id}>Price</label><input id={"price-" + line.id} className="qty-input" type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => updateLine(line.id, "unitPrice", Number(event.target.value) || 0)} /></td>
                              <td><label className="field-label" htmlFor={"qty-" + line.id}>Quantity</label><input id={"qty-" + line.id} className="qty-input" type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", Number(event.target.value) || 1)} /></td>
                              <td><label className="field-label" htmlFor={"discount-" + line.id}>Discount</label><input id={"discount-" + line.id} className="discount-input" type="number" min="0" max="100" step="1" value={line.discountPercent} onChange={(event) => updateLine(line.id, "discountPercent", Number(event.target.value) || 0)} /></td>
                              <td className="line-total">{money(lineTotal, draft.currency)}</td>
                              <td><button className="remove-button" aria-label={"Remove " + line.name} onClick={() => removeLine(line.id)}>×</button></td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="field" style={{ marginTop: 15 }}><label htmlFor="document-notes">Notes shown on the document</label><textarea id="document-notes" value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} maxLength={500} /></div>
                </section>
                {formError && <div className="form-error" role="alert">{formError}</div>}
              </div>

              <aside className="builder-side">
                <section className="summary-card">
                  <div className="summary-top"><div><p className="eyebrow">LIVE TOTAL</p><div className="summary-number">{previewNumber}</div></div><span className="section-index">{draft.kind.toUpperCase()}</span></div>
                  <hr className="summary-rule" />
                  <div className="field" style={{ marginBottom: 14 }}><label htmlFor="tax-rate" style={{ color: "#d3e0dc" }}>Tax rate for this document (%)</label><input id="tax-rate" type="number" min="0" max="100" step="0.1" value={draft.taxRate} onChange={(event) => updateDraft("taxRate", Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></div>
                  <div className="summary-lines">
                    <div className="summary-row"><span>Items total</span><strong>{money(draftTotals.itemsTotal, draft.currency)}</strong></div>
                    <div className="summary-row"><span>Line discounts</span><strong>− {money(draftTotals.discountTotal, draft.currency)}</strong></div>
                    <div className="summary-row"><span>Taxable amount</span><strong>{money(draftTotals.taxable, draft.currency)}</strong></div>
                    <div className="summary-row"><span>Tax ({draft.taxRate}%)</span><strong>{money(draftTotals.taxTotal, draft.currency)}</strong></div>
                    <div className="summary-row total"><span>Grand total</span><strong>{money(draftTotals.grandTotal, draft.currency)}</strong></div>
                  </div>
                  <p className="summary-note">Totals update as you edit. Verify your company tax rules and prices before issuing a real document.</p>
                  <div className="summary-actions">
                    <button className="button button-primary" onClick={saveDocument} disabled={!ready}>{draft.id ? "Save changes" : "Save document"}</button>
                    <button className="button button-secondary" onClick={printDraft} disabled={!ready}>Print / Save as PDF</button>
                    <button className="button button-quiet" onClick={() => startNew("Invoice")}>Start an invoice</button>
                  </div>
                </section>
                <section className="side-tip"><div className="tip-icon">⌁</div><h3>Built for business paperwork</h3><p>Use business account details only. This workspace is not for patient records or medication advice.</p></section>
              </aside>
            </div>
          )}

          {screen === "Catalog" && (
            <section className="panel panel-pad">
              <div className="panel-heading"><div><p className="eyebrow">DEMO CATALOG</p><h2>Items and unit prices</h2><p className="panel-description">Prices are editable placeholders saved only in this browser.</p></div><button className="button button-primary" onClick={() => setCatalogFormOpen((open) => !open)}>{catalogFormOpen ? "Close form" : "＋ Add item"}</button></div>
              {catalogFormOpen && <form className="catalog-form" onSubmit={addCatalogItem}>
                <h3>Add a catalog item</h3>
                <div className="catalog-form-grid">
                  <label>Item name<input required value={newItem.name} onChange={(event) => setNewItem((current) => ({ ...current, name: event.target.value }))} placeholder="Product or supply name" /></label>
                  <label>SKU<input required value={newItem.sku} onChange={(event) => setNewItem((current) => ({ ...current, sku: event.target.value }))} placeholder="Example: MED-001" /></label>
                  <label>Pack<input value={newItem.pack} onChange={(event) => setNewItem((current) => ({ ...current, pack: event.target.value }))} placeholder="Box of 100" /></label>
                  <label>Category<input value={newItem.category} onChange={(event) => setNewItem((current) => ({ ...current, category: event.target.value }))} placeholder="Medicine" /></label>
                  <label>Unit price ({store.settings.currency})<input required type="number" min="0" step="0.01" value={newItem.price} onChange={(event) => setNewItem((current) => ({ ...current, price: event.target.value }))} placeholder="0.00" /></label>
                </div>
                <button className="button button-primary button-small" type="submit">Save catalog item</button>
              </form>}
              <div className="catalog-toolbar"><input className="search-input" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Search by item, SKU, category..." aria-label="Search catalog" /><span className="panel-description">{catalogItems.length} catalog items</span></div>
              <div className="catalog-list">
                {catalogItems.map((item) => <div className="catalog-row" key={item.id}>
                  <div className="catalog-product"><strong>{item.name}</strong><span>{item.sku}</span></div><p className="catalog-meta">{item.category}</p><p className="catalog-meta">{item.pack}</p>
                  <label className="price-edit">{store.settings.currency}<input aria-label={"Unit price for " + item.name} type="number" min="0" step="0.01" value={item.unitPrice} onChange={(event) => changeCatalogPrice(item.id, Number(event.target.value) || 0)} /></label>
                  <div className="catalog-actions"><button className="button button-secondary button-small" onClick={() => { addToDraft(item); setScreen("Builder"); }}>Add to quote</button><button className="remove-button" aria-label={"Remove " + item.name} onClick={() => removeCatalog(item)}>×</button></div>
                </div>)}
                {catalogItems.length === 0 && <div className="history-empty"><strong>No matching items</strong><p>Try another product name or SKU.</p></div>}
              </div>
              <div className="disclaimer"><span>i</span><p>Every sample price is fictional. Replace it with your approved price list and confirm currency and tax settings before use.</p></div>
            </section>
          )}
          {screen === "History" && (
            <section className="panel panel-pad">
              <div className="panel-heading"><div><p className="eyebrow">LOCAL DOCUMENT HISTORY</p><h2>Saved quotations and invoices</h2><p className="panel-description">{store.documents.length} saved document{store.documents.length === 1 ? "" : "s"} in this browser.</p></div><button className="button button-primary" onClick={() => startNew("Quotation")}>＋ New document</button></div>
              <div className="history-toolbar">
                <input className="search-input" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search customer or document number..." aria-label="Search saved documents" />
                <select className="search-input" value={historyFilter} onChange={(event) => setHistoryFilter(event.target.value as "All" | DocumentKind)} aria-label="Filter document type" style={{ maxWidth: 170 }}><option>All</option><option>Quotation</option><option>Invoice</option></select>
              </div>
              <div className="history-list">
                {historyItems.map((document) => {
                  const amount = totals(document.lines, document.taxRate).grandTotal;
                  return <article className="history-row" key={document.id}>
                    <div className="history-title"><strong>{document.number}</strong><span>{showDate(document.issueDate)} · {document.lines.length} item{document.lines.length === 1 ? "" : "s"}</span></div>
                    <span className={"doc-badge " + (document.kind === "Invoice" ? "invoice" : "")}>{document.kind}</span>
                    <div className="history-customer">{document.customer.name}</div>
                    <div className="history-total">{money(amount, document.currency)}</div>
                    <div className="history-actions"><button className="button button-secondary button-small" onClick={() => openDocument(document)}>Open</button><button className="button button-secondary button-small" onClick={() => duplicateDocument(document)}>Duplicate</button><button className="remove-button" aria-label={"Delete " + document.number} onClick={() => deleteDocument(document.id)}>×</button></div>
                  </article>;
                })}
                {historyItems.length === 0 && <div className="history-empty"><strong>{store.documents.length === 0 ? "Your saved documents will appear here." : "No documents match that search."}</strong><p>{store.documents.length === 0 ? "Create and save a quotation or invoice to start your history." : "Try another name or number."}</p>{store.documents.length === 0 && <button className="button button-primary button-small" onClick={() => startNew("Quotation")}>Create a document</button>}</div>}
              </div>
            </section>
          )}

          {screen === "Settings" && (
            <div className="settings-grid">
              <section className="panel settings-card">
                <div className="panel-heading"><div><p className="eyebrow">BUSINESS PROFILE</p><h2>Document defaults</h2><p className="panel-description">These details appear on printed quotations and invoices.</p></div></div>
                <div className="field-grid">
                  <div className="field"><label htmlFor="business-name">Business name</label><input id="business-name" value={store.settings.companyName} onChange={(event) => updateSettings("companyName", event.target.value)} maxLength={100} /></div>
                  <div className="field"><label htmlFor="business-contact">Contact number</label><input id="business-contact" value={store.settings.contact} onChange={(event) => updateSettings("contact", event.target.value)} maxLength={50} /></div>
                  <div className="field"><label htmlFor="business-email">Business email</label><input id="business-email" type="email" value={store.settings.email} onChange={(event) => updateSettings("email", event.target.value)} maxLength={120} /></div>
                  <div className="field"><label htmlFor="currency">Currency</label><select id="currency" value={store.settings.currency} onChange={(event) => updateSettings("currency", event.target.value as CurrencyCode)}>{currencies.map((item) => <option key={item.code} value={item.code}>{item.code} · {item.name}</option>)}</select></div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="business-address">Business address</label><input id="business-address" value={store.settings.address} onChange={(event) => updateSettings("address", event.target.value)} maxLength={180} /></div>
                  <div className="field"><label htmlFor="default-tax">Default tax rate (%)</label><input id="default-tax" type="number" min="0" max="100" step="0.1" value={store.settings.defaultTaxRate} onChange={(event) => updateSettings("defaultTaxRate", Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></div>
                </div>
                <p className="panel-description" style={{ marginTop: 14 }}>New documents use this tax rate and currency. Saved documents retain their original currency; update catalog prices if you change the workspace currency.</p>
              </section>
              <aside className="settings-help">
                <h3>Back up this browser’s data</h3>
                <p>Documents and catalog items are kept in local browser storage. Download a backup before clearing browser data or switching computers.</p>
                <div className="backup-row"><button className="button button-primary button-small" onClick={downloadBackup}>Download backup</button><label className="button button-secondary button-small" htmlFor="restore-backup">Restore backup</label><input id="restore-backup" type="file" accept="application/json,.json" onChange={restoreBackup} /></div>
                <ul><li>No account, database, API key, or external service.</li><li>Saved documents stay in this browser.</li><li>Backup files contain the workspace data you entered.</li></ul>
                <div className="disclaimer" style={{ marginTop: 15 }}><span>i</span><p>Do not store patient-identifying or clinical information here.</p></div>
              </aside>
            </div>
          )}

          <footer className="app-footer"><span><b>PharmaQuote</b> · Commercial document workspace</span><span>Fictional prices · Verify your own price list and tax rules</span></footer>
        </div>
      </main>

      {pickerOpen && <div className="picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPickerOpen(false); }}>
        <section className="picker-modal" role="dialog" aria-modal="true" aria-labelledby="picker-title">
          <div className="modal-head"><div><h2 id="picker-title">Add a catalog item</h2><p>Choose a product or supply for this document.</p></div><button className="modal-close" aria-label="Close catalog" onClick={() => setPickerOpen(false)}>×</button></div>
          <div className="modal-search"><input className="search-input" autoFocus value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="Search name, SKU, or category..." aria-label="Search products" /></div>
          <div className="picker-list">
            {pickerItems.map((item) => <div className="picker-row" key={item.id}><div className="picker-name"><strong>{item.name}</strong><span>{item.sku} · {item.pack} · {item.category}</span></div><div className="picker-price">{money(item.unitPrice, store.settings.currency)}<button className="button button-primary button-small" onClick={() => addToDraft(item)}>Add</button></div></div>)}
            {pickerItems.length === 0 && <div className="history-empty"><strong>No matching catalog items</strong><p>Add products in the Catalog section first.</p></div>}
          </div>
        </section>
      </div>}

      <div className="print-root">
        {printDocument && printTotals && <article className="print-sheet">
          <div className="print-brand-row"><div><h1>{store.settings.companyName}</h1><p>{store.settings.address}<br />{store.settings.contact} · {store.settings.email}</p></div><div className="print-doc-label"><span>{printDocument.kind}</span><strong>{printDocument.number}</strong></div></div>
          <div className="print-meta"><div><span>Issue date</span><strong>{showDate(printDocument.issueDate)}</strong></div><div><span>{printDocument.kind === "Quotation" ? "Valid until" : "Due date"}</span><strong>{showDate(printDocument.dueDate)}</strong></div><div><span>Reference</span><strong>{printDocument.reference || "—"}</strong></div></div>
          <div className="print-info-grid"><div><h3>Prepared for</h3><strong>{printDocument.customer.name}</strong>{printDocument.customer.contact && <p>{printDocument.customer.contact}</p>}{printDocument.customer.email && <p>{printDocument.customer.email}</p>}{printDocument.customer.address && <p>{printDocument.customer.address}</p>}</div><div><h3>Document summary</h3><p>{printDocument.kind} {printDocument.number}</p><p>{printDocument.lines.length} line item{printDocument.lines.length === 1 ? "" : "s"}</p></div></div>
          <table className="print-table"><thead><tr><th>Item</th><th>Pack</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Line total</th></tr></thead><tbody>
            {printDocument.lines.map((line) => { const lineTotal = line.quantity * line.unitPrice * (1 - line.discountPercent / 100); return <tr key={line.id}><td>{line.name}<br />{line.sku}</td><td>{line.pack}</td><td>{line.quantity}</td><td>{money(line.unitPrice, printDocument.currency)}</td><td>{line.discountPercent}%</td><td>{money(lineTotal, printDocument.currency)}</td></tr>; })}
          </tbody></table>
          <div className="print-totals"><div><span>Items total</span><strong>{money(printTotals.itemsTotal, printDocument.currency)}</strong></div><div><span>Discount</span><strong>− {money(printTotals.discountTotal, printDocument.currency)}</strong></div><div><span>Taxable amount</span><strong>{money(printTotals.taxable, printDocument.currency)}</strong></div><div><span>Tax ({printDocument.taxRate}%)</span><strong>{money(printTotals.taxTotal, printDocument.currency)}</strong></div><div className="grand"><span>Grand total</span><strong>{money(printTotals.grandTotal, printDocument.currency)}</strong></div></div>
          {printDocument.notes && <div className="print-notes"><strong>Notes</strong><p>{printDocument.notes}</p></div>}
          <div className="print-footer">PharmaQuote · Demo prices are fictional. Verify prices and tax rules before issuing.</div>
        </article>}
      </div>
    </div>
  );
}
