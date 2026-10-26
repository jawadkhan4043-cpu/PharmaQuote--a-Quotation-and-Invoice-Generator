# PharmaQuote · Project 16

A browser-only quotation and invoice workspace for pharmacy and medical-supply business workflows.

## Start in VS Code

1. Extract this ZIP to D:\ so the folder becomes D:\project16.
2. In VS Code, choose File → Open Folder and open D:\project16.
3. Choose Terminal → New Terminal and run these commands:

    npm install
    npm run dev

4. Open http://localhost:3000.

If port 3000 is already busy, Next.js may show http://localhost:3001; open the URL it prints.

## Included

- Create and edit quotations and invoices with separate numbering.
- Add catalog items to a document and adjust quantities, prices, and line discounts.
- Set tax per document; totals update immediately.
- Search, add, and adjust items in the fictional catalog.
- Save documents in browser storage, reopen them, duplicate them, or remove them.
- Print to paper or choose Save as PDF in the browser print dialog.
- Download a JSON backup of the catalog, documents, settings, and numbering.

## Important

All medicine catalog entries, prices, customers, and documents are fictional demo data. Prices are not market quotes. Verify your own prices, currency, and tax rules before issuing a real document. Do not enter patient-identifying or clinical data. Browser storage stays on this device; clearing browser data removes saved history unless you download a backup. This prototype is not a clinical or accounting compliance system.
