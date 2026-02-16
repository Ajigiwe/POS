import { format } from "date-fns"
import { formatCurrency } from "./currency"
import type { Sale, SaleItem, Product, Customer, Settings } from "@/lib/db/schema"

interface PrintReceiptData {
  sale: Sale
  saleItems: SaleItem[]
  products: Product[]
  customer?: Customer
  settings?: Settings
  cashierName: string
}

export function printReceipt(data: PrintReceiptData) {
  const receiptWindow = window.open("", "_blank")
  if (!receiptWindow) return

  const { sale, saleItems, products, customer, settings, cashierName } = data

  // Create a map of products for quick lookup
  const productMap = new Map(products.map(p => [p.id, p]))

  receiptWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt #${sale.id}</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            max-width: 450px; 
            margin: 0 auto; 
            font-size: 16px; 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            color: #1e293b;
          }
            h1 { 
              text-align: center; 
              font-size: 24px; 
              margin-bottom: 15px; 
              font-weight: bold; 
              color: #0f172a;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }
            .store-title {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
              text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              margin-bottom: 15px;
            }
          .header { 
            text-align: center; 
            margin-bottom: 25px; 
            border-bottom: 3px solid #10b981; 
            padding-bottom: 15px; 
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
            .logo-icon { width: 28px; height: 28px; color: #10b981; }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0; 
            font-size: 16px; 
            padding: 6px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .item:last-child { border-bottom: none; }
          .totals { 
            border-top: 3px solid #3b82f6; 
            margin-top: 15px; 
            padding-top: 15px; 
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
          }
          .total { 
            font-weight: bold; 
            font-size: 20px; 
            color: #059669;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          .footer { 
            text-align: center; 
            margin-top: 25px; 
            border-top: 3px solid #8b5cf6; 
            padding-top: 15px; 
            font-size: 16px; 
            color: #64748b;
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .store-info { 
            font-size: 16px; 
            margin: 5px 0; 
            color: #475569;
          }
          .receipt-info { 
            font-size: 16px; 
            margin: 5px 0; 
            color: #334155;
            font-weight: 500;
          }
          .items {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 15px 0;
          }
          .subtotal { color: #3b82f6; font-weight: 600; }
          .tax { color: #f59e0b; font-weight: 600; }
          .discount { color: #ef4444; font-weight: 600; }
          .payment { color: #8b5cf6; font-weight: 600; }
          .change { color: #10b981; font-weight: 600; }
          @media print {
            body { 
              padding: 0; 
              font-size: 16px; 
              background: white;
            }
            .header, .items, .totals, .footer {
              box-shadow: none;
              border: 1px solid #e2e8f0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${settings?.logoUrl ? `
            <div style="text-align: center; margin-bottom: 15px;">
              <img src="${settings.logoUrl}" alt="Store Logo" style="max-width: 150px; max-height: 100px; object-fit: contain;" />
            </div>
            <h2 style="text-align: center; font-size: 22px; font-weight: bold; color: #0f172a; margin: 10px 0;">
              ${settings?.storeName || "Store Name"}
            </h2>
          ` : `
            <h1 class="store-title">
              <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 18C5.9 18 5.01 18.9 5.01 20C5.01 21.1 5.9 22 7 22C8.1 22 9 21.1 9 20C9 18.9 8.1 18 7 18ZM17 18C15.9 18 15.01 18.9 15.01 20C15.01 21.1 15.9 22 17 22C18.1 22 19 21.1 19 20C19 18.9 18.1 18 17 18ZM7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.59 17.3 11.97L21.16 4.96L19.42 4H19.41L18.31 6L15.55 11H8.53L8.4 10.73L6.16 6L5.21 4L4.27 2H1V4H3L6.6 11.59L5.25 14.03C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.29 15 7.17 14.89 7.17 14.75Z"/>
              </svg>
              ${settings?.storeName || "Store Name"}
            </h1>
          `}
          <div class="store-info">${settings?.storeAddress || ""}</div>
          <div class="store-info">${settings?.storePhone || ""}</div>
          <div class="receipt-info">Date: ${format(new Date(sale.createdAt), "MMM dd, yyyy HH:mm")}</div>
          <div class="receipt-info">Receipt #${sale.id}</div>
          ${customer ? `<div class="receipt-info">Customer: ${customer.name}</div>` : ""}
          <div class="receipt-info">Cashier: ${cashierName}</div>
        </div>
        
        <div class="items">
          ${saleItems
      .map(
        (item) => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>₵${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          `,
      )
      .join("")}
        </div>
        
        <div class="totals">
          <div class="item">
            <span class="subtotal">Subtotal:</span>
            <span class="subtotal">₵${sale.subtotal.toFixed(2)}</span>
          </div>
          ${sale.discountAmount > 0 ? `
            <div class="item">
              <span class="discount">Discount:</span>
              <span class="discount">-₵${sale.discountAmount.toFixed(2)}</span>
            </div>
          ` : ""}
        <div class="item">
            <span class="tax">Tax (${settings?.taxRate || 0}%):</span>
            <span class="tax">₵${sale.taxAmount.toFixed(2)}</span>
          </div>
          <div class="item total">
            <span>TOTAL:</span>
            <span>₵${sale.total.toFixed(2)}</span>
          </div>
          <div class="item">
            <span class="payment">Payment:</span>
            <span class="payment">₵${Number(sale.paymentReceived || 0).toFixed(2)}</span>
          </div>
          <div class="item">
            <span class="change">Change:</span>
            <span class="change">₵${Number(sale.changeGiven || 0).toFixed(2)}</span>
          </div>
          <div class="item">
            <span>Payment Method:</span>
            <span style="color: #059669; font-weight: 600;">${sale.paymentMethod.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>${settings?.receiptFooter || "Thank you for your business!"}</div>
        </div>

                                  <script>
document.addEventListener('DOMContentLoaded', function () {
  const logo = document.querySelector('img');
  
  function doPrint() {
    setTimeout(function() {
      window.print();
    }, 100);
  }

  if (logo && !logo.complete) {
    logo.onload = doPrint;
    logo.onerror = doPrint; // Print anyway if image fails
  } else {
    doPrint();
  }
});

window.addEventListener('afterprint', function () {
  setTimeout(function () {
    window.close();
  }, 500);
});

// Fallback safety (if print doesn't happen or is cancelled but window stays open)
setTimeout(function () {
  if (!window.closed) {
    // window.close(); // Optional: might annoy user if they are still previewing
  }
}, 30000); // Increased timeout
</script>
  </body>
  </html>
    `)
  receiptWindow.document.close()
}
