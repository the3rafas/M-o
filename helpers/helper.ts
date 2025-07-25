import { Registry } from "@/type";

// inside your component, add this helper:
export function generateAndPrintReceipt(entry: Registry) {
  // 1. Open a new blank window
  const receiptWin = window.open("", "_blank", "width=600,height=800");
  if (!receiptWin) {
    console.error("Failed to open print window");
    return;
  }

  // 2. Build some quick inline styles and HTML
  const styles = `
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h1 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 1em; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background: #f0f0f0; }
        tfoot td { font-weight: bold; }
      </style>
    `;

  const rowsHtml = entry.billItems
    .map(
      (item) => `
        <tr>
          <td>${item.productName}</td>
          <td>${item.quantity}</td>
          <td>$${item.unitPrice.toFixed(2)}</td>
          <td>$${item.subTotal.toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  const html = `
      <html>
        <head>
          <title>Receipt #${entry.id}</title>
          ${styles}
        </head>
        <body>
          <h1>Receipt #${entry.id}</h1>
          <p><strong>Date:</strong> ${entry.date}</p>
          <p><strong>Client:</strong> ${entry.name}</p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right;">Total:</td>
                <td>$${entry.totalPrice.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;

  // 3. Write & print
  receiptWin.document.open();
  receiptWin.document.write(html);
  receiptWin.document.close();
  receiptWin.focus();
  receiptWin.print();
  receiptWin.close();
}
